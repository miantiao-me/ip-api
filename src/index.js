import { getFlag, getTimezone, getTimezoneOffset, getTimezoneOffsetMinutes, getCurrentTime } from './utils'
import { getTimezoneByConsensus, getTimezoneFirst } from './geoip-services'
import { CORS_HEADERS } from './config'

export default {
  async fetch(request) {
    const ip = request.headers.get('cf-connecting-ipv6') || request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip')
    const { pathname, searchParams } = new URL(request.url)
    console.log(ip, pathname)

    // 处理 /timezone 接口
    if (pathname === '/timezone') {
      // 获取查询参数中的 IP，如果没有则使用请求者的 IP
      const queryIp = searchParams.get('ip')
      const targetIp = queryIp || ip
      const mode = searchParams.get('mode') || 'consensus' // consensus 或 first

      let timezone, timezoneOffset, currentTime, geo, confidence, sources

      // 如果查询的是请求者自己的 IP，使用 Cloudflare 数据
      if (!queryIp || queryIp === ip) {
        const country = request.cf?.country || request.headers.get('cf-ipcountry')
        const city = request.cf?.city || request.headers.get('cf-ipcity')
        const countryRegion = request.cf?.region || request.headers.get('cf-region')
        const cfTimezone = request.cf?.timezone

        timezone = getTimezone({
          city,
          country,
          countryRegion,
          cfTimezone
        })

        geo = {
          country,
          countryRegion,
          city,
          latitude: request.cf?.latitude || request.headers.get('cf-iplatitude'),
          longitude: request.cf?.longitude || request.headers.get('cf-iplongitude'),
        }
        confidence = 1.0
        sources = 'cloudflare'
      } else {
        // 查询其他 IP，使用多服务共识
        try {
          const result = mode === 'first'
            ? await getTimezoneFirst(targetIp)
            : await getTimezoneByConsensus(targetIp)

          timezone = result.timezone
          geo = result.geo
          confidence = result.confidence || 1.0
          sources = result.sources || result.service
        } catch (error) {
          console.error('Failed to fetch timezone:', error)
          return Response.json({
            error: 'Failed to determine timezone for the given IP',
            message: error.message
          }, {
            status: 500,
            headers: CORS_HEADERS
          })
        }
      }

      // 计算时区偏移和当前时间
      timezoneOffset = getTimezoneOffset(timezone)
      const timezoneOffsetMinutes = getTimezoneOffsetMinutes(timezone)
      const timeInfo = getCurrentTime(timezone)

      console.log({ timezone, timezoneOffset, timezoneOffsetMinutes, timeInfo, confidence })

      return Response.json({
        ip: targetIp,
        timezone,
        timezoneOffset,
        timezoneOffsetMinutes,
        timestamp: timeInfo.timestamp,
        datetime: timeInfo.datetime,
        iso: timeInfo.iso,
        ...geo,
        confidence,
        sources
      }, {
        headers: {
          ...CORS_HEADERS,
          'x-client-ip': ip
        }
      })
    }

    // 处理 /geo 接口
    if (pathname === '/geo') {
      const country = request.cf?.country || request.headers.get('cf-ipcountry')
      const colo = request.headers.get('cf-ray')?.split('-')[1]
      const geo = {
        flag: country && getFlag(country),
        country: country,
        countryRegion: request.cf?.region || request.headers.get('cf-region'),
        city: request.cf?.city || request.headers.get('cf-ipcity'),
        region: request.cf?.colo || colo,
        latitude: request.cf?.latitude || request.headers.get('cf-iplatitude'),
        longitude: request.cf?.longitude || request.headers.get('cf-iplongitude'),
        asOrganization: request.cf?.asOrganization || request.headers.get('x-asn'),
      }
      console.log(geo)
      return Response.json({
        ip,
        ...geo
      }, {
        headers: {
          ...CORS_HEADERS,
          'x-client-ip': ip
        }
      })
    }

    // 默认返回 IP
    return new Response(ip, {
      headers: {
        ...CORS_HEADERS,
        'x-client-ip': ip
      }
    })
  }
}

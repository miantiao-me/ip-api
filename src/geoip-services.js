/**
 * GeoIP 服务配置
 * 每个服务提供 IP 地理位置查询功能
 */
export const GEOIP_SERVICES = [
  {
    name: 'ipapi.co',
    url: 'https://ipapi.co/{ip}/json/',
    parseTimezone: (data) => data.timezone,
    parseGeo: (data) => ({
      country: data.country_code,
      countryRegion: data.region,
      city: data.city,
      latitude: data.latitude?.toString(),
      longitude: data.longitude?.toString(),
    })
  },
  {
    name: 'ipwho.is',
    url: 'https://ipwho.is/{ip}',
    parseTimezone: (data) => data.timezone?.id,
    parseGeo: (data) => ({
      country: data.country_code,
      countryRegion: data.region,
      city: data.city,
      latitude: data.latitude?.toString(),
      longitude: data.longitude?.toString(),
    })
  },
  {
    name: 'ip-api.com',
    url: 'http://ip-api.com/json/{ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone',
    parseTimezone: (data) => data.status === 'success' ? data.timezone : null,
    parseGeo: (data) => ({
      country: data.countryCode,
      countryRegion: data.regionName,
      city: data.city,
      latitude: data.lat?.toString(),
      longitude: data.lon?.toString(),
    })
  },
  {
    name: 'reallyfreegeoip.org',
    url: 'https://reallyfreegeoip.org/json/{ip}',
    parseTimezone: (data) => data.time_zone,
    parseGeo: (data) => ({
      country: data.country_code,
      countryRegion: data.region_name,
      city: data.city,
      latitude: data.latitude?.toString(),
      longitude: data.longitude?.toString(),
    })
  },
  {
    name: 'freeipapi.com',
    url: 'https://freeipapi.com/api/json/{ip}',
    parseTimezone: (data) => data.timeZone,
    parseGeo: (data) => ({
      country: data.countryCode,
      countryRegion: data.regionName,
      city: data.cityName,
      latitude: data.latitude?.toString(),
      longitude: data.longitude?.toString(),
    })
  }
]

/**
 * 从单个服务获取时区信息
 * @param {string} ip - IP 地址
 * @param {object} service - 服务配置
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<{timezone: string, geo: object}|null>}
 */
async function fetchFromService(ip, service, timeout = 3000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const url = service.url.replace('{ip}', ip)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IP-API/1.0)'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    const timezone = service.parseTimezone(data)
    const geo = service.parseGeo(data)

    if (!timezone) {
      throw new Error('No timezone in response')
    }

    return { timezone, geo, service: service.name }
  } catch (error) {
    console.log(`${service.name} failed for ${ip}:`, error.message)
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 使用共识算法从多个服务获取时区
 * @param {string} ip - IP 地址
 * @param {object} options - 配置选项
 * @returns {Promise<{timezone: string, geo: object, confidence: number}>}
 */
export async function getTimezoneByConsensus(ip, options = {}) {
  const {
    timeout = 5000,        // 单个服务超时时间
    totalTimeout = 8000,   // 总超时时间
  } = options

  const startTime = Date.now()
  const results = []
  const tallyMap = new Map()

  // 并发请求所有服务
  const promises = GEOIP_SERVICES.map(service =>
    fetchFromService(ip, service, timeout)
  )

  // 使用 Promise.race 来实现竞速和共识
  let completedCount = 0
  const majority = Math.ceil(GEOIP_SERVICES.length / 2)

  for await (const result of raceWithTimeout(promises, totalTimeout)) {
    if (!result) continue

    completedCount++
    results.push(result)

    // 统计时区出现次数
    const count = tallyMap.get(result.timezone) || 0
    tallyMap.set(result.timezone, count + 1)

    // 如果达到多数（超过50%），立即返回
    if (count + 1 >= majority) {
      console.log(`Consensus reached for ${ip}: ${result.timezone} (${count + 1}/${GEOIP_SERVICES.length})`)
      return {
        timezone: result.timezone,
        geo: result.geo,
        confidence: (count + 1) / GEOIP_SERVICES.length,
        responseTime: Date.now() - startTime,
        sources: completedCount
      }
    }
  }

  // 如果没有达到多数，选择最多的那个
  if (tallyMap.size > 0) {
    let bestTimezone = null
    let maxCount = 0
    let bestGeo = null

    for (const [timezone, count] of tallyMap.entries()) {
      if (count > maxCount) {
        maxCount = count
        bestTimezone = timezone
        bestGeo = results.find(r => r.timezone === timezone)?.geo
      }
    }

    console.log(`Best guess for ${ip}: ${bestTimezone} (${maxCount}/${GEOIP_SERVICES.length})`)
    return {
      timezone: bestTimezone,
      geo: bestGeo,
      confidence: maxCount / GEOIP_SERVICES.length,
      responseTime: Date.now() - startTime,
      sources: completedCount
    }
  }

  throw new Error('All GeoIP services failed or timed out')
}

/**
 * Promise 竞速助手，带总超时
 */
async function* raceWithTimeout(promises, totalTimeout) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Total timeout')), totalTimeout)
  )

  try {
    for (const promise of promises) {
      try {
        const result = await Promise.race([promise, timeoutPromise])
        yield result
      } catch (error) {
        if (error.message === 'Total timeout') {
          break
        }
        yield null
      }
    }
  } catch (error) {
    // 总超时
  }
}

/**
 * 快速模式：返回第一个成功的结果
 * @param {string} ip - IP 地址
 * @param {number} timeout - 超时时间
 * @returns {Promise<{timezone: string, geo: object}>}
 */
export async function getTimezoneFirst(ip, timeout = 5000) {
  const promises = GEOIP_SERVICES.map(service =>
    fetchFromService(ip, service, timeout)
  )

  const result = await Promise.race(
    promises.map(async p => {
      const res = await p
      if (res) return res
      throw new Error('Service failed')
    })
  )

  return {
    timezone: result.timezone,
    geo: result.geo,
    service: result.service
  }
}

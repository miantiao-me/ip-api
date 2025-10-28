import { CITY_TIMEZONE, COUNTRY_TIMEZONE, COUNTRY_REGION_TIMEZONE } from './timezone-data'

const EMOJI_FLAG_UNICODE_STARTING_POSITION = 127397
export function getFlag(countryCode) {
  const regex = new RegExp('^[A-Z]{2}$').test(countryCode)
  if (!countryCode || !regex) return void 0
  try {
    return String.fromCodePoint(
      ...countryCode
        .split('')
        .map((char) => EMOJI_FLAG_UNICODE_STARTING_POSITION + char.charCodeAt(0))
    )
  } catch (error) {
    return void 0
  }
}

/**
 * 根据地理信息查询时区
 * @param {Object} geo - 地理信息对象
 * @param {string} geo.city - 城市名称
 * @param {string} geo.country - 国家代码
 * @param {string} geo.countryRegion - 国家地区/州
 * @param {string} geo.cfTimezone - Cloudflare 提供的时区
 * @returns {string|undefined} IANA 时区标识
 */
export function getTimezone(geo) {
  // 1. 优先使用 Cloudflare 提供的时区
  if (geo.cfTimezone) {
    return geo.cfTimezone
  }

  // 2. 使用国家+地区查询（针对多时区国家）
  if (geo.country && geo.countryRegion) {
    const regionMap = COUNTRY_REGION_TIMEZONE[geo.country]
    if (regionMap && regionMap[geo.countryRegion]) {
      return regionMap[geo.countryRegion]
    }
  }

  // 3. 使用城市查询
  if (geo.city && CITY_TIMEZONE[geo.city]) {
    return CITY_TIMEZONE[geo.city]
  }

  // 4. 使用国家查询（兜底）
  if (geo.country && COUNTRY_TIMEZONE[geo.country]) {
    return COUNTRY_TIMEZONE[geo.country]
  }

  // 5. 默认返回 UTC
  return 'UTC'
}

/**
 * 计算时区的 UTC 偏移量（分钟）
 * @param {string} timezone - IANA 时区标识
 * @returns {number} UTC 偏移分钟数，例如 480 表示 +08:00，-300 表示 -05:00
 */
export function getTimezoneOffsetMinutes(timezone) {
  try {
    const now = new Date()
    // 使用 Intl API 获取时区偏移
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset'
    })
    const parts = formatter.formatToParts(now)
    const offsetPart = parts.find(part => part.type === 'timeZoneName')

    if (offsetPart && offsetPart.value.startsWith('GMT')) {
      // 提取 GMT+8 或 GMT-5 中的偏移部分
      const offset = offsetPart.value.replace('GMT', '')
      if (offset === '') return 0

      // 解析偏移量
      const match = offset.match(/([+-])(\d{1,2})(?::(\d{2}))?/)
      if (match) {
        const sign = match[1] === '+' ? 1 : -1
        const hours = parseInt(match[2], 10)
        const minutes = parseInt(match[3] || '0', 10)
        return sign * (hours * 60 + minutes)
      }
    }

    // 备用方法：计算时区偏移
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const offsetMinutes = Math.round((tzDate.getTime() - utcDate.getTime()) / (1000 * 60))
    return offsetMinutes
  } catch (error) {
    return 0
  }
}

/**
 * 计算时区的 UTC 偏移量（字符串格式）
 * @param {string} timezone - IANA 时区标识
 * @returns {string} UTC 偏移，格式如 "+08:00" 或 "-05:00"
 */
export function getTimezoneOffset(timezone) {
  const offsetMinutes = getTimezoneOffsetMinutes(timezone)
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absOffset = Math.abs(offsetMinutes)
  const hours = Math.floor(absOffset / 60).toString().padStart(2, '0')
  const minutes = (absOffset % 60).toString().padStart(2, '0')
  return `${sign}${hours}:${minutes}`
}

/**
 * 获取时区的当前时间信息
 * @param {string} timezone - IANA 时区标识
 * @returns {object} 包含时间戳和格式化时间的对象
 */
export function getCurrentTime(timezone) {
  try {
    const now = new Date()
    const timestamp = now.getTime() // Unix 时间戳（毫秒）

    // 目标时区的本地时间字符串
    const datetime = now.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })

    // ISO 8601 格式（始终是 UTC 时间）
    const iso = now.toISOString()

    return {
      timestamp,
      datetime,
      iso
    }
  } catch (error) {
    const now = new Date()
    return {
      timestamp: now.getTime(),
      datetime: now.toISOString(),
      iso: now.toISOString()
    }
  }
}

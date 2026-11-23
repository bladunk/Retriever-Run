import { categories } from './lodge-save.js'

export const boardPageSize = 25
export const boardCap = 100
export const campMetrics = Object.keys(categories)
const blocked = /(fuck|shit|bitch|cunt|nigger|faggot|whore|nazi|killyourself)/
const reserved = new Set(['admin', 'administrator', 'moderator', 'staff', 'system', 'official',
  'retrieverrun', 'supabase', 'github'])
const lookalikes = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't' }
export const runIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const maxRunMs = 14_400_000

export function campNickname(raw) {
  if (typeof raw !== 'string' || raw.length > 80) return null
  const name = raw.trim().replace(/\s+/g, ' ')
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{1,18}[A-Za-z0-9]$/.test(name)) return null
  const folded = name.toLowerCase().replace(/[013457]/g, digit => lookalikes[digit]).replace(/[^a-z]/g, '')
  return blocked.test(folded) || reserved.has(folded) ? null : name
}

export function canPostRun({ score, distance, retrieves, durationMs }) {
  // The server makes the same checks with its own inputs. These only avoid
  // queueing submissions already known to be outside the worldwide beta limits.
  if (![score, distance, retrieves, durationMs].every(Number.isSafeInteger) ||
      durationMs < 2000 || durationMs > maxRunMs) return false
  const seconds = durationMs / 1000
  return distance >= 11 * seconds - 2 && distance <= Math.min(29 * seconds, 11 * seconds + .14 * seconds ** 2) + 2 &&
    retrieves >= 0 && retrieves <= Math.floor(seconds / .85) + 1 &&
    score >= distance + 75 * retrieves && score <= distance + 450 * Math.ceil(seconds) + 350 &&
    (score - distance) % 5 === 0
}

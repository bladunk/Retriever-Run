export function rewardGroups(report) {
  const groups = []
  const honors = report.newHonors ?? []
  if (report.boyd) groups.push({ type: 'prestige', label: 'Master Hunter · Boyd earned', count: 1 })
  const legendary = honors.filter(honor => honor.category === 'Legendary').length
  const platinum = honors.filter(honor => honor.category !== 'Legendary' && honor.tier === 'Platinum').length
  const ordinary = honors.length - legendary - platinum
  if (legendary) groups.push({ type: 'legendary', label: 'Legendary', count: legendary })
  if (platinum) groups.push({ type: 'platinum', label: 'Platinum', count: platinum })
  if (report.career?.before.rank.id !== report.career?.after.rank.id && !report.boyd &&
      report.career?.after.rank.id !== 'master-hunter')
    groups.push({ type: 'rank', label: report.career.after.rank.name, count: 1 })
  if (ordinary) groups.push({ type: 'honor', label: ordinary === 1 ? 'Honor' : 'Honors', count: ordinary })
  if (report.gear?.length) groups.push({ type: 'gear', label: 'Gear', count: report.gear.length })
  if (report.newWildlife?.length) groups.push({ type: 'species', label: report.newWildlife.length === 1 ? 'Discovery' : 'Discoveries',
    count: report.newWildlife.length })
  const upgrades = (report.lodge?.upgrades.length ?? 0) + Number(Boolean(report.lodge?.tier))
  if (upgrades) groups.push({ type: 'lodge', label: 'Lodge', count: upgrades })
  return groups
}

const patterns = { retrieve: [20], collision: [34], milestone: [16, 32, 18], prestige: [24, 40, 30] }

export function hapticFeedback(device, enabled, cue) {
  if (!enabled || typeof device?.vibrate !== 'function' || !patterns[cue]) return false
  try { return device.vibrate(patterns[cue]) } catch { return false }
}

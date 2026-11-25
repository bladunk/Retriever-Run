export const runningBuild = typeof __RUNNING_BUILD__ === 'undefined'
  ? { version: 'development', id: 'local' } : __RUNNING_BUILD__

export function buildLabel({ version, id } = runningBuild) {
  const prerelease = /^(\d+\.\d+)\.\d+-phase\.(\d+)(?:\.(\d+))?$/.exec(version)
  if (!prerelease) return (version === 'development' ? 'Development' : 'v' + version) + ' · ' + id
  const phase = prerelease[2].padStart(2, '0') + (prerelease[3] ? '.' + prerelease[3] : '')
  return 'v' + prerelease[1] + ' Development · Phase ' + phase + ' · ' + id
}

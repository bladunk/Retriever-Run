export function shareFrom(source, build) {
  source.disabled = true
  void import('./connected-share.js').then(({ openSharePreview }) => {
    if (source.isConnected) openSharePreview(source,build())
  }).catch(() => { source.textContent = 'Try sharing again' })
    .finally(() => { source.disabled = false })
}

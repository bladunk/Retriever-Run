export function gearIllustration(item) {
  const image = document.createElement('img')
  image.width = 360
  image.height = 248
  image.alt = ''
  image.loading = 'lazy'
  image.decoding = 'async'
  image.className = 'gear-illustration'
  image.src = './gear/' + item.id + '.webp'
  return image
}

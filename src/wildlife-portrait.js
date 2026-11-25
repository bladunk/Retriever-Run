import { speciesArtwork } from './species-artwork.js'
export { speciesArtwork } from './species-artwork.js'

// Original field-guide illustrations keyed by the playable silhouettes.
function color(value) { return '#' + value.toString(16).padStart(6, '0') }

export function wildlifePortrait(animal, seen) {
  const art = speciesArtwork[animal.id]
  if (seen && art.photo) return './' + art.photo.path
  const family = art.silhouette
  const fill = type => seen ? color(animal[type]) : '#536057'
  const body = fill('body'), head = fill('head'), wing = fill('wing')
  const bill = seen ? (animal.family === 'goose' ? '#989084' : '#c9a253') : head
  const eye = seen ? '#e6d99b' : head
  const large = ['deer','moose'].includes(family)
  const slim = ['wader','crane','goose'].includes(family)
  const neck = slim ? 'M45 44 Q62 46 70 24 Q78 22 80 27 L66 46 Q61 54 45 55Z'
    : 'M50 41 Q60 34 68 36 L74 49 Q63 55 51 52Z'
  const silhouette = family === 'alligator' ? `
    <path fill="${body}" d="M7 42Q21 53 34 44Q47 37 62 42L70 40Q76 31 82 39L94 41L96 45L86 48L72 46L63 52L52 52L46 58H40L44 51L36 47Q20 57 7 42Z"/>
    <path fill="${wing}" d="M29 46l6-5 4 2 5-4 3 2 4-3 5 3 4-1 4 3Z"/>
    <circle cx="79" cy="40" r="1.4" fill="${eye}"/>` : family === 'raptor' ? `
    <path fill="${body}" d="M49 31Q35 8 9 21L6 31L27 35L43 43L34 55L44 60L53 49L65 48L81 37L86 28L82 25L69 31L65 27Z"/>
    <path fill="${head}" d="M64 28Q75 20 82 25L82 31L75 34L69 32Z"/>
    <path fill="${bill}" d="M82 25l8 2-4 5-4-1Z"/>` : large ? `
    <path fill="${body}" d="M10 47 Q22 32 47 41 L64 39 L78 48 L88 47 L91 51 L79 55 L62 53 L58 64H53L52 53H38L34 64H29L30 53L8 51Z"/>
    <path fill="${head}" d="M56 47 Q60 32 66 30 L73 25 L77 26 L76 33 L84 37 L83 44 L72 46 L68 53Z"/>
    ${family === 'moose' ? '<path fill="'+wing+'" d="M64 32 L55 23 L51 13 L58 16 L64 21 L64 11 L69 13 L72 21 L78 10 L85 13 L83 20 L76 30Z"/>' :
      '<path fill="'+wing+'" d="M64 32L60 21L64 18L69 30L73 15L78 19L73 33Z"/>'}` : `
    <path fill="${body}" d="M8 48 L22 45 Q30 35 52 40 Q68 41 70 48 Q62 60 37 59 Q18 56 8 48Z"/>
    <path fill="${wing}" d="M18 48 Q34 39 54 46 Q56 51 47 54 Q32 57 18 48Z"/>
    <path fill="${head}" d="${neck}"/>
    <ellipse cx="${slim ? 77 : 71}" cy="${slim ? 24 : 37}" rx="10" ry="8" fill="${head}"/>
    <path fill="${bill}" d="M${slim ? 84 : 78} ${slim ? 23 : 36} L93 ${slim ? 24 : 38} L91 ${slim ? 28 : 41} L81 ${slim ? 28 : 41}Z"/>
    <circle cx="${slim ? 80 : 74}" cy="${slim ? 22 : 35}" r="1.4" fill="${eye}"/>
    ${['pheasant', 'pintail'].includes(family) ? '<path fill="'+wing+'" d="M26 47L2 35l16 18Z"/>' : ''}
    ${family === 'spoon' ? '<ellipse fill="'+bill+'" cx="93" cy="39" rx="6" ry="3"/>' : ''}
    ${['wader','crane','merganser'].includes(family) ? '<path fill="'+bill+'" d="M80 23l19 3-16 3Z"/>' : ''}
    ${animal.family.startsWith('crest') || animal.family === 'merganser' ? '<path fill="'+head+'" d="M77 34Q61 12 60 35L69 40Z"/>' : ''}
    ${['wader','crane'].includes(animal.family) ? '<path stroke="'+head+'" fill="none" stroke-width="2" d="M38 56l-1 10m10-10-2 10"/>' : ''}`
  const graphic = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 70"><rect width="100" height="70" rx="8" fill="#23392f"/><path d="M0 62Q28 57 55 61T100 62V70H0Z" fill="#355244"/>' + silhouette + '</svg>'
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(graphic)
}

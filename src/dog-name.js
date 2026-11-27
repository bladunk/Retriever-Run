export const dogNameLimit = 20

// This optional field belongs to the local Labrador, independent of public
// hunter identity. Existing save files omit it, and Boyd keeps his own name.
export function validatedDogName(value) {
  if (typeof value !== 'string' || /[\p{Cc}\p{Cf}]/u.test(value)) return undefined
  const name = value.normalize('NFC').trim().replace(/ {2,}/g, ' ')
  if (!name) return ''
  if ([...name].length > dogNameLimit ||
      !/^[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:[ '’-][\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*$/u.test(name)) return undefined
  return name
}

export function dogDisplayName(kennel) {
  return kennel.breed === 'boyd' ? 'Boyd' : kennel.name || 'Labrador'
}

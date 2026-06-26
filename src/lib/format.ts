export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60)
}

export function uniqueSlug(base: string, salt: string) {
  const s = slugify(base) || 'perfil'
  return `${s}-${salt.slice(0, 6)}`
}

export function formatMoney(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(
    cents / 100,
  )
}

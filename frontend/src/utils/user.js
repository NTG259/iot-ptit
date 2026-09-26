/** "Nguyễn Trường Giang" -> "TG" (last two words, like the design). */
export function initialsOf(name) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return words.slice(-2).map((w) => w[0].toUpperCase()).join('') || '?'
}

/** "Nguyễn Trường Giang" -> "TG" (chữ cái đầu của hai từ cuối, theo thiết kế). */
export function getInitials(fullName) {
  const name = fullName ?? ''
  const words = name.trim().split(/\s+/).filter((word) => word !== '')
  const lastTwoWords = words.slice(-2)
  const initials = lastTwoWords.map((word) => word[0].toUpperCase()).join('')
  if (initials === '') {
    return '?'
  }
  return initials
}

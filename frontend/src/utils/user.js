/** "Nguyễn Trường Giang" -> "TG" (chữ cái đầu của hai từ cuối, theo thiết kế). */
export function getInitials(fullName) {
  let name = ''
  if (fullName) {
    name = fullName.trim()
  }
  if (name === '') {
    return '?'
  }

  const words = name.split(/\s+/)
  const lastWord = words[words.length - 1]
  if (words.length === 1) {
    return lastWord[0].toUpperCase()
  }

  const secondLastWord = words[words.length - 2]
  return secondLastWord[0].toUpperCase() + lastWord[0].toUpperCase()
}

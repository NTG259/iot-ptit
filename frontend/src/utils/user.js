/** "Nguyễn Trường Giang" -> "TG" (chữ cái đầu của hai từ cuối, theo thiết kế). */
export function layChuCaiDau(ten) {
  const cacTu = (ten ?? '').trim().split(/\s+/).filter(Boolean)
  return cacTu.slice(-2).map((tu) => tu[0].toUpperCase()).join('') || '?'
}

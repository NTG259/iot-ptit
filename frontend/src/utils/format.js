// Mọi thời gian trong app hiển thị theo giờ Việt Nam, bất kể múi giờ của trình duyệt.
export const MUI_GIO_VN = 'Asia/Ho_Chi_Minh'

/**
 * "2025-05-18 14:32:05" theo giờ Việt Nam: định dạng thời gian duy nhất dùng trong các bảng,
 * cũng là định dạng mà ô tìm kiếm hiểu được.
 */
export function dinhDangNgayGio(ngayGio) {
  return ngayGio.toLocaleString('sv-SE', { timeZone: MUI_GIO_VN })
}

/**
 * Đổi một ngày đã chọn (giá trị dayjs của antd, hoặc null) thành khoảng { from, to } theo giờ Việt Nam (UTC+7),
 * khớp với cách các bảng hiển thị thời gian; không chọn ngày thì cả hai là null (mọi ngày).
 */
export function khoangNgay(ngay) {
  if (!ngay) return { from: null, to: null }
  const chuoiNgay = ngay.format('YYYY-MM-DD')
  return { from: `${chuoiNgay}T00:00:00+07:00`, to: `${chuoiNgay}T23:59:59.999+07:00` }
}

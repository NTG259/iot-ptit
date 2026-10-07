// Lưu token và người dùng đang đăng nhập trong localStorage: phiên giữ nguyên sau khi đóng tab,
// cho tới khi đăng xuất hoặc token hết hạn.
const KHOA_TOKEN = 'auth.token'
const KHOA_NGUOI_DUNG = 'auth.user'

// Đọc một khoá; trình duyệt chặn storage thì trả về null.
function doc(khoa) {
  try {
    return localStorage.getItem(khoa)
  } catch {
    return null
  }
}

/** Token đăng nhập hiện tại, hoặc null. */
export function layToken() {
  return doc(KHOA_TOKEN)
}

/** Người dùng đang đăng nhập (đã parse JSON), hoặc null. */
export function layNguoiDung() {
  const chuoi = doc(KHOA_NGUOI_DUNG)
  try {
    return chuoi ? JSON.parse(chuoi) : null
  } catch {
    return null
  }
}

/** Lưu phiên đăng nhập mới, ghi đè phiên cũ. */
export function luuPhien(token, nguoiDung) {
  try {
    localStorage.setItem(KHOA_TOKEN, token)
    localStorage.setItem(KHOA_NGUOI_DUNG, JSON.stringify(nguoiDung))
  } catch {
    // Storage bị chặn (chế độ ẩn danh): người dùng sẽ phải đăng nhập lại.
  }
}

/** Cập nhật thông tin người dùng đang đăng nhập. */
export function capNhatNguoiDung(nguoiDung) {
  try {
    localStorage.setItem(KHOA_NGUOI_DUNG, JSON.stringify(nguoiDung))
  } catch {
    // Bỏ qua: storage bị chặn.
  }
}

/** Xoá phiên đăng nhập. */
export function xoaPhien() {
  try {
    localStorage.removeItem(KHOA_TOKEN)
    localStorage.removeItem(KHOA_NGUOI_DUNG)
  } catch {
    // Bỏ qua: storage bị chặn.
  }
}

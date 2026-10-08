// Lưu token và người dùng đang đăng nhập trong localStorage: phiên giữ nguyên sau khi đóng tab,
// cho tới khi đăng xuất hoặc token hết hạn.
const TOKEN_KEY = 'auth.token'
const USER_KEY = 'auth.user'

// Đọc một khoá; trình duyệt chặn storage thì trả về null.
function readStorage(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Token đăng nhập hiện tại, hoặc null. */
export function getToken() {
  return readStorage(TOKEN_KEY)
}

/** Người dùng đang đăng nhập (đã parse JSON), hoặc null. */
export function getUser() {
  const userJson = readStorage(USER_KEY)
  if (!userJson) {
    return null
  }
  try {
    return JSON.parse(userJson)
  } catch {
    return null
  }
}

/** Lưu phiên đăng nhập mới, ghi đè phiên cũ. */
export function saveSession(token, user) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // Storage bị chặn (chế độ ẩn danh): người dùng sẽ phải đăng nhập lại.
  }
}

/** Cập nhật thông tin người dùng đang đăng nhập. */
export function updateUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // Bỏ qua: storage bị chặn.
  }
}

/** Xoá phiên đăng nhập. */
export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    // Bỏ qua: storage bị chặn.
  }
}

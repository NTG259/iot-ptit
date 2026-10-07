import { khachApi } from './apiClient'
import { xoaPhien, luuPhien } from './session'

/** Đăng nhập: lưu token và thông tin người dùng, trả về người dùng. */
export async function dangNhap({ username, password }) {
  const { accessToken, user } = await khachApi.post('/auth/login', { username, password })
  luuPhien(accessToken, user)
  return user
}

// JWT không lưu trạng thái ở server, nên đăng xuất chỉ cần xoá token trên máy này.
export function dangXuat() {
  xoaPhien()
}

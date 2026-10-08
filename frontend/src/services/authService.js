import { apiClient } from './apiClient'
import { clearSession, saveSession } from './session'

/** Đăng nhập: lưu token và thông tin người dùng, trả về người dùng. */
export async function login({ username, password }) {
  const { accessToken, user } = await apiClient.post('/auth/login', { username, password })
  saveSession(accessToken, user)
  return user
}

// JWT không lưu trạng thái ở server, nên đăng xuất chỉ cần xoá token trên máy này.
export function logout() {
  clearSession()
}

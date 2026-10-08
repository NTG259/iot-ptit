import { apiClient } from './apiClient'
import { updateUser } from './session'

/** Lấy hồ sơ người dùng đang đăng nhập và cập nhật bản lưu trong phiên. */
export async function getProfile() {
  const user = await apiClient.get('/users/me')
  updateUser(user)
  return user
}

/**
 * Lưu hồ sơ người dùng đang đăng nhập và cập nhật bản lưu trong phiên.
 * PUT thay toàn bộ hồ sơ, nên phải gửi đủ mọi trường chứ không chỉ trường đã sửa; trường bỏ trống gửi null.
 * fullName bắt buộc, email phải đúng định dạng.
 */
export async function saveProfile({ fullName, email, studentId, role, school, githubUrl, figmaUrl }) {
  const user = await apiClient.put('/users/me', { fullName, email, studentId, role, school, githubUrl, figmaUrl })
  updateUser(user)
  return user
}

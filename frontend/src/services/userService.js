import { khachApi } from './apiClient'
import { capNhatNguoiDung } from './session'

/** Lấy hồ sơ người dùng đang đăng nhập và cập nhật bản lưu trong phiên. */
export async function layHoSo() {
  const nguoiDung = await khachApi.get('/users/me')
  capNhatNguoiDung(nguoiDung)
  return nguoiDung
}

/**
 * Lưu hồ sơ người dùng đang đăng nhập và cập nhật bản lưu trong phiên.
 * PUT thay toàn bộ hồ sơ, nên phải gửi đủ mọi trường chứ không chỉ trường đã sửa; trường bỏ trống gửi null.
 * fullName bắt buộc, email phải đúng định dạng.
 */
export async function luuHoSo({ fullName, email, studentId, role, school, githubUrl, figmaUrl }) {
  const nguoiDung = await khachApi.put('/users/me', { fullName, email, studentId, role, school, githubUrl, figmaUrl })
  capNhatNguoiDung(nguoiDung)
  return nguoiDung
}

import { cauHinh } from '@/config'
import { DUONG_DAN } from '@/routes/paths'
import { xoaPhien, layToken } from './session'

// Lỗi khi gọi API: `message` lấy từ backend, `maHttp` là mã HTTP (vd 503 = ESP8266 chưa kết nối).
export class LoiApi extends Error {
  constructor(message, maHttp) {
    super(message)
    this.maHttp = maHttp
  }
}

// Tạo query string, bỏ qua bộ lọc rỗng ('' / null / undefined) để nơi gọi truyền thẳng state của UI;
// mảng được nối bằng dấu phẩy.
function taoQuery(thamSo) {
  if (!thamSo) return ''
  const query = new URLSearchParams()
  for (const [khoa, giaTri] of Object.entries(thamSo)) {
    if (giaTri === undefined || giaTri === null || giaTri === '') continue
    query.set(khoa, Array.isArray(giaTri) ? giaTri.join(',') : giaTri)
  }
  const chuoi = query.toString()
  return chuoi ? `?${chuoi}` : ''
}

// Lớp bọc fetch để các service không gọi fetch() trực tiếp. Backend luôn trả về { success, message, data };
// hàm này trả về `data`, lỗi thì ném LoiApi kèm `message`. Tự gắn token đăng nhập vào header.
async function goiApi(duongDan, { thamSo, headers, ...tuyChon } = {}) {
  const token = layToken()
  const phanHoi = await fetch(`${cauHinh.diaChiApi}${duongDan}${taoQuery(thamSo)}`, {
    ...tuyChon,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
  })

  const noiDung = phanHoi.status === 204 ? null : await phanHoi.json().catch(() => null)

  if (phanHoi.status === 401 && token) {
    // Token hết hạn hoặc bị thu hồi: xoá token và đưa người dùng về trang đăng nhập.
    xoaPhien()
    window.location.assign(DUONG_DAN.DANG_NHAP)
  }
  if (!phanHoi.ok || noiDung?.success === false) {
    throw new LoiApi(noiDung?.message ?? `Request failed: ${phanHoi.status} ${phanHoi.statusText}`, phanHoi.status)
  }
  // Response 2xx nhưng không phải JSON của backend (vd index.html của dev server khi proxy /api không chạy)
  // thì báo lỗi rõ ràng, thay vì trả về null mà nơi gọi không ngờ tới.
  if (phanHoi.status !== 204 && noiDung == null) {
    throw new LoiApi(`Unexpected response from ${duongDan}: not JSON — is the backend reachable?`, phanHoi.status)
  }

  return noiDung?.data ?? null
}

// Các phương thức HTTP; nội dung của post/put được chuyển sang JSON.
export const khachApi = {
  get: (duongDan, thamSo, tuyChon) => goiApi(duongDan, { ...tuyChon, thamSo, method: 'GET' }),
  post: (duongDan, noiDung, tuyChon) => goiApi(duongDan, { ...tuyChon, method: 'POST', body: JSON.stringify(noiDung) }),
  put: (duongDan, noiDung, tuyChon) => goiApi(duongDan, { ...tuyChon, method: 'PUT', body: JSON.stringify(noiDung) }),
  delete: (duongDan, tuyChon) => goiApi(duongDan, { ...tuyChon, method: 'DELETE' }),
}

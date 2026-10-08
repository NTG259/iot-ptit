import { config } from '@/config'
import { ROUTES } from '@/routes/paths'
import { clearSession, getToken } from './session'

// Lỗi khi gọi API: `message` lấy từ backend, `httpStatus` là mã HTTP (vd 503 = ESP8266 chưa kết nối).
export class ApiError extends Error {
  constructor(message, httpStatus) {
    super(message)
    this.httpStatus = httpStatus
  }
}

// Tạo query string, bỏ qua bộ lọc rỗng ('' / null / undefined) để nơi gọi truyền thẳng state của UI;
// mảng được nối bằng dấu phẩy.
function buildQueryString(params) {
  if (!params) {
    return ''
  }

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const isEmpty = value === undefined || value === null || value === ''
    if (isEmpty) {
      continue
    }
    if (Array.isArray(value)) {
      query.set(key, value.join(','))
    } else {
      query.set(key, value)
    }
  }

  const queryText = query.toString()
  if (queryText === '') {
    return ''
  }
  return `?${queryText}`
}

// Đọc nội dung JSON của response; response 204 hoặc không phải JSON thì trả về null.
async function readBody(response) {
  if (response.status === 204) {
    return null
  }
  try {
    return await response.json()
  } catch {
    return null
  }
}

// Lớp bọc fetch để các service không gọi fetch() trực tiếp. Backend luôn trả về { success, message, data };
// hàm này trả về `data`, lỗi thì ném ApiError kèm `message`. Tự gắn token đăng nhập vào header.
async function callApi(path, { params, headers, ...fetchOptions } = {}) {
  const token = getToken()

  const requestHeaders = { 'Content-Type': 'application/json' }
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${config.apiBaseUrl}${path}${buildQueryString(params)}`, {
    ...fetchOptions,
    headers: { ...requestHeaders, ...headers },
  })
  const body = await readBody(response)

  if (response.status === 401 && token) {
    // Token hết hạn hoặc bị thu hồi: xoá token và đưa người dùng về trang đăng nhập.
    clearSession()
    window.location.assign(ROUTES.LOGIN)
  }

  const backendReportedFailure = body !== null && body.success === false
  if (!response.ok || backendReportedFailure) {
    let message = `Request failed: ${response.status} ${response.statusText}`
    if (body !== null && body.message !== undefined && body.message !== null) {
      message = body.message
    }
    throw new ApiError(message, response.status)
  }

  // Response 2xx nhưng không phải JSON của backend (vd index.html của dev server khi proxy /api không chạy)
  // thì báo lỗi rõ ràng, thay vì trả về null mà nơi gọi không ngờ tới.
  if (response.status !== 204 && body === null) {
    throw new ApiError(`Unexpected response from ${path}: not JSON — is the backend reachable?`, response.status)
  }

  if (body === null || body.data === undefined) {
    return null
  }
  return body.data
}

// Các phương thức HTTP; nội dung của post/put được chuyển sang JSON.
export const apiClient = {
  get(path, params, options) {
    return callApi(path, { ...options, params, method: 'GET' })
  },
  post(path, body, options) {
    return callApi(path, { ...options, method: 'POST', body: JSON.stringify(body) })
  },
  put(path, body, options) {
    return callApi(path, { ...options, method: 'PUT', body: JSON.stringify(body) })
  },
  delete(path, options) {
    return callApi(path, { ...options, method: 'DELETE' })
  },
}

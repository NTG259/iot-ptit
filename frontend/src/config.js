// Nơi duy nhất đọc cấu hình môi trường (lúc build), để phần còn lại của app không đụng vào import.meta.env.
// Muốn đổi giá trị thì thêm biến có tiền tố VITE_ vào file .env.
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
}

import { useEffect, useState } from 'react'

/**
 * Gọi `loadData()` khi `dependencies` đổi (và lặp lại mỗi `intervalMs` nếu có), giữ kết quả thành công gần nhất để mỗi lần
 * tải lại giao diện không nhấp nháy về trạng thái đang tải.
 * `initialData` là giá trị của `data` trước khi tải xong, để code đọc `data.xxx` thẳng mà không cần kiểm tra undefined.
 * Trả về { data, error, loading, reload }; `reload()` tải lại ngay.
 */
export default function useApi(loadData, dependencies, { intervalMs, initialData } = {}) {
  const [state, setState] = useState({ data: initialData, error: null, loading: true })
  // Mỗi lần `reload()` tăng số này để effect bên dưới chạy lại.
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    // Khi effect bị dọn (dependencies đổi hoặc rời trang), bỏ qua kết quả của các lần gọi còn đang bay.
    let cancelled = false

    // Gọi API một lần: thành công thì thay `data`, lỗi thì giữ `data` cũ và chỉ cập nhật `error`.
    async function run() {
      try {
        const data = await loadData()
        if (cancelled) {
          return
        }
        setState({ data, error: null, loading: false })
      } catch (error) {
        if (cancelled) {
          return
        }
        setState((previous) => ({ data: previous.data, error, loading: false }))
      }
    }

    run()
    let timerId
    if (intervalMs) {
      timerId = setInterval(run, intervalMs)
    }
    return () => {
      cancelled = true
      clearInterval(timerId)
    }
    // `loadData` là hàm mới ở mỗi lần vẽ nên không đưa vào mảng phụ thuộc; `dependencies` liệt kê những gì nó thực sự đọc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, reloadCount, intervalMs])

  function reload() {
    setReloadCount((count) => count + 1)
  }

  return { data: state.data, error: state.error, loading: state.loading, reload }
}

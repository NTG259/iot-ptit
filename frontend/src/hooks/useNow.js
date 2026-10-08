import { useEffect, useState } from 'react'

// Thời gian hiện tại, tự cập nhật mỗi `intervalMs` mili giây để đồng hồ chạy liên tục.
export default function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timerId = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timerId)
  }, [intervalMs])

  return now
}

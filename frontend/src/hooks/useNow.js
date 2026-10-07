import { useEffect, useState } from 'react'

// Thời gian hiện tại, tự cập nhật mỗi `chuKyMs` mili giây để đồng hồ chạy liên tục.
export default function useBayGio(chuKyMs = 1000) {
  const [bayGio, datBayGio] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => datBayGio(new Date()), chuKyMs)
    return () => clearInterval(id)
  }, [chuKyMs])

  return bayGio
}

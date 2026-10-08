import useNow from '@/hooks/useNow'
import { formatDateTime } from '@/utils/format'
import './GreetingHeader.css'

/** GreetingHeader: lời chào kèm tên người dùng ở bên trái, ngày giờ hiện tại (giờ Việt Nam, chạy từng giây) ở bên phải. */
export default function GreetingHeader({ name }) {
  const now = useNow()

  return (
    <header className="greeting-header">
      <h1 className="greeting-header__title">Hello, {name}</h1>
      <div className="panel greeting-header__clock">{formatDateTime(now)}</div>
    </header>
  )
}

import useBayGio from '@/hooks/useNow'
import { dinhDangNgayGio } from '@/utils/format'

/** GreetingHeader: lời chào kèm tên người dùng ở bên trái, ngày giờ hiện tại (giờ Việt Nam, chạy từng giây) ở bên phải. */
export default function GreetingHeader({ name }) {
  const bayGio = useBayGio()

  return (
    <header className="shrink-0 flex items-center gap-4">
      <h1 className="m-0 text-2xl font-semibold text-text">Hello, {name}</h1>
      <div className="panel ml-auto px-4 py-1.5 tabular-nums whitespace-nowrap">{dinhDangNgayGio(bayGio)}</div>
    </header>
  )
}

import './Badge.css'

/**
 * Badge: nhãn bo tròn hiển thị trạng thái hoặc loại, có thể kèm chấm màu phía trước (`dot`).
 * `tone` chọn màu: green, blue, red, gray, cyan hoặc orange (xem Badge.css).
 */
export default function Badge({ tone = 'gray', dot = false, children }) {
  return (
    <span className={`badge badge--${tone}`}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  )
}

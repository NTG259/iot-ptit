import { useEffect, useState } from 'react'

/**
 * Gọi `taiDuLieu()` khi `phuThuoc` đổi (và lặp lại mỗi `chuKyMs` nếu có), giữ kết quả thành công gần nhất để mỗi lần
 * tải lại giao diện không nhấp nháy về trạng thái đang tải.
 * `giaTriDau` là giá trị của `duLieu` trước khi tải xong, để code đọc `duLieu.xxx` thẳng mà không cần kiểm tra undefined.
 * Trả về { duLieu, loi, dangTai, taiLai }; `taiLai()` tải lại ngay.
 */
export default function useGoiApi(taiDuLieu, phuThuoc, { chuKyMs, giaTriDau } = {}) {
  const [trangThai, datTrangThai] = useState({ duLieu: giaTriDau, loi: null, dangTai: true })
  // Mỗi lần `taiLai()` đổi số này để effect bên dưới chạy lại.
  const [lanTaiLai, datLanTaiLai] = useState(0)

  useEffect(() => {
    // Khi effect bị dọn (phuThuoc đổi hoặc rời trang), bỏ qua kết quả của các lần gọi còn đang bay.
    let daHuy = false

    // Gọi API một lần: thành công thì thay `duLieu`, lỗi thì giữ `duLieu` cũ và chỉ cập nhật `loi`.
    const chay = () =>
      taiDuLieu().then(
        (duLieu) => !daHuy && datTrangThai({ duLieu, loi: null, dangTai: false }),
        (loi) => !daHuy && datTrangThai((truoc) => ({ ...truoc, loi, dangTai: false })),
      )

    chay()
    const id = chuKyMs ? setInterval(chay, chuKyMs) : undefined
    return () => {
      daHuy = true
      clearInterval(id)
    }
    // `taiDuLieu` là hàm mới ở mỗi lần vẽ nên không đưa vào mảng phụ thuộc; `phuThuoc` liệt kê những gì nó thực sự đọc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...phuThuoc, lanTaiLai, chuKyMs])

  return { ...trangThai, taiLai: () => datLanTaiLai((so) => so + 1) }
}

# Quy tắc code

Dự án này nhỏ và cố định: **3 cảm biến** (nhiệt độ `temp`, độ ẩm `humi`, ánh sáng `light`) và **3 LED**.
Mục tiêu duy nhất của code là **nhìn vào hiểu ngay, sửa được ngay**. Không viết code cho trường hợp "sau này có thể mở rộng".

## 1. Viết cố định, không viết tổng quát

- Có 3 cảm biến thì viết 3 chỗ rõ ràng, không lặp qua mảng cấu hình hay tra theo mã.
- Không dùng hàm bậc cao, bảng cấu hình sinh ra giao diện, hay `Object.fromEntries`, `reduce`, `Array.from` cho dữ liệu cố định.
- Chọn giá trị bằng `if / else`; không lồng nhiều `? :` hoặc `&&` / `??` trong một biểu thức.
- Số lượng cố định thì viết thẳng số đó (`types.length === 3`), không tính lại từ danh sách.

```jsx
// Đúng
<MetricCard config={TEMP} sensor={temp} />
<MetricCard config={HUMI} sensor={humi} />
<MetricCard config={LIGHT} sensor={light} />

// Sai
{SENSORS.map((s) => <MetricCard key={s.id} config={s} sensor={sensorByCode[s.code]} />)}
```

```js
// Đúng
let action
let state
if (on) {
  action = 'TURN_ON'
  state = 'ON'
} else {
  action = 'TURN_OFF'
  state = 'OFF'
}

// Sai
const action = on ? 'TURN_ON' : 'TURN_OFF'
```

Chỉ lặp qua mảng khi **số phần tử do backend quyết định** (ví dụ danh sách LED, các dòng của bảng).

## 2. Logic nằm ở backend, frontend chỉ hiển thị

- Mọi tính toán nghiệp vụ làm ở backend: trạng thái so với ngưỡng (`readingStatus`), trạng thái công tắc nên hiện (`on`), đổi giờ sang giờ Việt Nam (`times`).
- Frontend không tự tính lại những thứ backend đã có.
- Backend trả dữ liệu **đúng hình dạng giao diện cần**, để frontend đọc thẳng.

## 3. Mỗi loại dữ liệu một endpoint, không gộp

- Mỗi loại cảm biến có endpoint riêng, mỗi endpoint trả một thứ:

| Endpoint | Trả về |
|---|---|
| `GET /sensors/temp` (`humi`, `light`) | thông tin hiện tại: `lastValue`, `status`, `minValue`, `maxValue`, `readingStatus` |
| `GET /sensors/temp/latest?limit=25` (`humi`, `light`) | `{ values: [...], times: [...] }`, số đo cũ nhất ở đầu |

- Không gộp nhiều loại dữ liệu vào một response lồng nhau.
- Mảng 25 số đo mới nhất là đủ cho biểu đồ, không cần quan tâm đo cách đây bao lâu.

## 4. Đọc dữ liệu ở frontend như đọc JSON

- Biến phải đọc thẳng được: `temp.lastValue`, `tempChart.data.times`, `led.on`.
- Cho mọi dữ liệu một giá trị mặc định ngay từ đầu bằng `initial` của `useApi`, để không phải viết `data?.xxx` hay `data ?? []`.

```js
const tempInfo = useApi(() => sensorService.getTemp(), [], { intervalMs: 2000, initial: EMPTY_SENSOR })
const temp = tempInfo.data
// dùng: temp.lastValue, temp.minValue, temp.readingStatus
```

- Chỉ dùng `?.` / `??` khi giá trị **thật sự có thể rỗng** (ví dụ email chưa nhập).
- Dữ liệu mặc định (`EMPTY_SENSOR`, `EMPTY_CHART`, `EMPTY_PAGE`) phải cùng hình dạng với dữ liệu backend trả về.

## 5. Truyền thẳng vào hàm, ít biến trung gian

- Giá trị dùng **một lần** thì truyền thẳng vào chỗ cần, không gán ra biến.
- Chỉ tạo biến khi giá trị được dùng **từ hai lần trở lên** (ví dụ `times`, `leds`).
- Gọi hàm cứ truyền giá trị trực tiếp theo thứ tự, như `("hello", 1, 2)`. Không cần đặt tên từng giá trị thành biến riêng, cũng không cần gói chúng vào một object chỉ để truyền đi.

```js
// Đúng
sendCommand('LED1', true, 'TURN_ON')
formatReading(temp.lastValue, TEMP)

// Sai: tách biến chỉ để truyền một lần
const code = 'LED1'
const on = true
const action = 'TURN_ON'
sendCommand(code, on, action)
```

## 6. Giao diện LED: phản hồi ngay, báo lỗi khi thất bại

- Bấm công tắc thì **đổi sang trạng thái mới ngay** (xanh = bật, xám = tắt), không hiện loading.
- Lệnh bị từ chối (503, ESP8266 offline, broker lỗi) hoặc ESP8266 không xác nhận trong 10 giây thì **hiện thông báo lỗi** và công tắc **về lại trạng thái cũ**.

## 7. Dashboard không được cuộn

- Trang luôn vừa khít màn hình; chỉ biểu đồ giãn ra chiếm phần chiều cao còn lại.
- Thêm phần tử mới vào Dashboard thì kiểm tra lại chiều cao tối thiểu trước khi xong.

## 8. Chu kỳ tải lại viết thẳng

- Viết số mili giây ngay tại nơi gọi, không tạo hằng số riêng:
  - cảm biến và biểu đồ: `2000` (đúng nhịp ESP8266 gửi dữ liệu)
  - LED: `1000`
  - bảng lịch sử (History): `3000`

## 9. Comment

- Viết **tiếng Việt**, cho từng khối lệnh: nói **làm gì và vì sao**, không lặp lại code.
- Mỗi hàm, component và hằng số quan trọng có một comment ngắn ở trên.
- Comment phải đúng với code; sửa code thì sửa comment cùng lúc.

## 10. Trước khi coi là xong

- Frontend: `npx eslint src` và `npx vite build` đều phải pass.
- Backend: `./mvnw -q compile` phải pass.
- Sửa endpoint thì nhớ **khởi động lại backend**; frontend chạy với backend cũ sẽ báo "Not found".

## 11. Đặt tên (frontend/src)

- **Biến, hàm, hằng số, state, tham số của hàm** đặt bằng tiếng Việt không dấu: `camelCase` cho biến và hàm (`batTatDen`, `cacDen`), `UPPER_SNAKE` cho hằng số (`BIEU_DO_TRONG`, `DUONG_DAN`). State dùng cặp `ten` / `datTen` (ví dụ `trang` / `datTrang`).
- Hook vẫn phải bắt đầu bằng `use` (`useGoiApi`, `useBayGio`, `useKichThuoc`). Hook `useGoiApi` trả về `{ duLieu, loi, dangTai, taiLai }`.
- Service gọi theo namespace: `dichVuCamBien.layNhietDo()`, `dichVuThietBi.dieuKhien(...)`, `phien.layToken()`.
- **Giữ nguyên tiếng Anh** những thứ không thuộc về mình: tên component và file (`Dashboard`, `MetricCard`), props truyền giữa các component (`sensor`, `config`, `onToggle`), API của thư viện (`useState`, props của antd), tên trường backend trả về (`lastValue`, `minValue`, `items`, `totalItems`), tên tham số query gửi lên backend (`search`, `types`, `page`, `size`, `newestFirst`) và các giá trị enum của backend (`'LIGHT'`, `'TURN_ON'`, `'ACTIVE'`).
- Khoá của các object cấu hình dùng chung (`unit`, `decimals`, `color`, `tone`, `scale`) cũng giữ tiếng Anh.
- **Cẩn thận khi tìm và thay hàng loạt:** đã từng đổi nhầm `'LIGHT'` thành `'ANH_SANG'` trong giá trị gửi lên backend làm hỏng bộ lọc. Đổi tên xong phải chạy `eslint`, build và thử các trang trên trình duyệt.

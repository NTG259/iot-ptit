import { useState } from 'react'
import { Alert, Button, Form, Input, Modal } from 'antd'
import { LuCopy, LuCheck, LuGithub, LuFigma, LuPencil } from 'react-icons/lu'
import AppShell from '@/components/layout/AppShell'
import { phien, dichVuNguoiDung } from '@/services'
import useGoiApi from '@/hooks/useApi'
import { layChuCaiDau } from '@/utils/user'

/**
 * CopyField: một dòng thông tin (nhãn + giá trị) kèm nút sao chép vào clipboard.
 * Sao chép xong icon đổi thành dấu tick trong 1.5s; nếu trình duyệt chặn clipboard thì bỏ qua,
 * người dùng vẫn có thể bôi đen để copy.
 */
function CopyField({ label, value, valueClass = 'text-text' }) {
  const [daSaoChep, datDaSaoChep] = useState(false)

  const saoChep = () =>
    navigator.clipboard.writeText(value).then(
      () => {
        datDaSaoChep(true)
        setTimeout(() => datDaSaoChep(false), 1500)
      },
      () => {},
    )

  return (
    <div className="flex items-center gap-5 px-4 py-3 border border-outline rounded-xl bg-canvas/60">
      <div className="min-w-0">
        <p className="m-0 tabular-nums text-sm tracking-[0.12em] uppercase text-slate-400">{label}</p>
        <p className={`m-0 mt-1 truncate text-base ${valueClass}`}>{value}</p>
      </div>
      <Button
        type="text"
        onClick={saoChep}
        aria-label={`Copy ${label}`}
        icon={daSaoChep ? <LuCheck className="w-5 h-5" /> : <LuCopy className="w-5 h-5" />}
        className={`ml-auto ${daSaoChep ? '!text-primary' : '!text-slate-400'}`}
      />
    </div>
  )
}

// Bỏ khoảng trắng hai đầu; ô để trống thì thành null.
const lamSach = (chuoi) => chuoi?.trim() || null

/**
 * EditProfileModal: hộp thoại sửa hồ sơ gồm 7 trường (username không sửa được).
 * Khi mở, form được điền sẵn thông tin hiện tại. API là PUT thay toàn bộ hồ sơ nên luôn gửi đủ mọi trường,
 * trường để trống gửi null.
 */
function EditProfileModal({ user, open, onClose, onSaved }) {
  const [bieuMau] = Form.useForm()
  const [dangLuu, datDangLuu] = useState(false)
  const [thongBaoLoi, datThongBaoLoi] = useState(null)

  // Gửi hồ sơ lên backend; `giaTri` là các ô của form do antd gom lại, ô trống được làm sạch thành null.
  async function luu(giaTri) {
    datDangLuu(true)
    datThongBaoLoi(null)
    try {
      onSaved(
        await dichVuNguoiDung.luuHoSo({
          fullName: lamSach(giaTri.fullName),
          studentId: lamSach(giaTri.studentId),
          email: lamSach(giaTri.email),
          role: lamSach(giaTri.role),
          school: lamSach(giaTri.school),
          githubUrl: lamSach(giaTri.githubUrl),
          figmaUrl: lamSach(giaTri.figmaUrl),
        }),
      )
    } catch (loiGoi) {
      datThongBaoLoi(loiGoi.message)
    } finally {
      datDangLuu(false)
    }
  }

  return (
    <Modal
      title="Edit profile"
      open={open}
      onCancel={onClose}
      onOk={bieuMau.submit}
      okText="Save"
      confirmLoading={dangLuu}
      destroyOnHidden
      afterOpenChange={(hienThi) => hienThi && bieuMau.setFieldsValue(user)}
    >
      <Form form={bieuMau} layout="vertical" onFinish={luu} requiredMark={false} className="mt-4">
        <Form.Item
          name="fullName"
          label="Full name"
          rules={[{ required: true, whitespace: true, message: 'Full name is required.' }]}
          className="mb-3"
        >
          <Input />
        </Form.Item>
        <Form.Item name="studentId" label="Mã sinh viên" className="mb-3">
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Enter a valid email.' }]} className="mb-3">
          <Input />
        </Form.Item>
        <Form.Item name="role" label="Role" className="mb-3">
          <Input />
        </Form.Item>
        <Form.Item name="school" label="School" className="mb-3">
          <Input />
        </Form.Item>
        <Form.Item
          name="githubUrl"
          label="GitHub URL"
          rules={[{ type: 'url', message: 'Enter a full URL (https://…).' }]}
          className="mb-3"
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="figmaUrl"
          label="Figma URL"
          rules={[{ type: 'url', message: 'Enter a full URL (https://…).' }]}
          className="mb-3"
        >
          <Input />
        </Form.Item>
      </Form>
      {thongBaoLoi && <Alert type="error" showIcon title={thongBaoLoi} />}
    </Modal>
  )
}

const CLASS_LIEN_KET =
  'flex items-center justify-center gap-2 h-11 rounded-lg border border-outline bg-canvas/60 text-base font-medium text-text no-underline hover:bg-white'

/**
 * Profile: trang hồ sơ người dùng. Hiện ngay thông tin đã lưu trong phiên rồi làm mới từ API.
 * Gồm avatar chữ cái đầu, vai trò, trường, mã sinh viên / email có nút copy, link GitHub / Figma
 * và nút mở EditProfileModal; lưu xong thì tải lại hồ sơ.
 */
export default function Profile() {
  // Hiện ngay thông tin đã lưu trong phiên (nếu chưa có thì là {}), rồi thay bằng dữ liệu mới từ API.
  const hoSo = useGoiApi(() => dichVuNguoiDung.layHoSo(), [], { giaTriDau: phien.layNguoiDung() ?? {} })
  const nguoiDung = hoSo.duLieu
  const [dangSua, datDangSua] = useState(false)

  return (
    <AppShell breadcrumb="User Profile">
      <div className="flex-1 grid place-items-center">
        <section className="panel relative w-full max-w-[38rem] px-8 py-6 shadow-lg">
          <Button icon={<LuPencil className="w-4 h-4" />} onClick={() => datDangSua(true)} className="!absolute top-5 right-5">
            Edit profile
          </Button>
          <div className="flex flex-col items-center text-center">
            <div className="relative grid place-items-center w-20 h-20 rounded-full bg-primary-soft border-2 border-primary-line text-3xl font-semibold text-primary">
              {layChuCaiDau(nguoiDung.fullName)}
            </div>
            <h1 className="m-0 mt-4 text-2xl font-semibold tracking-[-0.02em] text-text">{nguoiDung.fullName}</h1>
            <p className="m-0 mt-2 text-lg text-slate-600">{nguoiDung.role}</p>
            <p className="m-0 mt-2 flex items-center gap-2 text-muted">
              {nguoiDung.school}
            </p>
          </div>

          <div className="my-5 border-t border-outline" />

          <div className="flex flex-col gap-4">
            <CopyField label="Mã sinh viên" value={nguoiDung.studentId ?? '—'} valueClass="tabular-nums font-semibold text-primary" />
            <CopyField label="Email" value={nguoiDung.email ?? '—'} />
          </div>

          {(nguoiDung.githubUrl || nguoiDung.figmaUrl) && (
            <div className="mt-5 grid grid-cols-2 gap-4">
              {nguoiDung.githubUrl && (
                <a href={nguoiDung.githubUrl} target="_blank" rel="noreferrer" className={CLASS_LIEN_KET}>
                  <LuGithub className="w-5 h-5" />
                  GitHub
                </a>
              )}
              {nguoiDung.figmaUrl && (
                <a href={nguoiDung.figmaUrl} target="_blank" rel="noreferrer" className={CLASS_LIEN_KET}>
                  <LuFigma className="w-5 h-5" />
                  Figma
                </a>
              )}
            </div>
          )}

          {hoSo.loi && <p className="m-0 mt-4 text-sm text-red">Could not refresh profile: {hoSo.loi.message}</p>}
        </section>

        <EditProfileModal
          user={nguoiDung}
          open={dangSua}
          onClose={() => datDangSua(false)}
          onSaved={() => {
            datDangSua(false)
            hoSo.taiLai()
          }}
        />
      </div>
    </AppShell>
  )
}

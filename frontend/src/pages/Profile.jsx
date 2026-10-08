import { useState } from 'react'
import { Alert, Button, Form, Input, Modal } from 'antd'
import { LuCopy, LuCheck, LuGithub, LuFigma, LuPencil } from 'react-icons/lu'
import AppShell from '@/components/layout/AppShell'
import { session, userService } from '@/services'
import useApi from '@/hooks/useApi'
import { getInitials } from '@/utils/user'
import './Profile.css'

/**
 * CopyField: một dòng thông tin (nhãn + giá trị) kèm nút sao chép vào clipboard.
 * Sao chép xong icon đổi thành dấu tick trong 1.5s; nếu trình duyệt chặn clipboard thì bỏ qua,
 * người dùng vẫn có thể bôi đen để copy.
 */
function CopyField({ label, value, highlight = false }) {
  const [copied, setCopied] = useState(false)

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Trình duyệt chặn clipboard: bỏ qua.
    }
  }

  let icon = <LuCopy size="1.25rem" />
  let buttonClass = 'copy-field__button copy-field__button--idle'
  if (copied) {
    icon = <LuCheck size="1.25rem" />
    buttonClass = 'copy-field__button copy-field__button--copied'
  }

  let valueClass = 'copy-field__value'
  if (highlight) {
    valueClass = 'copy-field__value copy-field__value--highlight'
  }

  return (
    <div className="copy-field">
      <div className="copy-field__text">
        <p className="copy-field__label">{label}</p>
        <p className={valueClass}>{value}</p>
      </div>
      <Button type="text" onClick={copyToClipboard} aria-label={`Copy ${label}`} icon={icon} className={buttonClass} />
    </div>
  )
}

// Bỏ khoảng trắng hai đầu; ô để trống thì thành null.
function cleanText(text) {
  if (!text) {
    return null
  }
  const trimmed = text.trim()
  if (trimmed === '') {
    return null
  }
  return trimmed
}

/**
 * EditProfileModal: hộp thoại sửa hồ sơ gồm 7 trường (username không sửa được).
 * Khi mở, form được điền sẵn thông tin hiện tại. API là PUT thay toàn bộ hồ sơ nên luôn gửi đủ mọi trường,
 * trường để trống gửi null.
 */
function EditProfileModal({ user, open, onClose, onSaved }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  // Gửi hồ sơ lên backend; `values` là các ô của form do antd gom lại, ô trống được làm sạch thành null.
  async function handleSave(values) {
    setSaving(true)
    setErrorMessage(null)
    try {
      const savedUser = await userService.saveProfile({
        fullName: cleanText(values.fullName),
        studentId: cleanText(values.studentId),
        email: cleanText(values.email),
        role: cleanText(values.role),
        school: cleanText(values.school),
        githubUrl: cleanText(values.githubUrl),
        figmaUrl: cleanText(values.figmaUrl),
      })
      onSaved(savedUser)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  // Mỗi lần hộp thoại mở xong thì điền sẵn thông tin hiện tại vào form.
  function handleOpenChange(isOpen) {
    if (isOpen) {
      form.setFieldsValue(user)
    }
  }

  return (
    <Modal
      title="Edit profile"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Save"
      confirmLoading={saving}
      destroyOnHidden
      afterOpenChange={handleOpenChange}
    >
      <Form form={form} layout="vertical" onFinish={handleSave} requiredMark={false} className="edit-profile__form">
        <Form.Item
          name="fullName"
          label="Full name"
          rules={[{ required: true, whitespace: true, message: 'Full name is required.' }]}
          className="edit-profile__field"
        >
          <Input />
        </Form.Item>
        <Form.Item name="studentId" label="Mã sinh viên" className="edit-profile__field">
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Enter a valid email.' }]} className="edit-profile__field">
          <Input />
        </Form.Item>
        <Form.Item name="role" label="Role" className="edit-profile__field">
          <Input />
        </Form.Item>
        <Form.Item name="school" label="School" className="edit-profile__field">
          <Input />
        </Form.Item>
        <Form.Item
          name="githubUrl"
          label="GitHub URL"
          rules={[{ type: 'url', message: 'Enter a full URL (https://…).' }]}
          className="edit-profile__field"
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="figmaUrl"
          label="Figma URL"
          rules={[{ type: 'url', message: 'Enter a full URL (https://…).' }]}
          className="edit-profile__field"
        >
          <Input />
        </Form.Item>
      </Form>
      {errorMessage && <Alert type="error" showIcon title={errorMessage} />}
    </Modal>
  )
}

/**
 * Profile: trang hồ sơ người dùng. Hiện ngay thông tin đã lưu trong phiên rồi làm mới từ API.
 * Gồm avatar chữ cái đầu, vai trò, trường, mã sinh viên / email có nút copy, link GitHub / Figma
 * và nút mở EditProfileModal; lưu xong thì tải lại hồ sơ.
 */
export default function Profile() {
  // Hiện ngay thông tin đã lưu trong phiên (nếu chưa có thì là {}), rồi thay bằng dữ liệu mới từ API.
  const savedUser = session.getUser()
  const initialUser = savedUser ?? {}
  const profileRequest = useApi(() => userService.getProfile(), [], { initialData: initialUser })
  const user = profileRequest.data
  const [editing, setEditing] = useState(false)

  function handleSaved() {
    setEditing(false)
    profileRequest.reload()
  }

  return (
    <AppShell breadcrumb="User Profile">
      <div className="profile">
        <section className="panel profile__card">
          <Button icon={<LuPencil size="1rem" />} onClick={() => setEditing(true)} className="profile__edit-button">
            Edit profile
          </Button>
          <div className="profile__header">
            <div className="profile__avatar">
              {getInitials(user.fullName)}
            </div>
            <h1 className="profile__name">{user.fullName}</h1>
            <p className="profile__role">{user.role}</p>
            <p className="profile__school">{user.school}</p>
          </div>

          <div className="profile__divider" />

          <div className="profile__fields">
            <CopyField label="Mã sinh viên" value={user.studentId ?? '—'} highlight />
            <CopyField label="Email" value={user.email ?? '—'} />
          </div>

          {(user.githubUrl || user.figmaUrl) && (
            <div className="profile__links">
              {user.githubUrl && (
                <a href={user.githubUrl} target="_blank" rel="noreferrer" className="profile__link">
                  <LuGithub size="1.25rem" />
                  GitHub
                </a>
              )}
              {user.figmaUrl && (
                <a href={user.figmaUrl} target="_blank" rel="noreferrer" className="profile__link">
                  <LuFigma size="1.25rem" />
                  Figma
                </a>
              )}
            </div>
          )}

          {profileRequest.error && <p className="profile__refresh-error">Could not refresh profile: {profileRequest.error.message}</p>}
        </section>

        <EditProfileModal user={user} open={editing} onClose={() => setEditing(false)} onSaved={handleSaved} />
      </div>
    </AppShell>
  )
}

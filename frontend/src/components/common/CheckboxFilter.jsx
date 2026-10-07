import { Button, Checkbox, ConfigProvider, Dropdown } from 'antd'
import { LuChevronDown } from 'react-icons/lu'

const CLASS_DONG = 'w-full m-0 px-2 py-2 rounded-md text-[0.9375rem] hover:bg-canvas'
const CHU_DE = { token: { controlInteractiveSize: 20 } }

/**
 * CheckboxFilter: bộ lọc trên thanh công cụ. Nút có nhãn cố định (`label`, để thanh công cụ không bị xê dịch) mở ra
 * một khung gồm tiêu đề (`header`, vd "Filter by type") cùng link "Select All", rồi danh sách checkbox.
 * - `options`: [{ value, label }]. `value` là mảng giá trị đang được tick.
 * - Tick một ô thì thêm giá trị đó vào mảng, bỏ tick thì bỏ nó ra; "Select All" tick tất cả.
 * - Ô tick được phóng to lên 20px (CHU_DE) cho giống thiết kế.
 */
export default function CheckboxFilter({ label, header, options, value, onChange }) {
  return (
    <Dropdown
      trigger={['click']}
      popupRender={() => (
        <div className="min-w-[16rem] px-3 py-3 flex flex-col bg-white border border-outline rounded-xl shadow-lg">
          <div className="flex items-center justify-between gap-4 px-2 pb-3 mb-2 border-b border-outline">
            <span className="font-mono text-xs tracking-[0.12em] uppercase text-muted">{header}</span>
            <Button type="link" size="small" onClick={() => onChange(options.map((luaChon) => luaChon.value))} className="!p-0 !font-mono !font-semibold !text-primary">
              Select All
            </Button>
          </div>
          <ConfigProvider theme={CHU_DE}>
            {options.map((luaChon) => (
              <Checkbox
                key={luaChon.value}
                checked={value.includes(luaChon.value)}
                onChange={(e) => onChange(e.target.checked ? [...value, luaChon.value] : value.filter((giaTri) => giaTri !== luaChon.value))}
                className={CLASS_DONG}
              >
                {luaChon.label}
              </Checkbox>
            ))}
          </ConfigProvider>
        </div>
      )}
    >
      <Button>
        {label}
        <LuChevronDown className="w-4 h-4 text-muted" />
      </Button>
    </Dropdown>
  )
}

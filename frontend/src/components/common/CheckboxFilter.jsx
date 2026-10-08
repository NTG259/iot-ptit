import { Button, Checkbox, ConfigProvider, Dropdown } from 'antd'
import { LuChevronDown } from 'react-icons/lu'
import './CheckboxFilter.css'

const CHECKBOX_THEME = { token: { controlInteractiveSize: 20 } }

/**
 * CheckboxFilter: bộ lọc trên thanh công cụ. Nút có nhãn cố định (`label`, để thanh công cụ không bị xê dịch) mở ra
 * một khung gồm link "Select All", rồi danh sách checkbox.
 * - `options`: [{ value, label }]. `value` là mảng giá trị đang được tick.
 * - Tick một ô thì thêm giá trị đó vào mảng, bỏ tick thì bỏ nó ra; "Select All" tick tất cả.
 * - Ô tick được phóng to lên 20px (CHECKBOX_THEME) cho giống thiết kế.
 */
export default function CheckboxFilter({ label, options, value, onChange }) {
  function selectAll() {
    onChange(options.map((option) => option.value))
  }

  function toggleOption(optionValue, checked) {
    if (checked) {
      onChange([...value, optionValue])
    } else {
      onChange(value.filter((selectedValue) => selectedValue !== optionValue))
    }
  }

  return (
    <Dropdown
      trigger={['click']}
      popupRender={() => (
        <div className="checkbox-filter__popup">
          <div className="checkbox-filter__header">
            <Button type="link" size="small" onClick={selectAll} className="checkbox-filter__select-all">
              Select All
            </Button>
          </div>
          <ConfigProvider theme={CHECKBOX_THEME}>
            {options.map((option) => (
              <Checkbox
                key={option.value}
                checked={value.includes(option.value)}
                onChange={(event) => toggleOption(option.value, event.target.checked)}
                className="checkbox-filter__option"
              >
                {option.label}
              </Checkbox>
            ))}
          </ConfigProvider>
        </div>
      )}
    >
      <Button>
        {label}
        <LuChevronDown size="1rem" className="checkbox-filter__chevron" />
      </Button>
    </Dropdown>
  )
}

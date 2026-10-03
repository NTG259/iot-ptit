import { Button, Checkbox, ConfigProvider, Dropdown } from 'antd'
import { LuChevronDown } from 'react-icons/lu'

const ROW_CLASS = 'w-full m-0 px-2 py-2 rounded-md text-[0.9375rem] hover:bg-canvas'
// Larger tick boxes than antd's default 16px, as in the design.
const THEME = { token: { controlInteractiveSize: 20 } }

/**
 * Toolbar filter: a button with a fixed `label` (so the toolbar never shifts) that opens a list of
 * tick boxes under a "Select All" link. `value` is the array of ticked option values.
 */
export default function CheckboxFilter({ label, options, value, onChange }) {
  return (
    <Dropdown
      trigger={['click']}
      popupRender={() => (
        <div className="min-w-[12rem] px-3 py-3 flex flex-col bg-white border border-outline rounded-xl shadow-lg">
          <div className="flex px-2 pb-3 mb-2 border-b border-outline">
            <button
              type="button"
              onClick={() => onChange(options.map((o) => o.value))}
              className="tabular-nums text-sm font-semibold text-primary cursor-pointer hover:opacity-80"
            >
              Select All
            </button>
          </div>
          <ConfigProvider theme={THEME}>
            {options.map((o) => (
              <Checkbox
                key={o.value}
                checked={value.includes(o.value)}
                // Keep the options' order, whatever order they were ticked in.
                onChange={(e) =>
                  onChange(options.map((x) => x.value).filter((v) => (v === o.value ? e.target.checked : value.includes(v))))
                }
                className={ROW_CLASS}
              >
                {o.label}
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

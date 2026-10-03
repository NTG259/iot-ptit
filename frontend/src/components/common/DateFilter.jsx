import { useState } from 'react'
import { Button, DatePicker } from 'antd'
import { LuCalendar } from 'react-icons/lu'

/** The picked calendar day in Vietnam time (UTC+7), matching the tables: { from, to } ISO strings, or nulls. */
// eslint-disable-next-line react-refresh/only-export-components
export function dayRange(day) {
  if (!day) return { from: null, to: null }
  const date = day.format('YYYY-MM-DD')
  return { from: `${date}T00:00:00+07:00`, to: `${date}T23:59:59.999+07:00` }
}

/**
 * Toolbar button that opens a calendar to pick one day (a dayjs value, or null for any day).
 * The picker's own input sits invisibly under the button to anchor the popup.
 */
export default function DateFilter({ value, onChange }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button onClick={() => setOpen(true)} className={`min-w-[9.5rem] justify-between ${value ? '!border-primary !text-primary' : ''}`}>
        {value ? value.format('YYYY-MM-DD') : 'Date'}
        <LuCalendar className="w-4 h-4 text-muted" />
      </Button>
      <DatePicker
        open={open}
        onOpenChange={setOpen}
        value={value}
        onChange={onChange}
        showNow={false}
        placement="bottomRight"
        renderExtraFooter={() => (
          <Button
            type="link"
            size="small"
            disabled={!value}
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
          >
            Clear
          </Button>
        )}
        className="!absolute inset-0 opacity-0 pointer-events-none"
      />
    </div>
  )
}

export default function Switch({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`inline-flex items-center w-[3.625rem] h-8 p-1 border rounded-full cursor-pointer transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? 'bg-primary border-primary' : 'bg-canvas border-outline'
      }`}
    >
      <span
        className={`w-6 h-6 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.25)] transition-transform duration-200 ${
          checked ? 'translate-x-[calc(1.625rem-2px)]' : ''
        }`}
      />
    </button>
  )
}

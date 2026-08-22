export default function Switch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`inline-flex items-center w-[50px] h-[26px] p-[3px] rounded-full cursor-pointer transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? 'bg-green' : 'bg-[#c4c4c4]'
      }`}
    >
      <span
        className={`w-5 h-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
          checked ? 'translate-x-6' : ''
        }`}
      />
    </button>
  )
}

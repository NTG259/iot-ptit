const VARIANT_CLASSES = {
  primary: 'bg-primary text-white hover:opacity-90',
}

export default function Button({ variant = 'primary', loading = false, disabled, className = '', children, ...props }) {
  return (
    <button
      className={`w-full border-0 rounded-lg px-5 py-[13px] text-[15px] font-bold font-[inherit] cursor-pointer transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-70 ${VARIANT_CLASSES[variant]} ${className}`.trim()}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? 'Loading…' : children}
    </button>
  )
}

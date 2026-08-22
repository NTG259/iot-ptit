export default function Input({ label, id, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={id} className="text-[13px] font-semibold text-text/70">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`border rounded-lg px-3.5 py-3 text-sm font-[inherit] text-text bg-[#fcfdfd] focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/15 ${
          error ? 'border-red' : 'border-[#d5d5d5]'
        } ${className}`.trim()}
        {...props}
      />
      {error && <p className="m-0 text-xs text-red">{error}</p>}
    </div>
  )
}

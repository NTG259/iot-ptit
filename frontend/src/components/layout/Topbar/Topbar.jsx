import menuIcon from '@/assets/icons/menu.svg'

export default function Topbar({ userName, dateTime, onToggleSidebar }) {
  return (
    <header className="h-[72px] bg-white border-b border-outline flex items-center gap-4 px-8">
      <button
        type="button"
        className="border-0 bg-transparent p-1 cursor-pointer opacity-90"
        aria-label="Toggle sidebar"
        onClick={onToggleSidebar}
      >
        <img src={menuIcon} alt="" className="w-[22px] h-[22px]" />
      </button>

      <p className="m-0 text-2xl font-extrabold text-text">
        <span className="text-primary">Good day </span>
        {userName}
      </p>

      <p className="ml-auto text-[25px] font-extrabold text-primary whitespace-nowrap">{dateTime}</p>
    </header>
  )
}

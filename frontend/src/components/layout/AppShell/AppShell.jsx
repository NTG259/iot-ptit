import Sidebar from '../Sidebar/Sidebar'
import Topbar from '../Topbar/Topbar'

const CURRENT_USER_NAME = 'Nguyen Truong Giang'
const CURRENT_DATE_TIME = '8:47  17-08-2026'

export default function AppShell({ title, children }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar userName={CURRENT_USER_NAME} dateTime={CURRENT_DATE_TIME} />

        <div className="pt-8 px-10 pb-12 flex flex-col gap-6">
          <h1 className="m-0 text-[32px] font-bold tracking-[-0.11px] text-text">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}

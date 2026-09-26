import Sidebar from '../Sidebar/Sidebar'

export default function AppShell({ breadcrumb, title, subtitle, children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar />

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {breadcrumb && (
          <div className="h-12 shrink-0 bg-white border-b border-outline flex items-center px-8 tabular-nums text-sm tracking-[0.1em]">
            <span className="font-semibold text-primary">SYSTEM</span>
            <span className="mx-3 text-slate-300">/</span>
            <span className="text-text uppercase">{breadcrumb}</span>
          </div>
        )}

        {/* Pages fill the viewport; only a panel that opts in (tables, chart) absorbs the leftover height. */}
        <main className="flex-1 min-h-0 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {title && (
            <div>
              <h1 className="m-0 text-2xl font-semibold tracking-[-0.03em] text-text">{title}</h1>
              {subtitle && <p className="m-0 mt-0.5 text-sm text-muted">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}

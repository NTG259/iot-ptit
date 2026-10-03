import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StyleProvider } from '@ant-design/cssinjs'
import { ConfigProvider } from 'antd'
import './index.css'
import App from './App.jsx'

// Ant Design reads the same palette as the Tailwind tokens in variables.css. Sizes are in px:
// the root font is 14px (index.css), so 35px matches the h-10 toolbar controls.
const THEME = {
  token: {
    colorPrimary: '#059669',
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#e2e8f0',
    fontFamily: "'Be Vietnam Pro', system-ui, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    borderRadius: 8,
    controlHeight: 35,
    controlItemBgActive: '#ecfdf5',
    controlItemBgActiveHover: '#d1fae5',
  },
  components: {
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#475569',
      rowHoverBg: 'rgba(248, 250, 252, 0.6)',
      // The sorted column (Timestamp) keeps the same background as the others instead of antd's grey tint.
      bodySortBg: 'transparent',
      headerSortActiveBg: '#f8fafc',
      headerSortHoverBg: '#f1f5f9',
    },
  },
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* `layer` puts antd's styles in @layer antd, ordered below Tailwind utilities in index.css. */}
    <StyleProvider layer>
      <ConfigProvider theme={THEME}>
        <App />
      </ConfigProvider>
    </StyleProvider>
  </StrictMode>,
)

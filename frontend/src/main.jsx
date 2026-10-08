import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StyleProvider } from '@ant-design/cssinjs'
import { ConfigProvider } from 'antd'
import './index.css'
import AppRouter from '@/routes/AppRouter'

// Ant Design dùng cùng bảng màu với các biến trong variables.css. Kích thước tính bằng px:
// font gốc là 14px (index.css) nên 35px khớp với chiều cao h-10 của các nút trên thanh công cụ.
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
      // Cột đang sắp xếp (Timestamp) giữ cùng màu nền với các cột khác, không bị antd tô xám.
      bodySortBg: 'transparent',
      headerSortActiveBg: '#f8fafc',
      headerSortHoverBg: '#f1f5f9',
    },
  },
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* `layer` đặt style của antd vào @layer antd, xếp dưới CSS tự viết trong các file .css (xem index.css). */}
    <StyleProvider layer>
      <ConfigProvider theme={THEME}>
        <AppRouter />
      </ConfigProvider>
    </StyleProvider>
  </StrictMode>,
)

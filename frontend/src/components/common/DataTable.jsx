import { Table } from 'antd'

// Cột thời gian chỉ đảo giữa mới nhất trước và cũ nhất trước, không bao giờ bỏ sắp xếp.
const SAP_XEP_THOI_GIAN = { sorter: true, sortDirections: ['descend', 'ascend', 'descend'] }

/**
 * DataTable: bảng phân trang phía server, dùng phân trang có sẵn của antd, nằm trong một panel chiếm hết chiều cao còn lại
 * (bảng dài thì panel cuộn).
 * - Đổi trang gọi `onPageChange`, đổi số dòng mỗi trang gọi `onRowsPerPageChange`.
 * - `sortColumn` là `dataIndex` của cột thời gian (vd 'measuredAt'): bấm vào tiêu đề cột đó thì kết quả báo qua
 *   `onNewestFirstChange`.
 */
export default function DataTable({
  columns,
  sortColumn,
  rows,
  loaded,
  emptyText,
  page,
  rowsPerPage,
  total,
  noun = 'entries',
  rowsOptions = [10, 20, 50],
  onPageChange,
  onRowsPerPageChange,
  newestFirst,
  onNewestFirstChange,
}) {
  return (
    <section className="panel flex-1 min-h-0 overflow-auto">
      <Table
        rowKey="id"
        columns={columns.map((cot) => (cot.dataIndex === sortColumn ? { ...cot, ...SAP_XEP_THOI_GIAN, sortOrder: newestFirst ? 'descend' : 'ascend' } : cot))}
        dataSource={rows}
        loading={!loaded}
        locale={{ emptyText: loaded ? emptyText : ' ' }}
        pagination={{
          current: page,
          pageSize: rowsPerPage,
          total,
          showSizeChanger: true,
          pageSizeOptions: rowsOptions,
          showTotal: (tong) => `${tong.toLocaleString('en-US')} ${noun}`,
          // Thư viện dùng chung một sự kiện cho cả đổi trang lẫn đổi số dòng mỗi trang: kích thước đổi thì là đổi số dòng.
          onChange: (trangMoi, soDongMoi) => (soDongMoi === rowsPerPage ? onPageChange(trangMoi) : onRowsPerPageChange(soDongMoi)),
        }}
        onChange={(_phanTrang, _loc, sapXep, hanhDong) => {
          if (hanhDong.action === 'sort') onNewestFirstChange(sapXep.order !== 'ascend')
        }}
      />
    </section>
  )
}

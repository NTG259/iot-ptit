import { Table } from 'antd'
import './DataTable.css'

// Cột thời gian chỉ đảo giữa mới nhất trước và cũ nhất trước, không bao giờ bỏ sắp xếp.
const TIME_SORTING = { sorter: true, sortDirections: ['descend', 'ascend', 'descend'] }

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
  // Cột thời gian được bật sắp xếp; các cột khác giữ nguyên.
  function addSorting(column) {
    if (column.dataIndex !== sortColumn) {
      return column
    }
    let sortOrder = 'ascend'
    if (newestFirst) {
      sortOrder = 'descend'
    }
    return { ...column, ...TIME_SORTING, sortOrder }
  }

  // Thư viện dùng chung một sự kiện cho cả đổi trang lẫn đổi số dòng mỗi trang: kích thước đổi thì là đổi số dòng.
  function handlePaginationChange(newPage, newRowsPerPage) {
    if (newRowsPerPage !== rowsPerPage) {
      onRowsPerPageChange(newRowsPerPage)
    } else {
      onPageChange(newPage)
    }
  }

  function handleTableChange(_pagination, _filters, sorter, extra) {
    if (extra.action === 'sort') {
      onNewestFirstChange(sorter.order !== 'ascend')
    }
  }

  return (
    <section className="panel data-table">
      <Table
        rowKey="id"
        columns={columns.map(addSorting)}
        dataSource={rows}
        loading={!loaded}
        locale={{ emptyText: loaded ? emptyText : ' ' }}
        pagination={{
          current: page,
          pageSize: rowsPerPage,
          total,
          showSizeChanger: true,
          pageSizeOptions: rowsOptions,
          showTotal: (totalCount) => `${totalCount.toLocaleString('en-US')} ${noun}`,
          onChange: handlePaginationChange,
        }}
        onChange={handleTableChange}
      />
    </section>
  )
}

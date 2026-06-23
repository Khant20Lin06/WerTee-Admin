import { Badge } from '@/components/ui/badge';
import { DataTable, TableColumn } from '@/components/data-table/data-table';

import { mockOrders, OrderRow } from '../data/mock-orders';

const columns: TableColumn<OrderRow>[] = [
  {
    key: 'id',
    header: 'Order',
    render: (row) => row.id,
  },
  {
    key: 'customer',
    header: 'Customer',
    render: (row) => row.customer,
  },
  {
    key: 'merchant',
    header: 'Merchant',
    render: (row) => row.merchant,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge>{row.status}</Badge>,
  },
  {
    key: 'total',
    header: 'Total',
    render: (row) => row.total,
  },
];

export function OrdersTable() {
  return <DataTable columns={columns} rows={mockOrders} />;
}

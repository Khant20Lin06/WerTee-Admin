export type OrderRow = {
  id: string;
  customer: string;
  merchant: string;
  status: string;
  total: string;
};

export const mockOrders: OrderRow[] = [
  {
    id: '#ORD-1041',
    customer: 'Su Su Hlaing',
    merchant: 'Mingalar Noodle House',
    status: 'preparing',
    total: 'MMK 18,500',
  },
  {
    id: '#ORD-1042',
    customer: 'Ko Thiha',
    merchant: 'Yangon Grill',
    status: 'rider_assigned',
    total: 'MMK 24,000',
  },
];

// Shared domain types — mirror backend DTOs exactly.
// Pages import from here; do NOT redefine locally.

export type DeliveryType = 'DELIVERY' | 'PICKUP';

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderCustomer = {
  customerProfileId: string;
  userId: string;
  phone: string;
  userStatus: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type OrderBranch = {
  branchId: string;
  branchName: string;
  branchStatus: string;
  township: string;
  merchantId: string;
  merchantUserId: string;
  merchantName: string;
  merchantStatus: string;
};

export type OrderRider = {
  riderId: string;
  userId: string;
  phone: string;
  userStatus: string;
  displayName: string;
  vehicleType: string;
  currentTownship: string | null;
  status: string;
};

export type OrderDelivery = {
  deliveryId: string;
  riderId: string | null;
  etaMinutes: number | null;
  rider: OrderRider | null;
};

/** Matches backend OrderSummaryDto */
export type OrderSummary = {
  orderId: string;
  orderCode: string;
  status: string;
  deliveryType: DeliveryType;
  subtotalAmount: string;
  discountAmount: string;
  deliveryFee: string;
  totalAmount: string;
  placedAt: string;
  updatedAt: string;
  availableActions: string[];
  customer: OrderCustomer;
  branch: OrderBranch;
  delivery: OrderDelivery | null;
};

export type OrderItem = {
  orderItemId: string;
  nameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: string;
  lineTotal: string;
};

export type OrderTimelineEntry = {
  orderStatusHistoryId: string;
  fromStatus: string | null;
  toStatus: string;
  createdAt: string;
};

export type DeliveryAddress = {
  label: string | null;
  line1: string | null;
  line2: string | null;
  landmark: string | null;
  township: string | null;
  city: string | null;
  deliveryInstructions: string | null;
};

/** Matches backend OrderDetailDto (superset of OrderSummaryDto) */
export type OrderDetail = OrderSummary & {
  deliveryAddress: DeliveryAddress | null;
  items: OrderItem[];
  timeline: OrderTimelineEntry[];
};

// ─── Merchant ─────────────────────────────────────────────────────────────────

/** Matches backend MerchantProfileDto */
export type Merchant = {
  id: string;
  name: string;
  phone: string;
  supportPhone?: string | null;
  storeType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Customer ─────────────────────────────────────────────────────────────────

/** Matches backend CustomerProfileDto */
export type Customer = {
  id: string;
  phone: string;
  fullName: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerOrder = {
  orderId: string;
  orderCode: string;
  status: string;
  totalAmount: string;
  placedAt: string;
  branch: { merchantName: string; branchName: string };
};

// ─── Rider ────────────────────────────────────────────────────────────────────

/** Matches backend RiderProfileDto */
export type Rider = {
  id: string;
  phone: string;
  displayName: string;
  vehicleType: string;
  currentTownship?: string | null;
  status: string;
  accountStatus: string;
  isOnline?: boolean;
  isAvailable?: boolean;
  createdAt: string;
  updatedAt: string;
};

// ─── Payment ──────────────────────────────────────────────────────────────────

export type PaymentRefund = {
  refundId: string;
  status: string;
  amount: string;
  currencyCode: string;
  reasonCode: string | null;
  requestedAt: string;
};

/** Matches backend PaymentSummaryDto */
export type Payment = {
  paymentId: string;
  orderId: string;
  customerProfileId: string;
  method: string;
  provider: string;
  status: string;
  amount: string;
  refundedAmount: string;
  currencyCode: string;
  providerReference: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  requiresActionAt: string | null;
  succeededAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  updatedAt: string;
  refunds: PaymentRefund[];
};

export type PaymentWithOrder = Payment & {
  orderCode: string;
  customerName: string;
  merchantName: string;
};

// ─── Refund ───────────────────────────────────────────────────────────────────

/** Matches backend RefundSummaryDto */
export type Refund = {
  refundId: string;
  paymentId: string;
  orderId: string;
  status: string;
  amount: string;
  currencyCode: string;
  reasonCode: string | null;
  note: string | null;
  paymentMethod: string;
  paymentProvider: string;
  createdByUserRole: string | null;
  createdByUserPhone: string | null;
  requestedAt: string;
  succeededAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RefundWithOrder = Refund & {
  orderCode: string;
  customerName: string;
  merchantName: string;
};

// ─── Ratings ──────────────────────────────────────────────────────────────────

export type RatingsStats = {
  totalCount: number;
  branch: { count: number; average: number };
  rider: { count: number; average: number };
  customer?: { count: number; average: number };
  scoreDistribution?: { score: number; count: number }[];
};

// ─── Lightweight stubs (for contexts / search) ────────────────────────────────

export type OrderStub = Pick<OrderSummary, 'orderId' | 'orderCode' | 'status' | 'totalAmount'> & {
  customer?: { fullName?: string; phone?: string };
  branch?: { branchName?: string };
};

export type MerchantStub = Pick<Merchant, 'id' | 'name' | 'phone' | 'status'>;

export type CustomerStub = Pick<Customer, 'id' | 'phone' | 'fullName' | 'status'>;

export type RiderStub = Pick<Rider, 'id' | 'phone' | 'displayName' | 'status'> & {
  isOnline?: boolean;
};

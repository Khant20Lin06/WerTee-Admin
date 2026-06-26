export const ep = {
  // Orders
  orders:              '/admin/orders',
  order:               (id: string) => `/admin/orders/${id}`,
  orderCancel:         (id: string) => `/admin/orders/${id}/cancel`,
  orderStatus:         (id: string) => `/admin/orders/${id}/status`,
  orderPayments:       (id: string) => `/admin/orders/${id}/payments`,
  orderRefunds:        (id: string) => `/admin/orders/${id}/refunds`,
  orderAudit:          (id: string) => `/admin/audit/orders/${id}`,
  assignRider:         (id: string) => `/admin/dispatch/orders/${id}/assign-rider`,

  // Merchants
  merchants:           '/admin/merchants',
  merchantStatus:      (id: string) => `/admin/merchants/${id}/status`,

  // Riders
  riders:              '/admin/riders',
  riderStatus:         (id: string) => `/admin/riders/${id}/status`,

  // Customers
  customers:           '/admin/customers',
  customerStatus:      (id: string) => `/admin/customers/${id}/status`,

  // Payments
  paymentConfirm:      (id: string) => `/admin/payments/${id}/confirm`,
  paymentFail:         (id: string) => `/admin/payments/${id}/fail`,
  paymentCancel:       (id: string) => `/admin/payments/${id}/cancel`,
  paymentRefund:       (id: string) => `/admin/payments/${id}/refunds`,

  // Refunds
  refundSucceed:       (id: string) => `/admin/refunds/${id}/succeed`,
  refundFail:          (id: string) => `/admin/refunds/${id}/fail`,

  // Zones
  zones:               '/admin/zones',
  zone:                (id: string) => `/admin/zones/${id}`,

  // Audit
  audit:               '/admin/audit',

  // Reports
  reportInventoryOverview: '/admin/reports/inventory-alerts/overview',
  reportInventoryTrends:   '/admin/reports/inventory-alerts/trends',

  // Promotions
  promotions:       '/admin/promotions',
  promotion:        (id: string) => `/admin/promotions/${id}`,

  // Store Types
  storeTypes:              '/admin/store-types',
  storeType:               (id: string) => `/admin/store-types/${id}`,
  storeTypeArchive:        (id: string) => `/admin/store-types/${id}/archive`,
  storeTypeActivate:       (id: string) => `/admin/store-types/${id}/activate`,

  // Inventory Alerts
  inventoryAlerts:              '/admin/inventory-alerts',
  inventoryAlertAcknowledge:    (id: string) => `/admin/inventory-alerts/${id}/acknowledge`,
  inventoryAlertResolve:        (id: string) => `/admin/inventory-alerts/${id}/resolve`,
  inventoryAlertsBulkAcknowledge: '/admin/inventory-alerts/bulk-acknowledge',
  inventoryAlertsBulkDismiss:   '/admin/inventory-alerts/bulk-dismiss',

  // Ratings
  ratingsStats:      '/admin/ratings/stats',
  ratingsList:       '/admin/ratings',
  ratingsTopBranches: '/admin/ratings/top-branches',
  ratingsTopRiders:   '/admin/ratings/top-riders',

  // Auth
  login:  '/auth/login',
  me:     '/auth/me',
  logout: '/auth/logout',
} as const;

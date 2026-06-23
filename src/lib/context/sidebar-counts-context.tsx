'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

import { apiGet } from '@/lib/api/client';
import { ep } from '@/lib/api/endpoints';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStub      = { orderId: string; status: string; totalAmount: string; placedAt: string };
type AlertStub      = { notificationId: string; status: string };
type RefundStub  = { refundId: string; status: string };
type MerchantStub = { id: string; status: string };
type RiderStub   = { riderId: string; status: string; isOnline: boolean; isAvailable: boolean };
type CustomerStub = { id: string; status: string; createdAt: string };
type PromotionStub = { promotionId: string; isActive: boolean; endsAt: string | null; startsAt: string | null };
type ZoneStub    = { id: string; status: string };

export type AdminStats = {
  // Orders
  totalOrders: number;
  pendingOrders: number;      // CONFIRMED + PREPARING + READY + DELIVERING
  completedOrders: number;
  cancelledOrders: number;
  // Merchants
  totalMerchants: number;
  activeMerchants: number;
  pendingMerchants: number;
  // Riders
  totalRiders: number;
  onlineRiders: number;
  deliveringRiders: number;
  // Customers
  totalCustomers: number;
  activeCustomers: number;
  // Refunds
  pendingRefunds: number;
  // Promotions
  totalPromotions: number;
  activePromotions: number;
  // Zones
  totalZones: number;
  activeZones: number;
  // Inventory Alerts
  openAlerts: number;
  // Meta
  loaded: boolean;
};

const EMPTY: AdminStats = {
  totalOrders: 0, pendingOrders: 0, completedOrders: 0, cancelledOrders: 0,
  totalMerchants: 0, activeMerchants: 0, pendingMerchants: 0,
  totalRiders: 0, onlineRiders: 0, deliveringRiders: 0,
  totalCustomers: 0, activeCustomers: 0,
  pendingRefunds: 0,
  totalPromotions: 0, activePromotions: 0,
  totalZones: 0, activeZones: 0,
  openAlerts: 0,
  loaded: false,
};

const AdminStatsContext = createContext<AdminStats>(EMPTY);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SidebarCountsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<AdminStats>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Fetch all resource lists in parallel
        const [ordersRes, merchantsRes, ridersRes, customersRes, promotionsRes, zonesRes, alertsRes] =
          await Promise.allSettled([
            apiGet<OrderStub[]>(ep.orders),
            apiGet<MerchantStub[]>(ep.merchants),
            apiGet<RiderStub[]>(ep.riders),
            apiGet<CustomerStub[]>(ep.customers),
            apiGet<PromotionStub[]>(ep.promotions),
            apiGet<ZoneStub[]>(ep.zones),
            apiGet<AlertStub[]>(ep.inventoryAlerts + '?status=OPEN&limit=100'),
          ]);

        if (cancelled) return;

        const orders    = ordersRes.status    === 'fulfilled' && Array.isArray(ordersRes.value)    ? ordersRes.value    : [];
        const merchants = merchantsRes.status === 'fulfilled' && Array.isArray(merchantsRes.value) ? merchantsRes.value : [];
        const riders    = ridersRes.status    === 'fulfilled' && Array.isArray(ridersRes.value)    ? ridersRes.value    : [];
        const customers = customersRes.status === 'fulfilled' && Array.isArray(customersRes.value) ? customersRes.value : [];
        const promos    = promotionsRes.status === 'fulfilled' && Array.isArray(promotionsRes.value) ? promotionsRes.value : [];
        const zones     = zonesRes.status     === 'fulfilled' && Array.isArray(zonesRes.value)     ? zonesRes.value     : [];
        const alerts    = alertsRes.status    === 'fulfilled' && Array.isArray(alertsRes.value)    ? alertsRes.value    : [];

        // Orders breakdown
        const pendingOrders    = orders.filter(o => ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERING'].includes(o.status)).length;
        const completedOrders  = orders.filter(o => o.status === 'COMPLETED').length;
        const cancelledOrders  = orders.filter(o => o.status === 'CANCELLED').length;

        // Merchants
        const activeMerchants  = merchants.filter(m => m.status === 'ACTIVE').length;
        const pendingMerchants = merchants.filter(m => m.status === 'PENDING').length;

        // Riders — use isOnline / isAvailable boolean fields from RiderOperationalSummaryDto
        const onlineRiders     = riders.filter(r => r.isOnline).length;
        const deliveringRiders = riders.filter(r => r.isOnline && !r.isAvailable).length;

        // Customers
        const activeCustomers  = customers.filter(c => c.status === 'ACTIVE').length;

        // Refunds — parallel-fetch for refundable orders (cap at 50)
        const refundable = orders.filter(o => ['COMPLETED', 'CANCELLED'].includes(o.status)).slice(0, 50);
        const refundResults = await Promise.allSettled(
          refundable.map(o => apiGet<RefundStub[]>(ep.orderRefunds(o.orderId))),
        );
        if (cancelled) return;

        let pendingRefunds = 0;
        for (const r of refundResults) {
          if (r.status === 'fulfilled' && Array.isArray(r.value)) {
            pendingRefunds += r.value.filter(
              rf => rf.status === 'PENDING' || rf.status === 'REQUIRES_ACTION',
            ).length;
          }
        }

        // Promotions — derive active from isActive + date window
        const now = Date.now();
        const activePromotions = promos.filter(p => {
          if (!p.isActive) return false;
          if (p.startsAt && new Date(p.startsAt).getTime() > now) return false;
          if (p.endsAt   && new Date(p.endsAt).getTime()   < now) return false;
          return true;
        }).length;

        // Zones
        const activeZones = zones.filter(z => z.status === 'ACTIVE').length;

        // Inventory Alerts — OPEN = unacknowledged
        const openAlerts = alerts.filter(a => a.status === 'OPEN').length;

        setStats({
          totalOrders: orders.length, pendingOrders, completedOrders, cancelledOrders,
          totalMerchants: merchants.length, activeMerchants, pendingMerchants,
          totalRiders: riders.length, onlineRiders, deliveringRiders,
          totalCustomers: customers.length, activeCustomers,
          pendingRefunds,
          totalPromotions: promos.length, activePromotions,
          totalZones: zones.length, activeZones,
          openAlerts,
          loaded: true,
        });
      } catch {
        setStats(s => ({ ...s, loaded: true }));
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <AdminStatsContext.Provider value={stats}>
      {children}
    </AdminStatsContext.Provider>
  );
}

export function useSidebarCounts() {
  const { pendingOrders, pendingRefunds, openAlerts } = useContext(AdminStatsContext);
  return { pendingOrders, pendingRefunds, openAlerts };
}

export function useAdminStats() {
  return useContext(AdminStatsContext);
}

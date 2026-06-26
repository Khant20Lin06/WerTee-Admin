export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {/* KPI row skeleton */}
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E8E6F8', height: 90 }}>
            <div className="h-2 rounded mb-3" style={{ background: '#F0EFFB', width: '40%' }} />
            <div className="h-6 rounded mb-2" style={{ background: '#F0EFFB', width: '60%' }} />
            <div className="h-2 rounded" style={{ background: '#F0EFFB', width: '80%' }} />
          </div>
        ))}
      </div>
      {/* Chart + table skeleton */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 320px' }}>
        <div className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E8E6F8', height: 200 }}>
          <div className="h-2 rounded mb-4" style={{ background: '#F0EFFB', width: '30%' }} />
          <div className="flex items-end gap-1.5" style={{ height: 120 }}>
            {[60, 40, 70, 55, 80, 65, 90].map((h, i) => (
              <div key={i} className="flex-1 rounded-lg" style={{ height: `${h}%`, background: '#F0EFFB' }} />
            ))}
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E8E6F8', height: 200 }}>
          <div className="h-2 rounded mb-4" style={{ background: '#F0EFFB', width: '50%' }} />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 mb-3">
              <div className="rounded-full" style={{ width: 24, height: 24, background: '#F0EFFB' }} />
              <div className="h-2 rounded flex-1" style={{ background: '#F0EFFB' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

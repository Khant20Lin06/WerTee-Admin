import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  children?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function PageHeader({ children, onRefresh, refreshing = false }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold flex-shrink-0"
          style={{
            fontSize: 11, background: '#F6F5FF', border: '1px solid #E8E6F8',
            color: '#5B4FE9', cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw size={11} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          Refresh
        </button>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

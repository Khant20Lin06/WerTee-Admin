import { AlertCircle, RefreshCw } from 'lucide-react';

type Props = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-2xl p-8"
      style={{ background: '#FFF0F0', border: '1px solid #FFD0D0' }}
    >
      <AlertCircle size={24} style={{ color: '#D84040' }} />
      <span style={{ fontSize: 13, color: '#D84040', fontWeight: 600 }}>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold"
          style={{ fontSize: 11, background: '#fff', border: '1px solid #FFD0D0', color: '#D84040', cursor: 'pointer' }}
        >
          <RefreshCw size={11} />
          Retry
        </button>
      )}
    </div>
  );
}

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
};

export function SidePanel({ title, onClose, children, width = 440, footer }: Props) {
  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex flex-col"
      style={{ width, background: '#fff', borderLeft: '1px solid #E8E6F8', boxShadow: '-8px 0 32px rgba(91,79,233,0.1)' }}
    >
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{ height: 52, borderBottom: '1px solid #E8E6F8' }}
      >
        <span className="font-extrabold" style={{ fontSize: 14, color: '#1A1730' }}>{title}</span>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-lg"
          style={{ width: 28, height: 28, background: '#F6F5FF', border: '1px solid #E8E6F8', cursor: 'pointer' }}
        >
          <X size={14} style={{ color: '#8A88A8' }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">{children}</div>

      {footer && (
        <div
          className="flex-shrink-0 px-5 py-3"
          style={{ borderTop: '1px solid #E8E6F8', background: '#FAFAFE' }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

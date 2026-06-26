import { Search } from 'lucide-react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number | string;
};

export function SearchInput({ value, onChange, placeholder = 'Search…', width = 220 }: Props) {
  return (
    <div className="relative flex items-center" style={{ width }}>
      <Search size={12} style={{ position: 'absolute', left: 10, color: '#B0AECC', flexShrink: 0 }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl"
        style={{
          paddingLeft: 30, paddingRight: 12, height: 34,
          fontSize: 12, color: '#1A1730',
          background: '#F6F5FF', border: '1px solid #E8E6F8',
          outline: 'none',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = '#5B4FE9')}
        onBlur={e  => (e.currentTarget.style.borderColor = '#E8E6F8')}
      />
    </div>
  );
}

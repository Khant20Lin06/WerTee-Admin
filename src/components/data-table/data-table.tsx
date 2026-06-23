import { ReactNode } from 'react';

export type TableColumn<T> = {
  key: keyof T | string;
  header: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
}: Readonly<{
  columns: TableColumn<T>[];
  rows: T[];
}>) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={String(column.key)} className="px-4 py-3 text-sm text-slate-700">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

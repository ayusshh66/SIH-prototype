import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../../lib/motion';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  isNumeric?: boolean;
  sortable?: boolean;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  emptyText?: string;
  className?: string;
  onRowClick?: (item: T) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  stickyHeader?: boolean;
  animateRows?: boolean;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyText = 'No operational records available',
  className = '',
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  stickyHeader = true,
  animateRows = true,
}: TableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto bg-surface border border-border-hairline rounded-md ${className}`}>
      <table className="w-full text-body text-left border-collapse">
        <thead
          className={`text-micro text-content-tertiary uppercase bg-surface-sunken border-b border-border-hairline font-mono tracking-wider ${
            stickyHeader ? 'sticky top-0 z-10' : ''
          }`}
        >
          <tr>
            {columns.map((col) => {
              const isSorted = sortColumn === col.key;
              const alignment = col.align || (col.isNumeric ? 'right' : 'left');

              return (
                <th
                  key={col.key}
                  className={`px-4 py-3 whitespace-nowrap select-none font-medium ${
                    col.sortable ? 'cursor-pointer hover:text-content-primary' : ''
                  }`}
                  style={{ width: col.width, textAlign: alignment }}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <div
                    className={`inline-flex items-center gap-1.5 ${
                      alignment === 'right' ? 'justify-end w-full' : alignment === 'center' ? 'justify-center w-full' : ''
                    }`}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-content-tertiary">
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp size={12} className="text-accent-500" />
                          ) : (
                            <ChevronDown size={12} className="text-accent-500" />
                          )
                        ) : (
                          <ChevronsUpDown size={12} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <motion.tbody
          variants={animateRows ? staggerContainer : undefined}
          initial={animateRows ? 'initial' : false}
          animate="animate"
        >
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-content-tertiary font-mono text-small"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const alignment = (col: Column<T>) => col.align || (col.isNumeric ? 'right' : 'left');
              const isZebra = index % 2 === 1;

              const rowElement = (
                <motion.tr
                  key={keyExtractor(item, index)}
                  variants={animateRows && index < 20 ? fadeInUp : undefined}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={`border-b border-border-subtle transition-colors duration-100 ${
                    isZebra ? 'bg-surface-sunken/40' : 'bg-surface'
                  } hover:bg-surface-raised/80 ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-small text-content-primary ${
                        col.isNumeric ? 'font-mono tabular-nums text-content-secondary' : ''
                      }`}
                      style={{ textAlign: alignment(col) }}
                    >
                      {col.render ? col.render(item, index) : (item as any)[col.key]}
                    </td>
                  ))}
                </motion.tr>
              );

              return rowElement;
            })
          )}
        </motion.tbody>
      </table>
    </div>
  );
}

export default Table;

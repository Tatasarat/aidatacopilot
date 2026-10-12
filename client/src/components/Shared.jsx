import React from 'react';
import { formatCell } from '../format';

const RIGHT = ['money', 'int', 'percent', 'decimal', 'days', 'auto'];

/** Generic table driven by the column list the server sends with each result. */
export function ResultTable({ columns, rows, currency }) {
  if (!rows || !rows.length) return null;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={RIGHT.includes(c.type) ? 'r' : ''}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.sku || row.metric || i}>
              {columns.map((c) => {
                const value = row[c.key];
                const negative = typeof value === 'number' && value < 0 && ['money', 'percent', 'auto'].includes(c.type);
                return (
                  <td key={c.key} className={`${RIGHT.includes(c.type) ? 'r' : ''} ${negative ? 'neg' : ''}`}>
                    {formatCell(value, c.type, currency, row)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyData({ go, title = 'No store data yet', body = 'Upload your orders and product costs, or load a sample store to see how ShopPulse works.' }) {
  return (
    <div className="card empty">
      <h3>{title}</h3>
      <p>{body}</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn" onClick={() => go('data')}>Add your data</button>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      <div className="kpis">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 104 }} />)}
      </div>
      <div className="skeleton" style={{ height: 300 }} />
    </div>
  );
}

export function PageHead({ title, children, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {actions}
    </div>
  );
}

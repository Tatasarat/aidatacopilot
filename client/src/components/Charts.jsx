import React from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine,
} from 'recharts';
import { formatCell, money, shortDate } from '../format';

const INK = '#0e2a3a';
const MARIGOLD = '#f2a900';
const PROFIT = '#1b7f55';
const LOSS = '#b8372a';
const GRID = '#e1e8ec';
const AXIS = { fontSize: 12, fill: '#425a6b' };

function Tip({ active, payload, label, render }) {
  if (!active || !payload || !payload.length) return null;
  return <div className="tip">{render(payload, label)}</div>;
}

/** Revenue and profit over time. Profit is left out when no unit costs exist. */
export function TrendChart({ data, currency }) {
  const hasProfit = data.some((d) => d.profit != null);
  const compact = (v) => money(v, currency, { compact: true });
  return (
    <div>
      <div className="legend">
        <span><i style={{ background: INK }} />Net revenue</span>
        {hasProfit && <span><i style={{ background: MARIGOLD }} />Profit</span>}
      </div>
      <div className="chart-box" role="img" aria-label="Line chart of net revenue and profit over the selected period">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={INK} stopOpacity={0.18} />
                <stop offset="100%" stopColor={INK} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={28} />
            <YAxis tickFormatter={compact} tick={AXIS} tickLine={false} axisLine={false} width={56} />
            <Tooltip
              content={(p) => (
                <Tip {...p} render={(pl, label) => (
                  <>
                    <b>{shortDate(label)}</b>
                    {pl.map((row) => <div key={row.dataKey}>{row.dataKey === 'profit' ? 'Profit' : 'Net revenue'}: {money(row.value, currency)}</div>)}
                  </>
                )} />
              )}
            />
            <Area type="monotone" dataKey="revenue" stroke={INK} strokeWidth={2} fill="url(#revFill)" isAnimationActive={false} />
            {hasProfit && <Area type="monotone" dataKey="profit" stroke={MARIGOLD} strokeWidth={2.5} fill="none" connectNulls isAnimationActive={false} />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Horizontal bars for "Ask AI" results. Negative values show in red, positive in ink. */
export function ValueBars({ rows, labelKey, valueKey, valueType, currency, title }) {
  const data = rows.filter((r) => r[valueKey] != null).map((r) => ({ label: r[labelKey], value: r[valueKey] }));
  if (!data.length) return null;
  const height = Math.max(160, data.length * 44 + 30);
  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      <div style={{ width: '100%', height }} role="img" aria-label={title}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis type="number" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} tickFormatter={(v) => formatCell(v, valueType, currency)} />
            <YAxis type="category" dataKey="label" width={130} tick={AXIS} tickLine={false} axisLine={false} />
            <ReferenceLine x={0} stroke="#9fb0ba" />
            <Tooltip cursor={{ fill: 'rgba(14,42,58,.05)' }} content={(p) => <Tip {...p} render={(pl) => <><b>{pl[0].payload.label}</b><div>{formatCell(pl[0].value, valueType, currency)}</div></>} />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22} isAnimationActive={false}>
              {data.map((d, i) => <Cell key={i} fill={d.value < 0 ? LOSS : valueType === 'days' ? MARIGOLD : INK} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export { PROFIT, LOSS, INK, MARIGOLD };

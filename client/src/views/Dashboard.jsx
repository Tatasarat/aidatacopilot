import React, { useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '../api';
import { changeText, int, money, percent, shortDate } from '../format';
import Tape from '../components/Tape';
import { TrendChart } from '../components/Charts';
import { EmptyData, PageHead, PageSkeleton } from '../components/Shared';

const RANGES = [
  ['last_7_days', '7 days'],
  ['last_30_days', '30 days'],
  ['last_90_days', '90 days'],
  ['this_month', 'This month'],
  ['last_month', 'Last month'],
  ['all', 'All time'],
];

const TILES = [
  { key: 'net_revenue', explain: 'net_revenue', label: 'Net revenue', type: 'money' },
  { key: 'profit', explain: 'profit', label: 'Profit', type: 'money' },
  { key: 'margin_pct', explain: 'margin', label: 'Profit margin', type: 'percent' },
  { key: 'orders', explain: 'orders', label: 'Orders', type: 'int' },
];

function tileValue(value, type, currency) {
  if (value == null) return '–';
  if (type === 'money') return money(value, currency);
  if (type === 'percent') return percent(value);
  return int(value);
}

function Delta({ delta, good = 'up' }) {
  if (!delta || delta.change_pct == null) {
    if (delta && delta.change != null) {
      const up = delta.change > 0;
      return <span className={`delta ${up ? 'pos' : delta.change < 0 ? 'neg' : 'muted'}`}>{up ? '+' : ''}{delta.change} pts vs before</span>;
    }
    return <span className="delta muted">No earlier period</span>;
  }
  const positive = good === 'up' ? delta.change_pct > 0 : delta.change_pct < 0;
  const neutral = delta.change_pct === 0;
  return <span className={`delta ${neutral ? 'muted' : positive ? 'pos' : 'neg'}`}>{changeText(delta.change_pct)} vs before</span>;
}

export default function Dashboard({ user, go }) {
  const currency = user.currency || 'INR';
  const [range, setRange] = useState('last_30_days');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [sort, setSort] = useState({ key: 'net_revenue', dir: 'desc' });

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    api.overview(range)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(errorMessage(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range]);

  const products = useMemo(() => {
    if (!data || !data.products) return [];
    const list = [...data.products];
    const { key, dir } = sort;
    list.sort((a, b) => {
      const x = a[key]; const y = b[key];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      const out = typeof x === 'string' ? x.localeCompare(y) : x - y;
      return dir === 'asc' ? out : -out;
    });
    return list;
  }, [data, sort]);

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }));
  const th = (key, label, right = true) => (
    <th className={right ? 'r' : ''} aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button className="linklike" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }} onClick={() => toggleSort(key)}>
        {label}{sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
      </button>
    </th>
  );

  const head = (
    <PageHead
      title="Dashboard"
      actions={(
        <div className="range" role="group" aria-label="Time period">
          {RANGES.map(([key, label]) => (
            <button key={key} aria-pressed={range === key} onClick={() => setRange(key)}>{label}</button>
          ))}
        </div>
      )}
    >
      Click any number to see how it was calculated.
    </PageHead>
  );

  if (loading && !data) return <>{head}<PageSkeleton /></>;
  if (error) return <>{head}<div className="alert error" role="alert">{error}</div></>;
  if (!data || data.has_data === false) return <>{head}<EmptyData go={go} /></>;

  const { current, deltas, meta, explain } = data;
  const label = meta.range.label;
  const attention = [];
  data.loss_making.slice(0, 2).forEach((p) => attention.push({ tone: 'bad', title: `${p.name} is losing money`, body: `${money(p.profit, currency)} profit on ${money(p.net_revenue, currency)} of sales ${label}.`, tag: 'Loss' }));
  data.low_margin.slice(0, 2).forEach((p) => attention.push({ tone: 'warn', title: `${p.name} sells well but keeps little`, body: `${percent(p.margin_pct)} margin on ${money(p.net_revenue, currency)} of sales. Check price, discounts and supplier cost.`, tag: 'Margin' }));
  data.stock_risk.slice(0, 2).forEach((s) => attention.push({ tone: s.severity === 'critical' ? 'bad' : 'warn', title: `${s.name} may run out around ${shortDate(s.stockout_date)}`, body: `${s.stock_on_hand} in stock, selling about ${s.daily_velocity} a day. That is roughly ${s.days_of_cover} days of cover.`, tag: 'Stock' }));
  products.filter((p) => p.refund_rate_pct >= 10 && p.refunds > 0).slice(0, 1).forEach((p) => attention.push({ tone: 'warn', title: `${p.name} has a high refund rate`, body: `${percent(p.refund_rate_pct)} of its sales were refunded (${money(p.refunds, currency)}).`, tag: 'Refunds' }));
  if (data.drivers && data.drivers.top_decreases[0]) {
    const d = data.drivers.top_decreases[0];
    attention.push({ tone: 'warn', title: `${d.name} is the biggest drop`, body: `Revenue moved ${money(d.change, currency)} compared with the previous period.`, tag: 'Change' });
  }

  return (
    <>
      {head}
      {meta.warnings.map((w) => <div key={w} className="alert note">{w} {w.startsWith('No product costs') && <button className="linklike" onClick={() => go('data')}>Add costs</button>}</div>)}

      <div className="kpis">
        {TILES.map((t) => {
          const delta = deltas[t.key];
          return (
            <button key={t.key} className={`kpi ${open === t.explain ? 'active' : ''}`} onClick={() => setOpen(t.explain)} aria-label={`${t.label}: ${tileValue(current[t.key], t.type, currency)}. Show how it was calculated.`}>
              <span className="label">{t.label}</span>
              <span className="value num">{tileValue(current[t.key], t.type, currency)}</span>
              <Delta delta={delta} />
              <span className="how">Show the working</span>
            </button>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h2>Revenue and profit</h2>
          <button className="linklike small" onClick={() => setOpen('aov')}>Average order value: {money(current.aov, currency)}</button>
        </div>
        <TrendChart data={data.trend} currency={currency} />
      </div>

      <div className="card">
        <div className="card-head"><h2>What needs your attention</h2><span className="muted small">{label}</span></div>
        {attention.length === 0 ? (
          <p className="muted">Nothing stands out. No loss-makers, thin margins or stock risks in this period.</p>
        ) : attention.map((a, i) => (
          <div className="insight" key={i}>
            <span className={`bar ${a.tone === 'bad' ? 'bad' : ''}`} />
            <div><h3>{a.title}</h3><p className="muted">{a.body}</p></div>
            <span className={`pill ${a.tone === 'bad' ? 'critical' : 'warning'}`}>{a.tag}</span>
          </div>
        ))}
        <div style={{ marginTop: 12 }}><button className="btn secondary small" onClick={() => go('ask')}>Ask a question about this</button></div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Products</h2><span className="muted small">{products.length} sold {label}</span></div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {th('name', 'Product', false)}{th('units', 'Units')}{th('net_revenue', 'Net revenue')}{th('profit', 'Profit')}{th('margin_pct', 'Margin')}{th('refund_rate_pct', 'Refund rate')}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.sku}>
                  <td><b>{p.name}</b><div className="muted small">{p.sku}</div></td>
                  <td className="r">{int(p.units)}</td>
                  <td className="r">{money(p.net_revenue, currency)}</td>
                  <td className={`r ${p.profit != null && p.profit < 0 ? 'neg' : ''}`}>{p.profit == null ? <span className="muted" title="No unit cost uploaded for this product">no cost</span> : money(p.profit, currency)}</td>
                  <td className="r">{percent(p.margin_pct)}</td>
                  <td className="r">{percent(p.refund_rate_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Tape entry={open ? explain[open] : null} currency={currency} periodLabel={label} onClose={() => setOpen(null)} />
    </>
  );
}

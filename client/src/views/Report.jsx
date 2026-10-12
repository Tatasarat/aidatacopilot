import React, { useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { money, percent, shortDate } from '../format';
import { EmptyData, PageHead, PageSkeleton } from '../components/Shared';
import { useToast } from '../components/Toast';

function Section({ title, tone, items, empty }) {
  return (
    <div className="card">
      <div className="card-head"><h2>{title}</h2></div>
      {items.length === 0 ? <p className="muted">{empty}</p> : items.map((it, i) => (
        <div className="insight" key={i}>
          <span className={`bar ${it.tone || tone || ''}`} />
          <div><h3>{it.title}</h3><p className="muted">{it.body}</p></div>
          {it.tag && <span className={`pill ${it.tagTone || 'warning'}`}>{it.tag}</span>}
        </div>
      ))}
    </div>
  );
}

export default function Report({ user, go }) {
  const currency = user.currency || 'INR';
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.report().then(setReport).catch((e) => setError(errorMessage(e)));
  }, []);

  async function email() {
    setSending(true);
    try { const out = await api.emailReport(); toast(out.message); } catch (e) { toast(errorMessage(e), 'error'); } finally { setSending(false); }
  }

  const actions = (
    <div className="row">
      <button className="btn" onClick={email} disabled={sending || !report || !report.has_data}>{sending ? 'Sending…' : 'Email me this report'}</button>
    </div>
  );
  const head = <PageHead title="Weekly report" actions={actions}>Your last 7 days against the 7 before. We also email this every Monday if you leave it switched on in Settings.</PageHead>;

  if (error) return <>{head}<div className="alert error" role="alert">{error}</div></>;
  if (!report) return <>{head}<PageSkeleton /></>;
  if (!report.has_data) return <>{head}<EmptyData go={go} /></>;

  const $ = (n) => money(n, currency);
  return (
    <>
      {head}
      <div className="card">
        <div className="muted small">{shortDate(report.period.start)} to {shortDate(report.period.end)}</div>
        <p style={{ fontSize: 19, marginTop: 6, maxWidth: '62ch' }}>{report.headline}</p>
      </div>

      <Section title="Running low on stock" empty="No product is projected to run out within 14 days."
        items={report.stock_risk.map((s) => ({ title: s.name, body: `${s.stock_on_hand} in stock, about ${s.days_of_cover} days left. Runs out around ${shortDate(s.stockout_date)}.`, tag: s.severity === 'critical' ? 'Order now' : 'Soon', tagTone: s.severity === 'critical' ? 'critical' : 'warning', tone: s.severity === 'critical' ? 'bad' : '' }))} />
      <Section title="Selling well, thin margin" empty="No high-selling product has a thin margin this week."
        items={report.low_margin.map((p) => ({ title: p.name, body: `${percent(p.margin_pct)} margin on ${$(p.net_revenue)} of sales.`, tag: 'Margin' }))} />
      <Section title="Losing money" tone="bad" empty="No product made a loss this week."
        items={report.loss_making.map((p) => ({ title: p.name, body: `${$(p.profit)} profit on ${$(p.net_revenue)} of sales.`, tag: 'Loss', tagTone: 'critical' }))} />
      <Section title="High refund rate" empty="No product has a refund rate of 10% or more."
        items={report.refund_heavy.map((p) => ({ title: p.name, body: `${$(p.refunds)} refunded, ${percent(p.refund_rate_pct)} of its sales.`, tag: 'Refunds' }))} />
      <Section title="Biggest drops since last week" empty="No product's revenue fell compared with last week."
        items={report.movers.down.map((p) => ({ title: p.name, body: `${$(p.change)} (from ${$(p.previous_revenue)} to ${$(p.current_revenue)}).`, tag: 'Down' }))} />
      <Section title="Best profit this week" tone="good" empty="Add product costs to see profit by product."
        items={report.top_profit.map((p) => ({ title: p.name, body: `${$(p.profit)} profit at a ${percent(p.margin_pct)} margin.`, tag: 'Top', tagTone: 'good' }))} />

      {report.notes.map((n) => <div key={n} className="alert note" style={{ marginTop: 16 }}>{n}</div>)}
    </>
  );
}

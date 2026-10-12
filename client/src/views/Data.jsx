import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../api';
import { Icon } from '../components/Icons';
import { PageHead } from '../components/Shared';
import { useToast } from '../components/Toast';
import { longDate } from '../format';

function UploadBox({ type, title, hint, onDone }) {
  const toast = useToast();
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);

  async function send(file) {
    if (!file) return;
    setBusy(true); setResult(null); setFailure(null);
    try {
      const out = await api.uploadCsv(type, file);
      setResult(out);
      toast(out.message);
      onDone();
    } catch (err) {
      const data = (err.response && err.response.data) || {};
      setFailure({ message: errorMessage(err), errors: data.errors || [], count: data.error_count });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div>
      <h3>{title}</h3>
      <p className="muted small" style={{ margin: '4px 0 10px' }}>{hint}</p>
      <div
        className={`drop ${over ? 'over' : ''}`}
        onClick={() => input.current && input.current.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files[0]); }}
      >
        <Icon name="upload" size={22} />
        <div style={{ marginTop: 6 }}>{busy ? 'Uploading…' : 'Drop a CSV here or click to choose'}</div>
        <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => send(e.target.files[0])} aria-label={`Choose ${title} CSV file`} />
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <a className="small" href={api.templateUrl(type)} download><Icon name="download" size={14} style={{ verticalAlign: -2 }} /> Download the template</a>
      </div>

      {failure && (
        <div className="alert error" role="alert" style={{ marginTop: 12 }}>
          <b>Nothing was changed.</b> {failure.message}
          {failure.errors.length > 0 && (
            <ul className="errlist">
              {failure.errors.slice(0, 8).map((e, i) => <li key={i}>Row {e.row}, <b>{e.field}</b>: {e.message}</li>)}
              {failure.count > 8 && <li>…and {failure.count - 8} more problems.</li>}
            </ul>
          )}
        </div>
      )}
      {result && (
        <div className="alert ok" role="status" style={{ marginTop: 12 }}>
          <b>{result.message}</b>
          {result.rows_rejected > 0 && <div>{result.rows_rejected} row(s) were skipped:</div>}
          {result.errors.length > 0 && (
            <ul className="errlist">
              {result.errors.slice(0, 5).map((e, i) => <li key={i}>Row {e.row}, <b>{e.field}</b>: {e.message}</li>)}
            </ul>
          )}
          {result.warnings.map((w) => <div key={w.code} className="small" style={{ marginTop: 4 }}>Note: {w.message}</div>)}
        </div>
      )}
    </div>
  );
}

export default function Data({ go }) {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => { api.dataStatus().then(setStatus).catch(() => {}); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const hasOrders = status && status.orders.lines > 0;
  const hasCosts = status && status.products.with_cost > 0;

  async function sample() {
    setBusy(true);
    try { const out = await api.loadSample(); toast(out.message); refresh(); } catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  }
  async function wipe() {
    if (!window.confirm('Delete all your orders, products and question history? This cannot be undone.')) return;
    setBusy(true);
    try { const out = await api.deleteData(); toast(out.message); refresh(); } catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHead title="Your data">Upload two CSV files. Your orders say what sold, your products file says what each item costs and how much is in stock. A new upload replaces the old one of the same kind.</PageHead>

      <div className="card">
        <div className="steps">
          <div className={`step ${hasCosts ? 'done' : ''}`}>
            <UploadBox type="products" title="Products and costs" hint="One row per product: sku, unit_cost, and optionally product_name and stock_on_hand. Profit and stock warnings need this file." onDone={refresh} />
          </div>
          <div className={`step ${hasOrders ? 'done' : ''}`}>
            <UploadBox type="orders" title="Orders" hint="One row per order line: order_id, order_date, sku, quantity, unit_price, and optionally product_name, discount and refund_amount. Shopify-style column names work too." onDone={refresh} />
          </div>
          <div className={`step ${hasOrders ? 'done' : ''}`}>
            <div>
              <h3>See your numbers</h3>
              <p className="muted small" style={{ margin: '4px 0 10px' }}>Once orders are in, your dashboard and weekly report fill in automatically.</p>
              <button className="btn" disabled={!hasOrders} onClick={() => go('dashboard')}>Open dashboard</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card" style={{ marginTop: 0 }}>
          <h2>What is loaded now</h2>
          {!status ? <div className="skeleton" style={{ height: 80, marginTop: 12 }} /> : (
            <div className="stack" style={{ marginTop: 12 }}>
              <div>
                <b>{status.orders.lines.toLocaleString('en-IN')}</b> order lines from <b>{status.orders.orders.toLocaleString('en-IN')}</b> orders
                {status.orders.first_date && <div className="muted small">{longDate(status.orders.first_date)} to {longDate(status.orders.last_date)}</div>}
              </div>
              <div>
                <b>{status.products.products}</b> products, <b>{status.products.with_cost}</b> with a unit cost, <b>{status.products.with_stock}</b> with stock levels
              </div>
              {hasOrders && status.skus_without_cost > 0 && (
                <div className="alert note" style={{ margin: 0 }}>{status.skus_without_cost} product(s) in your orders have no unit cost, so their profit is left out.</div>
              )}
              {status.recent_uploads.length > 0 && (
                <div className="muted small">
                  Last upload: {status.recent_uploads[0].file_name} ({status.recent_uploads[0].kind}), {longDate(String(status.recent_uploads[0].created_at).slice(0, 10))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: 0 }}>
          <h2>Just exploring?</h2>
          <p className="muted" style={{ margin: '6px 0 14px' }}>Load a made-up store with 120 days of orders. It shows a revenue drop, a discounted product with thin margins, high refunds, and low stock. Loading it replaces any data you have.</p>
          <div className="row">
            <button className="btn accent" onClick={sample} disabled={busy}>Load the sample store</button>
            <button className="btn danger" onClick={wipe} disabled={busy || !hasOrders && !(status && status.products.products)}>Delete my data</button>
          </div>
        </div>
      </div>
    </>
  );
}

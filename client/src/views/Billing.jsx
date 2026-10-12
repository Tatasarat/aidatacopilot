import React, { useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { longDate, money } from '../format';
import { PageHead } from '../components/Shared';
import { useToast } from '../components/Toast';

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection and try again.'));
    document.body.appendChild(s);
    return undefined;
  });
}

export default function Billing({ user, credits, onCredits }) {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.plans().then((d) => setPlans(d.plans)).catch((e) => setError(errorMessage(e)));
    api.paymentHistory().then((d) => setHistory(d.payments)).catch(() => {});
  }, []);

  async function buy(plan) {
    setBusy(plan.id); setError('');
    try {
      const order = await api.createOrder(plan.id);
      await loadRazorpay();
      const rz = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'ShopPulse AI',
        description: order.name,
        order_id: order.order_id,
        prefill: { name: user.name, email: user.email },
        theme: { color: '#0e2a3a' },
        handler: async (response) => {
          try {
            const out = await api.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            onCredits(out.credits);
            api.paymentHistory().then((d) => setHistory(d.payments)).catch(() => {});
            toast(out.message);
          } catch (err) {
            setError(`${errorMessage(err)} If money left your account, email us with payment ID ${response.razorpay_payment_id}.`);
          } finally { setBusy(''); }
        },
        modal: { ondismiss: () => setBusy('') },
      });
      rz.on('payment.failed', (r) => { setError(r.error && r.error.description ? r.error.description : 'The payment did not go through.'); setBusy(''); });
      rz.open();
    } catch (err) {
      setError(err.response ? errorMessage(err) : err.message);
      setBusy('');
    }
  }

  const used = credits && !credits.unlimited ? Math.min(100, Math.round((credits.credits_used / credits.credits_limit) * 100)) : 0;

  return (
    <>
      <PageHead title="Plans and billing">The dashboard, weekly report and CSV uploads are free on every plan. Plans only change how many AI questions you can ask each month.</PageHead>
      {error && <div className="alert error" role="alert">{error}</div>}

      {credits && (
        <div className="card">
          <div className="card-head"><h2>Your plan: {credits.plan_name}</h2><span className="muted small">Resets {longDate(String(credits.reset_date).slice(0, 10))}</span></div>
          {credits.unlimited ? <p>You have unlimited AI questions.</p> : (
            <>
              <div className="progress" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={100} aria-label="AI questions used"><i style={{ width: `${used}%` }} /></div>
              <p className="muted small" style={{ marginTop: 8 }}>{credits.credits_used} of {credits.credits_limit} AI questions used this month.</p>
            </>
          )}
        </div>
      )}

      <div className="grid-3" style={{ marginTop: 16 }}>
        {plans.map((p) => {
          const current = credits && credits.plan === p.id;
          return (
            <div key={p.id} className={`plan-card ${current ? 'current' : ''}`}>
              <h3>{p.name}</h3>
              <div className="price">{p.amount === 0 ? 'Free' : money(p.amount / 100, 'INR')}{p.amount > 0 && <span className="muted small" style={{ fontWeight: 400 }}> / month</span>}</div>
              <p className="muted">{p.blurb}</p>
              {current ? <span className="pill good" style={{ justifySelf: 'start' }}>Your current plan</span>
                : p.amount === 0 ? null
                : <button className="btn" disabled={!!busy} onClick={() => buy(p)}>{busy === p.id ? 'Opening payment…' : `Choose ${p.name}`}</button>}
            </div>
          );
        })}
      </div>
      <p className="muted small" style={{ marginTop: 12 }}>Payments are handled by Razorpay. We never see your card details.</p>

      {history.length > 0 && (
        <div className="card">
          <div className="card-head"><h2>Payment history</h2></div>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Date</th><th>Plan</th><th className="r">Amount</th></tr></thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}><td>{longDate(String(h.created_at).slice(0, 10))}</td><td>{(plans.find((p) => p.id === h.plan) || {}).name || h.plan}</td><td className="r">{money(h.amount / 100, 'INR')}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

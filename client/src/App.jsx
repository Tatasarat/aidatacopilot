import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ResultsTable from './components/ResultsTable.jsx';
import ChartView from './components/ChartView.jsx';

const suggestions = [
  'Show total billing by medical condition',
  'Which hospital has the most patients?',
  'Average age by gender',
  'Show top 10 most common diagnoses',
  'Find anomalies in billing amounts',
];

const PLANS = {
  free: { name: 'Free', price: '$0/mo', queries: 10, color: '#4b5563', features: ['10 queries/month', 'Basic analysis', 'CSV upload', 'Bar charts'] },
  pro: { name: 'Pro', price: '$19/mo', queries: 100, color: '#3b82f6', features: ['100 queries/month', 'Advanced analysis', 'Multiple CSVs', 'PDF export', 'Trend charts', 'Correlation heatmap'] },
  enterprise: { name: 'Enterprise', price: '$99/mo', queries: 'Unlimited', color: '#8b5cf6', features: ['Unlimited queries', 'All Pro features', 'Priority support', 'Custom models', 'API access'] },
};

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0e1a; }
  .glow-line { height: 1px; background: linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent); }
  .card { background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 20px 24px; }
  .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
  .badge-blue { background: rgba(59,130,246,0.15); color: #60a5fa; }
  .badge-amber { background: rgba(245,158,11,0.15); color: #fbbf24; }
  .badge-green { background: rgba(16,185,129,0.15); color: #34d399; }
  .badge-purple { background: rgba(139,92,246,0.15); color: #a78bfa; }
  .badge-red { background: rgba(239,68,68,0.15); color: #f87171; }
  .chip { background: #1e293b; border: 1px solid #2d3748; border-radius: 20px; padding: 6px 14px; font-size: 12px; color: #94a3b8; cursor: pointer; transition: all 0.2s; white-space: nowrap; font-family: 'DM Sans', sans-serif; }
  .chip:hover { background: #2d3748; color: #e2e8f0; border-color: #3b82f6; }
  .ask-btn { background: linear-gradient(135deg, #3b82f6, #6366f1); border: none; border-radius: 8px; color: white; font-size: 14px; font-weight: 600; padding: 10px 22px; cursor: pointer; transition: opacity 0.2s, transform 0.1s; font-family: 'DM Sans', sans-serif; white-space: nowrap; }
  .ask-btn:hover { opacity: 0.9; transform: scale(1.02); }
  .ask-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .input-wrap { display: flex; align-items: center; background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 4px 4px 4px 16px; transition: border-color 0.2s; }
  .input-wrap:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
  .main-input { flex: 1; background: transparent; border: none; outline: none; color: #e2e8f0; font-size: 15px; font-family: 'DM Sans', sans-serif; padding: 10px 0; }
  .main-input::placeholder { color: #4b5563; }
  .sql-block { background: #0d1117; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; font-family: 'DM Mono', monospace; font-size: 13px; color: #7dd3fc; overflow-x: auto; line-height: 1.7; }
  .spinner { width: 18px; height: 18px; border: 2px solid #1e293b; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .fade-in { animation: fadeIn 0.4s ease forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .drop-zone { border: 2px dashed #1e293b; border-radius: 16px; padding: 60px 40px; text-align: center; cursor: pointer; transition: all 0.2s; }
  .drop-zone:hover, .drop-zone.active { border-color: #3b82f6; background: rgba(59,130,246,0.05); }
  .history-item { padding: 8px 12px; border-radius: 8px; font-size: 13px; color: #64748b; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 8px; }
  .history-item:hover { background: #1e293b; color: #94a3b8; }
  details summary { cursor: pointer; list-style: none; }
  details summary::-webkit-details-marker { display: none; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #0a0e1a; }
  ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
  .pulse-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; animation: pulse 1.5s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
  @keyframes micPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.15)} }
  .auth-input { width: 100%; background: #0a0e1a; border: 1px solid #1e293b; border-radius: 8px; padding: 12px 16px; color: #e2e8f0; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
  .auth-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
  .auth-input::placeholder { color: #374151; }
  .auth-btn { width: 100%; background: linear-gradient(135deg, #3b82f6, #6366f1); border: none; border-radius: 8px; color: white; font-size: 15px; font-weight: 600; padding: 13px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: opacity 0.2s, transform 0.1s; margin-top: 8px; }
  .auth-btn:hover { opacity: 0.9; transform: scale(1.01); }
  .auth-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .auth-link { color: #3b82f6; cursor: pointer; font-size: 13px; }
  .auth-link:hover { text-decoration: underline; }
  .input-label { font-size: 13px; color: #64748b; margin-bottom: 6px; display: block; font-weight: 500; }
  .error-msg { background: #1a0505; border: 1px solid #450a0a; border-radius: 8px; padding: 10px 14px; color: #f87171; font-size: 13px; margin-bottom: 16px; }
  .success-msg { background: #052011; border: 1px solid #064e1e; border-radius: 8px; padding: 10px 14px; color: #34d399; font-size: 13px; margin-bottom: 16px; }
  .otp-input { width: 52px; height: 56px; background: #0a0e1a; border: 1px solid #1e293b; border-radius: 8px; text-align: center; font-size: 22px; font-weight: 700; color: #e2e8f0; outline: none; font-family: 'DM Mono', monospace; transition: border-color 0.2s; }
  .otp-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
  .tab { padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; color: #64748b; transition: all 0.2s; border: none; background: transparent; font-family: 'DM Sans', sans-serif; }
  .tab.active { background: #1e293b; color: #e2e8f0; }
  .stat-card { background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; text-align: center; flex: 1; }
  .avatar-wrap { width: 88px; height: 88px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #6366f1); display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 700; color: white; cursor: pointer; position: relative; overflow: hidden; flex-shrink: 0; }
  .avatar-wrap img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
  .avatar-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); padding: 4px; text-align: center; font-size: 10px; color: white; }
  .history-card { background: #0d1117; border: 1px solid #1e293b; border-radius: 8px; padding: 14px 16px; margin-bottom: 8px; }
  .toggle-wrap { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #1e293b; }
  .toggle { width: 44px; height: 24px; border-radius: 12px; cursor: pointer; transition: background 0.2s; position: relative; border: none; }
  .toggle.on { background: #3b82f6; }
  .toggle.off { background: #1e293b; }
  .toggle-dot { width: 18px; height: 18px; background: white; border-radius: 50%; position: absolute; top: 3px; transition: left 0.2s; }
  .toggle-dot.on { left: 23px; }
  .toggle-dot.off { left: 3px; }
  .danger-btn { width: 100%; background: transparent; border: 1px solid #450a0a; border-radius: 8px; color: #f87171; font-size: 14px; font-weight: 600; padding: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; margin-top: 8px; }
  .danger-btn:hover { background: #1a0505; }
  .credit-bar { height: 6px; border-radius: 3px; background: #1e293b; overflow: hidden; margin-top: 6px; }
  .credit-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }
  .plan-card { background: #111827; border: 1px solid #1e293b; border-radius: 16px; padding: 24px; cursor: pointer; transition: all 0.2s; }
  .plan-card:hover { border-color: #3b82f6; transform: translateY(-2px); }
  .plan-card.current { border-color: #3b82f6; background: rgba(59,130,246,0.05); }
  .mic-btn { background: #1e293b; border: none; border-radius: 8px; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-right: 6px; font-size: 16px; flex-shrink: 0; transition: all 0.2s; }
  .mic-btn.listening { background: linear-gradient(135deg, #ef4444, #dc2626); animation: micPulse 1s ease-in-out infinite; }
  .mic-btn:hover { background: #2d3748; }
`;

// ─── Credits Bar ──────────────────────────────────────────
function CreditsBar({ credits, onUpgrade }) {
  if (!credits) return null;
  const isUnlimited = credits.plan === 'enterprise';
  const pct = isUnlimited ? 0 : Math.min(100, (credits.credits_used / credits.credits_limit) * 100);
  const barColor = pct > 80 ? '#f87171' : pct > 50 ? '#fbbf24' : '#34d399';
  const planColors = { free: '#4b5563', pro: '#3b82f6', enterprise: '#8b5cf6' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: planColors[credits.plan], fontWeight: 700, textTransform: 'uppercase' }}>{credits.plan}</span>
          {credits.plan !== 'enterprise' && <span style={{ fontSize: 11, color: '#4b5563' }}>{credits.credits_used}/{credits.credits_limit} queries</span>}
          {credits.plan === 'enterprise' && <span style={{ fontSize: 11, color: '#4b5563' }}>unlimited</span>}
        </div>
        {!isUnlimited && (
          <div className="credit-bar" style={{ width: 80 }}>
            <div className="credit-fill" style={{ width: `${pct}%`, background: barColor }}></div>
          </div>
        )}
      </div>
      {credits.plan !== 'enterprise' && (
        <button onClick={onUpgrade} style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', borderRadius: 6, color: 'white', fontSize: 11, fontWeight: 600, padding: '4px 10px', cursor: 'pointer' }}>
          Upgrade ↑
        </button>
      )}
    </div>
  );
}

// ─── Upgrade Page ─────────────────────────────────────────
function UpgradePage({ user, credits, onBack, onUpgrade, API_URL }) {
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchPaymentHistory();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/payment-history/${user.email}`);
      setPaymentHistory(res.data.payments || []);
    } catch (err) { console.error(err); }
  };

  const handlePayment = async (plan) => {
    setLoading(plan); setMsg({ type: '', text: '' });
    try {
      const orderRes = await axios.post(`${API_URL}/api/create-order`, { plan, email: user.email });
      const { order_id, amount, currency, name, key_id } = orderRes.data;

      const options = {
        key: key_id,
        amount, currency,
        name: 'InsightAI',
        description: name,
        order_id,
        prefill: { name: user.name, email: user.email },
        theme: { color: '#3b82f6' },
        handler: async (response) => {
          try {
            const verifyRes = await axios.post(`${API_URL}/api/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              email: user.email, plan
            });
            if (verifyRes.data.success) {
              setMsg({ type: 'success', text: `🎉 Successfully upgraded to ${plan}!` });
              fetchPaymentHistory();
              onUpgrade(plan);
            }
          } catch (err) {
            setMsg({ type: 'error', text: 'Payment verification failed.' });
          }
        },
        modal: { ondismiss: () => { setLoading(''); setMsg({ type: 'error', text: 'Payment cancelled.' }); } }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Payment failed' });
    } finally { setLoading(''); }
  };

  const planColors = { free: '#4b5563', pro: '#3b82f6', enterprise: '#8b5cf6' };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ borderBottom: '1px solid #1e293b', padding: '0 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', height: 56, gap: 12 }}>
          <button onClick={onBack} style={{ background: '#1e293b', border: '1px solid #2d3748', borderRadius: 8, color: '#94a3b8', fontSize: 13, padding: '6px 14px', cursor: 'pointer' }}>← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🧠</div>
            <span style={{ fontWeight: 600, fontSize: 15 }}>InsightAI — Upgrade Plan</span>
          </div>
        </div>
      </div>
      <div className="glow-line"></div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 12 }}>Choose your plan</h1>
          <p style={{ color: '#4b5563', fontSize: 15 }}>Secure payments powered by Razorpay</p>
          {msg.text && (
            <div style={{ background: msg.type === 'success' ? '#052011' : '#1a0505', border: `1px solid ${msg.type === 'success' ? '#064e1e' : '#450a0a'}`, borderRadius: 8, padding: '12px 20px', color: msg.type === 'success' ? '#34d399' : '#f87171', fontSize: 14, display: 'inline-block', marginTop: 16 }}>
              {msg.text}
            </div>
          )}
        </div>

        {credits && (
          <div className="card" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderColor: planColors[credits.plan] }}>
            <div>
              <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 4 }}>Current Plan</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: planColors[credits.plan], textTransform: 'capitalize' }}>{credits.plan}</p>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              {[{ label: 'Used', value: credits.credits_used }, { label: 'Remaining', value: credits.credits_remaining === 'unlimited' ? '∞' : credits.credits_remaining }, { label: 'Total/month', value: credits.credits_limit === 999999 ? '∞' : credits.credits_limit }].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: '#4b5563' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
          {Object.entries(PLANS).map(([key, plan]) => (
            <div key={key} className={`plan-card ${credits?.plan === key ? 'current' : ''}`} style={{ borderColor: credits?.plan === key ? plan.color : '#1e293b', position: 'relative' }}>
              {key === 'pro' && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 20, padding: '3px 14px', fontSize: 11, fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: plan.color }}>{plan.name}</h2>
              <p style={{ fontSize: 32, fontWeight: 700, marginBottom: 2 }}>{key === 'free' ? '₹0' : key === 'pro' ? '₹999' : '₹4,999'}</p>
              <p style={{ color: '#4b5563', fontSize: 13, marginBottom: 20 }}>/month · {plan.queries} queries</p>
              <div style={{ marginBottom: 24 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: '#34d399', fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>{f}</span>
                  </div>
                ))}
              </div>
              {credits?.plan === key ? (
                <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>✓ Current Plan</div>
              ) : key === 'free' ? (
                <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>Free Forever</div>
              ) : (
                <button onClick={() => handlePayment(key)} disabled={loading === key}
                  style={{ width: '100%', background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`, border: 'none', borderRadius: 8, color: 'white', fontSize: 14, fontWeight: 600, padding: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading === key ? <><span className="spinner" style={{ width: 16, height: 16 }}></span>Processing...</> : <>🔒 Pay {key === 'pro' ? '₹999' : '₹4,999'}/mo</>}
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 40, flexWrap: 'wrap' }}>
          {['🔒 256-bit SSL Encryption', '🏦 Razorpay Secured', '↩ Cancel Anytime', '📱 UPI, Cards, NetBanking'].map(b => (
            <div key={b} style={{ fontSize: 13, color: '#4b5563' }}>{b}</div>
          ))}
        </div>

        {paymentHistory.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment History</p>
              <button onClick={() => setShowHistory(!showHistory)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: 13, cursor: 'pointer' }}>{showHistory ? 'Hide' : 'Show'} ({paymentHistory.length})</button>
            </div>
            {showHistory && paymentHistory.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #0d1117' }}>
                <div>
                  <p style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500, textTransform: 'capitalize' }}>{p.plan} Plan</p>
                  <p style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>{new Date(p.created_at).toLocaleDateString()} · {p.payment_id || 'Pending'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>₹{(p.amount / 100).toLocaleString()}</p>
                  <span style={{ fontSize: 11, background: p.status === 'paid' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: p.status === 'paid' ? '#34d399' : '#fbbf24', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                    {p.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Correlation Heatmap ──────────────────────────────────
function CorrelationHeatmap({ correlations }) {
  if (!correlations || !correlations.length) return null;
  const getColor = (val) => {
    const abs = Math.abs(val);
    if (abs > 0.8) return val > 0 ? '#1d4ed8' : '#dc2626';
    if (abs > 0.6) return val > 0 ? '#3b82f6' : '#ef4444';
    if (abs > 0.4) return val > 0 ? '#93c5fd' : '#fca5a5';
    return '#1e293b';
  };
  return (
    <div>
      <p style={{ fontSize: 12, color: '#4b5563', marginBottom: 12 }}>Strong correlations found:</p>
      {correlations.slice(0, 6).map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8', width: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.col1}</span>
            <span style={{ fontSize: 11, color: '#374151' }}>↔</span>
            <span style={{ fontSize: 12, color: '#94a3b8', width: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.col2}</span>
          </div>
          <div style={{ width: 100, height: 20, background: '#0d1117', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: `${Math.abs(c.correlation) * 50}%`, background: getColor(c.correlation), transform: c.correlation > 0 ? 'none' : 'translateX(-100%)' }}></div>
          </div>
          <span style={{ fontSize: 12, color: getColor(c.correlation), fontWeight: 600, width: 40, textAlign: 'right', fontFamily: 'monospace' }}>{c.correlation}</span>
          <span style={{ fontSize: 10, color: '#4b5563', width: 50 }}>{c.strength}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Trend Chart ──────────────────────────────────────────
function TrendChart({ trends }) {
  if (!trends || !trends.length) return null;
  return (
    <div>
      {trends.slice(0, 4).map((t, i) => (
        <div key={i} style={{ marginBottom: 16, background: '#0d1117', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{t.column}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: t.direction === 'increasing' ? '#34d399' : '#f87171' }}>
                {t.direction === 'increasing' ? '↑' : '↓'} {Math.abs(t.change_pct)}%
              </span>
              <span style={{ fontSize: 11, color: '#374151' }}>avg: {t.mean}</span>
            </div>
          </div>
          <div style={{ height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, Math.abs(t.change_pct))}%`, background: t.direction === 'increasing' ? '#34d399' : '#f87171', borderRadius: 2 }}></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Cluster Visualization ────────────────────────────────
function ClusterViz({ clusters }) {
  if (!clusters || !clusters.length) return null;
  const colors = ['#3b82f6', '#8b5cf6', '#34d399', '#fbbf24', '#f87171'];
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {clusters.map((c, i) => <div key={i} style={{ flex: c.size, background: colors[i % colors.length], borderRadius: 4, height: 8, opacity: 0.8 }}></div>)}
      </div>
      {clusters.map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, background: '#0d1117', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[i % colors.length], flexShrink: 0 }}></div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>Cluster {i + 1}</span>
            <span style={{ fontSize: 12, color: '#4b5563', marginLeft: 8 }}>{c.size} rows ({c.percentage}%)</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(c.stats || {}).slice(0, 2).map(([k, v]) => (
              <span key={k} style={{ fontSize: 11, color: '#374151' }}>{k}: {v}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PDF Export ───────────────────────────────────────────
function exportToPDF(data, question) {
  const content = `InsightAI Analysis Report\n========================\nQuestion: ${question}\nDate: ${new Date().toLocaleDateString()}\n\nSUMMARY\n-------\n${data.explanation}\n\nANOMALIES\n---------\n${data.anomalies}\n\nSQL GENERATED\n-------------\n${data.sql}\n\nRESULTS (first 20 rows)\n-----------------------\n${data.results ? JSON.stringify(data.results.slice(0, 20), null, 2) : 'No results'}\n\nTRENDS\n------\n${data.trends ? data.trends.map(t => `${t.column}: ${t.direction} (${t.change_pct}% change)`).join('\n') : 'No trends'}\n\nCORRELATIONS\n------------\n${data.correlations ? data.correlations.map(c => `${c.col1} ↔ ${c.col2}: ${c.correlation}`).join('\n') : 'No correlations'}`;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `insightai-report-${Date.now()}.txt`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Topbar ───────────────────────────────────────────────
function Topbar({ user, onLogout, showStatus, rowCount, onProfile, onUpgrade, credits }) {
  return (
    <>
      <div style={{ borderBottom: '1px solid #1e293b', padding: '0 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🧠</div>
            <span style={{ fontWeight: 600, fontSize: 15 }}>InsightAI</span>
            <span style={{ background: '#1e293b', color: '#64748b', fontSize: 10, padding: '2px 8px', borderRadius: 4 }}>AI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {showStatus && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="pulse-dot"></div><span style={{ fontSize: 12, color: '#4b5563' }}>{rowCount} rows loaded</span></div>}
            {user && <CreditsBar credits={credits} onUpgrade={onUpgrade} />}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div onClick={onProfile} title="View Profile" style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer' }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 13, color: '#64748b' }}>{user.name}</span>
                <button onClick={onLogout} style={{ background: '#1e293b', border: '1px solid #2d3748', borderRadius: 6, color: '#94a3b8', fontSize: 12, padding: '5px 12px', cursor: 'pointer' }}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="glow-line"></div>
    </>
  );
}

// ─── Login Page ───────────────────────────────────────────
function LoginPage({ onLogin, onGoSignup, onGoForgot, API_URL }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${API_URL}/api/login`, { email, password });
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', flexDirection: 'column' }}>
      <Topbar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div className="fade-in" style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>🧠</div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: 6 }}>Welcome back</h1>
            <p style={{ color: '#4b5563', fontSize: 14 }}>Sign in to your InsightAI account</p>
          </div>
          <div className="card" style={{ padding: 28 }}>
            {error && <div className="error-msg">⚠️ {error}</div>}
            <div style={{ marginBottom: 16 }}>
              <label className="input-label">Email address</label>
              <input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="input-label" style={{ margin: 0 }}>Password</label>
                <span className="auth-link" onClick={onGoForgot}>Forgot password?</span>
              </div>
              <input className="auth-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <button className="auth-btn" onClick={handleLogin} disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }}></span>Signing in...</> : 'Sign in →'}
            </button>
          </div>
          <p style={{ textAlign: 'center', color: '#4b5563', fontSize: 13, marginTop: 20 }}>
            Don't have an account? <span className="auth-link" onClick={onGoSignup}>Create one free →</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Signup Page ──────────────────────────────────────────
function SignupPage({ onSignup, onGoLogin, API_URL }) {
  const [step, setStep] = useState('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const handleSendOTP = async () => {
    if (!name || !email || !password || !confirm) { setError('Please fill in all fields'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      await axios.post(`${API_URL}/api/send-otp`, { email });
      setSuccess('OTP sent to your email!');
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleOTPChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs[index + 1].current?.focus();
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) { setError('Please enter the complete 6-digit OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${API_URL}/api/verify-otp`, { email, otp: otpCode, name, password });
      setSuccess('Account created successfully!');
      setTimeout(() => onSignup(res.data.user), 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const handleResendOTP = async () => {
    setLoading(true); setError(''); setOtp(['', '', '', '', '', '']);
    try {
      await axios.post(`${API_URL}/api/send-otp`, { email });
      setSuccess('New OTP sent!');
    } catch (err) { setError('Failed to resend OTP'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', flexDirection: 'column' }}>
      <Topbar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div className="fade-in" style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>🧠</div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: 6 }}>
              {step === 'form' ? 'Create your account' : 'Verify your email'}
            </h1>
            <p style={{ color: '#4b5563', fontSize: 14 }}>
              {step === 'form' ? 'Start analyzing your data with AI' : `We sent a 6-digit code to ${email}`}
            </p>
          </div>
          <div className="card" style={{ padding: 28 }}>
            {error && <div className="error-msg">⚠️ {error}</div>}
            {success && <div className="success-msg">✓ {success}</div>}
            {step === 'form' ? (
              <>
                <div style={{ marginBottom: 16 }}><label className="input-label">Full name</label><input className="auth-input" type="text" placeholder="John Smith" value={name} onChange={e => setName(e.target.value)} /></div>
                <div style={{ marginBottom: 16 }}><label className="input-label">Email address</label><input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div style={{ marginBottom: 16 }}><label className="input-label">Password</label><input className="auth-input" type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} /></div>
                <div style={{ marginBottom: 20 }}><label className="input-label">Confirm password</label><input className="auth-input" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
                <button className="auth-btn" onClick={handleSendOTP} disabled={loading}>
                  {loading ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }}></span>Sending OTP...</> : 'Send verification code →'}
                </button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
                  {otp.map((digit, i) => (
                    <input key={i} ref={otpRefs[i]} className="otp-input" type="text" maxLength={1} value={digit}
                      onChange={e => handleOTPChange(i, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus(); }} />
                  ))}
                </div>
                <button className="auth-btn" onClick={handleVerifyOTP} disabled={loading}>
                  {loading ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }}></span>Verifying...</> : 'Verify & Create Account →'}
                </button>
                <p style={{ textAlign: 'center', color: '#4b5563', fontSize: 13, marginTop: 16 }}>Didn't receive it? <span className="auth-link" onClick={handleResendOTP}>Resend OTP</span></p>
                <p style={{ textAlign: 'center', marginTop: 8 }}><span className="auth-link" onClick={() => { setStep('form'); setError(''); setSuccess(''); }}>← Go back</span></p>
              </>
            )}
          </div>
          <p style={{ textAlign: 'center', color: '#4b5563', fontSize: 13, marginTop: 20 }}>
            Already have an account? <span className="auth-link" onClick={onGoLogin}>Sign in →</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Forgot Password ──────────────────────────────────────
function ForgotPasswordPage({ onGoLogin, API_URL }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) { setError('Please enter your email'); return; }
    setLoading(true); setError('');
    try {
      await axios.post(`${API_URL}/api/forgot-password`, { email });
      setSuccess('Password reset link sent! Check your email.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', flexDirection: 'column' }}>
      <Topbar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div className="fade-in" style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>🔒</div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: 6 }}>Forgot password?</h1>
            <p style={{ color: '#4b5563', fontSize: 14 }}>Enter your email to receive a reset link</p>
          </div>
          <div className="card" style={{ padding: 28 }}>
            {error && <div className="error-msg">⚠️ {error}</div>}
            {success && <div className="success-msg">✓ {success}</div>}
            {!success && (
              <>
                <div style={{ marginBottom: 20 }}><label className="input-label">Email address</label><input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} /></div>
                <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }}></span>Sending...</> : 'Send reset link →'}
                </button>
              </>
            )}
          </div>
          <p style={{ textAlign: 'center', color: '#4b5563', fontSize: 13, marginTop: 20 }}><span className="auth-link" onClick={onGoLogin}>← Back to login</span></p>
        </div>
      </div>
    </div>
  );
}

// ─── Reset Password ───────────────────────────────────────
function ResetPasswordPage({ token, onGoLogin, API_URL }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!password || !confirm) { setError('Please fill in all fields'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      await axios.post(`${API_URL}/api/reset-password`, { token, password });
      setSuccess('Password updated! Redirecting...');
      setTimeout(() => onGoLogin(), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', flexDirection: 'column' }}>
      <Topbar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div className="fade-in" style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>🔑</div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: 6 }}>Set new password</h1>
          </div>
          <div className="card" style={{ padding: 28 }}>
            {error && <div className="error-msg">⚠️ {error}</div>}
            {success && <div className="success-msg">✓ {success}</div>}
            {!success && (
              <>
                <div style={{ marginBottom: 16 }}><label className="input-label">New password</label><input className="auth-input" type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} /></div>
                <div style={{ marginBottom: 20 }}><label className="input-label">Confirm new password</label><input className="auth-input" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
                <button className="auth-btn" onClick={handleReset} disabled={loading}>
                  {loading ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }}></span>Updating...</> : 'Update password →'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────
function ProfilePage({ user, credits, onBack, onLogout, onUpgrade, API_URL }) {
  const [tab, setTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const avatarInputRef = useRef(null);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/profile/${user.email}`);
      setProfile(res.data.profile);
      setHistory(res.data.history);
      setBio(res.data.profile.bio || '');
      setAvatarUrl(res.data.profile.avatar_url || '');
      setNotifications(res.data.profile.notifications_enabled ?? true);
    } catch (err) { console.error('Profile error:', err); }
    finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    setSaving(true); setMsg({ type: '', text: '' });
    try {
      await axios.post(`${API_URL}/api/profile/update`, { email: user.email, bio, avatar_url: avatarUrl, notifications_enabled: notifications });
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) { setMsg({ type: 'error', text: 'Failed to update profile' }); }
    finally { setSaving(false); }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) { setMsg({ type: 'error', text: 'Fill in all fields' }); return; }
    if (newPassword !== confirmPassword) { setMsg({ type: 'error', text: 'New passwords do not match' }); return; }
    if (newPassword.length < 6) { setMsg({ type: 'error', text: 'Password must be at least 6 characters' }); return; }
    setSaving(true); setMsg({ type: '', text: '' });
    try {
      await axios.post(`${API_URL}/api/change-password`, { email: user.email, oldPassword, newPassword });
      setMsg({ type: 'success', text: 'Password changed!' });
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.error || 'Failed' }); }
    finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { setMsg({ type: 'error', text: 'Enter your password to confirm' }); return; }
    if (!window.confirm('Are you sure? This cannot be undone!')) return;
    try {
      await axios.delete(`${API_URL}/api/delete-account`, { data: { email: user.email, password: deletePassword } });
      onLogout();
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.error || 'Failed' }); }
  };

  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }}></div></div>;

  const planColors = { free: '#4b5563', pro: '#3b82f6', enterprise: '#8b5cf6' };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ borderBottom: '1px solid #1e293b', padding: '0 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onBack} style={{ background: '#1e293b', border: '1px solid #2d3748', borderRadius: 8, color: '#94a3b8', fontSize: 13, padding: '6px 14px', cursor: 'pointer' }}>← Back</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🧠</div>
              <span style={{ fontWeight: 600, fontSize: 15 }}>InsightAI</span>
            </div>
          </div>
          <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>Logout</button>
        </div>
      </div>
      <div className="glow-line"></div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
          <div className="avatar-wrap" onClick={() => avatarInputRef.current?.click()}>
            {avatarUrl ? <img src={avatarUrl} alt="avatar" /> : user.name?.charAt(0).toUpperCase()}
            <div className="avatar-overlay">Edit</div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{user.name}</h2>
            <p style={{ color: '#4b5563', fontSize: 14, marginBottom: 8 }}>{user.email}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ background: `${planColors[credits?.plan || 'free']}22`, color: planColors[credits?.plan || 'free'], fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, textTransform: 'uppercase' }}>{credits?.plan || 'free'} plan</span>
              {credits?.plan !== 'enterprise' && (
                <button onClick={onUpgrade} style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', borderRadius: 6, color: 'white', fontSize: 11, fontWeight: 600, padding: '3px 10px', cursor: 'pointer' }}>Upgrade ↑</button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Queries Used', value: credits?.credits_used || 0 },
              { label: 'Remaining', value: credits?.credits_remaining === 'unlimited' ? '∞' : credits?.credits_remaining || 0 },
              { label: 'History', value: history?.length || 0 },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ minWidth: 80 }}>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6', marginBottom: 4 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#111827', borderRadius: 10, padding: 4, border: '1px solid #1e293b' }}>
          {[['overview', '👤 Overview'], ['history', '📋 History'], ['settings', '⚙️ Settings']].map(([t, label]) => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setMsg({ type: '', text: '' }); }} style={{ flex: 1 }}>{label}</button>
          ))}
        </div>

        {msg.text && (
          <div style={{ background: msg.type === 'success' ? '#052011' : '#1a0505', border: `1px solid ${msg.type === 'success' ? '#064e1e' : '#450a0a'}`, borderRadius: 8, padding: '10px 16px', color: msg.type === 'success' ? '#34d399' : '#f87171', fontSize: 13, marginBottom: 16 }}>
            {msg.type === 'success' ? '✓' : '⚠️'} {msg.text}
          </div>
        )}

        {tab === 'overview' && (
          <div className="fade-in">
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Personal Info</p>
              <div style={{ marginBottom: 16 }}><label className="input-label">Full Name</label><div style={{ background: '#0a0e1a', border: '1px solid #1e293b', borderRadius: 8, padding: '12px 16px', color: '#64748b', fontSize: 14 }}>{user.name}</div></div>
              <div style={{ marginBottom: 16 }}><label className="input-label">Email</label><div style={{ background: '#0a0e1a', border: '1px solid #1e293b', borderRadius: 8, padding: '12px 16px', color: '#64748b', fontSize: 14 }}>{user.email}</div></div>
              <div style={{ marginBottom: 20 }}>
                <label className="input-label">Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3}
                  style={{ width: '100%', background: '#0a0e1a', border: '1px solid #1e293b', borderRadius: 8, padding: '12px 16px', color: '#e2e8f0', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', resize: 'vertical' }} />
              </div>
              <button className="auth-btn" onClick={handleSaveProfile} disabled={saving} style={{ marginTop: 0 }}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
            <div className="card">
              <p style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Recent Activity</p>
              {history.length === 0 ? <p style={{ color: '#374151', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No analyses yet!</p> :
                history.slice(0, 5).map((h, i) => (
                  <div key={i} className="history-card">
                    <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>💬 {h.question}</p>
                    <p style={{ color: '#374151', fontSize: 11 }}>{new Date(h.created_at).toLocaleDateString()} · {h.rows_returned} rows</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="fade-in">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analysis History</p>
                <span style={{ color: '#374151', fontSize: 12 }}>{history.length} total</span>
              </div>
              {history.length === 0 ? <p style={{ color: '#374151', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>No analyses yet!</p> :
                history.map((h, i) => (
                  <div key={i} className="history-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <p style={{ color: '#94a3b8', fontSize: 13, flex: 1, marginRight: 12 }}>💬 {h.question}</p>
                      <span style={{ color: '#374151', fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(h.created_at).toLocaleDateString()}</span>
                    </div>
                    {h.sql_generated && <pre style={{ background: '#0a0e1a', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#7dd3fc', overflow: 'auto', margin: 0 }}>{h.sql_generated}</pre>}
                    <p style={{ color: '#374151', fontSize: 11, marginTop: 8 }}>{h.rows_returned} rows returned</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="fade-in">
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Preferences</p>
              <div className="toggle-wrap">
                <div><p style={{ fontSize: 14, color: '#e2e8f0', marginBottom: 2 }}>Email Notifications</p><p style={{ fontSize: 12, color: '#4b5563' }}>Receive updates via email</p></div>
                <button className={`toggle ${notifications ? 'on' : 'off'}`} onClick={() => setNotifications(!notifications)}><div className={`toggle-dot ${notifications ? 'on' : 'off'}`}></div></button>
              </div>
              <button className="auth-btn" onClick={handleSaveProfile} disabled={saving} style={{ marginTop: 16 }}>{saving ? 'Saving...' : 'Save Preferences'}</button>
            </div>
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Change Password</p>
              <div style={{ marginBottom: 12 }}><label className="input-label">Current Password</label><input className="auth-input" type="password" placeholder="••••••••" value={oldPassword} onChange={e => setOldPassword(e.target.value)} /></div>
              <div style={{ marginBottom: 12 }}><label className="input-label">New Password</label><input className="auth-input" type="password" placeholder="Min. 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
              <div style={{ marginBottom: 16 }}><label className="input-label">Confirm New Password</label><input className="auth-input" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
              <button className="auth-btn" onClick={handleChangePassword} disabled={saving}>{saving ? 'Updating...' : 'Update Password'}</button>
            </div>
            <div className="card" style={{ borderColor: '#450a0a' }}>
              <p style={{ fontSize: 13, color: '#f87171', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>⚠️ Danger Zone</p>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>Deleting your account is permanent and cannot be undone.</p>
              <div style={{ marginBottom: 12 }}><label className="input-label">Enter password to confirm</label><input className="auth-input" type="password" placeholder="••••••••" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} /></div>
              <button className="danger-btn" onClick={handleDeleteAccount}>Delete My Account</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────
export default function App() {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');

  const [screen, setScreen] = useState(resetToken ? 'reset' : 'login');
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(null);
  const [tableName, setTableName] = useState(null);
  const [csvInfo, setCsvInfo] = useState(null);
  const [csvFiles, setCsvFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('results');
  const [listening, setListening] = useState(false);
  const fileRef = useRef(null);
  const recognitionRef = useRef(null);

  const fetchCredits = async (email) => {
    try {
      const res = await axios.get(`${API_URL}/api/credits/${email}`);
      setCredits(res.data);
    } catch (err) { console.error('Credits error:', err); }
  };

  const handleLogin = (u) => { setUser(u); setScreen('upload'); fetchCredits(u.email); };
  const handleSignup = (u) => { setUser(u); setScreen('upload'); fetchCredits(u.email); };
  const handleLogout = () => { setUser(null); setScreen('login'); setData(null); setHistory([]); setCsvInfo(null); setTableName(null); setCredits(null); setCsvFiles([]); };
  const handleUpgrade = (plan) => { fetchCredits(user.email); setScreen(csvInfo ? 'chat' : 'upload'); };

  // ── Voice to Text ────────────────────────────────────────
  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input not supported. Please use Chrome or Edge.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setQuestion(transcript);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone in browser settings.');
      }
    };

    recognition.start();
  };

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.csv')) { setUploadError('Please upload a .csv file'); return; }
    setUploading(true); setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API_URL}/api/upload`, formData);
      setCsvInfo(res.data);
      setTableName(res.data.tableName);
      setCsvFiles(prev => [...prev.filter(f => f.name !== file.name), { name: file.name, ...res.data }]);
      setScreen('chat');
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleQuery = async (q) => {
    const query = q || question;
    if (!query.trim()) return;
    setLoading(true); setError(null); setData(null); setActiveTab('results');
    try {
      const res = await axios.post(`${API_URL}/api/query`, { question: query, tableName, email: user?.email });
      if (res.data.upgrade_required) { setError('Credit limit reached! Please upgrade.'); setScreen('upgrade'); return; }
      setData(res.data);
      setHistory(h => [{ question: query, time: new Date().toLocaleTimeString() }, ...h.slice(0, 4)]);
      if (user?.email) {
        await axios.post(`${API_URL}/api/save-analysis`, {
          email: user.email, question: query,
          sql_generated: res.data.sql,
          rows_returned: res.data.results?.length || 0
        }).catch(() => {});
        fetchCredits(user.email);
      }
    } catch (err) {
      if (err.response?.data?.upgrade_required) { setError('Credit limit reached!'); setScreen('upgrade'); }
      else { setError(err.response?.data?.error || 'Something went wrong'); }
    } finally { setLoading(false); }
  };

  if (screen === 'login') return <><style>{STYLES}</style><LoginPage onLogin={handleLogin} onGoSignup={() => setScreen('signup')} onGoForgot={() => setScreen('forgot')} API_URL={API_URL} /></>;
  if (screen === 'signup') return <><style>{STYLES}</style><SignupPage onSignup={handleSignup} onGoLogin={() => setScreen('login')} API_URL={API_URL} /></>;
  if (screen === 'forgot') return <><style>{STYLES}</style><ForgotPasswordPage onGoLogin={() => setScreen('login')} API_URL={API_URL} /></>;
  if (screen === 'reset') return <><style>{STYLES}</style><ResetPasswordPage token={resetToken} onGoLogin={() => setScreen('login')} API_URL={API_URL} /></>;
  if (screen === 'profile') return <><style>{STYLES}</style><ProfilePage user={user} credits={credits} onBack={() => setScreen(csvInfo ? 'chat' : 'upload')} onLogout={handleLogout} onUpgrade={() => setScreen('upgrade')} API_URL={API_URL} /></>;
  if (screen === 'upgrade') return <><style>{STYLES}</style><UpgradePage user={user} credits={credits} onBack={() => setScreen(csvInfo ? 'chat' : 'upload')} onUpgrade={handleUpgrade} API_URL={API_URL} /></>;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0', fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <style>{STYLES}</style>
      <Topbar user={user} onLogout={handleLogout} showStatus={screen === 'chat'} rowCount={csvInfo?.rowCount} onProfile={() => setScreen('profile')} onUpgrade={() => setScreen('upgrade')} credits={credits} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {/* UPLOAD SCREEN */}
        {screen === 'upload' && (
          <div className="fade-in">
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h1 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 12 }}>
                Upload your CSV,<br />
                <span style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ask anything about it</span>
              </h1>
              <p style={{ color: '#4b5563', fontSize: 15 }}>AI reads your data, writes SQL, detects anomalies, explains in plain English</p>
            </div>

            <div className={`drop-zone ${dragOver ? 'active' : ''}`} onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
              {uploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }}></div>
                  <p style={{ color: '#94a3b8' }}>Parsing CSV and loading into database...</p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
                  <p style={{ fontSize: 16, fontWeight: 500, color: '#94a3b8', marginBottom: 8 }}>Drop your CSV file here</p>
                  <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 20 }}>or click to browse</p>
                  <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, color: 'white' }}>Choose CSV File</div>
                </div>
              )}
            </div>

            {uploadError && <div style={{ marginTop: 16, background: '#1a0505', border: '1px solid #450a0a', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 14 }}>⚠️ {uploadError}</div>}

            {csvFiles.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Recent Files</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {csvFiles.map((f, i) => (
                    <button key={i} onClick={() => { setCsvInfo(f); setTableName(f.tableName); setScreen('chat'); }}
                      style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                      📄 {f.name} <span style={{ color: '#374151', fontSize: 11 }}>{f.rowCount} rows</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 40 }}>
              {[
                { icon: '🧠', title: 'Natural Language', desc: 'Ask in plain English or by voice' },
                { icon: '🎤', title: 'Voice Input', desc: 'Speak your question, AI understands' },
                { icon: '📊', title: 'Advanced Charts', desc: 'Trends, correlations, clusters' }
              ].map(f => (
                <div key={f.title} className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{f.title}</p>
                  <p style={{ color: '#4b5563', fontSize: 13, lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHAT SCREEN */}
        {screen === 'chat' && (
          <div className="fade-in">
            <div className="card" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>📄</span>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>CSV loaded successfully</p>
                    <p style={{ color: '#4b5563', fontSize: 12 }}>{csvInfo?.rowCount} rows · {csvInfo?.columns?.length} columns</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge badge-green">✓ Ready</span>
                  {csvFiles.length > 1 && csvFiles.map((f, i) => (
                    <button key={i} onClick={() => { setCsvInfo(f); setTableName(f.tableName); setData(null); }}
                      style={{ background: tableName === f.tableName ? '#1e293b' : 'transparent', border: '1px solid #2d3748', borderRadius: 6, color: '#94a3b8', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>
                      📄 {f.name}
                    </button>
                  ))}
                  <button onClick={() => { setScreen('upload'); setData(null); setHistory([]); }} style={{ background: '#1e293b', border: '1px solid #2d3748', borderRadius: 8, color: '#94a3b8', fontSize: 12, padding: '6px 14px', cursor: 'pointer' }}>↑ Add CSV</button>
                </div>
              </div>
            </div>

            {/* Credit warning */}
            {credits && credits.plan !== 'enterprise' && credits.credits_remaining <= 2 && (
              <div style={{ background: '#1a0a05', border: '1px solid #92400e', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#fbbf24', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>⚠️ Only {credits.credits_remaining} queries remaining!</span>
                <button onClick={() => setScreen('upgrade')} style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', borderRadius: 6, color: 'white', fontSize: 12, fontWeight: 600, padding: '4px 12px', cursor: 'pointer' }}>Upgrade Now</button>
              </div>
            )}

            {/* Voice + Text Input */}
            <div style={{ marginBottom: 12 }}>
              <div className="input-wrap">
                <span style={{ fontSize: 16, marginRight: 8 }}>💬</span>
                <input
                  className="main-input"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleQuery()}
                  placeholder={listening ? '🎤 Listening... speak now' : 'Ask anything or click 🎤 to speak...'}
                />
                <button
                  className={`mic-btn ${listening ? 'listening' : ''}`}
                  onClick={toggleListening}
                  title={listening ? 'Stop listening' : 'Voice input'}>
                  {listening ? '⏹' : '🎤'}
                </button>
                <button className="ask-btn" disabled={loading || !question.trim()} onClick={() => handleQuery()}>
                  {loading ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }}></span>Thinking</> : 'Ask AI →'}
                </button>
              </div>
              {listening && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '6px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
                  <div style={{ width: 8, height: 8, background: '#ef4444', borderRadius: '50%', animation: 'micPulse 1s ease-in-out infinite' }}></div>
                  <span style={{ fontSize: 12, color: '#f87171' }}>Listening... speak your question clearly</span>
                  <span style={{ fontSize: 12, color: '#374151', marginLeft: 'auto' }}>Click ⏹ to stop</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
              {suggestions.map(s => <button key={s} className="chip" onClick={() => { setQuestion(s); handleQuery(s); }}>{s}</button>)}
            </div>

            {loading && (
              <div className="card fade-in" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto 16px' }}></div>
                <p style={{ color: '#94a3b8', fontSize: 15, marginBottom: 4 }}>Analyzing your data...</p>
                <p style={{ color: '#4b5563', fontSize: 13 }}>Generating SQL → Running query → Detecting anomalies → Explaining results</p>
              </div>
            )}

            {error && (
              <div className="card fade-in" style={{ borderColor: '#450a0a', background: '#1a0505' }}>
                <p style={{ color: '#f87171', fontWeight: 600, marginBottom: 4 }}>⚠️ Error</p>
                <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>
              </div>
            )}

            {data && !loading && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span className="badge badge-blue">📊 Summary</span>
                    <button onClick={() => exportToPDF(data, question)} style={{ background: '#1e293b', border: '1px solid #2d3748', borderRadius: 6, color: '#94a3b8', fontSize: 12, padding: '4px 12px', cursor: 'pointer' }}>📄 Export</button>
                  </div>
                  <p style={{ color: '#cbd5e1', lineHeight: 1.7, fontSize: 15 }}>{data.explanation}</p>
                </div>

                {data.anomalies && (
                  <div className="card" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
                    <div style={{ marginBottom: 12 }}><span className="badge badge-amber">⚠️ Anomalies</span></div>
                    <p style={{ color: '#cbd5e1', lineHeight: 1.7, fontSize: 14, whiteSpace: 'pre-line' }}>{data.anomalies}</p>
                  </div>
                )}

                {(data.trends?.length > 0 || data.correlations?.length > 0 || data.clusters?.length > 0) && (
                  <div className="card">
                    <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#0d1117', borderRadius: 8, padding: 4 }}>
                      {[['results', '📋 Results'], ['trends', '📈 Trends'], ['correlations', '🔗 Correlations'], ['clusters', '🔵 Clusters']].map(([t, label]) => (
                        <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)} style={{ flex: 1, fontSize: 12 }}>{label}</button>
                      ))}
                    </div>
                    {activeTab === 'results' && <div><ChartView data={data.results} />{data.results?.length > 0 && <div style={{ marginTop: 16 }}><ResultsTable data={data.results} /></div>}</div>}
                    {activeTab === 'trends' && <TrendChart trends={data.trends} />}
                    {activeTab === 'correlations' && <CorrelationHeatmap correlations={data.correlations} />}
                    {activeTab === 'clusters' && <ClusterViz clusters={data.clusters} />}
                  </div>
                )}

                <details className="card">
                  <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="badge badge-green">🔍 Generated SQL</span>
                    <span style={{ color: '#4b5563', fontSize: 12 }}>click to expand ▾</span>
                  </summary>
                  <div style={{ marginTop: 14 }}><pre className="sql-block">{data.sql}</pre></div>
                </details>

                {!(data.trends?.length > 0 || data.correlations?.length > 0 || data.clusters?.length > 0) && data.results?.length > 0 && (
                  <>
                    <div className="card"><div style={{ marginBottom: 14 }}><span className="badge badge-blue">📈 Chart</span></div><ChartView data={data.results} /></div>
                    <div className="card">
                      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="badge badge-green">📋 Results</span>
                        <span style={{ color: '#4b5563', fontSize: 12 }}>{data.results.length} rows</span>
                      </div>
                      <ResultsTable data={data.results} />
                    </div>
                  </>
                )}
              </div>
            )}

            {history.length > 0 && !loading && (
              <div style={{ marginTop: 32 }}>
                <p style={{ color: '#374151', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Recent queries</p>
                {history.map((h, i) => (
                  <div key={i} className="history-item" onClick={() => { setQuestion(h.question); handleQuery(h.question); }}>
                    <span style={{ color: '#374151' }}>↩</span><span style={{ flex: 1 }}>{h.question}</span><span style={{ fontSize: 11 }}>{h.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
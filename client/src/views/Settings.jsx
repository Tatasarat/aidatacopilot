import React, { useState } from 'react';
import { api, errorMessage } from '../api';
import { PageHead } from '../components/Shared';
import { useToast } from '../components/Toast';

export default function Settings({ user, onUser, onSignOut }) {
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [currency, setCurrency] = useState(user.currency || 'INR');
  const [weekly, setWeekly] = useState(user.notifications_enabled !== false);
  const [pw, setPw] = useState({ oldPassword: '', newPassword: '' });
  const [delPw, setDelPw] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ where: '', kind: '', text: '' });

  const say = (where, kind, text) => setMsg({ where, kind, text });
  const Msg = ({ where }) => (msg.where === where && msg.text ? <div className={`alert ${msg.kind}`} role={msg.kind === 'error' ? 'alert' : 'status'}>{msg.text}</div> : null);

  async function saveProfile(e) {
    e.preventDefault(); setBusy('profile'); say('', '', '');
    try {
      const out = await api.updateSettings({ name, currency, notifications_enabled: weekly });
      onUser(out.user); toast('Settings saved.');
    } catch (err) { say('profile', 'error', errorMessage(err)); } finally { setBusy(''); }
  }

  async function changePassword(e) {
    e.preventDefault(); setBusy('pw'); say('', '', '');
    try {
      const out = await api.changePassword(pw.oldPassword, pw.newPassword);
      setPw({ oldPassword: '', newPassword: '' }); say('pw', 'ok', out.message);
    } catch (err) { say('pw', 'error', errorMessage(err)); } finally { setBusy(''); }
  }

  async function removeAccount(e) {
    e.preventDefault();
    if (!window.confirm('Delete your account and all your data? This cannot be undone.')) return;
    setBusy('del'); say('', '', '');
    try { await api.deleteAccount(delPw); onSignOut(); } catch (err) { say('del', 'error', errorMessage(err)); setBusy(''); }
  }

  return (
    <>
      <PageHead title="Settings" />
      <div className="grid-2">
        <form className="card" style={{ marginTop: 0 }} onSubmit={saveProfile}>
          <h2 style={{ marginBottom: 14 }}>Profile</h2>
          <Msg where="profile" />
          <div className="field"><label htmlFor="s-email">Email</label><input id="s-email" className="input" value={user.email} disabled /></div>
          <div className="field"><label htmlFor="s-name">Name</label><input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
          <div className="field">
            <label htmlFor="s-cur">Currency for your numbers</label>
            <select id="s-cur" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="INR">Indian rupee (₹)</option><option value="USD">US dollar ($)</option><option value="GBP">British pound (£)</option><option value="EUR">Euro (€)</option>
            </select>
            <span className="hint">This changes how amounts are shown. It does not convert them. Upload your data in one currency.</span>
          </div>
          <label className="check" style={{ borderBottom: 0, padding: '4px 0 14px' }}>
            <input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} />
            <span><b>Email me the weekly report</b><br /><span className="muted small">Sent on Mondays, only when you have data uploaded.</span></span>
          </label>
          <button className="btn" disabled={busy === 'profile'}>{busy === 'profile' ? 'Saving…' : 'Save changes'}</button>
        </form>

        <form className="card" style={{ marginTop: 0 }} onSubmit={changePassword}>
          <h2 style={{ marginBottom: 14 }}>Password</h2>
          <Msg where="pw" />
          <div className="field"><label htmlFor="p-old">Current password</label><input id="p-old" className="input" type="password" autoComplete="current-password" value={pw.oldPassword} onChange={(e) => setPw({ ...pw, oldPassword: e.target.value })} /></div>
          <div className="field"><label htmlFor="p-new">New password</label><input id="p-new" className="input" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /><span className="hint">At least 8 characters.</span></div>
          <button className="btn secondary" disabled={busy === 'pw' || !pw.oldPassword || !pw.newPassword}>{busy === 'pw' ? 'Updating…' : 'Update password'}</button>
        </form>
      </div>

      <form className="card" onSubmit={removeAccount}>
        <h2 style={{ marginBottom: 6 }}>Delete your account</h2>
        <p className="muted" style={{ marginBottom: 14, maxWidth: '62ch' }}>This removes your account, store data, question history and credits. Payment records that must be kept for accounting stay on file.</p>
        <Msg where="del" />
        <div className="row">
          <input className="input" style={{ maxWidth: 280 }} type="password" placeholder="Type your password to confirm" autoComplete="current-password" aria-label="Your password" value={delPw} onChange={(e) => setDelPw(e.target.value)} />
          <button className="btn danger" disabled={!delPw || busy === 'del'}>Delete account</button>
        </div>
      </form>
    </>
  );
}

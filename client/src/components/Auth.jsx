import React, { useState } from 'react';
import { api, errorMessage, setToken } from '../api';
import { BrandMark } from './Icons';

function Aside() {
  return (
    <div className="auth-aside">
      <div className="brand"><BrandMark className="brand-mark" /> ShopPulse AI</div>
      <div>
        <h1>See what your store really earns.</h1>
        <p style={{ marginTop: 14 }}>
          Upload your orders and product costs. Get profit, margin and stock answers where every number shows its working.
        </p>
      </div>
      <div className="mini-tape" aria-hidden="true">
        <div className="line"><span>Gross sales</span><span>₹6,40,000</span></div>
        <div className="line"><span>Discounts</span><span>−₹25,000</span></div>
        <div className="line"><span>Refunds</span><span>−₹1,00,000</span></div>
        <div className="line total"><span>Net revenue</span><span>₹5,15,000</span></div>
      </div>
    </div>
  );
}

function Field({ id, label, hint, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export default function Auth({ onAuthed, resetToken, onResetDone }) {
  const [mode, setMode] = useState(resetToken ? 'reset' : 'login'); // login | register | forgot | reset
  const [step, setStep] = useState(1); // register: 1 = email, 2 = code + details
  const [form, setForm] = useState({ name: '', email: '', password: '', otp: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const go = (next) => { setMode(next); setStep(1); setError(''); setInfo(''); };

  async function run(fn) {
    setBusy(true); setError(''); setInfo('');
    try { await fn(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }

  const finishAuth = (data) => { setToken(data.token); onAuthed(); };

  const submit = (e) => {
    e.preventDefault();
    if (mode === 'login') {
      return run(async () => finishAuth(await api.login(form.email, form.password)));
    }
    if (mode === 'register') {
      if (step === 1) {
        return run(async () => {
          await api.sendOtp(form.email);
          setStep(2);
          setInfo(`We emailed a 6-digit code to ${form.email}. It expires in 10 minutes.`);
        });
      }
      return run(async () => finishAuth(await api.register({ email: form.email, otp: form.otp, name: form.name, password: form.password })));
    }
    if (mode === 'forgot') {
      return run(async () => {
        const out = await api.forgotPassword(form.email);
        setInfo(out.message);
      });
    }
    return run(async () => {
      const out = await api.resetPassword(resetToken, form.password);
      setInfo(out.message);
      setTimeout(() => { onResetDone(); go('login'); }, 1400);
    });
  };

  const titles = {
    login: ['Sign in', 'Welcome back. Your numbers are waiting.'],
    register: step === 1 ? ['Create your account', 'Start with your email. We will send a code to confirm it.'] : ['Confirm your email', 'Enter the code and choose a password.'],
    forgot: ['Reset your password', 'Enter your email and we will send a reset link.'],
    reset: ['Choose a new password', 'Use at least 8 characters.'],
  };
  const [title, subtitle] = titles[mode];

  return (
    <div className="auth">
      <Aside />
      <main className="auth-main">
        <div className="auth-card">
          <div className="brand" style={{ color: 'var(--ink)', padding: 0, marginBottom: 24 }}>
            <BrandMark className="brand-mark" /> ShopPulse AI
          </div>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>

          {error && <div className="alert error" role="alert">{error}</div>}
          {info && <div className="alert ok" role="status">{info}</div>}

          <form onSubmit={submit} noValidate>
            {mode !== 'reset' && (
              <Field id="email" label="Email">
                <input id="email" className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} disabled={mode === 'register' && step === 2} required />
              </Field>
            )}

            {mode === 'register' && step === 2 && (
              <>
                <Field id="otp" label="6-digit code">
                  <input id="otp" className="input num" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={form.otp} onChange={set('otp')} required />
                </Field>
                <Field id="name" label="Your name">
                  <input id="name" className="input" autoComplete="name" value={form.name} onChange={set('name')} required />
                </Field>
              </>
            )}

            {(mode === 'login' || mode === 'reset' || (mode === 'register' && step === 2)) && (
              <Field id="password" label={mode === 'login' ? 'Password' : 'New password'} hint={mode === 'login' ? null : 'At least 8 characters.'}>
                <input id="password" className="input" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={set('password')} required />
              </Field>
            )}

            <button className="btn" style={{ width: '100%' }} disabled={busy} type="submit">
              {busy ? 'Please wait…'
                : mode === 'login' ? 'Sign in'
                : mode === 'register' ? (step === 1 ? 'Send code' : 'Create account')
                : mode === 'forgot' ? 'Send reset link'
                : 'Save new password'}
            </button>
          </form>

          <div className="row spread small" style={{ marginTop: 18 }}>
            {mode === 'login' && (
              <>
                <button className="linklike" onClick={() => go('forgot')}>Forgot password?</button>
                <button className="linklike" onClick={() => go('register')}>Create an account</button>
              </>
            )}
            {mode === 'register' && step === 2 && <button className="linklike" onClick={() => { setStep(1); setError(''); setInfo(''); }}>Use a different email</button>}
            {(mode === 'register' || mode === 'forgot') && <button className="linklike" onClick={() => go('login')}>Back to sign in</button>}
          </div>
        </div>
      </main>
    </div>
  );
}

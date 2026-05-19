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
`;

// ─── Topbar ───────────────────────────────────────────────
function Topbar({ user, onLogout, showStatus, rowCount, onProfile }) {
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
    } catch (err) {
      setError('Failed to resend OTP');
    } finally { setLoading(false); }
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
                <div style={{ marginBottom: 16 }}>
                  <label className="input-label">Full name</label>
                  <input className="auth-input" type="text" placeholder="John Smith" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="input-label">Email address</label>
                  <input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="input-label">Password</label>
                  <input className="auth-input" type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label className="input-label">Confirm password</label>
                  <input className="auth-input" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} />
                </div>
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
                <p style={{ textAlign: 'center', color: '#4b5563', fontSize: 13, marginTop: 16 }}>
                  Didn't receive it? <span className="auth-link" onClick={handleResendOTP}>Resend OTP</span>
                </p>
                <p style={{ textAlign: 'center', marginTop: 8 }}>
                  <span className="auth-link" onClick={() => { setStep('form'); setError(''); setSuccess(''); }}>← Go back</span>
                </p>
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
                <div style={{ marginBottom: 20 }}>
                  <label className="input-label">Email address</label>
                  <input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                </div>
                <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }}></span>Sending...</> : 'Send reset link →'}
                </button>
              </>
            )}
          </div>
          <p style={{ textAlign: 'center', color: '#4b5563', fontSize: 13, marginTop: 20 }}>
            <span className="auth-link" onClick={onGoLogin}>← Back to login</span>
          </p>
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
      setSuccess('Password updated! Redirecting to login...');
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
            <p style={{ color: '#4b5563', fontSize: 14 }}>Choose a strong password for your account</p>
          </div>
          <div className="card" style={{ padding: 28 }}>
            {error && <div className="error-msg">⚠️ {error}</div>}
            {success && <div className="success-msg">✓ {success}</div>}
            {!success && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label className="input-label">New password</label>
                  <input className="auth-input" type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label className="input-label">Confirm new password</label>
                  <input className="auth-input" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} />
                </div>
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
function ProfilePage({ user, onBack, onLogout, API_URL }) {
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
    } catch (err) {
      console.error('Profile error:', err);
    } finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    setSaving(true); setMsg({ type: '', text: '' });
    try {
      await axios.post(`${API_URL}/api/profile/update`, { email: user.email, bio, avatar_url: avatarUrl, notifications_enabled: notifications });
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update profile' });
    } finally { setSaving(false); }
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
      setMsg({ type: 'success', text: 'Password changed successfully!' });
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
    } finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { setMsg({ type: 'error', text: 'Enter your password to confirm' }); return; }
    if (!window.confirm('Are you sure? This cannot be undone!')) return;
    try {
      await axios.delete(`${API_URL}/api/delete-account`, { data: { email: user.email, password: deletePassword } });
      onLogout();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to delete account' });
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }}></div>
    </div>
  );

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
        {/* Profile Header */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
          <div className="avatar-wrap" onClick={() => avatarInputRef.current?.click()}>
            {avatarUrl ? <img src={avatarUrl} alt="avatar" /> : user.name?.charAt(0).toUpperCase()}
            <div className="avatar-overlay">Edit</div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{user.name}</h2>
            <p style={{ color: '#4b5563', fontSize: 14, marginBottom: 8 }}>{user.email}</p>
            <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6 }}>FREE PLAN</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Analyses', value: profile?.total_analyses || 0 },
              { label: 'Queries', value: history?.length || 0 },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ minWidth: 80 }}>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6', marginBottom: 4 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#111827', borderRadius: 10, padding: 4, border: '1px solid #1e293b' }}>
          {[['overview', '👤 Overview'], ['history', '📋 History'], ['settings', '⚙️ Settings']].map(([t, label]) => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setMsg({ type: '', text: '' }); }} style={{ flex: 1 }}>{label}</button>
          ))}
        </div>

        {/* Messages */}
        {msg.text && (
          <div style={{ background: msg.type === 'success' ? '#052011' : '#1a0505', border: `1px solid ${msg.type === 'success' ? '#064e1e' : '#450a0a'}`, borderRadius: 8, padding: '10px 16px', color: msg.type === 'success' ? '#34d399' : '#f87171', fontSize: 13, marginBottom: 16 }}>
            {msg.type === 'success' ? '✓' : '⚠️'} {msg.text}
          </div>
        )}

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="fade-in">
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Personal Info</p>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Full Name</label>
                <div style={{ background: '#0a0e1a', border: '1px solid #1e293b', borderRadius: 8, padding: '12px 16px', color: '#64748b', fontSize: 14 }}>{user.name}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Email</label>
                <div style={{ background: '#0a0e1a', border: '1px solid #1e293b', borderRadius: 8, padding: '12px 16px', color: '#64748b', fontSize: 14 }}>{user.email}</div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="input-label">Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3}
                  style={{ width: '100%', background: '#0a0e1a', border: '1px solid #1e293b', borderRadius: 8, padding: '12px 16px', color: '#e2e8f0', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', resize: 'vertical' }} />
              </div>
              <button className="auth-btn" onClick={handleSaveProfile} disabled={saving} style={{ marginTop: 0 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
            <div className="card">
              <p style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Recent Activity</p>
              {history.length === 0 ? (
                <p style={{ color: '#374151', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No analyses yet — upload a CSV to get started!</p>
              ) : history.slice(0, 5).map((h, i) => (
                <div key={i} className="history-card">
                  <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>💬 {h.question}</p>
                  <p style={{ color: '#374151', fontSize: 11 }}>{new Date(h.created_at).toLocaleDateString()} · {h.rows_returned} rows returned</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <div className="fade-in">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analysis History</p>
                <span style={{ color: '#374151', fontSize: 12 }}>{history.length} total</span>
              </div>
              {history.length === 0 ? (
                <p style={{ color: '#374151', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>No analyses yet!</p>
              ) : history.map((h, i) => (
                <div key={i} className="history-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <p style={{ color: '#94a3b8', fontSize: 13, flex: 1, marginRight: 12 }}>💬 {h.question}</p>
                    <span style={{ color: '#374151', fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(h.created_at).toLocaleDateString()}</span>
                  </div>
                  {h.sql_generated && (
                    <pre style={{ background: '#0a0e1a', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#7dd3fc', overflow: 'auto', margin: 0 }}>{h.sql_generated}</pre>
                  )}
                  <p style={{ color: '#374151', fontSize: 11, marginTop: 8 }}>{h.rows_returned} rows returned</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div className="fade-in">
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Preferences</p>
              <div className="toggle-wrap">
                <div>
                  <p style={{ fontSize: 14, color: '#e2e8f0', marginBottom: 2 }}>Email Notifications</p>
                  <p style={{ fontSize: 12, color: '#4b5563' }}>Receive updates and alerts via email</p>
                </div>
                <button className={`toggle ${notifications ? 'on' : 'off'}`} onClick={() => setNotifications(!notifications)}>
                  <div className={`toggle-dot ${notifications ? 'on' : 'off'}`}></div>
                </button>
              </div>
              <button className="auth-btn" onClick={handleSaveProfile} disabled={saving} style={{ marginTop: 16 }}>
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Change Password</p>
              <div style={{ marginBottom: 12 }}>
                <label className="input-label">Current Password</label>
                <input className="auth-input" type="password" placeholder="••••••••" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="input-label">New Password</label>
                <input className="auth-input" type="password" placeholder="Min. 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Confirm New Password</label>
                <input className="auth-input" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
              <button className="auth-btn" onClick={handleChangePassword} disabled={saving}>
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>

            <div className="card" style={{ borderColor: '#450a0a' }}>
              <p style={{ fontSize: 13, color: '#f87171', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>⚠️ Danger Zone</p>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>Deleting your account is permanent and cannot be undone.</p>
              <div style={{ marginBottom: 12 }}>
                <label className="input-label">Enter password to confirm</label>
                <input className="auth-input" type="password" placeholder="••••••••" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} />
              </div>
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
  const [tableName, setTableName] = useState(null);
  const [csvInfo, setCsvInfo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const fileRef = useRef(null);

  const handleLogin = (u) => { setUser(u); setScreen('upload'); };
  const handleSignup = (u) => { setUser(u); setScreen('upload'); };
  const handleLogout = () => { setUser(null); setScreen('login'); setData(null); setHistory([]); setCsvInfo(null); setTableName(null); };

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.csv')) { setUploadError('Please upload a .csv file'); return; }
    setUploading(true); setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API_URL}/api/upload`, formData);
      setCsvInfo(res.data);
      setTableName(res.data.tableName);
      setScreen('chat');
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleQuery = async (q) => {
    const query = q || question;
    if (!query.trim()) return;
    setLoading(true); setError(null); setData(null);
    try {
      const res = await axios.post(`${API_URL}/api/query`, { question: query, tableName });
      setData(res.data);
      setHistory(h => [{ question: query, time: new Date().toLocaleTimeString() }, ...h.slice(0, 4)]);
      if (user?.email) {
        await axios.post(`${API_URL}/api/save-analysis`, {
          email: user.email,
          question: query,
          sql_generated: res.data.sql,
          rows_returned: res.data.results?.length || 0
        }).catch(() => {});
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  };

  if (screen === 'login') return <><style>{STYLES}</style><LoginPage onLogin={handleLogin} onGoSignup={() => setScreen('signup')} onGoForgot={() => setScreen('forgot')} API_URL={API_URL} /></>;
  if (screen === 'signup') return <><style>{STYLES}</style><SignupPage onSignup={handleSignup} onGoLogin={() => setScreen('login')} API_URL={API_URL} /></>;
  if (screen === 'forgot') return <><style>{STYLES}</style><ForgotPasswordPage onGoLogin={() => setScreen('login')} API_URL={API_URL} /></>;
  if (screen === 'reset') return <><style>{STYLES}</style><ResetPasswordPage token={resetToken} onGoLogin={() => setScreen('login')} API_URL={API_URL} /></>;
  if (screen === 'profile') return <><style>{STYLES}</style><ProfilePage user={user} onBack={() => setScreen(csvInfo ? 'chat' : 'upload')} onLogout={handleLogout} API_URL={API_URL} /></>;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0', fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <style>{STYLES}</style>
      <Topbar user={user} onLogout={handleLogout} showStatus={screen === 'chat'} rowCount={csvInfo?.rowCount} onProfile={() => setScreen('profile')} />

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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 40 }}>
              {[{ icon: '🧠', title: 'Natural Language', desc: 'Ask in plain English, no SQL needed' },
                { icon: '🔍', title: 'Anomaly Detection', desc: 'AI spots outliers and trends automatically' },
                { icon: '📊', title: 'Auto Charts', desc: 'Results visualized as interactive charts' }].map(f => (
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
            <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>📄</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>CSV loaded successfully</p>
                  <p style={{ color: '#4b5563', fontSize: 12 }}>{csvInfo?.rowCount} rows · {csvInfo?.columns?.length} columns: {csvInfo?.columns?.slice(0, 4).join(', ')}{csvInfo?.columns?.length > 4 ? '...' : ''}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="badge badge-green">✓ Ready</span>
                <button onClick={() => { setScreen('upload'); setData(null); setHistory([]); }} style={{ background: '#1e293b', border: '1px solid #2d3748', borderRadius: 8, color: '#94a3b8', fontSize: 12, padding: '6px 14px', cursor: 'pointer' }}>↑ Upload new CSV</button>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div className="input-wrap">
                <span style={{ fontSize: 16, marginRight: 8 }}>💬</span>
                <input className="main-input" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuery()} placeholder='Ask anything about your data...' />
                <button className="ask-btn" disabled={loading || !question.trim()} onClick={() => handleQuery()}>
                  {loading ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }}></span>Thinking</> : 'Ask AI →'}
                </button>
              </div>
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

            {error && <div className="card fade-in" style={{ borderColor: '#450a0a', background: '#1a0505' }}><p style={{ color: '#f87171', fontWeight: 600, marginBottom: 4 }}>⚠️ Error</p><p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p></div>}

            {data && !loading && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
                  <div style={{ marginBottom: 12 }}><span className="badge badge-blue">📊 Summary</span></div>
                  <p style={{ color: '#cbd5e1', lineHeight: 1.7, fontSize: 15 }}>{data.explanation}</p>
                </div>
                {data.anomalies && (
                  <div className="card" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
                    <div style={{ marginBottom: 12 }}><span className="badge badge-amber">⚠️ Anomalies</span></div>
                    <p style={{ color: '#cbd5e1', lineHeight: 1.7, fontSize: 14, whiteSpace: 'pre-line' }}>{data.anomalies}</p>
                  </div>
                )}
                <details className="card">
                  <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="badge badge-green">🔍 Generated SQL</span>
                    <span style={{ color: '#4b5563', fontSize: 12 }}>click to expand ▾</span>
                  </summary>
                  <div style={{ marginTop: 14 }}><pre className="sql-block">{data.sql}</pre></div>
                </details>
                {data.results?.length > 0 && <div className="card"><div style={{ marginBottom: 14 }}><span className="badge badge-blue">📈 Chart</span></div><ChartView data={data.results} /></div>}
                {data.results?.length > 0 && (
                  <div className="card">
                    <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="badge badge-green">📋 Results</span>
                      <span style={{ color: '#4b5563', fontSize: 12 }}>{data.results.length} rows</span>
                    </div>
                    <ResultsTable data={data.results} />
                  </div>
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
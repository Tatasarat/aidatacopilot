import { useState, useRef } from 'react';
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

  .auth-input {
    width: 100%;
    background: #0a0e1a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 12px 16px;
    color: #e2e8f0;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .auth-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
  }
  .auth-input::placeholder { color: #374151; }
  .auth-btn {
    width: 100%;
    background: linear-gradient(135deg, #3b82f6, #6366f1);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 15px;
    font-weight: 600;
    padding: 13px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: opacity 0.2s, transform 0.1s;
    margin-top: 8px;
  }
  .auth-btn:hover { opacity: 0.9; transform: scale(1.01); }
  .auth-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .auth-link { color: #3b82f6; cursor: pointer; font-size: 13px; text-decoration: none; }
  .auth-link:hover { text-decoration: underline; }
  .divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
  .divider-line { flex: 1; height: 1px; background: #1e293b; }
  .divider-text { color: #374151; font-size: 12px; }
  .social-btn {
    width: 100%;
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 8px;
    color: #94a3b8;
    font-size: 14px;
    font-weight: 500;
    padding: 11px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .social-btn:hover { background: #1e293b; color: #e2e8f0; border-color: #2d3748; }
  .input-label { font-size: 13px; color: #64748b; margin-bottom: 6px; display: block; font-weight: 500; }
  .error-msg { background: #1a0505; border: 1px solid #450a0a; border-radius: 8px; padding: 10px 14px; color: #f87171; font-size: 13px; margin-bottom: 16px; }
  .success-msg { background: #052011; border: 1px solid #064e1e; border-radius: 8px; padding: 10px 14px; color: #34d399; font-size: 13px; margin-bottom: 16px; }
`;

// ─── Topbar ───────────────────────────────────────────────
function Topbar({ user, onLogout, showStatus, rowCount }) {
  return (
    <>
      <div style={{ borderBottom: '1px solid #1e293b', padding: '0 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
            <span style={{ fontWeight: 600, fontSize: 15 }}>DataCopilot</span>
            <span style={{ background: '#1e293b', color: '#64748b', fontSize: 10, padding: '2px 8px', borderRadius: 4 }}>AI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {showStatus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="pulse-dot"></div>
                <span style={{ fontSize: 12, color: '#4b5563' }}>{rowCount} rows loaded</span>
              </div>
            )}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'white' }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 13, color: '#64748b' }}>{user.name}</span>
                <button onClick={onLogout} style={{ background: '#1e293b', border: '1px solid #2d3748', borderRadius: 6, color: '#94a3b8', fontSize: 12, padding: '5px 12px', cursor: 'pointer' }}>
                  Logout
                </button>
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
function LoginPage({ onLogin, onGoSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    setError('');
    // Simulate auth — replace with real API call
    await new Promise(r => setTimeout(r, 800));
    const users = JSON.parse(localStorage.getItem('dc_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid email or password');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', flexDirection: 'column' }}>
      <Topbar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div className="fade-in" style={{ width: '100%', maxWidth: 420 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>⚡</div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: 6 }}>Welcome back</h1>
            <p style={{ color: '#4b5563', fontSize: 14 }}>Sign in to your DataCopilot account</p>
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
                <span className="auth-link">Forgot password?</span>
              </div>
              <input className="auth-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>

            <button className="auth-btn" onClick={handleLogin} disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }}></span>Signing in...</> : 'Sign in →'}
            </button>

            <div className="divider">
              <div className="divider-line"></div>
              <span className="divider-text">or continue with</span>
              <div className="divider-line"></div>
            </div>

            <button className="social-btn">
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
          </div>

          <p style={{ textAlign: 'center', color: '#4b5563', fontSize: 13, marginTop: 20 }}>
            Don't have an account?{' '}
            <span className="auth-link" onClick={onGoSignup}>Create one free →</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Signup Page ──────────────────────────────────────────
function SignupPage({ onSignup, onGoLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirm) { setError('Please fill in all fields'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 800));
    const users = JSON.parse(localStorage.getItem('dc_users') || '[]');
    if (users.find(u => u.email === email)) { setError('Email already registered'); setLoading(false); return; }
    const newUser = { name, email, password };
    users.push(newUser);
    localStorage.setItem('dc_users', JSON.stringify(users));
    setSuccess('Account created! Signing you in...');
    await new Promise(r => setTimeout(r, 1000));
    onSignup(newUser);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', flexDirection: 'column' }}>
      <Topbar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div className="fade-in" style={{ width: '100%', maxWidth: 420 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>⚡</div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: 6 }}>Create your account</h1>
            <p style={{ color: '#4b5563', fontSize: 14 }}>Start analyzing your data with AI</p>
          </div>

          <div className="card" style={{ padding: 28 }}>
            {error && <div className="error-msg">⚠️ {error}</div>}
            {success && <div className="success-msg">✓ {success}</div>}

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
              <input className="auth-input" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSignup()} />
            </div>

            <button className="auth-btn" onClick={handleSignup} disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }}></span>Creating account...</> : 'Create account →'}
            </button>

            <div className="divider">
              <div className="divider-line"></div>
              <span className="divider-text">or continue with</span>
              <div className="divider-line"></div>
            </div>

            <button className="social-btn">
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <p style={{ fontSize: 11, color: '#374151', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
              By creating an account you agree to our Terms of Service and Privacy Policy
            </p>
          </div>

          <p style={{ textAlign: 'center', color: '#4b5563', fontSize: 13, marginTop: 20 }}>
            Already have an account?{' '}
            <span className="auth-link" onClick={onGoLogin}>Sign in →</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────
export default function App() {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
  const [screen, setScreen] = useState('login'); // login | signup | upload | chat
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
  const handleLogout = () => { setUser(null); setScreen('login'); setData(null); setHistory([]); setCsvInfo(null); };

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.csv')) { setUploadError('Please upload a .csv file'); return; }
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API_URL}/api/upload`, formData);

      setCsvInfo(res.data);
      setTableName(res.data.tableName);
      setScreen('chat');
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleQuery = async (q) => {
    const query = q || question;
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await axios.post(`${API_URL}/api/query`, { question: query, tableName });
      setData(res.data);
      setHistory(h => [{ question: query, time: new Date().toLocaleTimeString() }, ...h.slice(0, 4)]);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (screen === 'login') return <><style>{STYLES}</style><LoginPage onLogin={handleLogin} onGoSignup={() => setScreen('signup')} /></>;
  if (screen === 'signup') return <><style>{STYLES}</style><SignupPage onSignup={handleSignup} onGoLogin={() => setScreen('login')} /></>;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0', fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <style>{STYLES}</style>

      <Topbar user={user} onLogout={handleLogout} showStatus={screen === 'chat'} rowCount={csvInfo?.rowCount} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {/* UPLOAD SCREEN */}
        {screen === 'upload' && (
          <div className="fade-in">
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h1 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 12 }}>
                Upload your CSV,<br />
                <span style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  ask anything about it
                </span>
              </h1>
              <p style={{ color: '#4b5563', fontSize: 15 }}>AI reads your data, writes SQL, detects anomalies, explains in plain English</p>
            </div>

            <div
              className={`drop-zone ${dragOver ? 'active' : ''}`}
              onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            >
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
                  <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, color: 'white' }}>
                    Choose CSV File
                  </div>
                </div>
              )}
            </div>

            {uploadError && (
              <div style={{ marginTop: 16, background: '#1a0505', border: '1px solid #450a0a', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 14 }}>
                ⚠️ {uploadError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 40 }}>
              {[
                { icon: '🧠', title: 'Natural Language', desc: 'Ask questions in plain English, no SQL needed' },
                { icon: '🔍', title: 'Anomaly Detection', desc: 'AI automatically spots outliers and trends' },
                { icon: '📊', title: 'Auto Charts', desc: 'Results visualized as interactive bar charts' },
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
                <button onClick={() => { setScreen('upload'); setData(null); setHistory([]); }}
                  style={{ background: '#1e293b', border: '1px solid #2d3748', borderRadius: 8, color: '#94a3b8', fontSize: 12, padding: '6px 14px', cursor: 'pointer' }}>
                  ↑ Upload new CSV
                </button>
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
              {suggestions.map(s => (
                <button key={s} className="chip" onClick={() => { setQuestion(s); handleQuery(s); }}>{s}</button>
              ))}
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

                {data.results?.length > 0 && (
                  <div className="card">
                    <div style={{ marginBottom: 14 }}><span className="badge badge-blue">📈 Chart</span></div>
                    <ChartView data={data.results} />
                  </div>
                )}

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
                    <span style={{ color: '#374151' }}>↩</span>
                    <span style={{ flex: 1 }}>{h.question}</span>
                    <span style={{ fontSize: 11 }}>{h.time}</span>
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
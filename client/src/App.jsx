import React, { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api';
import { BrandMark, Icon } from './components/Icons';
import { ToastProvider } from './components/Toast';
import Auth from './components/Auth';
import Dashboard from './views/Dashboard';
import Ask from './views/Ask';
import Report from './views/Report';
import Data from './views/Data';
import Launch from './views/Launch';
import Billing from './views/Billing';
import Settings from './views/Settings';

const NAV = [
  ['dashboard', 'Dashboard', 'dashboard'],
  ['ask', 'Ask AI', 'ask'],
  ['report', 'Weekly report', 'report'],
  ['data', 'Your data', 'data'],
  ['launch', 'Launch plan', 'launch'],
  ['billing', 'Plans', 'billing'],
  ['settings', 'Settings', 'settings'],
];
const VIEW_IDS = NAV.map((n) => n[0]);

const viewFromHash = () => {
  const id = window.location.hash.replace(/^#\/?/, '');
  return VIEW_IDS.includes(id) ? id : 'dashboard';
};

function readResetToken() {
  try { return new URLSearchParams(window.location.search).get('reset_token') || ''; } catch (_) { return ''; }
}

function Shell({ user, credits, setUser, setCredits, onSignOut }) {
  const [view, setView] = useState(viewFromHash);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((id) => {
    window.location.hash = `/${id}`;
    setView(id);
    window.scrollTo({ top: 0 });
  }, []);

  const used = credits && !credits.unlimited ? Math.min(100, Math.round((credits.credits_used / credits.credits_limit) * 100)) : 0;

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><BrandMark className="brand-mark" /> ShopPulse AI</div>
        <nav className="nav" aria-label="Main">
          {NAV.map(([id, label, icon]) => (
            <button key={id} onClick={() => go(id)} aria-current={view === id ? 'page' : undefined}><Icon name={icon} />{label}</button>
          ))}
        </nav>
        <div className="side-foot">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
          {credits && (credits.unlimited ? <div style={{ marginTop: 8 }}>Unlimited AI questions</div> : (
            <>
              <div className="meter" aria-hidden="true"><i style={{ width: `${used}%` }} /></div>
              <div>{credits.credits_remaining} of {credits.credits_limit} AI questions left</div>
              {credits.credits_remaining === 0 && <button className="linklike" onClick={() => go('billing')}>Upgrade</button>}
            </>
          ))}
          <button className="linklike" style={{ display: 'block', marginTop: 10 }} onClick={onSignOut}>Sign out</button>
        </div>
      </aside>

      <main className="main" id="main">
        {view === 'dashboard' && <Dashboard user={user} go={go} />}
        {view === 'ask' && <Ask user={user} credits={credits} onCredits={setCredits} go={go} />}
        {view === 'report' && <Report user={user} go={go} />}
        {view === 'data' && <Data go={go} />}
        {view === 'launch' && <Launch />}
        {view === 'billing' && <Billing user={user} credits={credits} onCredits={setCredits} />}
        {view === 'settings' && <Settings user={user} onUser={setUser} onSignOut={onSignOut} />}
      </main>

      <nav className="mobilebar" aria-label="Main">
        {NAV.map(([id, label, icon]) => (
          <button key={id} onClick={() => go(id)} aria-current={view === id ? 'page' : undefined}><Icon name={icon} /><span>{label === 'Weekly report' ? 'Report' : label}</span></button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState('loading'); // loading | out | in
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(null);
  const [resetToken, setResetToken] = useState(readResetToken);

  const signOut = useCallback(() => {
    setToken(null); setUser(null); setCredits(null); setState('out');
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const data = await api.me();
      setUser(data.user); setCredits(data.credits); setState('in');
    } catch (_) {
      setToken(null); setState('out');
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    if (getToken()) loadMe(); else setState('out');
  }, [loadMe, signOut]);

  const clearReset = () => {
    setResetToken('');
    try { window.history.replaceState({}, '', window.location.pathname); } catch (_) { /* ignore */ }
  };

  return (
    <ToastProvider>
      {state === 'loading' && <div style={{ padding: 40 }} aria-busy="true"><div className="skeleton" style={{ height: 24, width: 200 }} /></div>}
      {state === 'out' && <Auth onAuthed={loadMe} resetToken={resetToken} onResetDone={clearReset} />}
      {state === 'in' && user && <Shell user={user} credits={credits} setUser={setUser} setCredits={setCredits} onSignOut={signOut} />}
    </ToastProvider>
  );
}

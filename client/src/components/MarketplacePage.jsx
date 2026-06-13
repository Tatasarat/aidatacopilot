import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const CATEGORIES = ['All', 'Healthcare', 'Finance', 'Sports', 'Education', 'E-commerce', 'Government', 'Environment', 'Technology'];
const TYPES = ['All', 'dataset', 'research', 'newsletter'];
const TYPE_ICONS = { dataset: '📊', research: '📚', newsletter: '📰' };
const TYPE_LABELS = { dataset: 'Dataset', research: 'Research', newsletter: 'Newsletter' };
const FORMAT_COLORS = { csv: '#34d399', pdf: '#f87171', xlsx: '#fbbf24', json: '#60a5fa' };

function formatSize(bytes) {
  if (!bytes) return 'N/A';
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function MarketplacePage({ user, credits, onBack, API_URL, onCreditsUpdate }) {
  const [tab, setTab] = useState('browse');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [type, setType] = useState('All');
  const [search, setSearch] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [myDownloads, setMyDownloads] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [preview, setPreview] = useState(null);

  // Submit form
  const [submitForm, setSubmitForm] = useState({ title: '', description: '', category: 'Healthcare', type: 'dataset', price_credits: '0', is_free: 'true', tags: '' });
  const [submitFile, setSubmitFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { fetchResources(); }, [category, type, search, freeOnly]);
  useEffect(() => { if (tab === 'library') { fetchMyDownloads(); fetchMySubmissions(); } }, [tab]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'All') params.append('category', category);
      if (type !== 'All') params.append('type', type);
      if (search) params.append('search', search);
      if (freeOnly) params.append('free', 'true');
      const res = await axios.get(`${API_URL}/api/marketplace?${params}`);
      setResources(res.data.resources);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchMyDownloads = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/marketplace/my-downloads/${user.email}`);
      setMyDownloads(res.data.downloads);
    } catch (err) { console.error(err); }
  };

  const fetchMySubmissions = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/marketplace/my-submissions/${user.email}`);
      setMySubmissions(res.data.submissions);
      setTotalEarnings(res.data.total_earnings || 0);
    } catch (err) { console.error(err); }
  };

  const handleDownload = async (resource) => {
    setDownloading(resource.id);
    setMsg({ type: '', text: '' });
    try {
      const res = await axios.post(`${API_URL}/api/marketplace/download`, { resource_id: resource.id, email: user.email });
      if (res.data.success) {
        setMsg({ type: 'success', text: res.data.already_downloaded ? `"${resource.title}" is already in your library!` : `"${resource.title}" added to your library! Check My Library tab.` });
        if (onCreditsUpdate) onCreditsUpdate(user.email);
        fetchResources();
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Download failed' });
    } finally { setDownloading(null); }
  };

  const handleSubmit = async () => {
    if (!submitForm.title || !submitForm.description) { setMsg({ type: 'error', text: 'Please fill in title and description' }); return; }
    setSubmitting(true); setMsg({ type: '', text: '' });
    try {
      const formData = new FormData();
      Object.entries(submitForm).forEach(([k, v]) => formData.append(k, v));
      formData.append('email', user.email);
      if (submitFile) formData.append('file', submitFile);
      await axios.post(`${API_URL}/api/marketplace/submit`, formData);
      setMsg({ type: 'success', text: 'Resource submitted for review! It will be published after approval within 24 hours.' });
      setSubmitForm({ title: '', description: '', category: 'Healthcare', type: 'dataset', price_credits: '0', is_free: 'true', tags: '' });
      setSubmitFile(null);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Submission failed' });
    } finally { setSubmitting(false); }
  };

  const planColors = { free: '#4b5563', pro: '#3b82f6', enterprise: '#8b5cf6' };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .mk-card { background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; transition: all 0.2s; }
        .mk-card:hover { border-color: #2d3748; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .mk-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 5px; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
        .mk-btn { background: linear-gradient(135deg, #3b82f6, #6366f1); border: none; border-radius: 8px; color: white; font-size: 13px; font-weight: 600; padding: 8px 16px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: opacity 0.2s; }
        .mk-btn:hover { opacity: 0.9; }
        .mk-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .mk-btn-outline { background: transparent; border: 1px solid #2d3748; border-radius: 8px; color: #94a3b8; font-size: 13px; padding: 8px 16px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .mk-btn-outline:hover { background: #1e293b; color: #e2e8f0; }
        .mk-input { background: #0a0e1a; border: 1px solid #1e293b; border-radius: 8px; padding: 10px 14px; color: #e2e8f0; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s; }
        .mk-input:focus { border-color: #3b82f6; }
        .mk-input::placeholder { color: #374151; }
        .mk-select { background: #0a0e1a; border: 1px solid #1e293b; border-radius: 8px; padding: 10px 14px; color: #e2e8f0; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; cursor: pointer; }
        .mk-tab { padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; color: #64748b; border: none; background: transparent; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .mk-tab.active { background: #1e293b; color: #e2e8f0; }
        .mk-chip { background: #1e293b; border: 1px solid #2d3748; border-radius: 20px; padding: 5px 12px; font-size: 12px; color: #94a3b8; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .mk-chip.active { background: rgba(59,130,246,0.15); border-color: #3b82f6; color: #60a5fa; }
        .mk-chip:hover { background: #2d3748; color: #e2e8f0; }
        .spinner { width: 16px; height: 16px; border: 2px solid #1e293b; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-in { animation: fadeIn 0.3s ease forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0a0e1a; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
      `}</style>

      {/* Topbar */}
      <div style={{ borderBottom: '1px solid #1e293b', padding: '0 32px', position: 'sticky', top: 0, background: '#0a0e1a', zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onBack} style={{ background: '#1e293b', border: '1px solid #2d3748', borderRadius: 8, color: '#94a3b8', fontSize: 13, padding: '6px 14px', cursor: 'pointer' }}>← Back</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🧠</div>
              <span style={{ fontWeight: 600, fontSize: 15 }}>InsightAI</span>
              <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>MARKETPLACE</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#111827', border: '1px solid #1e293b', borderRadius: 8, padding: '6px 12px' }}>
              <span style={{ fontSize: 14 }}>⚡</span>
              <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{credits ? (credits.plan === 'enterprise' ? '∞' : credits.credits_limit - credits.credits_used) : 0}</span>
              <span style={{ fontSize: 11, color: '#4b5563' }}>credits</span>
            </div>
            <span style={{ fontSize: 12, color: planColors[credits?.plan || 'free'], fontWeight: 700, textTransform: 'uppercase' }}>{credits?.plan || 'free'}</span>
          </div>
        </div>
      </div>
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)' }}></div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 12 }}>
            Data Marketplace
          </h1>
          <p style={{ color: '#4b5563', fontSize: 15, marginBottom: 24 }}>
            Download datasets, research papers, and newsletters — or share your own and earn credits
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            {[{ icon: '📊', label: 'Datasets', count: '50+' }, { icon: '📚', label: 'Research Papers', count: '200+' }, { icon: '📰', label: 'Newsletters', count: '30+' }, { icon: '🆓', label: 'Free Resources', count: '40+' }].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>{s.count}</div>
                <div style={{ fontSize: 12, color: '#4b5563' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        {msg.text && (
          <div style={{ background: msg.type === 'success' ? '#052011' : '#1a0505', border: `1px solid ${msg.type === 'success' ? '#064e1e' : '#450a0a'}`, borderRadius: 8, padding: '12px 16px', color: msg.type === 'success' ? '#34d399' : '#f87171', fontSize: 13, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{msg.type === 'success' ? '✓' : '⚠️'} {msg.text}</span>
            <button onClick={() => setMsg({ type: '', text: '' })} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: '#111827', borderRadius: 10, padding: 4, border: '1px solid #1e293b', width: 'fit-content' }}>
          {[['browse', '🔍 Browse'], ['submit', '⬆️ Submit'], ['library', '📚 My Library']].map(([t, label]) => (
            <button key={t} className={`mk-tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setMsg({ type: '', text: '' }); }}>{label}</button>
          ))}
        </div>

        {/* BROWSE TAB */}
        {tab === 'browse' && (
          <div className="fade-in">
            {/* Search + Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <input className="mk-input" placeholder="🔍 Search datasets, papers, newsletters..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
              <select className="mk-select" value={type} onChange={e => setType(e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : TYPE_LABELS[t] || t}</option>)}
              </select>
              <button onClick={() => setFreeOnly(!freeOnly)} className="mk-btn-outline" style={{ borderColor: freeOnly ? '#3b82f6' : '#2d3748', color: freeOnly ? '#60a5fa' : '#94a3b8' }}>
                {freeOnly ? '🆓 Free Only ✓' : '🆓 Free Only'}
              </button>
            </div>

            {/* Category chips */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => (
                <button key={c} className={`mk-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>

            {/* Resources Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }}></div>
                <p style={{ color: '#4b5563' }}>Loading resources...</p>
              </div>
            ) : resources.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                <p style={{ color: '#4b5563', fontSize: 15 }}>No resources found. Try different filters.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {resources.map(r => (
                  <div key={r.id} className="mk-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="mk-badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                          {TYPE_ICONS[r.type]} {TYPE_LABELS[r.type] || r.type}
                        </span>
                        <span className="mk-badge" style={{ background: '#1e293b', color: '#64748b' }}>{r.category}</span>
                        {r.format && <span className="mk-badge" style={{ background: `${FORMAT_COLORS[r.format]}22`, color: FORMAT_COLORS[r.format] || '#94a3b8' }}>.{r.format}</span>}
                      </div>
                      {r.is_free ? (
                        <span className="mk-badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', flexShrink: 0 }}>FREE</span>
                      ) : (
                        <span className="mk-badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', flexShrink: 0 }}>⚡ {r.price_credits} credits</span>
                      )}
                    </div>

                    <h3 style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 8, lineHeight: 1.4 }}>{r.title}</h3>
                    <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</p>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                      {r.rows_count > 0 && <span style={{ fontSize: 12, color: '#374151' }}>📋 {r.rows_count.toLocaleString()} rows</span>}
                      {r.file_size > 0 && <span style={{ fontSize: 12, color: '#374151' }}>💾 {formatSize(r.file_size)}</span>}
                      <span style={{ fontSize: 12, color: '#374151' }}>⬇️ {r.downloads.toLocaleString()}</span>
                    </div>

                    {/* Tags */}
                    {r.tags && r.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                        {r.tags.slice(0, 4).map(tag => (
                          <span key={tag} style={{ background: '#0d1117', border: '1px solid #1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#374151' }}>#{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="mk-btn" onClick={() => handleDownload(r)} disabled={downloading === r.id} style={{ flex: 1 }}>
                        {downloading === r.id ? <><span className="spinner" style={{ marginRight: 6 }}></span>Processing...</> :
                          r.is_free ? '⬇️ Download Free' : `⚡ Get for ${r.price_credits} credits`}
                      </button>
                      <button className="mk-btn-outline" onClick={() => setPreview(preview?.id === r.id ? null : r)} style={{ padding: '8px 12px' }}>
                        {preview?.id === r.id ? '▲' : '👁'}
                      </button>
                    </div>

                    {/* Preview */}
                    {preview?.id === r.id && (
                      <div style={{ marginTop: 14, background: '#0d1117', borderRadius: 8, padding: 12, border: '1px solid #1e293b' }}>
                        <p style={{ fontSize: 11, color: '#4b5563', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preview</p>
                        <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{r.description}</p>
                        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: '#374151' }}>Submitted by: {r.submitted_by}</span>
                          <span style={{ fontSize: 11, color: '#374151' }}>Added: {new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBMIT TAB */}
        {tab === 'submit' && (
          <div className="fade-in" style={{ maxWidth: 640 }}>
            <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 12, padding: 28 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Submit a Resource</h2>
              <p style={{ color: '#4b5563', fontSize: 13, marginBottom: 24 }}>Share your datasets, research papers, or newsletters with the community and earn credits when others download them.</p>

              {msg.text && (
                <div style={{ background: msg.type === 'success' ? '#052011' : '#1a0505', border: `1px solid ${msg.type === 'success' ? '#064e1e' : '#450a0a'}`, borderRadius: 8, padding: '10px 14px', color: msg.type === 'success' ? '#34d399' : '#f87171', fontSize: 13, marginBottom: 20 }}>
                  {msg.type === 'success' ? '✓' : '⚠️'} {msg.text}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 13, color: '#64748b', marginBottom: 6, display: 'block', fontWeight: 500 }}>Title *</label>
                  <input className="mk-input" placeholder="e.g. Global Sales Dataset 2024" value={submitForm.title} onChange={e => setSubmitForm({ ...submitForm, title: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: '#64748b', marginBottom: 6, display: 'block', fontWeight: 500 }}>Category *</label>
                  <select className="mk-select" value={submitForm.category} onChange={e => setSubmitForm({ ...submitForm, category: e.target.value })} style={{ width: '100%' }}>
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, color: '#64748b', marginBottom: 6, display: 'block', fontWeight: 500 }}>Type *</label>
                  <select className="mk-select" value={submitForm.type} onChange={e => setSubmitForm({ ...submitForm, type: e.target.value })} style={{ width: '100%' }}>
                    <option value="dataset">📊 Dataset</option>
                    <option value="research">📚 Research Paper</option>
                    <option value="newsletter">📰 Newsletter</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 13, color: '#64748b', marginBottom: 6, display: 'block', fontWeight: 500 }}>Description *</label>
                  <textarea
                    placeholder="Describe your resource — what it contains, how it can be used, data source..."
                    value={submitForm.description}
                    onChange={e => setSubmitForm({ ...submitForm, description: e.target.value })}
                    rows={4}
                    style={{ width: '100%', background: '#0a0e1a', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', resize: 'vertical' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: '#64748b', marginBottom: 6, display: 'block', fontWeight: 500 }}>Pricing</label>
                  <select className="mk-select" value={submitForm.is_free} onChange={e => setSubmitForm({ ...submitForm, is_free: e.target.value })} style={{ width: '100%' }}>
                    <option value="true">🆓 Free</option>
                    <option value="false">⚡ Credits (paid)</option>
                  </select>
                </div>
                {submitForm.is_free === 'false' && (
                  <div>
                    <label style={{ fontSize: 13, color: '#64748b', marginBottom: 6, display: 'block', fontWeight: 500 }}>Credits Required</label>
                    <input className="mk-input" type="number" min="1" max="100" placeholder="e.g. 10" value={submitForm.price_credits} onChange={e => setSubmitForm({ ...submitForm, price_credits: e.target.value })} style={{ width: '100%' }} />
                    <p style={{ fontSize: 11, color: '#374151', marginTop: 4 }}>You earn 70% = {Math.floor((parseInt(submitForm.price_credits) || 0) * 0.7)} credits per download</p>
                  </div>
                )}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 13, color: '#64748b', marginBottom: 6, display: 'block', fontWeight: 500 }}>Tags (comma separated)</label>
                  <input className="mk-input" placeholder="e.g. healthcare, india, 2024" value={submitForm.tags} onChange={e => setSubmitForm({ ...submitForm, tags: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 13, color: '#64748b', marginBottom: 6, display: 'block', fontWeight: 500 }}>Upload File (CSV, PDF, XLSX)</label>
                  <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #1e293b', borderRadius: 8, padding: '24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#1e293b'}>
                    <input ref={fileRef} type="file" accept=".csv,.pdf,.xlsx,.json" style={{ display: 'none' }} onChange={e => setSubmitFile(e.target.files[0])} />
                    {submitFile ? (
                      <div>
                        <p style={{ color: '#34d399', fontWeight: 600, fontSize: 14 }}>✓ {submitFile.name}</p>
                        <p style={{ color: '#4b5563', fontSize: 12, marginTop: 4 }}>{formatSize(submitFile.size)}</p>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                        <p style={{ color: '#94a3b8', fontSize: 14 }}>Click to upload or drag file here</p>
                        <p style={{ color: '#374151', fontSize: 12, marginTop: 4 }}>CSV, PDF, XLSX, JSON up to 50MB</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ background: '#0d1117', borderRadius: 8, padding: 14, marginBottom: 20, border: '1px solid #1e293b' }}>
                <p style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.6 }}>
                  📋 <strong style={{ color: '#64748b' }}>Submission Guidelines:</strong> Resources will be reviewed within 24 hours before being published. Make sure your data doesn't contain personal information and you have rights to share it. Premium resources earn 70% of credits per download.
                </p>
              </div>

              <button className="mk-btn" onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: '13px' }}>
                {submitting ? <><span className="spinner" style={{ marginRight: 8 }}></span>Submitting...</> : '⬆️ Submit for Review'}
              </button>
            </div>
          </div>
        )}

        {/* LIBRARY TAB */}
        {tab === 'library' && (
          <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* My Downloads */}
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#e2e8f0' }}>⬇️ Downloaded Resources</h3>
                {myDownloads.length === 0 ? (
                  <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 12, padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                    <p style={{ color: '#4b5563', fontSize: 14 }}>No downloads yet</p>
                    <button className="mk-btn" onClick={() => setTab('browse')} style={{ marginTop: 12 }}>Browse Marketplace</button>
                  </div>
                ) : myDownloads.map((d, i) => (
                  <div key={i} className="mk-card" style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{TYPE_ICONS[d.type]} {d.title}</p>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <span style={{ fontSize: 11, color: '#374151' }}>{d.category}</span>
                          <span style={{ fontSize: 11, color: '#374151' }}>{new Date(d.created_at).toLocaleDateString()}</span>
                          {d.credits_spent > 0 && <span style={{ fontSize: 11, color: '#fbbf24' }}>⚡ {d.credits_spent} credits</span>}
                          {d.credits_spent === 0 && <span style={{ fontSize: 11, color: '#34d399' }}>Free</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, background: `${FORMAT_COLORS[d.format]}22`, color: FORMAT_COLORS[d.format] || '#94a3b8', padding: '2px 8px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase' }}>.{d.format}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* My Submissions */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>⬆️ My Submissions</h3>
                  {totalEarnings > 0 && (
                    <div style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 8, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>⚡ {totalEarnings} credits earned</span>
                    </div>
                  )}
                </div>
                {mySubmissions.length === 0 ? (
                  <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 12, padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>📤</div>
                    <p style={{ color: '#4b5563', fontSize: 14 }}>No submissions yet</p>
                    <button className="mk-btn" onClick={() => setTab('submit')} style={{ marginTop: 12 }}>Submit a Resource</button>
                  </div>
                ) : mySubmissions.map((s, i) => (
                  <div key={i} className="mk-card" style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{TYPE_ICONS[s.type]} {s.title}</p>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: '#374151' }}>{s.category}</span>
                          <span style={{ fontSize: 11, color: '#374151' }}>⬇️ {s.downloads} downloads</span>
                          {s.is_free ? <span style={{ fontSize: 11, color: '#34d399' }}>Free</span> : <span style={{ fontSize: 11, color: '#fbbf24' }}>⚡ {s.price_credits} credits</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, fontWeight: 700, background: s.approved ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: s.approved ? '#34d399' : '#fbbf24' }}>
                        {s.approved ? '✓ Live' : '⏳ Review'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
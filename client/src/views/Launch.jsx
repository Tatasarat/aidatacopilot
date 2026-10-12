import React, { useCallback, useEffect, useState } from 'react';
import { PageHead } from '../components/Shared';
import { useToast } from '../components/Toast';

/** State that survives a refresh. Storage can be blocked, so every access is guarded and the page works without it. */
function usePersisted(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch (_) { return initial; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* ignore */ }
  }, [key, value]);
  return [value, setValue];
}

const SCORECARD = [
  ['s1', 'Interview at least 15 relevant store owners.'],
  ['s2', 'Find at least 5 who independently describe a similar recurring problem.'],
  ['s3', 'Get anonymized sample data or permission to test a real workflow.'],
  ['s4', 'Recruit 3 stores to test a working prototype.'],
  ['s5', 'Get at least 1 paid pilot or a clear purchase commitment.'],
];

const QUESTIONS = [
  'How do you currently track sales, product margins and inventory?',
  'What report do you spend the most time preparing?',
  'Tell me about the last time you made a decision using that report.',
  'What data do you struggle to combine?',
  'Have you paid for any analytics tools? What do they fail to do?',
  'If this problem were solved reliably, what would that be worth to you?',
];

const OUTREACH = `Hi! I'm researching how small e-commerce brands track product profitability and inventory. I'm building a tool that turns store data into clear, evidence-backed business insights.

I'm not trying to sell anything during this conversation. Could I ask you a few questions about your current reporting workflow? I'd appreciate learning how you handle it today.`;

const PHASES = [
  { id: 'p1', title: 'Days 1–14: Validate the problem', goal: 'A specific customer, a recurring problem, and evidence that the current solution is inadequate.', items: ['Choose two customer segments', 'Interview 15–20 potential customers', 'Ask how they solve it today, how often it happens and what it costs them', 'Request sample workflows or anonymized data'] },
  { id: 'p2', title: 'Days 15–30: Build a narrow MVP', goal: 'A working product that solves one task reliably.', items: ['Support one data source and a few high-value tasks', 'Add sign-in, access controls and clear errors', 'Show evidence for every insight', 'Test against known questions with known answers'] },
  { id: 'p3', title: 'Days 31–60: Get real users', goal: 'Evidence that people use it repeatedly and some will pay.', items: ['Recruit 5–10 design partners', 'Watch them use it instead of relying only on feedback', 'Measure task completion, time saved, errors and repeat use', 'Offer a paid pilot once value is clear'] },
  { id: 'p4', title: 'Days 61–90: Test global distribution', goal: 'A small, measurable acquisition and revenue experiment, not just a launch post.', items: ['Launch a clear landing page and demo', 'Contact prospects in one overseas market (US or UK)', 'Test pricing, onboarding and a repeatable way to get customers', 'Fix the biggest reliability or retention issue before adding features'] },
];

const FIRST_WEEK = [
  ['w1', 'Write a one-sentence description of the problem you want to solve'],
  ['w2', 'Make a list of 20 small e-commerce brands to contact'],
  ['w3', 'Send five personalized interview requests'],
  ['w4', 'Prepare a sample store dataset with product costs, orders and refunds'],
  ['w5', 'Review what can be reused from the existing project'],
];

const ROUTINE = [
  ['Monday', 'Find 10–15 stores that match your target profile and research each one.'],
  ['Tuesday and Wednesday', 'Send 5–10 personalized messages a day, asking about their reporting workflow.'],
  ['Thursday', 'Show one real workflow with sample or authorised data. Ask them to complete a task themselves.'],
  ['Friday', 'Record objections, usage, errors and time saved. Fix the most common problem.'],
];

const GO_LIVE = [
  { group: 'Name, domain and business email', items: [
    ['g1', 'Check that the product name is free: search trademarks and domain availability before you commit to "ShopPulse".'],
    ['g2', 'Buy a domain (Cloudflare, Namecheap or GoDaddy). Plan for roughly ₹700–1,000 a year.'],
    ['g3', 'Create hello@, support@ and reports@ addresses. Cloudflare Email Routing forwards for free; Zoho Mail or Google Workspace give real mailboxes.'],
    ['g4', 'In Brevo, verify your domain as a sender and add the SPF, DKIM and DMARC records it shows you. Without them your weekly reports land in spam.'],
    ['g5', 'Set BREVO_SENDER_EMAIL on the server to reports@yourdomain.'],
  ] },
  { group: 'Deploy the app', items: [
    ['d1', 'Create a branch (v2) in GitHub and push the new code. Keep your current site running until the new one is tested.'],
    ['d2', 'Backend (Render): set DATABASE_URL, JWT_SECRET, CLIENT_URL, BREVO_API_KEY, BREVO_SENDER_EMAIL, MISTRAL_API_KEY and NODE_ENV=production.'],
    ['d3', 'Frontend (Vercel): set REACT_APP_API_URL to your backend address.'],
    ['d4', 'Rotate any API keys that were ever committed or shared, then check the server log shows "Migration" and "Server running".'],
    ['d5', 'Sign up with a fresh email, load the sample store, ask three questions and open the tape on each number.'],
    ['d6', 'Set up the Monday report: set CRON_SECRET and call POST /api/jobs/weekly-report weekly from a cron service, or set ENABLE_SCHEDULER=true on an always-on server.'],
  ] },
  { group: 'Before you take money', items: [
    ['m1', 'Publish a privacy policy and terms of service. Say what you store, why, and how people delete it.'],
    ['m2', 'Test a real payment of the smallest plan end to end, then check the plan changes and the receipt arrives.'],
    ['m3', 'For international customers, look at a merchant-of-record service (Paddle, Lemon Squeezy) so tax and VAT are handled. Check current India availability.'],
    ['m4', 'Add error tracking (Sentry free tier) and an uptime monitor.'],
    ['m5', 'Check Neon backups are on, and write down who to contact and what to do if the site goes down.'],
  ] },
];

const BUDGET_CAP = 10000;
const BUDGET_ITEMS = [
  ['llm', 'LLM API experiments', 2000, '#0e2a3a'],
  ['host', 'Hosting and database', 1000, '#1b7f55'],
  ['domain', 'Domain and basic tooling', 1200, '#f2a900'],
  ['research', 'Customer research and demos', 800, '#6b7f8e'],
  ['reserve', 'Contingency reserve', 5000, '#b9c7ce'],
];

const HOURS_ITEMS = [
  ['disc', 'Customer discovery and outreach', 2],
  ['dev', 'Product development', 3],
  ['test', 'Testing and feedback', 1],
  ['cofounder', 'Co-founder search and review', 1],
];

function Progress({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
      <p className="muted small" style={{ marginTop: 6 }}>{done} of {total} done</p>
    </div>
  );
}

function Check({ id, checked, onToggle, children }) {
  return (
    <label className={`check ${checked ? 'done' : ''}`} htmlFor={id}>
      <input id={id} type="checkbox" checked={!!checked} onChange={() => onToggle(id)} />
      <span className="t">{children}</span>
    </label>
  );
}

function CopyBox({ text, label }) {
  const toast = useToast();
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast('Copied.'); } catch (_) { toast('Could not copy. Select the text and copy it yourself.', 'error'); }
  };
  return (
    <div>
      <div className="copybox">{text}</div>
      <button className="btn secondary small" style={{ marginTop: 8 }} onClick={copy}>{label}</button>
    </div>
  );
}

function Validate({ ticks, toggle }) {
  const done = SCORECARD.filter(([id]) => ticks[id]).length;
  return (
    <div className="stack">
      <div className="card">
        <div className="card-head"><h2>Validation scorecard</h2></div>
        <p className="muted" style={{ marginBottom: 12 }}>Tick a step only when you have real evidence. If interviews don't reveal a compelling problem, change the niche before writing more code.</p>
        <Progress done={done} total={SCORECARD.length} />
        <div style={{ marginTop: 8 }}>{SCORECARD.map(([id, text]) => <Check key={id} id={id} checked={ticks[id]} onToggle={toggle}>{text}</Check>)}</div>
        {done === SCORECARD.length && <div className="alert ok" style={{ marginTop: 12 }}>All five gates passed. That is real evidence. Move on to the paid pilots.</div>}
      </div>
      <div className="grid-2">
        <div className="card" style={{ marginTop: 0 }}>
          <h2 style={{ marginBottom: 10 }}>Interview questions</h2>
          <p className="muted small" style={{ marginBottom: 10 }}>Ask about past behaviour and spending. Never ask "Would you use my AI app?" because people say yes to be polite.</p>
          <ol style={{ margin: 0, paddingLeft: 20 }}>{QUESTIONS.map((q) => <li key={q} style={{ margin: '6px 0' }}>{q}</li>)}</ol>
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <h2 style={{ marginBottom: 10 }}>Outreach message</h2>
          <CopyBox text={OUTREACH} label="Copy message" />
        </div>
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 6 }}>A weekly acquisition routine</h2>
        {ROUTINE.map(([day, text]) => (
          <div className="insight" key={day}><span className="bar" /><div><h3>{day}</h3><p className="muted">{text}</p></div><span /></div>
        ))}
      </div>
    </div>
  );
}

function Roadmap({ ticks, toggle }) {
  const all = PHASES.flatMap((p) => p.items.map((_, i) => `${p.id}-${i}`));
  const done = all.filter((id) => ticks[id]).length;
  const week = FIRST_WEEK.filter(([id]) => ticks[id]).length;
  return (
    <div className="stack">
      <div className="card">
        <div className="card-head"><h2>Your first seven days</h2></div>
        <Progress done={week} total={FIRST_WEEK.length} />
        <div style={{ marginTop: 8 }}>{FIRST_WEEK.map(([id, text]) => <Check key={id} id={id} checked={ticks[id]} onToggle={toggle}>{text}</Check>)}</div>
      </div>
      <div className="card">
        <div className="card-head"><h2>90-day roadmap</h2><span className="muted small">A working plan, not a promise of product-market fit.</span></div>
        <Progress done={done} total={all.length} />
      </div>
      {PHASES.map((p) => {
        const d = p.items.filter((_, i) => ticks[`${p.id}-${i}`]).length;
        return (
          <div className="card" key={p.id} style={{ marginTop: 0 }}>
            <div className="card-head"><h3>{p.title}</h3><span className={`pill ${d === p.items.length ? 'good' : 'warning'}`}>{d}/{p.items.length}</span></div>
            <p className="muted small" style={{ marginBottom: 6 }}>Goal: {p.goal}</p>
            {p.items.map((t, i) => <Check key={i} id={`${p.id}-${i}`} checked={ticks[`${p.id}-${i}`]} onToggle={toggle}>{t}</Check>)}
          </div>
        );
      })}
    </div>
  );
}

function Pricing({ prices, setPrices }) {
  const set = (k) => (e) => setPrices((p) => ({ ...p, [k]: Math.max(0, Number(e.target.value) || 0) }));
  const mrr = prices.starterPrice * prices.starterCount + prices.proPrice * prices.proCount;
  const customers = prices.starterCount + prices.proCount;
  const aiCost = customers * prices.questionsEach * prices.costPerQuestion;
  const profit = mrr - aiCost - prices.fixed;
  const margin = mrr > 0 ? Math.round((profit / mrr) * 100) : null;
  const num = (id, label, key, hint) => (
    <div className="field"><label htmlFor={id}>{label}</label><input id={id} className="input" type="number" min="0" step="any" value={prices[key]} onChange={set(key)} />{hint && <span className="hint">{hint}</span>}</div>
  );
  return (
    <div className="stack">
      <div className="alert note">These are pricing hypotheses to test, not established market prices. Start with one paid plan and a few early users, and avoid promising a profit increase until you have evidence.</div>
      <div className="grid-2">
        <div className="card" style={{ marginTop: 0 }}>
          <h2 style={{ marginBottom: 12 }}>Your assumptions</h2>
          {num('sp', 'Starter price (US$ per month)', 'starterPrice', 'One store and weekly insights. Starting idea: $19.')}
          {num('sc', 'Starter customers', 'starterCount')}
          {num('pp', 'Pro price (US$ per month)', 'proPrice', 'More reports, history and scheduled summaries. Starting idea: $49.')}
          {num('pc', 'Pro customers', 'proCount')}
          {num('qe', 'AI questions per customer per month', 'questionsEach')}
          {num('cq', 'Model cost per question (US$)', 'costPerQuestion', 'Check your model provider’s current pricing and measure real usage.')}
          {num('fx', 'Fixed monthly costs (US$)', 'fixed', 'Hosting, email, domain.')}
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <h2 style={{ marginBottom: 12 }}>What that means each month</h2>
          <div className="stack">
            <div><span className="muted small">Subscription revenue</span><div className="price num">${mrr.toFixed(0)}</div></div>
            <div><span className="muted small">AI model costs</span><div className="price num">${aiCost.toFixed(2)}</div></div>
            <div><span className="muted small">Left after AI and fixed costs</span><div className={`price num ${profit < 0 ? 'neg' : 'pos'}`}>{profit < 0 ? '−' : ''}${Math.abs(profit).toFixed(0)}</div></div>
            <p className="muted small">{margin == null ? 'Add customers to see a margin.' : `That is a ${margin}% margin before payment fees and tax. Include those once you pick a payment provider.`}</p>
          </div>
        </div>
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 6 }}>Early paid pilot</h2>
        <p className="muted">$10–$25 a month, discounted, in exchange for feedback. Don't build billing complexity before anyone wants to pay.</p>
      </div>
    </div>
  );
}

function Budget({ budget, setBudget }) {
  const total = BUDGET_ITEMS.reduce((s, [k]) => s + (budget[k] ?? 0), 0);
  const over = total > BUDGET_CAP;
  return (
    <div className="stack">
      <div className="card">
        <div className="card-head"><h2>First 90 days budget</h2><b className={`num ${over ? 'neg' : ''}`}>₹{total.toLocaleString('en-IN')} of ₹{BUDGET_CAP.toLocaleString('en-IN')}</b></div>
        <div className="stack-bar" aria-hidden="true">
          {BUDGET_ITEMS.map(([k, , , color]) => <i key={k} style={{ width: `${Math.min(100, ((budget[k] ?? 0) / Math.max(total, BUDGET_CAP)) * 100)}%`, background: color }} />)}
        </div>
        {over && <div className="alert error" style={{ marginTop: 12 }} role="alert">You are ₹{(total - BUDGET_CAP).toLocaleString('en-IN')} over the cap. Trim something before you spend it.</div>}
        <div style={{ marginTop: 14 }}>
          {BUDGET_ITEMS.map(([k, label, , color]) => (
            <div className="budget-row" key={k}>
              <label htmlFor={`b-${k}`}><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: color, marginRight: 8 }} />{label}</label>
              <input id={`b-${k}`} className="slider" type="range" min="0" max="6000" step="100" value={budget[k] ?? 0} onChange={(e) => setBudget((b) => ({ ...b, [k]: Number(e.target.value) }))} />
              <span className="num r" style={{ textAlign: 'right' }}>₹{(budget[k] ?? 0).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>Use free tiers wherever practical. Keep the reserve unspent unless a real need appears. Don't spend on ads, paid courses or incorporation until you know which problem you are solving.</p>
        <button className="btn secondary small" style={{ marginTop: 10 }} onClick={() => setBudget(Object.fromEntries(BUDGET_ITEMS.map(([k, , v]) => [k, v])))}>Reset to the suggested split</button>
      </div>
    </div>
  );
}

function Hours({ hours, setHours }) {
  const total = HOURS_ITEMS.reduce((s, [k, , d]) => s + (hours[k] ?? d), 0);
  return (
    <div className="card">
      <div className="card-head"><h2>Weekly schedule alongside your studies</h2><b className={`num ${total > 10 ? 'neg' : ''}`}>{total} hours a week</b></div>
      <p className="muted" style={{ marginBottom: 12 }}>Start with about 7 hours a week and raise it only if your classes and interview preparation stay on track.</p>
      {HOURS_ITEMS.map(([k, label, d]) => (
        <div className="budget-row" key={k}>
          <label htmlFor={`h-${k}`}>{label}</label>
          <input id={`h-${k}`} className="slider" type="range" min="0" max="6" step="0.5" value={hours[k] ?? d} onChange={(e) => setHours((h) => ({ ...h, [k]: Number(e.target.value) }))} />
          <span className="num" style={{ textAlign: 'right' }}>{hours[k] ?? d} h</span>
        </div>
      ))}
      {total > 10 && <div className="alert note" style={{ marginTop: 12 }}>That is more than 10 hours a week. Protect your study and placement schedule.</div>}
    </div>
  );
}

function GoLive({ ticks, toggle }) {
  const ids = GO_LIVE.flatMap((g) => g.items.map(([id]) => id));
  const done = ids.filter((id) => ticks[id]).length;
  return (
    <div className="stack">
      <div className="card">
        <div className="card-head"><h2>Go-live checklist</h2></div>
        <Progress done={done} total={ids.length} />
      </div>
      {GO_LIVE.map((g) => (
        <div className="card" key={g.group} style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 6 }}>{g.group}</h3>
          {g.items.map(([id, text]) => <Check key={id} id={id} checked={ticks[id]} onToggle={toggle}>{text}</Check>)}
        </div>
      ))}
    </div>
  );
}

const TABS = [['validate', 'Validate'], ['roadmap', 'Roadmap'], ['pricing', 'Pricing'], ['budget', 'Budget and time'], ['live', 'Go live']];

export default function Launch() {
  const [tab, setTab] = useState('validate');
  const [ticks, setTicks] = usePersisted('shoppulse_launch_ticks', {});
  const [prices, setPrices] = usePersisted('shoppulse_launch_prices', { starterPrice: 19, starterCount: 10, proPrice: 49, proCount: 3, questionsEach: 40, costPerQuestion: 0.01, fixed: 15 });
  const [budget, setBudget] = usePersisted('shoppulse_launch_budget', Object.fromEntries(BUDGET_ITEMS.map(([k, , v]) => [k, v])));
  const [hours, setHours] = usePersisted('shoppulse_launch_hours', {});
  const toggle = useCallback((id) => setTicks((t) => ({ ...t, [id]: !t[id] })), [setTicks]);

  return (
    <>
      <PageHead title="Launch plan">Your path from prototype to paying customers. Everything you tick or change here is saved in this browser.</PageHead>
      <div className="tabs" role="tablist" aria-label="Launch plan sections">
        {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === 'validate' && <Validate ticks={ticks} toggle={toggle} />}
      {tab === 'roadmap' && <Roadmap ticks={ticks} toggle={toggle} />}
      {tab === 'pricing' && <Pricing prices={prices} setPrices={setPrices} />}
      {tab === 'budget' && <div className="stack"><Budget budget={budget} setBudget={setBudget} /><Hours hours={hours} setHours={setHours} /></div>}
      {tab === 'live' && <GoLive ticks={ticks} toggle={toggle} />}
    </>
  );
}

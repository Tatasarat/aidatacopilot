import React, { useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../api';
import { shortDate } from '../format';
import { ResultTable, PageHead } from '../components/Shared';
import { ValueBars, TrendChart } from '../components/Charts';

const SUGGESTIONS = [
  'Which products generated the most profit last week?',
  'Which products have high sales but low margins?',
  'Which products might run out of stock soon?',
  'Why did revenue change compared with last month?',
  'Which products are losing money?',
  'Which products have the most refunds?',
];

export default function Ask({ user, credits, onCredits, go }) {
  const currency = user.currency || 'INR';
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [upgrade, setUpgrade] = useState(false);
  const [out, setOut] = useState(null);
  const [history, setHistory] = useState([]);
  const resultRef = useRef(null);

  useEffect(() => { api.history().then((d) => setHistory(d.history)).catch(() => {}); }, []);

  async function ask(text) {
    const q = (text ?? question).trim();
    if (q.length < 3 || busy) return;
    setQuestion(q); setBusy(true); setError(''); setUpgrade(false);
    try {
      const data = await api.ask(q);
      setOut(data);
      onCredits(data.credits);
      api.history().then((d) => setHistory(d.history)).catch(() => {});
      setTimeout(() => resultRef.current && resultRef.current.focus(), 50);
    } catch (err) {
      setError(errorMessage(err));
      if (err.response && err.response.data && err.response.data.upgrade_required) {
        setUpgrade(true);
        if (err.response.data.credits) onCredits(err.response.data.credits);
      }
    } finally {
      setBusy(false);
    }
  }

  const result = out && out.result;
  const left = credits && !credits.unlimited ? credits.credits_remaining : null;

  return (
    <>
      <PageHead title="Ask AI">
        Ask about profit, margins, refunds, stock, or why revenue changed. Answers come from your uploaded data, and every number is calculated, not guessed.
      </PageHead>

      <div className="card">
        <form className="ask-box" onSubmit={(e) => { e.preventDefault(); ask(); }}>
          <label htmlFor="q" className="sr-only">Your question</label>
          <input id="q" className="input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="For example: which products are losing money?" maxLength={300} />
          <button className="btn accent" disabled={busy || question.trim().length < 3} type="submit">{busy ? 'Working it out…' : 'Ask'}</button>
        </form>
        <div className="chips" aria-label="Suggested questions">
          {SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => ask(s)} disabled={busy}>{s}</button>)}
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>
          {credits && credits.unlimited ? 'Unlimited questions on your plan.' : left != null ? `${left} question${left === 1 ? '' : 's'} left this month. The dashboard and weekly report are always free.` : ''}
        </p>
      </div>

      {error && (
        <div className={`alert ${upgrade ? 'note' : 'error'}`} role="alert" style={{ marginTop: 16 }}>
          {error} {upgrade && <button className="linklike" onClick={() => go('billing')}>See plans</button>}
          {!upgrade && /Upload your orders/.test(error) && <button className="linklike" onClick={() => go('data')}>Add your data</button>}
        </div>
      )}

      {out && result && (
        <div className="card" ref={resultRef} tabIndex={-1} aria-live="polite" style={{ outline: 'none' }}>
          <div className="card-head">
            <h2>{result.title}</h2>
            <span className="row">
              <span className="muted small">{result.range ? `${shortDate(result.range.start)} to ${shortDate(result.range.end)}` : ''}</span>
              {out.verified && <span className="badge" title="Every number in this answer was checked against the calculated results.">✓ Numbers checked</span>}
            </span>
          </div>
          <p className="answer">{out.answer}</p>

          {result.chart && result.chart.type === 'line' && <div style={{ marginTop: 20 }}><TrendChart data={result.chart.series} currency={currency} /></div>}
          {result.chart && result.chart.type === 'bar' && result.rows.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <ValueBars rows={result.rows} labelKey={result.chart.labelKey} valueKey={result.chart.valueKey} valueType={result.chart.valueType} currency={currency} title={result.chart.title} />
            </div>
          )}

          <div style={{ marginTop: 20 }}><ResultTable columns={result.columns} rows={result.rows} currency={currency} /></div>

          <details className="evidence">
            <summary>How this was worked out</summary>
            <ul>
              <li>Period: {shortDate(result.evidence.period.start)} to {shortDate(result.evidence.period.end)}, using {result.evidence.order_lines_used.toLocaleString('en-IN')} order lines.</li>
              {result.evidence.definitions.map((d) => <li key={d}>{d}</li>)}
              {result.evidence.notes.map((n) => <li key={n}>{n}</li>)}
              <li>
                {out.understood_by === 'ai' ? 'The AI chose which analysis to run' : 'A built-in rule chose which analysis to run'}
                {out.answer_source === 'ai' ? ', and wrote the wording above. Its numbers were checked against the results.' : ', and the wording above comes from a fixed template.'}
              </li>
            </ul>
          </details>
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <div className="card-head"><h2>Recent questions</h2></div>
          {history.slice(0, 8).map((h) => (
            <button key={h.id} className="history-item" onClick={() => ask(h.question)} disabled={busy}>
              <span className="q">{h.question}</span>
              <span className="muted small" style={{ display: 'block' }}>{h.answer}</span>
            </button>
          ))}
          <p className="muted small" style={{ marginTop: 10 }}>Asking again uses one question.</p>
        </div>
      )}
    </>
  );
}

import React, { useEffect, useRef } from 'react';
import { Icon } from './Icons';
import { formatCell } from '../format';

/**
 * The tape: an adding-machine slip that shows exactly how a headline number was worked out.
 * `entry` comes straight from the server's `explain` block, so what you see is what was computed.
 */
export default function Tape({ entry, currency, periodLabel, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!entry) return undefined;
    const previous = document.activeElement;
    closeRef.current && closeRef.current.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous && previous.focus) previous.focus();
    };
  }, [entry, onClose]);

  if (!entry) return null;
  const fmt = (v, type) => formatCell(v, type, currency);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`How ${entry.label} was calculated`}>
        <div className="drawer-head">
          <h2>How this was worked out</h2>
          <button ref={closeRef} className="iconbtn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="tape">
          <h4>{entry.label.toUpperCase()} · {periodLabel}</h4>
          <p className="formula">{entry.formula}</p>
          {entry.inputs.map((line) => (
            <div className="tape-line" key={line.label}>
              <span className="what">{line.label}</span>
              <span className="lead" />
              <span className="num">{fmt(line.value, line.type)}</span>
            </div>
          ))}
          <div className="tape-line total">
            <span>{entry.label}</span>
            <span className="lead" />
            <span className="num">{fmt(entry.value, entry.type)}</span>
          </div>
          {entry.note && <p className="tape-note">{entry.note}</p>}
          <p className="tape-foot">Calculated from your uploaded files. No AI involved.</p>
        </div>
      </aside>
    </>
  );
}

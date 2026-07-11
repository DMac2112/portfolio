// Contact (§7.7): Outlook-Express-style compose window. Delivery = Web3Forms fetch POST when
// an access_key is present; the mailto: fallback fires when the key is blank OR the fetch
// fails, so Send never dead-ends.
//
// NOTE on the access_key: a Web3Forms submit key is PUBLIC-BY-DESIGN and safe to commit in a
// static bundle — it only lets people submit this form, which is the point. (This is a
// different, safe kind of key from a write-capable API token, which must never ship.)
// Dominik fills it in /os/content/contact.json (§15.4).
import { useEffect, useState } from 'react';
import type { AppProps } from '../types';

interface ContactData {
  email: string;
  linkedin: string;
  classic: string;
  endpoint: string;
  access_key: string;
}

type SendState = 'idle' | 'sending' | 'sent' | 'mailto';

export default function ContactApp({ manifest }: AppProps) {
  const [data, setData] = useState<ContactData | null>(null);
  const [from, setFrom] = useState('');
  const [subject, setSubject] = useState('Hello from DominikOS');
  const [message, setMessage] = useState('');
  const [sendState, setSendState] = useState<SendState>('idle');

  useEffect(() => {
    let alive = true;
    if (!manifest.data) return;
    fetch(manifest.data)
      .then((r) => r.json())
      .then((j) => alive && setData(j as ContactData))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [manifest.data]);

  if (!data) return <div className="app-loading">Opening contact…</div>;

  const openMailto = () => {
    window.location.href = `mailto:${data.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    setSendState('mailto');
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = data.access_key.trim();
    if (!key) return openMailto(); // §7.7: blank key → mailto path
    setSendState('sending');
    try {
      const res = await fetch(data.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: key, email: from, subject, message, from_name: from }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSendState('sent');
    } catch {
      openMailto(); // fetch failed → mailto so Send never dead-ends
    }
  };

  if (sendState === 'sent' || sendState === 'mailto') {
    return (
      <div className="app-placeholder">
        <img src={manifest.icon} alt="" />
        <h2>{sendState === 'sent' ? 'Message sent' : 'Handing over to your mail app'}</h2>
        <p>
          {sendState === 'sent'
            ? 'Thanks — your message is on its way to Dominik.'
            : `Your email app should open addressed to ${data.email}. If it didn't, just email directly.`}
        </p>
        <button type="button" onClick={() => setSendState('idle')}>Write another</button>
      </div>
    );
  }

  return (
    <form className="contact" onSubmit={send}>
      <div className="contact__toolbar">
        <button type="submit" disabled={sendState === 'sending'}>
          ✉ {sendState === 'sending' ? 'Sending…' : 'Send'}
        </button>
        <button type="button" onClick={() => window.open(data.linkedin, '_blank', 'noopener')}>LinkedIn</button>
        <button type="button" onClick={() => window.open(data.classic, '_blank', 'noopener')}>Classic site</button>
      </div>
      <div className="contact__main">
        <nav className="contact__rail" aria-hidden="true">
          <span>📥 Inbox</span>
          <span>📤 Sent Items</span>
          <span>📁 Opportunities</span>
          <span>🗑 Deleted</span>
        </nav>
        <div className="contact__compose">
          <p className="contact__intro">I'm always happy to chat about new opportunities.</p>
          <div className="field-row-stacked">
            <label htmlFor="c-to">To:</label>
            <input id="c-to" type="text" readOnly value={data.email} />
          </div>
          <div className="field-row-stacked">
            <label htmlFor="c-from">From:</label>
            <input id="c-from" type="email" required placeholder="you@example.com" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field-row-stacked">
            <label htmlFor="c-subject">Subject:</label>
            <input id="c-subject" type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="field-row-stacked contact__msg">
            <label htmlFor="c-message">Message:</label>
            <textarea id="c-message" required rows={7} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>
      </div>
    </form>
  );
}

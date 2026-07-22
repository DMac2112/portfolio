// Notepad (§7.9): plaintext viewer for readme.txt — editable in-window, never persisted.
import { useEffect, useState } from 'react';
import type { AppProps } from '../types';

export default function NotepadApp({ manifest }: AppProps) {
  const [text, setText] = useState('Loading…');
  useEffect(() => {
    let alive = true;
    if (!manifest.content) {
      setText('');
      return;
    }
    fetch(manifest.content)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => alive && setText(t))
      .catch(() => alive && setText('The file could not be opened.'));
    return () => {
      alive = false;
    };
  }, [manifest.content]);
  return (
    <textarea
      className="notepad-area"
      value={text}
      onChange={(e) => setText(e.target.value)}
      spellCheck={false}
      aria-label={manifest.title}
    />
  );
}

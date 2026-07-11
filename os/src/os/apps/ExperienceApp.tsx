// Career timeline (§7.4): years rail + cards from /os/content/experience.json. The Deloitte
// entry carries star:true and gets the highlight treatment.
import { useEffect, useState } from 'react';
import type { AppProps } from '../types';

interface Entry {
  year: string;
  org: string;
  role: string;
  body: string;
  kind?: string;
  live?: string;
  star?: boolean;
}

export default function ExperienceApp({ manifest }: AppProps) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!manifest.data) return;
    fetch(manifest.data)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => alive && setEntries(j as Entry[]))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [manifest.data]);

  if (error) return <div className="app-loading">Could not load the timeline.</div>;
  if (!entries) return <div className="app-loading">Loading career timeline…</div>;

  return (
    <div className="doc">
      <ol className="timeline">
        {[...entries].reverse().map((e) => (
          <li key={`${e.year}-${e.org}`} className={`timeline__item${e.star ? ' timeline__item--star' : ''}`}>
            <span className="timeline__year">{e.year}</span>
            <div className="timeline__card">
              <h3>
                {e.star && <span aria-label="current role">⭐ </span>}
                {e.org}
              </h3>
              <p className="timeline__role">{e.role}{e.kind === 'education' ? ' · Education' : ''}</p>
              <p>{e.body}</p>
              {e.live && (
                <a href={e.live} target="_blank" rel="noopener noreferrer">
                  Visit {e.org}'s site ↗
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

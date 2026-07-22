// Document window (§7): the ONE markdown renderer. Pipeline per plan §3/§7 — gray-matter
// (frontmatter) + marked (md→HTML) + DOMPurify (sanitize). Frontmatter `layout` picks the
// presentation: default doc · tabs (About §7.2) · project (§7.3) · skills (§7.5) ·
// testimonials (§7.6 — attributed paraphrase, deliberately no fake quotation marks).
import '../bufferShim';
import { useEffect, useMemo, useState } from 'react';
import matter from 'gray-matter';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { AppProps } from '../types';

interface DocMeta {
  layout?: 'tabs' | 'project' | 'skills' | 'testimonials';
  title?: string;
  role?: string;
  tech?: string[];
  live?: string;
  badge?: string;
  screenshot?: string;
  skills?: string[];
  certs?: string[];
}

interface DocState {
  status: 'loading' | 'error' | 'ready';
  meta: DocMeta;
  intro: string;                                  // html before the first ## section
  sections: Array<{ title: string; html: string }>;
}

marked.use({ gfm: true, breaks: false });

// external links open outside the OS window
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')?.startsWith('http')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const md = (src: string) => DOMPurify.sanitize(marked.parse(src) as string);

function parseDoc(raw: string): Omit<DocState, 'status'> {
  const { data, content } = matter(raw);
  const parts = content.split(/\n(?=## )/);
  const intro = parts[0]?.startsWith('## ') ? '' : parts.shift() ?? '';
  const sections = parts.map((p) => {
    const [head, ...rest] = p.split('\n');
    return { title: head.replace(/^## /, '').trim(), html: md(rest.join('\n')) };
  });
  return { meta: data as DocMeta, intro: md(intro), sections };
}

export default function DocWindow({ manifest }: AppProps) {
  const [doc, setDoc] = useState<DocState>({ status: 'loading', meta: {}, intro: '', sections: [] });
  const [tab, setTab] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!manifest.content) return;
    fetch(manifest.content)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((raw) => alive && setDoc({ status: 'ready', ...parseDoc(raw) }))
      .catch(() => alive && setDoc((d) => ({ ...d, status: 'error' })));
    return () => {
      alive = false;
    };
  }, [manifest.content]);

  const layout = doc.meta.layout;
  const body = useMemo(() => {
    if (doc.status !== 'ready') return null;

    if (layout === 'tabs') {
      return (
        <>
          <div className="doc__intro" dangerouslySetInnerHTML={{ __html: doc.intro }} />
          <section className="tabs doc__tabs">
            <menu role="tablist" aria-label={manifest.title}>
              {doc.sections.map((s, i) => (
                <button key={s.title} role="tab" aria-selected={i === tab} aria-controls={`tabpanel-${i}`} onClick={() => setTab(i)}>
                  {s.title}
                </button>
              ))}
            </menu>
            <article role="tabpanel" id={`tabpanel-${tab}`} dangerouslySetInnerHTML={{ __html: doc.sections[tab]?.html ?? '' }} />
          </section>
        </>
      );
    }

    if (layout === 'project') {
      const { title, role, tech, live, badge } = doc.meta;
      return (
        <>
          <header className="proj-head">
            <h2>
              {title ?? manifest.title} {badge && <span className="badge">{badge.toUpperCase()}</span>}
            </h2>
            {role && <p className="proj-head__role">{role}</p>}
            {tech && (
              <div className="chip-grid">
                {tech.map((t) => (
                  <span key={t} className="chip">{t}</span>
                ))}
              </div>
            )}
          </header>
          <div dangerouslySetInnerHTML={{ __html: doc.intro }} />
          {live && (
            <p>
              <button type="button" className="proj-live" onClick={() => window.open(live, '_blank', 'noopener')}>
                Open live site ↗
              </button>
            </p>
          )}
        </>
      );
    }

    if (layout === 'skills') {
      const { skills = [], certs = [] } = doc.meta;
      return (
        <>
          <div dangerouslySetInnerHTML={{ __html: doc.intro }} />
          <h3>Toolkit</h3>
          <div className="chip-grid">
            {skills.map((s) => (
              <span key={s} className="chip">{s}</span>
            ))}
          </div>
          <h3>Certifications</h3>
          <ul className="badge-list">
            {certs.map((c) => (
              <li key={c}>🏅 {c}</li>
            ))}
          </ul>
        </>
      );
    }

    if (layout === 'testimonials') {
      return (
        <>
          <div dangerouslySetInnerHTML={{ __html: doc.intro }} />
          <div className="t-cards">
            {doc.sections.map((s, i) => (
              <article key={s.title} className="t-card" style={{ ['--tilt' as string]: `${(i % 2 ? 1 : -1) * 0.8}deg` }}>
                <div dangerouslySetInnerHTML={{ __html: s.html }} />
                <footer>— {s.title}</footer>
              </article>
            ))}
          </div>
        </>
      );
    }

    // default document
    return (
      <>
        <div dangerouslySetInnerHTML={{ __html: doc.intro }} />
        {doc.sections.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: s.html }} />
          </section>
        ))}
      </>
    );
  }, [doc, layout, tab, manifest.title]);

  if (doc.status === 'loading') return <div className="app-loading">Opening {manifest.title}…</div>;
  if (doc.status === 'error')
    return (
      <div className="app-placeholder">
        <img src={manifest.icon} alt="" />
        <h2>{manifest.title}</h2>
        <p>The document could not be opened ({manifest.content}).</p>
      </div>
    );
  return <div className="doc">{body}</div>;
}

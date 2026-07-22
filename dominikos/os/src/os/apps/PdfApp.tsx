// Résumé PDF viewer (§7.1, amended by §15.5: Dominik supplies the PDF at /os/assets/cv.pdf —
// no build-time generation).
//
// The chrome is a period toolbar (XP/Reader-era); the document itself stays the browser's native
// PDF view. Deliberately laid out as toolbar-GROUPS + a BODY row + a STATUS bar so the fuller
// "Adobe Reader 6" tribute can slot into the marked places without restructuring:
//   · toolbar  → page box ([ 1 ] of N) and a zoom picker go after the last group
//   · body     → a thumbnail rail goes before the frame
//   · status   → page/zoom readouts replace the static cells
// Those extras need a real PDF engine (pdf.js) to know page count/zoom; the shell is ready for it.
import type { AppProps } from '../types';

export default function PdfApp({ manifest }: AppProps) {
  const src = manifest.src ?? '';
  const dl = manifest.download;

  return (
    <div className="pdf-app">
      <div className="pdf-app__toolbar" role="toolbar" aria-label="Document">
        <div className="pdf-app__group">
          {dl && (
            <a className="pdf-app__btn" href={dl.href} download={dl.filename} title="Save a copy of this document">
              <span className="pdf-app__ico" aria-hidden="true">💾</span>
              <span>Save a Copy</span>
            </a>
          )}
        </div>

        <span className="pdf-app__sep" aria-hidden="true" />

        <div className="pdf-app__group">
          <button
            type="button"
            className="pdf-app__btn"
            onClick={() => window.open(src, '_blank', 'noopener')}
            title="Open this document in a new tab"
          >
            <span className="pdf-app__ico" aria-hidden="true">🔍</span>
            <span>Open in new tab</span>
          </button>
        </div>

        {/* ADOBE-6 SLOT: page box + zoom picker mount here (needs pdf.js for real values). */}
      </div>

      <div className="pdf-app__body">
        {/* ADOBE-6 SLOT: thumbnail rail mounts here, before the document. */}
        {/* <object> renders PDFs inline in modern browsers without triggering a download;
            the nested <iframe> is the fallback for older engines. */}
        <object className="pdf-app__frame" data={src} type="application/pdf" title={manifest.title}>
          <iframe className="pdf-app__frame" src={src} title={manifest.title} style={{ border: 0 }} />
        </object>
      </div>

      <div className="pdf-app__status">
        <span className="pdf-app__cell pdf-app__cell--grow">{manifest.title}</span>
        {/* ADOBE-6 SLOT: these become live page/zoom readouts. */}
        <span className="pdf-app__cell">PDF</span>
      </div>
    </div>
  );
}

// Résumé PDF viewer (§7.1, amended by §15.5: Dominik supplies the PDF at /os/assets/cv.pdf —
// no build-time generation).
import type { AppProps } from '../types';

export default function PdfApp({ manifest }: AppProps) {
  const src = manifest.src ?? '';
  const dl = manifest.download;
  return (
    <div className="pdf-app">
      <div className="pdf-app__bar">
        {dl && (
          <a href={dl.href} download={dl.filename}>
            <button type="button">⤓ Download CV</button>
          </a>
        )}
        <button type="button" onClick={() => window.open(src, '_blank', 'noopener')}>Open in new tab ↗</button>
      </div>
      {/* <object> renders PDFs inline in all modern browsers without triggering download;
          the nested <iframe> is a fallback for older engines. */}
      <object
        className="pdf-app__frame"
        data={src}
        type="application/pdf"
        title={manifest.title}
      >
        <iframe
          className="pdf-app__frame"
          src={src}
          title={manifest.title}
          style={{ border: 0 }}
        />
      </object>
    </div>
  );
}


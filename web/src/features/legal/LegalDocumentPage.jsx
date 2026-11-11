import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink, FileText } from 'lucide-react';
import { ComerciaLogo } from '../../shared/ui/ComerciaLogo.jsx';

export function LegalDocumentPage({ title, description, pdfPath }) {
  const [status, setStatus] = useState('loading');
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    async function checkPdf() {
      try {
        let response = await fetch(pdfPath, {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-store',
        });

        // Servidores que no permiten HEAD pueden responder 405 Method Not Allowed
        if (response.status === 405) {
          response = await fetch(pdfPath, {
            method: 'GET',
            headers: { Range: 'bytes=0-10' },
            signal: controller.signal,
            cache: 'no-store',
          });
        }

        const contentType = response.headers.get('content-type') || '';
        const isPdf =
          response.ok &&
          (contentType.includes('application/pdf') ||
            contentType.includes('octet-stream') ||
            (!contentType.includes('text/html') && response.status < 400));

        setStatus(isPdf ? 'available' : 'missing');
      } catch (error) {
        if (error.name !== 'AbortError') setStatus('missing');
      }
    }

    checkPdf();
    return () => controller.abort();
  }, [pdfPath]);

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/inicio');
    }
  }

  return (
    <main className="policy-page">
      <header className="policy-top">
        <Link to="/inicio" className="auth-brand" aria-label="ComercIA, ir al inicio">
          <ComerciaLogo className="policy-logo" />
        </Link>
        <button
          type="button"
          className="back-link"
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            font: 'inherit',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <ArrowLeft size={15} />
          Volver
        </button>
      </header>

      <article className="policy-card legal-document-card">
        <div className="policy-icon">
          <FileText size={22} />
        </div>
        <div className="eyebrow">DOCUMENTACIÓN LEGAL COMERCIA</div>
        <h1>{title}</h1>
        <p className="policy-lead">{description}</p>
        <nav className="legal-document-nav" aria-label="Documentos legales">
          <Link to="/terminos">Términos y Condiciones</Link>
          <Link to="/privacidad">Política de tratamiento</Link>
        </nav>

        {status === 'loading' && (
          <div className="legal-document-status" role="status">
            Cargando documento…
          </div>
        )}

        {status === 'missing' && (
          <div className="policy-callout" role="status">
            <b>Documento pendiente de publicación</b>
            <p>
              La versión aprobada aún no está disponible. Cuando se publique, podrás consultarla o
              descargarla desde esta página.
            </p>
          </div>
        )}

        {status === 'available' && (
          <>
            <div className="legal-document-actions">
              <a className="button button-primary" href={pdfPath} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                Abrir documento
              </a>
              <a className="button button-soft" href={pdfPath} download>
                <Download size={16} />
                Descargar PDF
              </a>
            </div>
            <iframe className="legal-document-frame" src={pdfPath} title={title} />
          </>
        )}
      </article>
    </main>
  );
}

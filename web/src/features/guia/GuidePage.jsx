import { useRef, useState } from 'react';
import {
  FileText,
  FileUp,
  Info,
  LoaderCircle,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useGuide, useGuideAction } from '../../shared/hooks/useData.js';
import { Button, Modal, PageTitle } from '../../shared/ui/Components.jsx';
import { EmptyState, ErrorState, Skeleton } from '../../shared/ui/Feedback.jsx';
import { useToast } from '../../app/providers.jsx';

const MAX_BYTES = 2 * 1024 * 1024;
export function GuidePage() {
  const query = useGuide(),
    save = useGuideAction(),
    toast = useToast(),
    input = useRef(null);
  const [text, setText] = useState(null),
    [filename, setFilename] = useState(''),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [replace, setReplace] = useState(false);
  const original = query.data?.contenido || '';
  const value = text === null ? original : text;
  const dirty = value !== original || filename !== '';
  async function extract(file) {
    setError('');
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError('El archivo supera el límite de 2 MB. Elige un archivo más pequeño.');
      return;
    }
    setLoading(true);
    try {
      let extracted;
      if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        extracted = await file.text();
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();
        const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        const chunks = [];
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          const content = await page.getTextContent();
          chunks.push(content.items.map((item) => item.str).join(' '));
        }
        extracted = chunks.join('\n\n');
      } else {
        throw new Error('Ese formato no es compatible. Elige un archivo PDF o texto (.txt).');
      }
      extracted = extracted
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (!extracted)
        throw new Error(
          'No encontramos texto en el archivo. Prueba con un PDF que permita seleccionar y copiar texto.',
        );
      setText(extracted);
      setFilename(file.name);
      toast(`Texto extraído de ${file.name}. Revisa la vista previa antes de guardarlo.`);
    } catch (e) {
      setError(e.message || 'No pudimos leer este archivo.');
    } finally {
      setLoading(false);
      if (input.current) input.current.value = '';
    }
  }
  async function persist() {
    if (!value.trim()) {
      setError('La guía no puede quedar vacía.');
      return;
    }
    try {
      await save.mutateAsync({
        contenido: value.trim(),
        nombre: filename || query.data?.nombre || 'Guía del negocio',
      });
      setFilename('');
      setText(null);
      setReplace(false);
      toast('Tu guía quedó guardada.');
    } catch (e) {
      toast(e.message, 'error');
    }
  }
  async function requestSave() {
    if (original && dirty) {
      setReplace(true);
      return;
    }
    await persist();
  }
  if (query.isLoading)
    return (
      <div className="page-enter">
        <PageTitle
          eyebrow="LAS RESPUESTAS CON TU VOZ"
          title="Guía del negocio"
          description="Ponle contexto al asistente, con tus palabras."
        />
        <Skeleton rows={9} />
      </div>
    );
  if (query.error) return <ErrorState error={query.error} onRetry={query.refetch} />;
  return (
    <div className="page-enter guide-page">
      <PageTitle
        eyebrow="LAS RESPUESTAS CON TU VOZ"
        title={
          <>
            Lo que sabes, <em>también atiende.</em>
          </>
        }
        description="Agrega políticas y respuestas para que el bot tenga mejor contexto."
        actions={
          <span className="guide-secure">
            <ShieldCheck size={14} />
            Se procesa en tu navegador
          </span>
        }
      />
      <section className="guide-intro">
        <div className="guide-intro-icon">
          <Sparkles size={20} />
        </div>
        <div>
          <b>Tu experiencia, al alcance del asistente.</b>
          <p>
            Incluye información estable del negocio: horarios especiales, ubicación, cambios y
            devoluciones, o detalles de tus productos.
          </p>
        </div>
        <span className="guide-page-index">
          01 <i /> 01
        </span>
      </section>
      <div className="guide-layout">
        <section className="guide-main surface">
          <header className="guide-main-head">
            <div>
              <div className="section-eyebrow">DOCUMENTO VIGENTE</div>
              <h3>{query.data?.nombre || 'Guía de preguntas frecuentes'}</h3>
              <p>Sube un PDF con texto o escribe directamente en este espacio.</p>
            </div>
            <span className="guide-status">
              <i />
              Activa
            </span>
          </header>
          <div
            className="upload-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              extract(e.dataTransfer.files[0]);
            }}
          >
            <input
              ref={input}
              type="file"
              accept="application/pdf,text/plain,.txt,.pdf"
              hidden
              onChange={(e) => extract(e.target.files[0])}
            />
            {loading ? (
              <>
                <span className="upload-icon loading">
                  <LoaderCircle size={19} />
                </span>
                <b>Estamos leyendo el documento</b>
                <small>El texto se extrae en tu navegador.</small>
              </>
            ) : (
              <>
                <span className="upload-icon">
                  <FileUp size={19} />
                </span>
                <b>Suelta el documento aquí</b>
                <small>PDF con texto o archivo .txt · hasta 2 MB</small>
                <Button type="button" onClick={() => input.current?.click()} icon={Upload}>
                  Elegir archivo
                </Button>
              </>
            )}
          </div>
          {error && (
            <div className="inline-error">
              <Info size={15} />
              <span>{error}</span>
            </div>
          )}
          {filename && (
            <div className="file-ready">
              <FileText size={17} />
              <span>
                <b>{filename}</b>
                <small>{value.length.toLocaleString('es-CO')} caracteres extraídos</small>
              </span>
              <button
                onClick={() => {
                  setFilename('');
                  setText(original);
                }}
                aria-label="Descartar archivo"
              >
                <X size={15} />
              </button>
            </div>
          )}
          <label className="guide-editor-label" htmlFor="guide-content">
            <span>
              VISTA PREVIA DEL TEXTO{' '}
              <small>
                {value.length.toLocaleString('es-CO')} caracteres · máximo del archivo: 2 MB
              </small>
            </span>
            <textarea
              id="guide-content"
              value={value}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe aquí la información que el bot debería conocer…"
            />
          </label>
          <div className="guide-main-foot">
            <span>
              <Info size={14} />
              Revisa el texto extraído antes de guardar. El bot no recibe archivos.
            </span>
            <div>
              <Button
                disabled={!dirty}
                onClick={() => {
                  setText(null);
                  setFilename('');
                  setError('');
                }}
              >
                Descartar
              </Button>
              <Button
                variant="primary"
                icon={Save}
                loading={save.isPending}
                disabled={!dirty}
                onClick={requestSave}
              >
                Guardar guía
              </Button>
            </div>
          </div>
        </section>
        <aside className="guide-aside">
          <article className="surface guide-hints">
            <span className="guide-aside-mark">
              <Info size={16} />
            </span>
            <h3>Una buena guía ayuda a responder con seguridad.</h3>
            <p>
              El asistente solo usa la información que escribas aquí para contestar preguntas
              frecuentes.
            </p>
            <ul>
              <li>
                <span>01</span>Escribe datos claros y concretos.
              </li>
              <li>
                <span>02</span>Evita contraseñas e información sensible.
              </li>
              <li>
                <span>03</span>Actualízala si cambian tus políticas.
              </li>
            </ul>
          </article>
          <article className="guide-file-card">
            <span>
              <FileText size={16} />
            </span>
            <div>
              <b>Solo se guarda una guía</b>
              <small>Al reemplazarla, la nueva versión será la vigente para el bot.</small>
            </div>
          </article>
          <article className="guide-file-card">
            <span>
              <ShieldCheck size={16} />
            </span>
            <div>
              <b>Privacidad primero</b>
              <small>No agregues datos personales de tus clientes a este documento.</small>
            </div>
          </article>
        </aside>
      </div>
      <Modal
        open={replace}
        size="small"
        title="Reemplazar la guía actual"
        description="Esta nueva versión sustituirá el documento que usa el asistente."
        onClose={() => setReplace(false)}
        footer={
          <>
            <Button onClick={() => setReplace(false)}>Seguir revisando</Button>
            <Button variant="primary" icon={RotateCcw} loading={save.isPending} onClick={persist}>
              Reemplazar guía
            </Button>
          </>
        }
      >
        <div className="replace-guide-note">
          <Info size={17} />
          <p>Confirma que revisaste el texto. Solo la última guía quedará activa.</p>
        </div>
      </Modal>
    </div>
  );
}

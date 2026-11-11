import { LegalDocumentPage } from '../legal/LegalDocumentPage.jsx';

export function TermsPage() {
  return (
    <LegalDocumentPage
      title="Términos y Condiciones de uso"
      description="Consulta las condiciones para utilizar el asistente de ComercIA y el panel web."
      pdfPath="/legal/terminos.pdf"
    />
  );
}

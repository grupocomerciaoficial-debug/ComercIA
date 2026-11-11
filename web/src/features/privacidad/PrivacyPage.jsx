import { LegalDocumentPage } from '../legal/LegalDocumentPage.jsx';

export function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="Política de Tratamiento de Datos Personales"
      description="Consulta cómo se tratan los datos personales y cómo ejercer los derechos de sus titulares."
      pdfPath="/legal/politica-tratamiento-datos.pdf"
    />
  );
}

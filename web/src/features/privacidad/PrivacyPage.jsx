import { Link } from 'react-router-dom';
import { ComerciaLogo } from '../../shared/ui/ComerciaLogo.jsx';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { DEFAULT_CHANNEL, getChannel } from '../../shared/lib/contracts.js';

const version = import.meta.env.VITE_PRIVACY_POLICY_VERSION || '1.0';
const effectiveDate = import.meta.env.VITE_PRIVACY_POLICY_DATE || '22 de octubre de 2026';
const controllerName = import.meta.env.VITE_PRIVACY_CONTROLLER_NAME;
const controllerEmail = import.meta.env.VITE_PRIVACY_CONTACT_EMAIL;
const controllerAddress = import.meta.env.VITE_PRIVACY_CONTACT_ADDRESS;
const policyReady = Boolean(controllerName && controllerEmail && controllerAddress);

export function PrivacyPage() {
  const channel = getChannel(DEFAULT_CHANNEL);
  return (
    <main className="policy-page">
      <header className="policy-top">
        <Link to="/ingresar" className="auth-brand">
          <ComerciaLogo className="policy-logo" />
        </Link>
        <Link className="back-link" to="/ingresar">
          <ArrowLeft size={15} />
          Volver
        </Link>
      </header>
      <article className="policy-card">
        <div className="policy-icon">
          <ShieldCheck size={22} />
        </div>
        <div className="eyebrow">INFORMACIÓN PARA CLIENTES Y COMERCIOS</div>
        <h1>Política de tratamiento de datos personales</h1>
        <p className="policy-lead">
          Esta política explica quién trata los datos personales en ComercIA, con qué finalidades,
          cuáles son los derechos de sus titulares y cómo ejercerlos. El MVP atiende por{' '}
          {channel.label}; WhatsApp queda previsto para una fase posterior.
        </p>
        {!policyReady && (
          <div className="policy-callout">
            <b>Borrador pendiente de completar antes de publicación</b>
            <p>
              El equipo debe confirmar la razón social o nombre del responsable, domicilio y correo
              oficial para consultas y reclamos. No se habilitó un contacto inventado. Antes del
              piloto, complete estos datos y publique esta misma URL para el aviso de WF-02.
            </p>
          </div>
        )}
        <section>
          <h2>1. Responsable y contacto</h2>
          <p>
            El responsable del tratamiento de los datos de cada conversación es el comercio que
            atiende al cliente. Para los datos de cuentas, operación y soporte del panel, el
            responsable debe ser la persona o entidad titular del servicio ComercIA. Los
            responsables vigentes son:{' '}
            {controllerName || '[nombre o razón social pendiente de confirmar]'}; domicilio:{' '}
            {controllerAddress || '[dirección pendiente de confirmar]'}; correo de consultas y
            reclamos: {controllerEmail || '[correo pendiente de confirmar]'}. La identidad y el
            canal del comercio responsable deben informarse al cliente en el aviso de privacidad del
            bot.
          </p>
        </section>
        <section>
          <h2>2. Finalidades y datos tratados</h2>
          <p>
            Los datos se utilizan para responder consultas, consultar el catálogo y la guía del
            comercio, preparar y hacer seguimiento a pedidos, atender solicitudes humanas o de
            modificación/cancelación, administrar la cuenta del comercio y proteger la operación. En
            el MVP por Telegram pueden tratarse el identificador de usuario, mensajes autorizados,
            productos, especificaciones, dirección de entrega, forma de pago, identificadores de
            pedido y el teléfono personal del comerciante para alertas. Si se habilita WhatsApp en
            una fase posterior, el canal podrá aportar un número telefónico del cliente. No se
            solicitan datos sensibles ni datos de tarjetas de pago.
          </p>
        </section>
        <section>
          <h2>3. Autorización y atención sin autorización</h2>
          <p>
            Antes de almacenar contenido de conversación y usarlo para atención automatizada, el bot
            solicita autorización y enlaza a esta política. Si la persona no autoriza, no se
            conserva el contenido del mensaje ni se consulta un proveedor de inteligencia
            artificial; solo se conserva la referencia estrictamente necesaria para informar al
            comercio de la solicitud de atención alternativa. En Telegram esa referencia no es un
            número telefónico.
          </p>
        </section>
        <section>
          <h2>4. Derechos y solicitudes</h2>
          <p>
            La persona titular puede conocer, actualizar y rectificar sus datos; solicitar prueba de
            la autorización; ser informada sobre el uso; presentar consultas y reclamos; solicitar
            la supresión o revocar la autorización cuando sea procedente; y acudir ante la
            Superintendencia de Industria y Comercio después de agotar el trámite ante el
            responsable. Para ejercerlos, escriba al canal oficial indicado arriba con su
            identificación, descripción de la solicitud y datos que permitan localizar la
            conversación. Las consultas se atienden en un máximo de diez (10) días hábiles; los
            reclamos, en quince (15) días hábiles, con las reglas de prórroga previstas en la Ley
            1581 de 2012. El responsable podrá verificar identidad.
          </p>
        </section>
        <section>
          <h2>5. Conservación, encargados y seguridad</h2>
          <p>
            Los datos se conservan durante el tiempo necesario para las finalidades informadas y las
            obligaciones legales o contractuales aplicables. ComercIA y los proveedores tecnológicos
            que intervienen actúan según las funciones y obligaciones que se formalicen para cada
            tratamiento. El acceso debe limitarse por comercio y rol, con medidas de seguridad
            razonables. Una solicitud de supresión se atenderá considerando las obligaciones
            vigentes y la necesidad de conservar registros permitidos por la ley.
          </p>
        </section>
        <section>
          <h2>6. Cambios a esta política</h2>
          <p>
            Los cambios sustanciales de responsable o finalidad se comunicarán antes de aplicarse
            cuando así corresponda. La versión vigente y su fecha aparecen al final de esta página.
            La URL pública de esta página debe ser la misma incluida en el aviso de consentimiento
            de WF-02.
          </p>
        </section>
        <p className="policy-version">
          Política de tratamiento · versión {version} · Vigente desde {effectiveDate} · Piloto
          ComercIA, Cúcuta, Colombia
        </p>
        <Link className="button button-primary" to="/ingresar">
          Volver al panel
        </Link>
      </article>
    </main>
  );
}

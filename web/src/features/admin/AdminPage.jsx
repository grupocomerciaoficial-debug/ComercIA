import { useMemo, useState } from 'react';
import { Building2, CircleAlert, Link2, Search, ShieldCheck, Store } from 'lucide-react';
import { useMerchantAction, useMerchants, usePhoneIdAction } from '../../shared/hooks/useData.js';
import { DEFAULT_CHANNEL, getChannel } from '../../shared/lib/contracts.js';
import {
  Button,
  FormField,
  Modal,
  PageTitle,
  SearchInput,
  StatusBadge,
} from '../../shared/ui/Components.jsx';
import { EmptyState, ErrorState, Skeleton, emptyBusqueda } from '../../shared/ui/Feedback.jsx';
import { useToast } from '../../app/providers.jsx';

export function AdminPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const merchants = useMerchants();
  const toggle = useMerchantAction();
  const savePhone = usePhoneIdAction();
  const toast = useToast();
  const rows = useMemo(
    () =>
      (merchants.data || []).filter((merchant) =>
        merchant.nombre_comercial
          .toLocaleLowerCase('es')
          .includes(search.trim().toLocaleLowerCase('es')),
      ),
    [merchants.data, search],
  );

  async function changeEnabled(merchant) {
    try {
      await toggle.mutateAsync({ id: merchant.id, active: !merchant.activo });
      toast(merchant.activo ? 'Comercio pausado.' : 'Comercio activado.');
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function updateChannel() {
    if (!selected || !phoneNumberId.trim()) {
      toast('Escribe el identificador del canal antes de guardar.', 'error');
      return;
    }
    try {
      await savePhone.mutateAsync({ id: selected.id, value: phoneNumberId });
      toast('Identificador del canal guardado.');
      setSelected(null);
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  const channel = getChannel(selected?.canal || DEFAULT_CHANNEL);

  return (
    <div className="page-enter admin-page">
      <PageTitle
        eyebrow="OPERACIÓN INTERNA · COMERCIA"
        title={
          <>
            Cada comercio, <em>bien acompañado.</em>
          </>
        }
        description="Consulta y actualiza la configuración de los comercios de la plataforma."
        actions={
          <span className="admin-shield">
            <ShieldCheck size={15} />
            Sin acceso a pedidos ni datos de clientes
          </span>
        }
      />
      <div className="admin-scope-note">
        <CircleAlert size={16} />
        <span>
          Este espacio solo consulta comercios y guarda cambios por funciones autorizadas.
        </span>
      </div>
      <div className="admin-tabs">
        <span className="active">
          <Building2 size={15} />
          Comercios <span>{merchants.data?.length || 0}</span>
        </span>
      </div>
      <section className="surface admin-surface">
        <div className="admin-list-head">
          <div>
            <span className="section-eyebrow">COMERCIOS EN LA PLATAFORMA</span>
            <h3>Una operación transparente</h3>
            <p>Consulta el canal, la guía y el horario sin acceder a información de clientes.</p>
          </div>
        </div>
        <div className="admin-toolbar">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar comercio…" />
          <span className="admin-result-count">{rows.length} comercios</span>
        </div>
        {merchants.isLoading ? (
          <Skeleton rows={5} />
        ) : merchants.error ? (
          <ErrorState error={merchants.error} onRetry={merchants.refetch} />
        ) : rows.length ? (
          <div className="merchant-list">
            {rows.map((merchant) => (
              <MerchantRow
                key={merchant.id}
                merchant={merchant}
                onToggle={() => changeEnabled(merchant)}
                onPhone={() => {
                  setSelected(merchant);
                  setPhoneNumberId(merchant.identificador_canal || '');
                }}
                pending={toggle.isPending}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            illustration={emptyBusqueda}
            icon={Search}
            title="No encontramos comercios"
            description="Revisa el nombre o limpia la búsqueda."
          />
        )}
      </section>
      <Modal
        open={Boolean(selected)}
        title={`Actualizar canal de ${channel.label}`}
        description={selected?.nombre_comercial}
        onClose={() => setSelected(null)}
        size="small"
        footer={
          <>
            <Button onClick={() => setSelected(null)}>Cancelar</Button>
            <Button
              variant="primary"
              icon={Link2}
              loading={savePhone.isPending}
              onClick={updateChannel}
            >
              Guardar identificador
            </Button>
          </>
        }
      >
        <FormField
          label="Identificador público del canal"
          hint="El secreto del bot se administra desde las credenciales de n8n."
        >
          <input
            value={phoneNumberId}
            onChange={(event) => setPhoneNumberId(event.target.value)}
            placeholder={channel.key === 'telegram' ? '@nombre_del_bot' : 'Identificador del canal'}
          />
        </FormField>
      </Modal>
    </div>
  );
}

function MerchantRow({ merchant, onToggle, onPhone, pending }) {
  const channel = getChannel(merchant.canal || DEFAULT_CHANNEL);
  return (
    <article className="merchant-row">
      <span className="merchant-mark">
        <Store size={18} />
      </span>
      <div className="merchant-name">
        <b>{merchant.nombre_comercial}</b>
        <small>
          {channel.label} · {merchant.identificador_canal || 'sin identificador conectado'}
        </small>
      </div>
      <div className="merchant-setup">
        <span className={merchant.identificador_canal ? 'setup-done' : 'setup-pending'}>
          <i />
          {merchant.identificador_canal ? 'Canal conectado' : 'Canal pendiente'}
        </span>
        <small>
          <span className={merchant.guia ? 'setup-tick' : 'setup-empty'}>
            {merchant.guia ? '✓' : '○'}
          </span>{' '}
          Guía ·{' '}
          <span className={merchant.horario ? 'setup-tick' : 'setup-empty'}>
            {merchant.horario ? '✓' : '○'}
          </span>{' '}
          Horario
        </small>
      </div>
      <StatusBadge status={merchant.activo ? 'Activo' : 'Pausado'} />
      <div className="merchant-actions">
        <button
          onClick={onPhone}
          className="icon-button"
          title="Configurar canal"
          aria-label={`Configurar canal de ${merchant.nombre_comercial}`}
        >
          <Link2 size={16} />
        </button>
        <button
          onClick={onToggle}
          disabled={pending}
          className={`button button-small ${merchant.activo ? 'button-soft' : 'button-primary'}`}
        >
          {merchant.activo ? 'Pausar' : 'Activar'}
        </button>
      </div>
    </article>
  );
}

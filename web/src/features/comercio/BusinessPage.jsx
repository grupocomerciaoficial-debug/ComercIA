import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  BadgeCheck,
  Clock3,
  MessageCircle,
  Save,
  ShieldCheck,
  Store,
  Truck,
  WalletCards,
} from 'lucide-react';
import { businessSchema } from '../../shared/lib/schemas.js';
import { DEFAULT_CHANNEL, getChannel } from '../../shared/lib/contracts.js';
import { useBusiness, useBusinessAction } from '../../shared/hooks/useData.js';
import { useToast } from '../../app/providers.jsx';
import { Button, FormField, PageTitle } from '../../shared/ui/Components.jsx';
import { ErrorState, Skeleton } from '../../shared/ui/Feedback.jsx';

const WEEK = [
  ['lunes', 'Lunes'],
  ['martes', 'Martes'],
  ['miercoles', 'Miércoles'],
  ['jueves', 'Jueves'],
  ['viernes', 'Viernes'],
  ['sabado', 'Sábado'],
  ['domingo', 'Domingo'],
];
const EMPTY = {
  nombre_comercial: '',
  direccion: '',
  datos_transferencia: '',
  telefono_alertas: '',
  tiempo_respuesta_humana: '',
  tiempo_estimado: '',
  modo_seguimiento: 'basico',
  entregas: { domicilio: true, recogida: true },
  horario: {},
};

export function BusinessPage() {
  const query = useBusiness();
  const mutation = useBusinessAction();
  const toast = useToast();
  const channel = getChannel(query.data?.canal || DEFAULT_CHANNEL);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(businessSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (query.data)
      reset({
        ...EMPTY,
        ...query.data,
        entregas: { ...EMPTY.entregas, ...query.data.entregas },
        horario: { ...EMPTY.horario, ...query.data.horario },
      });
  }, [query.data, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
      toast('Los datos de tu comercio quedaron guardados.');
      reset(values);
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  if (query.isLoading)
    return (
      <div className="page-enter">
        <PageTitle
          eyebrow="TU NEGOCIO, A TU MANERA"
          title="Mi comercio"
          description="Los detalles que dan forma a cada respuesta del asistente."
        />
        <Skeleton rows={12} />
      </div>
    );
  if (query.error) return <ErrorState error={query.error} onRetry={query.refetch} />;

  return (
    <div className="page-enter business-page">
      <PageTitle
        eyebrow="TU NEGOCIO, A TU MANERA"
        title={
          <>
            Tu comercio, <em>con tu sello.</em>
          </>
        }
        description="Lo que configures aquí orienta las respuestas del asistente."
        actions={
          <span className="saved-indicator">
            <i />
            {isDirty ? 'Cambios sin guardar' : 'Todo guardado'}
          </span>
        }
      />
      <div className="business-connect-banner">
        <span className="connect-icon">
          <MessageCircle size={18} />
        </span>
        <div>
          <b>Canal de atención</b>
          <p>{`El bot del comercio opera mediante ${channel.label}. La conexión técnica se gestiona desde n8n.`}</p>
        </div>
        <span className="connect-status">
          <i />
          {channel.label}
        </span>
      </div>
      <form onSubmit={submit} className="business-layout">
        <div className="business-form-main">
          <section className="settings-card">
            <SectionHeading
              icon={Store}
              eyebrow="IDENTIDAD"
              title="Cómo se presenta tu tienda"
              copy="El bot usa estos datos para reconocer el negocio."
            />
            <div className="settings-form-grid">
              <FormField
                id="nombre_comercial"
                label="Nombre comercial"
                required
                error={errors.nombre_comercial?.message}
              >
                <input
                  id="nombre_comercial"
                  {...register('nombre_comercial')}
                  placeholder="Ej. Variedades La Económica"
                />
              </FormField>
              <FormField
                id="direccion"
                label="Dirección del local"
                hint="Se comparte a quien elige recoger su pedido."
                error={errors.direccion?.message}
              >
                <input
                  id="direccion"
                  {...register('direccion')}
                  placeholder="Barrio, calle y número"
                />
              </FormField>
            </div>
            <FormField
              id="telefono_alertas"
              label="Número para recibir alertas"
              hint="Contacto personal del comercio; es independiente del canal del bot."
              error={errors.telefono_alertas?.message}
            >
              <input
                id="telefono_alertas"
                {...register('telefono_alertas')}
                inputMode="tel"
                placeholder="+57 300 000 0000"
              />
            </FormField>
          </section>
          <section className="settings-card">
            <SectionHeading
              icon={Clock3}
              eyebrow="TIEMPOS Y HORARIOS"
              title="Tu ritmo de atención"
              copy="Así el asistente puede dar expectativas claras."
            />
            <div className="settings-form-grid">
              <FormField
                id="tiempo_respuesta_humana"
                label="Tiempo para respuesta humana"
                hint="Escribe el tiempo como se lo dirías a un cliente."
                error={errors.tiempo_respuesta_humana?.message}
              >
                <input
                  id="tiempo_respuesta_humana"
                  type="text"
                  maxLength="100"
                  {...register('tiempo_respuesta_humana')}
                  placeholder="Ej. unos 10 minutos"
                />
              </FormField>
              <FormField
                id="tiempo_estimado"
                label="Tiempo de preparación"
                hint="Para pedidos confirmados."
                error={errors.tiempo_estimado?.message}
              >
                <input
                  id="tiempo_estimado"
                  type="text"
                  maxLength="100"
                  {...register('tiempo_estimado')}
                  placeholder="Ej. 30-45 minutos"
                />
              </FormField>
            </div>
            <div className="week-schedule-head">
              <div>
                <b>Horario de atención</b>
                <small>Si no configuras un horario, se asume atención todo el día.</small>
              </div>
            </div>
            <div className="schedule-list">
              {WEEK.map(([day, label]) => (
                <ScheduleRow key={day} day={day} label={label} control={control} />
              ))}
            </div>
          </section>
          <section className="settings-card">
            <SectionHeading
              icon={WalletCards}
              eyebrow="OPERACIÓN"
              title="Entregas y pagos"
              copy="Elige las opciones de entrega y configura tus datos de transferencia."
            />
            <div className="choice-grid">
              <ToggleController
                control={control}
                name="entregas.domicilio"
                label="Domicilio"
                description="Entregas en la dirección del cliente."
                icon={Truck}
              />
              <ToggleController
                control={control}
                name="entregas.recogida"
                label="Recogida en tienda"
                description="El cliente pasa por el local."
                icon={Store}
              />
            </div>
            <FormField
              id="datos_transferencia"
              label="Datos para transferencia"
              hint="El bot podrá compartir esta información cuando corresponda."
              error={errors.datos_transferencia?.message}
            >
              <textarea
                id="datos_transferencia"
                rows={3}
                {...register('datos_transferencia')}
                placeholder="Banco, tipo y número de cuenta, o billetera"
              />
            </FormField>
          </section>
          <section className="settings-card">
            <SectionHeading
              icon={BadgeCheck}
              eyebrow="SEGUIMIENTO"
              title="Mantén al cliente al tanto"
              copy="El modo de seguimiento controla los avisos automáticos."
            />
            <div className="tracking-options">
              <label className="tracking-choice">
                <input type="radio" value="basico" {...register('modo_seguimiento')} />
                <span>
                  <i className="tracking-radio" />
                  <b>Básico</b>
                  <small>Avisa al confirmar o cancelar.</small>
                </span>
              </label>
              <label className="tracking-choice">
                <input type="radio" value="completo" {...register('modo_seguimiento')} />
                <span>
                  <i className="tracking-radio" />
                  <b>Completo</b>
                  <small>También avisa al procesar el pedido.</small>
                </span>
              </label>
            </div>
          </section>
          <div className="form-sticky-save">
            <span>
              <ShieldCheck size={15} />
              Tus cambios se aplican en el próximo mensaje.
            </span>
            <Button type="submit" variant="primary" icon={Save} loading={mutation.isPending}>
              Guardar configuración
            </Button>
          </div>
        </div>
        <aside className="business-side">
          <article className="business-preview-card">
            <span className="preview-eyebrow">VISTA PREVIA</span>
            <div className="preview-chat">
              <div className="preview-chat-brand">
                <span>
                  <Store size={15} />
                </span>
                <div>
                  <b>{query.data?.nombre_comercial || 'Tu comercio'}</b>
                  <small>en línea</small>
                </div>
                <i />
              </div>
              <div className="preview-message">
                ¡Hola!
                <br />
                Bienvenido a <b>{query.data?.nombre_comercial || 'tu tienda'}</b>.<br />
                ¿En qué te puedo ayudar hoy?<small>Asistente ComercIA · ahora</small>
              </div>
              <div className="preview-input">Escribe un mensaje…</div>
            </div>
            <p>
              Así podría iniciar la conversación. El menú lo define el flujo conectado al canal.
            </p>
          </article>
          <article className="business-reminder">
            <div>
              <Clock3 size={15} />
              <b>Una expectativa honesta</b>
            </div>
            <p>
              Si no hay horario configurado, el asistente asume que tu negocio atiende durante todo
              el día.
            </p>
            <span>Regla del proyecto · RN-20</span>
          </article>
        </aside>
      </form>
    </div>
  );
}

function SectionHeading({ icon: Icon, eyebrow, title, copy }) {
  return (
    <header className="settings-section-head">
      <span className="settings-icon">
        <Icon size={17} />
      </span>
      <div>
        <span className="section-eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
        <p>{copy}</p>
      </div>
    </header>
  );
}

function ScheduleRow({ day, label, control }) {
  const active = useWatch({ control, name: `horario.${day}.activo` });
  return (
    <div className="schedule-row">
      <span className="day-label">{label}</span>
      <Controller
        control={control}
        name={`horario.${day}.activo`}
        defaultValue={false}
        render={({ field }) => (
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(field.value)}
            className={`toggle ${field.value ? 'on' : ''}`}
            onClick={() => field.onChange(!field.value)}
          >
            <i />
          </button>
        )}
      />
      <Controller
        control={control}
        name={`horario.${day}.abre`}
        defaultValue="09:00"
        render={({ field }) => (
          <input
            type="time"
            aria-label={`${label}: hora de apertura`}
            disabled={!active}
            {...field}
          />
        )}
      />
      <span className="schedule-separator">a</span>
      <Controller
        control={control}
        name={`horario.${day}.cierra`}
        defaultValue="18:00"
        render={({ field }) => (
          <input
            type="time"
            aria-label={`${label}: hora de cierre`}
            disabled={!active}
            {...field}
          />
        )}
      />
    </div>
  );
}

function ToggleController({ control, name, label, description, icon: Icon }) {
  return (
    <Controller
      control={control}
      name={name}
      defaultValue={false}
      render={({ field }) => (
        <div className="operation-choice">
          <span className="operation-icon">
            <Icon size={17} />
          </span>
          <div>
            <b>{label}</b>
            <small>{description}</small>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(field.value)}
            className={`toggle ${field.value ? 'on' : ''}`}
            onClick={() => field.onChange(!field.value)}
          >
            <i />
          </button>
        </div>
      )}
    />
  );
}

# ComercIA Panel Web

Panel administrativo para comercios conectado a Supabase local. La aplicación usa Supabase Auth y una sola capa de repositorios; no incluye datos de demostración ni un modo local alternativo.

## Requisitos

- Node.js 22.x, versión 22.13 o superior.
- npm compatible con Node 22.
- Docker Desktop iniciado para levantar Supabase local.

## Instalación

La web incluye acceso por Supabase Auth, configuración del comercio, catálogo, pedidos, bandeja de atención, guía, páginas públicas de Términos y Política de Tratamiento de Datos, y administración de comercios. El registro público permanece deshabilitado para el MVP.

## Publicar los documentos legales

Las rutas públicas son `/terminos` y `/privacidad`; no requieren iniciar sesión. Las páginas muestran un estado de documento pendiente hasta que exista el PDF correspondiente. Cuando los DOCX estén completos y aprobados, expórtalos a PDF y copia los archivos a `web/public/legal/` con estos nombres exactos:

- `terminos.pdf` para Términos y Condiciones.
- `politica-tratamiento-datos.pdf` para la Política de Tratamiento de Datos Personales.

Al desplegar en Vercel, los documentos aparecerán en sus rutas públicas y podrán abrirse o descargarse. Las URL estables son `/legal/terminos.pdf` y `/legal/politica-tratamiento-datos.pdf`; configura WF-02 para enlazar `/privacidad` y registrar el identificador de versión de la política por separado. No agregues los PDF hasta retirar campos pendientes y aprobar el contenido.

Desde esta carpeta (`web/`):

```powershell
npm ci
Copy-Item .env.example .env.local
```

Configura las variables descritas abajo en `web/.env.local`. Este archivo no se debe subir al repositorio.

## Supabase local

Desde la raíz del repositorio, con Docker Desktop abierto:

```powershell
npx supabase start
npx supabase status
```

Toma `API_URL` y la clave pública `ANON_KEY` o `PUBLISHABLE_KEY` que muestre el CLI y úsalas como `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. La clave `service_role` es privada y no debe copiarse al panel ni a variables `VITE_*`.

Las migraciones de `supabase/migrations/` aplican el esquema base y las extensiones del panel. `supabase/seed.sql` carga la información comercial de Berakah junto con registros sintéticos de prueba y cuentas locales. Para reconstruir una base local descartable:

```powershell
npx supabase db reset
```

Ese comando borra y vuelve a crear la base local. No lo ejecutes si necesitas conservar sus datos.

## Variables

- `VITE_SUPABASE_URL`: URL local del API que muestra `supabase status`.
- `VITE_SUPABASE_ANON_KEY`: clave pública local `anon` o `publishable`.
- `VITE_N8N_PANEL_ENVIAR_URL`: endpoint HTTPS de n8n para enviar respuestas desde la bandeja. El panel envía `POST` JSON `{ "id_conversacion": number, "contenido": string }` y el JWT de Supabase en `Authorization: Bearer`. El equipo de n8n debe validar esa sesión y aplicar autorización por comercio. Si la variable queda vacía, el envío aparece deshabilitado.
- Los documentos legales se publican como PDF estáticos en `public/legal/`; no necesitan variables de entorno. Completa y aprueba el contenido antes de agregar los archivos.

El panel no usa `service_role`. No incluyas tokens de bot, contraseñas, claves privadas ni secretos de n8n en esta carpeta.

## Comandos

```powershell
npm run dev
npm run build
npm run lint
```

## Acceso y datos

El inicio de sesión se realiza con Supabase Auth. El perfil de comercio se busca por `usuarios.auth_user_id`; solo las cuentas activas con comercio asociado pueden entrar. El equipo de plataforma se valida con `es_plataforma()` y administra comercios exclusivamente mediante `admin_listar_comercios()` y `admin_actualizar_comercio()`.

Pedidos, catálogo, bandeja, comercio y guía usan las tablas y RPC de `supabase/migrations/`. La bandeja oculta contenido y mensajes cuando `alertas.con_contenido` es falso. Los cambios de estado pasan únicamente por `panel_cambiar_estado()` y las acciones de atención por sus RPC correspondientes.

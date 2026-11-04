# Entrega web de Sofi

Este paquete contiene una copia completa de `web/` para que la aplicación pueda revisarse y compilarse como un solo proyecto. La lista siguiente identifica el alcance asignado a Sofi en el cronograma; los módulos de pedidos y bandeja pertenecen a Fabián, y las carpetas compartidas conectan ambos aportes.

## Alcance de Sofi

- ACT-12: inicio de sesión, recuperación de contraseña y control de acceso, en `src/features/auth/`, `src/shared/data/real/auth.js` y las rutas compartidas.
- ACT-13: configuración del comercio y catálogo, en `src/features/comercio/BusinessPage.jsx`, `src/features/catalogo/` y los repositorios correspondientes.
- ACT-14: página pública de privacidad, en `src/features/privacidad/`.
- ACT-23 y RF-70: administración y lista de comercios, en `src/features/admin/` y `src/shared/data/real/admin.js`.
- ACT-27: guía de preguntas frecuentes, en `src/features/guia/` y `src/shared/data/real/guide.js`.
- Documentación de instalación y configuración web, en `README.md`.

## Archivos compartidos incluidos

`src/app/`, `src/shared/`, `src/styles/`, `src/main.jsx`, las dependencias y configuración de Vite forman parte de la integración común. El paquete también incluye los módulos de pedidos y bandeja que necesita el enrutador para compilar la aplicación completa.

## Verificación

- `npm run lint`: aprobado.
- `npm run format:check`: aprobado.
- `npm run build`: aprobado; las fuentes tipográficas quedan incluidas en el build.
- La web de desarrollo y el endpoint de salud de Supabase local no respondieron desde este entorno; la integración con datos reales requiere validación en el equipo donde corre Supabase.

## Pendientes de integración

- ACT-23 contempla auditoría. La base registra cambios administrativos, pero la migración actual no expone una lectura autorizada de esos eventos para mostrarlos en la web. Resolverlo requiere acordar una función o vista con Camilo antes de cambiar SQL.
- La página de privacidad conserva campos del responsable sin completar. No publicar hasta recibir nombre legal y canales de contacto confirmados.
- Los workflows de `N8N-y-Documentación` apuntan a una instancia Supabase hospedada; esta web está configurada para Supabase local. Acordar el destino de integración con Sneider antes de conectar el panel y n8n.
- `VITE_N8N_PANEL_ENVIAR_URL` no está configurada en `.env.local`, por lo que la respuesta desde la bandeja permanece deshabilitada hasta que se defina el endpoint de WF-10.

El paquete excluye `.env.local`, dependencias instaladas, `dist/` y cachés. No se creó commit ni se publicó código desde esta sesión.

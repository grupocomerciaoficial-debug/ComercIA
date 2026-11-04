# Aporte web de Sofi

Este recorte organiza los archivos que corresponden al alcance web de Sofi según el cronograma. Copia la carpeta `web/` de este recorte sobre `web/` en la rama compartida y registra los archivos de Sofi en su propio commit.

## Funcionalidades incluidas

- ACT-12: acceso y recuperación de contraseña.
- ACT-13: configuración del comercio y mantenimiento del catálogo.
- ACT-14: página pública de privacidad.
- ACT-23 y RF-70: administración y lista de comercios.
- ACT-27: carga y edición de la guía del asistente.
- Documentación web y plantilla `.env.example` sin secretos.

## Archivos que incluye este recorte

- `src/features/auth/AuthPages.jsx`
- `src/features/catalogo/CatalogPage.jsx`
- `src/features/comercio/BusinessPage.jsx`
- `src/features/guia/GuidePage.jsx`
- `src/features/privacidad/PrivacyPage.jsx`
- `src/features/admin/AdminPage.jsx`
- `src/shared/data/real/auth.js`
- `src/shared/data/real/business.js`
- `src/shared/data/real/catalog.js`
- `src/shared/data/real/guide.js`
- `src/shared/data/real/admin.js`

Los archivos de enrutamiento, sesión, componentes comunes, estilos, recursos y pedidos/bandeja se integran aparte con la aplicación web del equipo. Por eso, este recorte no se compila de forma independiente.

La administración ya registra cambios en la base; la pantalla de lectura de auditoría y los datos legales confirmados de privacidad quedan para su revisión posterior.

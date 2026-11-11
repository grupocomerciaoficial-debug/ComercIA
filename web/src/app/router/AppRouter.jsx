import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestOnly, RequireSession } from './Guards.jsx';
import { AppShell } from '../layout/AppShell.jsx';
import { LoginPage, RecoveryPage, ResetPasswordPage } from '../../features/auth/AuthPages.jsx';
import { PrivacyPage } from '../../features/privacidad/PrivacyPage.jsx';
import { TermsPage } from '../../features/terminos/TermsPage.jsx';
import { DashboardPage } from '../../features/comercio/DashboardPage.jsx';
import { BusinessPage } from '../../features/comercio/BusinessPage.jsx';
import { CatalogPage } from '../../features/catalogo/CatalogPage.jsx';
import { GuidePage } from '../../features/guia/GuidePage.jsx';
import { OrdersPage } from '../../features/pedidos/OrdersPage.jsx';
import { InboxPage } from '../../features/bandeja/InboxPage.jsx';
import { AdminPage } from '../../features/admin/AdminPage.jsx';
import { NotFoundPage } from '../../shared/ui/Feedback.jsx';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/ingresar" element={<LoginPage />} />
        <Route path="/recuperar" element={<RecoveryPage />} />
      </Route>
      <Route path="/restablecer" element={<ResetPasswordPage />} />
      <Route path="/privacidad" element={<PrivacyPage />} />
      <Route path="/terminos" element={<TermsPage />} />
      <Route element={<RequireSession role="dueno" />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/inicio" replace />} />
          <Route path="/inicio" element={<DashboardPage />} />
          <Route path="/pedidos" element={<OrdersPage />} />
          <Route path="/catalogo" element={<CatalogPage />} />
          <Route path="/atencion" element={<InboxPage />} />
          <Route path="/comercio" element={<BusinessPage />} />
          <Route path="/guia" element={<GuidePage />} />
        </Route>
      </Route>
      <Route element={<RequireSession role="admin" />}>
        <Route path="/admin" element={<AppShell admin />}>
          <Route index element={<AdminPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

import { Outlet } from 'react-router-dom';
import { useAuth } from '../providers.jsx';
import { Header } from './Header.jsx';
import { Sidebar } from './Sidebar.jsx';
import { usePendingAlerts } from '../../shared/hooks/useData.js';
import { PageLoader } from '../../shared/ui/Feedback.jsx';

export function AppShell({ admin = false }) {
  const { user } = useAuth();
  const { data: alertCount = 0, isLoading } = usePendingAlerts({ enabled: !admin });
  if (isLoading && !admin) return <PageLoader label="Preparando tu espacio…" />;
  return (
    <div className={`workspace ${admin ? 'workspace-admin' : ''}`}>
      <Sidebar admin={admin} user={user} count={admin ? 0 : alertCount} />
      <div className="workspace-main">
        <Header admin={admin} user={user} count={admin ? 0 : alertCount} />
        <main className="page-container" key={admin ? 'admin' : 'owner'}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

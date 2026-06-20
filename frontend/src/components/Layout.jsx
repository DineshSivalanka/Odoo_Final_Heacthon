import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  '/dashboard':      { title: 'Dashboard',         subtitle: 'Overview of your business' },
  '/products':       { title: 'Products',           subtitle: 'Manage your product catalog & BoM' },
  '/purchase':       { title: 'Purchase Orders',    subtitle: 'Manage vendor purchases & stock intake' },
  '/manufacturing':  { title: 'Manufacturing',      subtitle: 'Manage production orders' },
  '/sales':          { title: 'Sales Orders',       subtitle: 'Manage customer orders & deliveries' },
  '/inventory':      { title: 'Inventory',          subtitle: 'Real-time stock levels & movements' },
  '/reports':        { title: 'Reports',            subtitle: 'Business analytics & insights' },
};

export default function Layout() {
  const token = localStorage.getItem('erp_token');
  const location = useLocation();

  if (!token) return <Navigate to="/login" replace />;

  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'ERP', subtitle: '' };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={pageInfo.title} subtitle={pageInfo.subtitle} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

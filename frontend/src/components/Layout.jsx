import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar  from './Topbar';
import { useAuth } from '../context/AuthContext';

const PAGE_META = {
  '/dashboard':      { title: 'Dashboard',          subtitle: 'Business overview at a glance' },
  '/products':       { title: 'Products',            subtitle: 'Manage your product catalog & BoMs' },
  '/sales':          { title: 'Sales Orders',        subtitle: 'Manage customer orders & deliveries' },
  '/purchase':       { title: 'Purchase Orders',     subtitle: 'Manage vendor orders & receiving' },
  '/manufacturing':  { title: 'Manufacturing',       subtitle: 'Production orders & work center tracking' },
  '/inventory':      { title: 'Inventory',           subtitle: 'Real-time stock levels & ledger' },
  '/reports':        { title: 'Reports & Analytics', subtitle: 'Business insights & KPIs' },
  '/users':          { title: 'User Management',     subtitle: 'Manage users, roles & access rights' },
};

export default function Layout() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const path = window.location.pathname;
  const meta = PAGE_META[path] || { title: 'ERP System', subtitle: '' };
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/login', { replace: true });
  }, [isAuthenticated, loading]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="app-layout">
      <Topbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="main-content" style={{ marginLeft: isSidebarOpen ? '260px' : '80px', transition: 'margin-left 0.3s ease', paddingTop: 'var(--topbar-height)' }}>
        <main className="page-content" style={{ marginTop: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

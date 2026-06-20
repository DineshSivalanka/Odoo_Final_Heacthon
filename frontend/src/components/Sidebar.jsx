import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingCart, Truck,
  Factory, BarChart3, LogOut, Layers
} from 'lucide-react';

const navSections = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/products',      icon: <Package size={17} />,      label: 'Products' },
      { to: '/purchase',      icon: <Truck size={17} />,         label: 'Purchase Orders' },
      { to: '/manufacturing', icon: <Factory size={17} />,       label: 'Manufacturing' },
      { to: '/sales',         icon: <ShoppingCart size={17} />,  label: 'Sales Orders' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/inventory', icon: <Layers size={17} />,    label: 'Inventory' },
      { to: '/reports',   icon: <BarChart3 size={17} />, label: 'Reports' },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('erp_user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    navigate('/login');
  };

  return (
    <motion.aside
      className="sidebar"
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">🪑</div>
        <h2>Shiv Furniture</h2>
        <span>Mini ERP System</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'Admin'}</div>
            <div className="user-role">{user?.role?.toLowerCase() || 'admin'}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

import { Bell, RefreshCw } from 'lucide-react';

export default function Topbar({ title, subtitle, onRefresh }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="topbar-right">
        {onRefresh && (
          <button className="topbar-btn" onClick={onRefresh} title="Refresh">
            <RefreshCw size={16} />
          </button>
        )}
        <button className="topbar-btn" title="Notifications">
          <Bell size={16} />
        </button>
      </div>
    </header>
  );
}

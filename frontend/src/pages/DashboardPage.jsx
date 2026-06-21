import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package, ShoppingCart, Truck, Factory, Layers,
  TrendingUp, AlertTriangle, Clock, CheckCircle2
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import Badge from '../components/Badge';
const COLORS = ['#14b8a6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Role-specific KPI configs
const getRoleKPIs = (data, role) => {
  const all = {
    ADMIN: [
      { label: 'Total Users',        value: data?.users?.total || 0,              color: 'teal',   icon: <Package size={18}/> },
      { label: 'Sales Orders',       value: data?.sales?.total_orders || 0,        color: 'green',  icon: <ShoppingCart size={18}/> },
      { label: 'Purchase Orders',    value: data?.purchase?.total_orders || 0,     color: 'cyan',   icon: <Truck size={18}/> },
      { label: 'Production Orders',  value: data?.manufacturing?.total_orders || 0,color: 'purple', icon: <Factory size={18}/> },
      { label: 'Low Stock Items',    value: (data?.low_stock || []).length,        color: 'red',    icon: <AlertTriangle size={18}/> },
      { label: 'Total Products',     value: data?.products?.total || 0,            color: 'orange', icon: <Layers size={18}/> },
    ],
    OWNER: [
      { label: 'Revenue (Delivered)', value: `₹${Number(data?.sales?.revenue || 0).toLocaleString('en-IN')}`, color: 'teal', icon: <TrendingUp size={18}/> },
      { label: 'Total Products',      value: data?.products?.total || 0,            color: 'green',  icon: <Package size={18}/> },
      { label: 'Low Stock Alerts',    value: (data?.low_stock || []).length,        color: 'red',    icon: <AlertTriangle size={18}/> },
      { label: 'Active MOs',          value: data?.manufacturing?.in_progress || 0, color: 'orange', icon: <Factory size={18}/> },
    ],
    SALES: [
      { label: 'Total Orders',     value: data?.sales?.total_orders || 0,  color: 'teal',   icon: <ShoppingCart size={18}/> },
      { label: 'Pending (Draft)',  value: data?.sales?.draft || 0,          color: 'orange', icon: <Clock size={18}/> },
      { label: 'Confirmed',        value: data?.sales?.confirmed || 0,      color: 'cyan',   icon: <CheckCircle2 size={18}/> },
      { label: 'Delivered',        value: data?.sales?.delivered || 0,      color: 'green',  icon: <Truck size={18}/> },
    ],
    PURCHASE: [
      { label: 'Purchase Orders',   value: data?.purchase?.total_orders || 0,  color: 'teal',   icon: <Truck size={18}/> },
      { label: 'Pending Approvals', value: data?.purchase?.draft || 0,          color: 'orange', icon: <Clock size={18}/> },
      { label: 'Confirmed',         value: data?.purchase?.confirmed || 0,      color: 'cyan',   icon: <CheckCircle2 size={18}/> },
      { label: 'Received',          value: data?.purchase?.received || 0,       color: 'green',  icon: <Package size={18}/> },
    ],
    MANUFACTURING: [
      { label: 'Production Orders', value: data?.manufacturing?.total_orders || 0, color: 'teal',   icon: <Factory size={18}/> },
      { label: 'In Progress',       value: data?.manufacturing?.in_progress || 0,  color: 'orange', icon: <Clock size={18}/> },
      { label: 'Completed',         value: data?.manufacturing?.completed || 0,    color: 'green',  icon: <CheckCircle2 size={18}/> },
      { label: 'Draft Orders',      value: data?.manufacturing?.draft || 0,        color: 'cyan',   icon: <Package size={18}/> },
    ],
    INVENTORY: [
      { label: 'Total Products',   value: data?.products?.total || 0,       color: 'teal',   icon: <Layers size={18}/> },
      { label: 'Low Stock Items',  value: (data?.low_stock || []).length,   color: 'red',    icon: <AlertTriangle size={18}/> },
      { label: 'Out of Stock',     value: data?.products?.out_of_stock || 0,color: 'orange', icon: <Package size={18}/> },
      { label: 'Healthy Stock',    value: data?.products?.healthy || 0,     color: 'green',  icon: <CheckCircle2 size={18}/> },
    ],
  };
  return all[role] || all['ADMIN'];
};

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const kpis = getRoleKPIs(data, user?.role);

  const salesPie = [
    { name: 'Draft',     value: Number(data?.sales?.draft || 0) },
    { name: 'Confirmed', value: Number(data?.sales?.confirmed || 0) },
    { name: 'Delivered', value: Number(data?.sales?.delivered || 0) },
    { name: 'Cancelled', value: Number(data?.sales?.cancelled || 0) },
  ].filter(d => d.value > 0);

  const mfgBar = [
    { label: 'Draft',       value: Number(data?.manufacturing?.draft || 0) },
    { label: 'In Progress', value: Number(data?.manufacturing?.in_progress || 0) },
    { label: 'Completed',   value: Number(data?.manufacturing?.completed || 0) },
  ];

  const ttStyle = { background: '#071412', border: '1px solid rgba(20,184,166,0.2)', borderRadius: 8, color: '#e2fef8', fontSize: 12 };

  return (
    <div>
      <Toast toasts={toast.toasts} />

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        {kpis.map((k, i) => (
          <motion.div key={k.label} className={`kpi-card ${k.color}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }} whileHover={{ scale: 1.03 }}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-value" style={{ fontSize: typeof k.value === 'string' ? 18 : 28 }}>{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts — only for ADMIN and OWNER */}
      {['ADMIN', 'OWNER'].includes(user?.role) && (
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <motion.div className="chart-wrapper" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <div className="chart-title">Sales Order Status</div>
            <div className="chart-subtitle">Distribution across all stages</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={salesPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {salesPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={ttStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#7ecfc0' }} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div className="chart-wrapper" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
            <div className="chart-title">Manufacturing Orders</div>
            <div className="chart-subtitle">Production pipeline status</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mfgBar} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" stroke="#475569" fontSize={11} />
                <YAxis stroke="#475569" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="value" name="Orders" radius={[6, 6, 0, 0]}>
                  {mfgBar.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}

      {/* Recent Sales Orders Widget */}
      {(data?.recent_sales?.length > 0) && (
        <motion.div className="table-container" style={{ marginBottom: 24 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
          <div className="table-header">
            <span className="table-title"><ShoppingCart size={15} style={{ display: 'inline', marginRight: 8, color: 'var(--accent-teal)' }} />
              Recent 5 Sales Orders
            </span>
          </div>
          <table>
            <thead>
              <tr><th>Order #</th><th>Customer</th><th>Date</th><th>Status</th><th>Total Value</th></tr>
            </thead>
            <tbody>
              {data.recent_sales.map((order, i) => (
                <motion.tr key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <td style={{ fontWeight: 700, color: 'var(--accent-teal)' }}>SO-{String(order.id).padStart(4, '0')}</td>
                  <td>{order.customer_name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td><Badge status={order.status} /></td>
                  <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>₹{Number(order.total_value).toLocaleString('en-IN')}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Low Stock Alert */}
      {(data?.low_stock?.length > 0) && (
        <motion.div className="table-container" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="table-header">
            <span className="table-title"><AlertTriangle size={15} style={{ display: 'inline', marginRight: 8, color: 'var(--accent-orange)' }} />
              ⚠️ Low Stock Alert ({data.low_stock.length} products)
            </span>
          </div>
          <table>
            <thead>
              <tr><th>Product</th><th>On Hand</th><th>Reserved</th><th>Available</th><th>Action</th></tr>
            </thead>
            <tbody>
              {data.low_stock.map((p, i) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ color: p.on_hand_qty === 0 ? 'var(--accent-red)' : 'var(--accent-orange)', fontWeight: 700 }}>{p.on_hand_qty}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.reserved_qty}</td>
                  <td style={{ fontWeight: 700, color: (p.on_hand_qty - p.reserved_qty) <= 0 ? 'var(--accent-red)' : 'var(--accent-orange)' }}>{p.on_hand_qty - p.reserved_qty}</td>
                  <td>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: p.on_hand_qty === 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: p.on_hand_qty === 0 ? 'var(--accent-red)' : 'var(--accent-orange)', fontWeight: 600 }}>
                      {p.on_hand_qty === 0 ? '🚨 Restock Now' : '⚠️ Reorder Soon'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}

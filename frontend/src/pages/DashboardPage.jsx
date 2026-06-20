import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Package, ShoppingCart, Truck, Factory, AlertTriangle, TrendingUp } from 'lucide-react';
import api from '../api';
import Badge from '../components/Badge';

const COLORS = ['#4f8ef7', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, type: 'spring', stiffness: 200, damping: 20 } }),
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data: d } = await api.get('/dashboard');
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const kpis = [
    { label: 'Total Products',    value: data?.products?.total || 0,                           icon: <Package size={20} />,      color: 'blue',   prefix: '' },
    { label: 'Stoc k Value (₹)',   value: Number(data?.products?.stock_value || 0).toLocaleString('en-IN'), icon: <TrendingUp size={20} />,   color: 'green',  prefix: '₹' },
    { label: 'Sales Orders',      value: data?.sales?.total_orders || 0,                        icon: <ShoppingCart size={20} />, color: 'purple', prefix: '' },
    { label: 'Purchase Orders',   value: data?.purchase?.total_orders || 0,                     icon: <Truck size={20} />,        color: 'cyan',   prefix: '' },
    { label: 'Manufacturing MOs', value: data?.manufacturing?.total_orders || 0,                icon: <Factory size={20} />,      color: 'orange', prefix: '' },
    { label: 'Low Stock Items',   value: data?.low_stock?.length || 0,                          icon: <AlertTriangle size={20} />,color: 'red',    prefix: '' },
  ];

  // Build pie chart data for order statuses
  const salesPie = [
    { name: 'Draft',     value: Number(data?.sales?.draft || 0) },
    { name: 'Confirmed', value: Number(data?.sales?.confirmed || 0) },
    { name: 'Delivered', value: Number(data?.sales?.delivered || 0) },
    { name: 'Cancelled', value: Number(data?.sales?.cancelled || 0) },
  ].filter(d => d.value > 0);

  const mfgPie = [
    { name: 'Draft',       value: Number(data?.manufacturing?.draft || 0) },
    { name: 'In Progress', value: Number(data?.manufacturing?.in_progress || 0) },
    { name: 'Completed',   value: Number(data?.manufacturing?.completed || 0) },
    { name: 'Cancelled',   value: Number(data?.manufacturing?.cancelled || 0) },
  ].filter(d => d.value > 0);

  // Recent stock movements for area chart
  const ledgerChart = (data?.recent_stock_movements || [])
    .slice().reverse()
    .map((m, i) => ({
      name: `#${i + 1}`,
      qty: Math.abs(m.change_qty),
      type: m.change_qty > 0 ? 'In' : 'Out',
    }));

  return (
    <div>
      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            className={`kpi-card ${k.color}`}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            whileHover={{ scale: 1.02 }}
          >
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-value">
              {typeof k.value === 'number' ? k.value.toLocaleString() : k.value}
            </div>
            <div className="kpi-label">{k.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Sales Status Pie */}
        <motion.div className="chart-wrapper" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <div className="chart-title">Sales Orders by Status</div>
          <div className="chart-subtitle">Breakdown of all sales orders</div>
          {salesPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={salesPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {salesPie.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f0f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ padding: 40 }}><p>No sales orders yet</p></div>}
        </motion.div>

        {/* Manufacturing Status Pie */}
        <motion.div className="chart-wrapper" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
          <div className="chart-title">Manufacturing Orders</div>
          <div className="chart-subtitle">Production order breakdown</div>
          {mfgPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={mfgPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {mfgPie.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f0f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ padding: 40 }}><p>No manufacturing orders yet</p></div>}
        </motion.div>
      </div>

      {/* Stock movements chart */}
      {ledgerChart.length > 0 && (
        <motion.div className="chart-wrapper" style={{ marginBottom: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="chart-title">Recent Stock Movements</div>
          <div className="chart-subtitle">Last 10 inventory changes</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ledgerChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#475569" fontSize={11} />
              <YAxis stroke="#475569" fontSize={11} />
              <Tooltip contentStyle={{ background: '#0f0f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
              <Bar dataKey="qty" fill="#4f8ef7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Bottom row: Recent Sales + Low Stock */}
      <div className="grid-2">
        {/* Recent Sales */}
        <motion.div className="table-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <div className="table-header">
            <span className="table-title">Recent Sales Orders</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Status</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_sales || []).length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No orders yet</td></tr>
              ) : (
                (data?.recent_sales || []).map((so) => (
                  <tr key={so.id}>
                    <td>{so.customer_name}</td>
                    <td><Badge status={so.status} /></td>
                    <td className="text-success">₹{Number(so.total_value || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </motion.div>

        {/* Low Stock Alert */}
        <motion.div className="table-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="table-header">
            <span className="table-title">⚠️ Low Stock Alert</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>On Hand</th>
                <th>Reserved</th>
              </tr>
            </thead>
            <tbody>
              {(data?.low_stock || []).length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>All stock levels OK ✅</td></tr>
              ) : (
                (data?.low_stock || []).map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className={p.on_hand_qty <= 5 ? 'text-danger font-bold' : 'text-warning'}>{p.on_hand_qty}</td>
                    <td className="text-muted">{p.reserved_qty}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
}

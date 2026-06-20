import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { BarChart3, TrendingUp, Package, Factory, ShoppingCart, Truck } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

const COLORS   = ['#4f8ef7', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
const PIE_COLS = ['#10b981', '#4f8ef7', '#f59e0b', '#ef4444'];

// ─── Section Title ─────────────────────────────────────────────
function SectionTitle({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(79,142,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>{icon}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData]     = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      api.get('/dashboard'),
      api.get('/dashboard/inventory'),
    ]).then(([dashRes, invRes]) => {
      setData(dashRes.data);
      setProducts(invRes.data);
    }).catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  // ── Build chart datasets ────────────────────────────────────
  // Top 10 products by stock value
  const topByValue = [...products]
    .sort((a, b) => (Number(b.cost_price) * b.on_hand_qty) - (Number(a.cost_price) * a.on_hand_qty))
    .slice(0, 10)
    .map(p => ({
      name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
      value: Number(p.cost_price) * p.on_hand_qty,
    }));

  // Sales funnel: Draft → Confirmed → Delivered
  const salesFunnel = [
    { stage: 'Created',   count: Number(data?.sales?.total_orders || 0) },
    { stage: 'Confirmed', count: Number(data?.sales?.confirmed || 0) + Number(data?.sales?.delivered || 0) },
    { stage: 'Delivered', count: Number(data?.sales?.delivered || 0) },
  ];

  // Order status pies
  const salesPie = [
    { name: 'Draft',     value: Number(data?.sales?.draft || 0) },
    { name: 'Confirmed', value: Number(data?.sales?.confirmed || 0) },
    { name: 'Delivered', value: Number(data?.sales?.delivered || 0) },
    { name: 'Cancelled', value: Number(data?.sales?.cancelled || 0) },
  ].filter(d => d.value > 0);

  const purchasePie = [
    { name: 'Draft',     value: Number(data?.purchase?.draft || 0) },
    { name: 'Confirmed', value: Number(data?.purchase?.confirmed || 0) },
    { name: 'Received',  value: Number(data?.purchase?.received || 0) },
    { name: 'Cancelled', value: Number(data?.purchase?.cancelled || 0) },
  ].filter(d => d.value > 0);

  const mfgPie = [
    { name: 'Draft',       value: Number(data?.manufacturing?.draft || 0) },
    { name: 'In Progress', value: Number(data?.manufacturing?.in_progress || 0) },
    { name: 'Completed',   value: Number(data?.manufacturing?.completed || 0) },
    { name: 'Cancelled',   value: Number(data?.manufacturing?.cancelled || 0) },
  ].filter(d => d.value > 0);

  // Procurement type split
  const procurementPie = [
    { name: 'Purchase',      value: products.filter(p => p.procurement_type === 'PURCHASE').length },
    { name: 'Manufacturing', value: products.filter(p => p.procurement_type === 'MANUFACTURING').length },
  ];

  // Stock health
  const stockHealth = [
    { label: 'Out of Stock', value: products.filter(p => p.on_hand_qty === 0).length, color: '#ef4444' },
    { label: 'Critical ≤5',  value: products.filter(p => p.on_hand_qty > 0 && p.on_hand_qty <= 5).length, color: '#f59e0b' },
    { label: 'Low ≤10',      value: products.filter(p => p.on_hand_qty > 5 && p.on_hand_qty <= 10).length, color: '#06b6d4' },
    { label: 'Healthy >10',  value: products.filter(p => p.on_hand_qty > 10).length, color: '#10b981' },
  ];

  const tooltipStyle = { background: '#0f0f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 };

  return (
    <div>
      <Toast toasts={toast.toasts} />

      {/* ── Summary Cards ── */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 32 }}>
        {[
          { label: 'Total Products', value: data?.products?.total || 0,      color: 'blue',   icon: <Package size={18}/> },
          { label: 'Total Sales',    value: data?.sales?.total_orders || 0,   color: 'green',  icon: <ShoppingCart size={18}/> },
          { label: 'Total Purchases',value: data?.purchase?.total_orders || 0,color: 'cyan',   icon: <Truck size={18}/> },
          { label: 'Total MOs',      value: data?.manufacturing?.total_orders || 0, color: 'purple', icon: <Factory size={18}/> },
        ].map((k, i) => (
          <motion.div key={k.label} className={`kpi-card ${k.color}`}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }} whileHover={{ scale: 1.03 }}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Top Products by Stock Value ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <SectionTitle icon={<TrendingUp size={18}/>} title="Top Products by Stock Value" subtitle="Highest value items currently in inventory" />
        <div className="chart-wrapper" style={{ marginBottom: 32 }}>
          {topByValue.length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}><p>No stock data yet</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topByValue} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#475569" fontSize={11} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#475569" fontSize={11} width={110} />
                <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Stock Value']} contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {topByValue.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* ── Order Status Breakdown ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <SectionTitle icon={<BarChart3 size={18}/>} title="Order Status Breakdown" subtitle="Current status distribution across all order types" />
        <div className="grid-3" style={{ marginBottom: 32 }}>
          {[
            { title: 'Sales Orders',      data: salesPie },
            { title: 'Purchase Orders',   data: purchasePie },
            { title: 'Manufacturing MOs', data: mfgPie },
          ].map((chart, ci) => (
            <motion.div key={chart.title} className="chart-wrapper"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + ci * 0.1 }}>
              <div className="chart-title">{chart.title}</div>
              {chart.data.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}><p>No data</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={chart.data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                      {chart.data.map((_, idx) => <Cell key={idx} fill={PIE_COLS[idx % PIE_COLS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Stock Health + Procurement Split ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <SectionTitle icon={<Package size={18}/>} title="Inventory Health" subtitle="Stock level distribution and procurement breakdown" />
        <div className="grid-2" style={{ marginBottom: 32 }}>
          {/* Stock health bars */}
          <div className="chart-wrapper">
            <div className="chart-title">Stock Health Distribution</div>
            <div className="chart-subtitle">Products by stock level category</div>
            <div style={{ marginTop: 20 }}>
              {stockHealth.map((s, i) => (
                <div key={s.label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value} products</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
                    <motion.div
                      style={{ height: '100%', background: s.color, borderRadius: 3 }}
                      initial={{ width: 0 }}
                      animate={{ width: products.length > 0 ? `${(s.value / products.length) * 100}%` : '0%' }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Procurement split pie */}
          <div className="chart-wrapper">
            <div className="chart-title">Procurement Split</div>
            <div className="chart-subtitle">Products by procurement type</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={procurementPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={6} dataKey="value">
                  <Cell fill="#06b6d4" />
                  <Cell fill="#8b5cf6" />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* ── Sales Funnel ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <SectionTitle icon={<ShoppingCart size={18}/>} title="Sales Funnel" subtitle="Order conversion through the sales pipeline" />
        <div className="chart-wrapper" style={{ marginBottom: 32 }}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={salesFunnel} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="stage" stroke="#475569" fontSize={12} />
              <YAxis stroke="#475569" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Orders" radius={[8, 8, 0, 0]}>
                <Cell fill="#8b5cf6" />
                <Cell fill="#4f8ef7" />
                <Cell fill="#10b981" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── Low Stock Alert Table ── */}
      {(data?.low_stock || []).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <SectionTitle icon={<Package size={18} />} title="⚠️ Low Stock Alert" subtitle="Products requiring immediate restocking" />
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>On Hand</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Action Needed</th>
                </tr>
              </thead>
              <tbody>
                {(data?.low_stock || []).map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ color: p.on_hand_qty === 0 ? 'var(--accent-red)' : 'var(--accent-orange)', fontWeight: 700 }}>{p.on_hand_qty}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.reserved_qty}</td>
                    <td style={{ color: (p.on_hand_qty - p.reserved_qty) <= 0 ? 'var(--accent-red)' : 'var(--accent-orange)', fontWeight: 700 }}>{p.on_hand_qty - p.reserved_qty}</td>
                    <td>
                      <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12,
                        background: p.on_hand_qty === 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        color: p.on_hand_qty === 0 ? 'var(--accent-red)' : 'var(--accent-orange)', fontWeight: 600 }}>
                        {p.on_hand_qty === 0 ? '🚨 Restock Now' : '⚠️ Reorder Soon'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

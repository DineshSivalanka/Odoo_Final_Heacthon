import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Factory, Play, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Save, X,
  Layers, Clock, AlertTriangle, Zap
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const COLORS = ['#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

// ─── KPI Bar ───────────────────────────────────────────────────
function MfgKPIs({ orders }) {
  const total      = orders.length;
  const draft      = orders.filter(o => o.status === 'DRAFT').length;
  const inProgress = orders.filter(o => o.status === 'IN_PROGRESS').length;
  const completed  = orders.filter(o => o.status === 'COMPLETED').length;
  const cancelled  = orders.filter(o => o.status === 'CANCELLED').length;

  const kpis = [
    { label: 'Total MOs',    value: total,      color: 'blue',   icon: <Factory size={18}/> },
    { label: 'Draft',        value: draft,      color: 'purple', icon: <Clock size={18}/> },
    { label: 'In Progress',  value: inProgress, color: 'orange', icon: <Zap size={18}/> },
    { label: 'Completed',    value: completed,  color: 'green',  icon: <CheckCircle2 size={18}/> },
    { label: 'Cancelled',    value: cancelled,  color: 'red',    icon: <XCircle size={18}/> },
  ];

  return (
    <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 24 }}>
      {kpis.map((k, i) => (
        <motion.div key={k.label} className={`kpi-card ${k.color}`}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }} whileHover={{ scale: 1.03 }}>
          <div className="kpi-icon">{k.icon}</div>
          <div className="kpi-value" style={{ fontSize: 26 }}>{k.value}</div>
          <div className="kpi-label">{k.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Create MO Form ────────────────────────────────────────────
function CreateMOForm({ products, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ product_id: '', quantity: 1, start_date: '', end_date: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mfgProducts = products.filter(p => p.procurement_type === 'MANUFACTURING');
  const selected = products.find(p => p.id === Number(form.product_id));

  const handleSave = () => {
    if (!form.product_id) return alert('Select a product');
    if (form.quantity < 1) return alert('Quantity must be at least 1');
    onSave({
      product_id: Number(form.product_id),
      quantity: Number(form.quantity),
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
    });
  };

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Product to Manufacture *</label>
        <select className="form-select" value={form.product_id} onChange={e => set('product_id', e.target.value)}>
          <option value="">Select manufactured product...</option>
          {mfgProducts.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {mfgProducts.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--accent-orange)', marginTop: 6 }}>
            ⚠️ No manufactured products found. Create a product with type "MANUFACTURING" first.
          </p>
        )}
      </div>

      {/* Show BoM info if product selected */}
      {selected && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--accent-purple)', fontWeight: 600, marginBottom: 6 }}>📋 Selected Product Info</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Current stock: <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{selected.on_hand_qty} units</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            BoM must be configured for this product before starting production.
          </div>
        </motion.div>
      )}

      <div className="form-group">
        <label className="form-label">Quantity to Produce *</label>
        <input className="form-input" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Planned Start Date</label>
          <input className="form-input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Planned End Date</label>
          <input className="form-input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <motion.button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Save size={14} /> {saving ? 'Creating...' : 'Create MO'}
        </motion.button>
      </div>
    </div>
  );
}

// ─── Order Detail Expand ───────────────────────────────────────
function MODetail({ orderId }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api.get(`/manufacturing/${orderId}`).then(({ data }) => setDetail(data));
  }, [orderId]);

  if (!detail) return (
    <motion.tr><td colSpan={9} style={{ padding: 16, textAlign: 'center' }}>
      <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto' }} />
    </td></motion.tr>
  );

  const components = detail.bom_components || [];

  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <td colSpan={9} style={{ padding: 0, background: 'rgba(139,92,246,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ padding: '16px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* BoM Components */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-purple)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                🔩 BoM Components (per unit × qty)
              </div>
              {components.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--accent-red)' }}>⚠️ No BoM configured for this product!</p>
              ) : (
                components.map((c, i) => {
                  const needed = c.quantity * detail.quantity;
                  const sufficient = c.on_hand_qty >= needed;
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{c.component_name}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: sufficient ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          Need: {needed}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                          (Stock: {c.on_hand_qty})
                        </span>
                        {!sufficient && <AlertTriangle size={12} style={{ marginLeft: 4, color: 'var(--accent-red)', display: 'inline' }} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Order Info */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                📋 Order Details
              </div>
              {[
                { label: 'Product',    value: detail.product_name },
                { label: 'Quantity',   value: `${detail.quantity} units` },
                { label: 'Status',     value: detail.status },
                { label: 'Start Date', value: detail.start_date ? new Date(detail.start_date).toLocaleDateString('en-IN') : 'Not set' },
                { label: 'End Date',   value: detail.end_date   ? new Date(detail.end_date).toLocaleDateString('en-IN')   : 'Not set' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Status Step Indicator ─────────────────────────────────────
function StatusSteps({ status }) {
  const steps = ['DRAFT', 'IN_PROGRESS', 'COMPLETED'];
  const idx = steps.indexOf(status);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: i <= idx ? (i === 2 ? 'var(--accent-green)' : 'var(--accent-blue)') : 'rgba(255,255,255,0.15)',
            transition: 'all 0.3s',
          }} />
          {i < steps.length - 1 && (
            <div style={{ width: 16, height: 2, background: i < idx ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)', borderRadius: 1 }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Manufacturing Page ───────────────────────────────────
export default function ManufacturingPage() {
  const [orders, setOrders]     = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving]     = useState(false);
  const toast = useToast();

  const load = async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        api.get('/manufacturing'),
        api.get('/products'),
      ]);
      setOrders(ordersRes.data);
      setProducts(productsRes.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await api.post('/manufacturing', form);
      toast.success('Manufacturing order created!');
      setShowCreate(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const handleAction = async (id, action, successMsg) => {
    try {
      await api.patch(`/manufacturing/${id}/${action}`);
      toast.success(successMsg);
      setExpanded(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || `Failed to ${action}`); }
  };

  const filtered = orders.filter(o => {
    const matchSearch = o.product_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Pie chart
  const pieData = [
    { name: 'Draft',       value: orders.filter(o => o.status === 'DRAFT').length },
    { name: 'In Progress', value: orders.filter(o => o.status === 'IN_PROGRESS').length },
    { name: 'Completed',   value: orders.filter(o => o.status === 'COMPLETED').length },
    { name: 'Cancelled',   value: orders.filter(o => o.status === 'CANCELLED').length },
  ].filter(d => d.value > 0);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <Toast toasts={toast.toasts} />

      {/* KPIs */}
      <MfgKPIs orders={orders} />

      {/* Charts + Flow */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Pie chart */}
        <motion.div className="chart-wrapper" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div className="chart-title">Production Status</div>
          <div className="chart-subtitle">Manufacturing order breakdown</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f0f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}><p>No orders yet</p></div>
          )}
        </motion.div>

        {/* Production flow */}
        <motion.div className="glass-card" style={{ padding: 24 }} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
          <div className="chart-title" style={{ marginBottom: 16 }}>🏭 Production Flow</div>
          {[
            { step: '1', label: 'Create MO',  desc: 'Define product & quantity to produce', color: 'var(--accent-purple)', detail: 'Status: DRAFT' },
            { step: '2', label: 'Start',       desc: 'Consumes raw materials from stock',    color: 'var(--accent-orange)', detail: 'Status: IN_PROGRESS' },
            { step: '3', label: 'Complete',    desc: 'Adds finished goods to inventory',     color: 'var(--accent-green)',  detail: 'Status: COMPLETED' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>{s.step}</div>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</span>
                  <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>{s.detail}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by product..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {['ALL', 'DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => (
          <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setStatusFilter(s)}>
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}

        <motion.button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Plus size={15} /> New MO
        </motion.button>
      </div>

      {/* Orders Table */}
      <motion.div className="table-container" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="table-header">
          <span className="table-title">
            <Factory size={16} style={{ display: 'inline', marginRight: 8 }} />
            Manufacturing Orders ({filtered.length})
          </span>
        </div>

        <table>
          <thead>
            <tr>
              <th>MO #</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Actions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40 }}>
                <div className="empty-state">
                  <div className="empty-icon"><Factory size={40} strokeWidth={1} /></div>
                  <h3>No manufacturing orders</h3>
                  <p>Create a MO to start production</p>
                </div>
              </td></tr>
            ) : (
              filtered.map((order, i) => {
                const isExpanded = expanded === order.id;
                return (
                  <AnimatePresence key={order.id}>
                    <motion.tr
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}>
                      <td style={{ fontWeight: 700, color: 'var(--accent-purple)' }}>MO-{String(order.id).padStart(4, '0')}</td>
                      <td style={{ fontWeight: 600 }}>{order.product_name}</td>
                      <td>
                        <span style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--accent-purple)', padding: '2px 10px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                          {order.quantity}
                        </span>
                      </td>
                      <td><Badge status={order.status} /></td>
                      <td><StatusSteps status={order.status} /></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {order.start_date ? new Date(order.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {order.end_date ? new Date(order.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {order.status === 'DRAFT' && (
                            <>
                              <motion.button className="btn btn-warning btn-xs" whileHover={{ scale: 1.05 }}
                                onClick={() => handleAction(order.id, 'start', '⚙️ Production started! Materials consumed.')}>
                                <Play size={12} /> Start
                              </motion.button>
                              <motion.button className="btn btn-ghost btn-xs" whileHover={{ scale: 1.05 }}
                                onClick={() => handleAction(order.id, 'cancel', 'Order cancelled')}
                                style={{ color: 'var(--accent-red)' }}>
                                <XCircle size={12} />
                              </motion.button>
                            </>
                          )}
                          {order.status === 'IN_PROGRESS' && (
                            <motion.button className="btn btn-success btn-xs" whileHover={{ scale: 1.05 }}
                              onClick={() => handleAction(order.id, 'complete', '✅ Production complete! Goods added to stock.')}>
                              <CheckCircle2 size={12} /> Complete
                            </motion.button>
                          )}
                          {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <button onClick={() => setExpanded(isExpanded ? null : order.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </motion.tr>
                    {isExpanded && <MODetail orderId={order.id} />}
                  </AnimatePresence>
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="🏭 New Manufacturing Order">
        <CreateMOForm products={products} onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
      </Modal>
    </div>
  );
}

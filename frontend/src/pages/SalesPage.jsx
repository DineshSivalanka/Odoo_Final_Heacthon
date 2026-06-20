import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, ShoppingCart, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Save, X,
  Truck, Clock, Package, TrendingUp, AlertCircle
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import api from '../api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const STATUS_COLORS = { DRAFT: '#8b5cf6', CONFIRMED: '#4f8ef7', DELIVERED: '#10b981', CANCELLED: '#ef4444' };

// ─── KPI Bar ───────────────────────────────────────────────────
function SalesKPIs({ orders }) {
  const total     = orders.length;
  const draft     = orders.filter(o => o.status === 'DRAFT').length;
  const confirmed = orders.filter(o => o.status === 'CONFIRMED').length;
  const delivered = orders.filter(o => o.status === 'DELIVERED').length;
  const cancelled = orders.filter(o => o.status === 'CANCELLED').length;

  const totalRevenue = orders
    .filter(o => o.status === 'DELIVERED')
    .reduce((sum, o) => {
      const items = o.items?.filter(i => i.product_id) || [];
      return sum + items.reduce((s, i) => s + Number(i.sales_price || 0) * Number(i.quantity), 0);
    }, 0);

  const kpis = [
    { label: 'Total Orders',   value: total,                                       color: 'blue',   icon: <ShoppingCart size={18}/> },
    { label: 'Draft',          value: draft,                                        color: 'purple', icon: <Clock size={18}/> },
    { label: 'Confirmed',      value: confirmed,                                    color: 'cyan',   icon: <CheckCircle2 size={18}/> },
    { label: 'Delivered',      value: delivered,                                    color: 'green',  icon: <Truck size={18}/> },
    { label: 'Revenue (₹)',    value: `₹${totalRevenue.toLocaleString('en-IN')}`, color: 'orange', icon: <TrendingUp size={18}/> },
  ];

  return (
    <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 24 }}>
      {kpis.map((k, i) => (
        <motion.div key={k.label} className={`kpi-card ${k.color}`}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }} whileHover={{ scale: 1.03 }}>
          <div className="kpi-icon">{k.icon}</div>
          <div className="kpi-value" style={{ fontSize: typeof k.value === 'string' ? 18 : 26 }}>{k.value}</div>
          <div className="kpi-label">{k.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Create SO Form ────────────────────────────────────────────
function CreateSOForm({ products, onSave, onCancel, saving }) {
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);

  const addItem    = () => setItems(it => [...it, { product_id: '', quantity: 1 }]);
  const removeItem = (i) => setItems(it => it.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const copy = [...items];
    copy[i] = { ...copy[i], [field]: val };
    setItems(copy);
  };

  const getProduct = (id) => products.find(p => p.id === Number(id));

  const totalValue = items.reduce((sum, item) => {
    const p = getProduct(item.product_id);
    return sum + (p ? Number(p.sales_price) * Number(item.quantity) : 0);
  }, 0);

  const handleSave = () => {
    if (!customerName.trim()) return alert('Customer name is required');
    if (items.some(i => !i.product_id)) return alert('Select a product for all items');
    onSave({
      customer_name: customerName,
      items: items.map(i => ({ product_id: Number(i.product_id), quantity: Number(i.quantity) })),
    });
  };

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Customer Name *</label>
        <input className="form-input" value={customerName} onChange={e => setCustomerName(e.target.value)}
          placeholder="e.g. Ramesh Furniture Store" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label className="form-label" style={{ margin: 0 }}>Order Items *</label>
          <button className="btn btn-ghost btn-xs" onClick={addItem}><Plus size={13} /> Add Item</button>
        </div>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 110px 32px', gap: 8, marginBottom: 6, padding: '0 4px' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>PRODUCT</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>QTY</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>AVAIL</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>LINE TOTAL</span>
        </div>

        <AnimatePresence>
          {items.map((item, i) => {
            const p = getProduct(item.product_id);
            const available = p ? p.on_hand_qty - p.reserved_qty : 0;
            const lineTotal = p ? Number(p.sales_price) * Number(item.quantity) : 0;
            const overQty   = p && Number(item.quantity) > available;

            return (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 110px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <select className="form-select" value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                  <option value="">Select product...</option>
                  {products.map(prod => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} (₹{Number(prod.sales_price).toLocaleString()})
                    </option>
                  ))}
                </select>
                <input className="form-input" type="number" min="1" value={item.quantity}
                  onChange={e => updateItem(i, 'quantity', e.target.value)}
                  style={{ borderColor: overQty ? 'var(--accent-red)' : '' }} />
                <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600,
                  color: !p ? 'var(--text-muted)' : available <= 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                  {p ? available : '—'}
                  {overQty && <AlertCircle size={11} style={{ marginLeft: 4, display: 'inline' }} />}
                </div>
                <div style={{ fontSize: 13, color: 'var(--accent-green)', fontWeight: 600, padding: '0 4px' }}>
                  ₹{lineTotal.toLocaleString('en-IN')}
                </div>
                <button onClick={() => removeItem(i)} disabled={items.length === 1}
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: items.length === 1 ? 'var(--text-muted)' : 'var(--accent-red)', cursor: items.length === 1 ? 'not-allowed' : 'pointer', width: 32, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={13} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Total */}
      <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Total Order Value</span>
        <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: 16 }}>₹{totalValue.toLocaleString('en-IN')}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <motion.button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Save size={14} /> {saving ? 'Creating...' : 'Create SO'}
        </motion.button>
      </div>
    </div>
  );
}

// ─── Order Detail Expand ───────────────────────────────────────
function SODetail({ order }) {
  const items = order.items?.filter(i => i.product_id) || [];
  const total = items.reduce((s, i) => s + Number(i.sales_price || 0) * Number(i.quantity), 0);

  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <td colSpan={9} style={{ padding: 0, background: 'rgba(16,185,129,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ padding: '16px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Items table */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-green)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                📦 Order Items
              </div>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    {['Product', 'Qty', 'Unit Price', 'Line Total'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', background: 'transparent', fontWeight: 600, letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 8px', color: 'var(--text-primary)', fontSize: 13 }}>{item.product_name}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-secondary)', fontSize: 13 }}>{item.quantity}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-secondary)', fontSize: 13 }}>₹{Number(item.sales_price || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--accent-green)', fontSize: 13, fontWeight: 600 }}>₹{(Number(item.sales_price || 0) * Number(item.quantity)).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 700 }}>Total</td>
                    <td style={{ padding: '10px 8px', color: 'var(--accent-blue)', fontSize: 15, fontWeight: 700 }}>₹{total.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Order info */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                📋 Order Info
              </div>
              {[
                { label: 'Customer',  value: order.customer_name },
                { label: 'Status',    value: order.status },
                { label: 'Created',   value: new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                { label: 'Updated',   value: new Date(order.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                { label: 'Items',     value: `${items.length} product${items.length !== 1 ? 's' : ''}` },
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

// ─── Main Sales Page ───────────────────────────────────────────
export default function SalesPage() {
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
        api.get('/sales'),
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
      await api.post('/sales', form);
      toast.success('Sales order created!');
      setShowCreate(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const handleAction = async (id, action, successMsg) => {
    try {
      await api.patch(`/sales/${id}/${action}`);
      toast.success(successMsg);
      setExpanded(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || `Failed to ${action}`); }
  };

  const filtered = orders.filter(o => {
    const matchSearch = o.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Revenue bar chart — by status
  const revenueByStatus = ['DRAFT', 'CONFIRMED', 'DELIVERED', 'CANCELLED'].map(status => {
    const val = orders
      .filter(o => o.status === status)
      .reduce((sum, o) => {
        const its = o.items?.filter(i => i.product_id) || [];
        return sum + its.reduce((s, i) => s + Number(i.sales_price || 0) * Number(i.quantity), 0);
      }, 0);
    return { status, value: val };
  });

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <Toast toasts={toast.toasts} />

      {/* KPIs */}
      <SalesKPIs orders={orders} />

      {/* Charts + Flow */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Revenue bar */}
        <motion.div className="chart-wrapper" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div className="chart-title">Revenue by Order Status</div>
          <div className="chart-subtitle">Total value grouped by status</div>
          <ResponsiveContainer width="100%" height={165}>
            <BarChart data={revenueByStatus} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="status" stroke="#475569" fontSize={11} />
              <YAxis stroke="#475569" fontSize={11} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Value']}
                contentStyle={{ background: '#0f0f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {revenueByStatus.map(entry => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Sales flow guide */}
        <motion.div className="glass-card" style={{ padding: 24 }} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
          <div className="chart-title" style={{ marginBottom: 16 }}>🛒 Sales Flow</div>
          {[
            { step: '1', label: 'Create SO',  desc: 'Add customer & products ordered',       color: 'var(--accent-purple)', detail: 'DRAFT' },
            { step: '2', label: 'Confirm',     desc: 'Reserves stock for this customer',       color: 'var(--accent-blue)',   detail: 'CONFIRMED' },
            { step: '3', label: 'Deliver',     desc: 'Goods shipped → stock is deducted',      color: 'var(--accent-green)',  detail: 'DELIVERED' },
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
          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 12, marginTop: 4 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              💡 <strong style={{ color: 'var(--accent-orange)' }}>Confirm</strong> reserves stock so it's not sold to others.
              <strong style={{ color: 'var(--accent-red)' }}> Deliver</strong> finalizes and deducts from inventory.
            </div>
          </div>
        </motion.div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by customer..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {['ALL', 'DRAFT', 'CONFIRMED', 'DELIVERED', 'CANCELLED'].map(s => (
          <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setStatusFilter(s)}>
            {s === 'ALL' ? 'All' : s}
          </button>
        ))}

        <motion.button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Plus size={15} /> New SO
        </motion.button>
      </div>

      {/* Orders Table */}
      <motion.div className="table-container" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="table-header">
          <span className="table-title">
            <ShoppingCart size={16} style={{ display: 'inline', marginRight: 8 }} />
            Sales Orders ({filtered.length})
          </span>
        </div>

        <table>
          <thead>
            <tr>
              <th>SO #</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Items</th>
              <th>Total Value</th>
              <th>Date</th>
              <th>Actions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>
                <div className="empty-state">
                  <div className="empty-icon"><ShoppingCart size={40} strokeWidth={1} /></div>
                  <h3>No sales orders found</h3>
                  <p>Create your first order to start selling</p>
                </div>
              </td></tr>
            ) : (
              filtered.map((order, i) => {
                const items     = order.items?.filter(it => it.product_id) || [];
                const total     = items.reduce((s, it) => s + Number(it.sales_price || 0) * Number(it.quantity), 0);
                const isExpanded = expanded === order.id;

                return (
                  <AnimatePresence key={order.id}>
                    <motion.tr
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}>
                      <td style={{ fontWeight: 700, color: 'var(--accent-green)' }}>SO-{String(order.id).padStart(4, '0')}</td>
                      <td>{order.customer_name}</td>
                      <td><Badge status={order.status} /></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{items.length} item{items.length !== 1 ? 's' : ''}</td>
                      <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>₹{total.toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {order.status === 'DRAFT' && (
                            <>
                              <motion.button className="btn btn-primary btn-xs" whileHover={{ scale: 1.05 }}
                                onClick={() => handleAction(order.id, 'confirm', '✅ Order confirmed, stock reserved!')}>
                                <CheckCircle2 size={12} /> Confirm
                              </motion.button>
                              <motion.button className="btn btn-ghost btn-xs" whileHover={{ scale: 1.05 }}
                                onClick={() => handleAction(order.id, 'cancel', 'Order cancelled')}
                                style={{ color: 'var(--accent-red)' }}>
                                <XCircle size={12} />
                              </motion.button>
                            </>
                          )}
                          {order.status === 'CONFIRMED' && (
                            <>
                              <motion.button className="btn btn-success btn-xs" whileHover={{ scale: 1.05 }}
                                onClick={() => handleAction(order.id, 'deliver', '🚚 Delivered! Stock deducted.')}>
                                <Truck size={12} /> Deliver
                              </motion.button>
                              <motion.button className="btn btn-ghost btn-xs" whileHover={{ scale: 1.05 }}
                                onClick={() => handleAction(order.id, 'cancel', 'Order cancelled, stock released')}
                                style={{ color: 'var(--accent-red)' }}>
                                <XCircle size={12} />
                              </motion.button>
                            </>
                          )}
                          {(order.status === 'DELIVERED' || order.status === 'CANCELLED') && (
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
                    {isExpanded && <SODetail order={order} />}
                  </AnimatePresence>
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="🛒 New Sales Order">
        <CreateSOForm products={products} onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
      </Modal>
    </div>
  );
}

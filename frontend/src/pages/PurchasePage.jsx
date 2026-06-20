import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Truck, CheckCircle, PackageCheck,
  X, Save, Eye, XCircle, ChevronDown, ChevronUp,
  ShoppingBag, Clock, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import api from '../api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

// ─── KPI Bar ───────────────────────────────────────────────────
function PurchaseKPIs({ orders }) {
  const total     = orders.length;
  const draft     = orders.filter(o => o.status === 'DRAFT').length;
  const confirmed = orders.filter(o => o.status === 'CONFIRMED').length;
  const received  = orders.filter(o => o.status === 'RECEIVED').length;
  const cancelled = orders.filter(o => o.status === 'CANCELLED').length;

  const kpis = [
    { label: 'Total Orders',  value: total,     color: 'blue',   icon: <Truck size={18}/> },
    { label: 'Draft',         value: draft,     color: 'purple', icon: <Clock size={18}/> },
    { label: 'Confirmed',     value: confirmed, color: 'cyan',   icon: <CheckCircle size={18}/> },
    { label: 'Received',      value: received,  color: 'green',  icon: <PackageCheck size={18}/> },
    { label: 'Cancelled',     value: cancelled, color: 'red',    icon: <XCircle size={18}/> },
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

// ─── Create PO Form ────────────────────────────────────────────
function CreatePOForm({ products, onSave, onCancel, saving }) {
  const [vendorName, setVendorName] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);

  const addItem = () => setItems(it => [...it, { product_id: '', quantity: 1 }]);
  const removeItem = (i) => setItems(it => it.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const copy = [...items];
    copy[i] = { ...copy[i], [field]: val };
    setItems(copy);
  };

  const totalValue = items.reduce((sum, item) => {
    const product = products.find(p => p.id === Number(item.product_id));
    return sum + (product ? Number(product.cost_price) * Number(item.quantity) : 0);
  }, 0);

  const handleSave = () => {
    if (!vendorName.trim()) return alert('Vendor name is required');
    if (items.some(i => !i.product_id)) return alert('Select a product for all items');
    onSave({ vendor_name: vendorName, items: items.map(i => ({ product_id: Number(i.product_id), quantity: Number(i.quantity) })) });
  };

  // Only show purchasable products
  const purchaseProducts = products.filter(p => p.procurement_type === 'PURCHASE');

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Vendor / Supplier Name *</label>
        <input className="form-input" value={vendorName} onChange={e => setVendorName(e.target.value)}
          placeholder="e.g. Wood Supplier Co." />
      </div>

      {/* Items */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label className="form-label" style={{ margin: 0 }}>Order Items *</label>
          <button className="btn btn-ghost btn-xs" onClick={addItem}><Plus size={13} /> Add Item</button>
        </div>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px 32px', gap: 8, marginBottom: 6, padding: '0 4px' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>PRODUCT</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>QTY</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>COST</span>
        </div>

        <AnimatePresence>
          {items.map((item, i) => {
            const product = products.find(p => p.id === Number(item.product_id));
            const lineTotal = product ? Number(product.cost_price) * Number(item.quantity) : 0;
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <select className="form-select" value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                  <option value="">Select product...</option>
                  {purchaseProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (₹{Number(p.cost_price).toLocaleString()})</option>
                  ))}
                </select>
                <input className="form-input" type="number" min="1" value={item.quantity}
                  onChange={e => updateItem(i, 'quantity', e.target.value)} />
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
      <div style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Total Order Value</span>
        <span style={{ color: 'var(--accent-blue)', fontWeight: 700, fontSize: 16 }}>₹{totalValue.toLocaleString('en-IN')}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <motion.button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Save size={14} /> {saving ? 'Creating...' : 'Create PO'}
        </motion.button>
      </div>
    </div>
  );
}

// ─── Order Detail Expand ───────────────────────────────────────
function OrderDetail({ order }) {
  const items = order.items?.filter(i => i.product_id) || [];
  const total = items.reduce((s, i) => s + Number(i.cost_price || 0) * Number(i.quantity), 0);

  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <td colSpan={8} style={{ padding: 0, background: 'rgba(79,142,247,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ padding: '16px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Order Items</div>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', background: 'transparent' }}>Product</th>
                <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', background: 'transparent' }}>Quantity</th>
                <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', background: 'transparent' }}>Cost Price</th>
                <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', background: 'transparent' }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px 12px', color: 'var(--text-primary)', fontSize: 13 }}>{item.product_name}</td>
                  <td style={{ padding: '6px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>{item.quantity}</td>
                  <td style={{ padding: '6px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>₹{Number(item.cost_price || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '6px 12px', color: 'var(--accent-green)', fontSize: 13, fontWeight: 600 }}>₹{(Number(item.cost_price || 0) * Number(item.quantity)).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>Total</td>
                <td style={{ padding: '10px 12px', color: 'var(--accent-blue)', fontSize: 14, fontWeight: 700 }}>₹{total.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Main Purchase Orders Page ─────────────────────────────────
export default function PurchasePage() {
  const [orders, setOrders]       = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const toast = useToast();

  const load = async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        api.get('/purchase'),
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
      await api.post('/purchase', form);
      toast.success('Purchase order created!');
      setShowCreate(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const handleAction = async (id, action, successMsg) => {
    try {
      await api.patch(`/purchase/${id}/${action}`);
      toast.success(successMsg);
      load();
    } catch (err) { toast.error(err.response?.data?.error || `Failed to ${action}`); }
  };

  const filtered = orders.filter(o => {
    const matchSearch = o.vendor_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Bar chart data — orders by status
  const chartData = ['DRAFT', 'CONFIRMED', 'RECEIVED', 'CANCELLED'].map(s => ({
    status: s,
    count: orders.filter(o => o.status === s).length,
  }));
  const CHART_COLORS = { DRAFT: '#8b5cf6', CONFIRMED: '#4f8ef7', RECEIVED: '#10b981', CANCELLED: '#ef4444' };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <Toast toasts={toast.toasts} />

      {/* KPIs */}
      <PurchaseKPIs orders={orders} />

      {/* Chart + Actions Row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Bar chart */}
        <motion.div className="chart-wrapper" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div className="chart-title">Orders by Status</div>
          <div className="chart-subtitle">Purchase order breakdown</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="status" stroke="#475569" fontSize={11} />
              <YAxis stroke="#475569" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0f0f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={CHART_COLORS[entry.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quick Info */}
        <motion.div className="glass-card" style={{ padding: 24 }} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
          <div className="chart-title" style={{ marginBottom: 16 }}>📋 Purchase Flow</div>
          {[
            { step: '1', label: 'Create PO', desc: 'Add vendor & products needed', color: 'var(--accent-purple)' },
            { step: '2', label: 'Confirm',   desc: 'Lock in the order with vendor', color: 'var(--accent-blue)' },
            { step: '3', label: 'Receive',   desc: 'Goods arrive → stock is added', color: 'var(--accent-green)' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>{s.step}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by vendor..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {['ALL', 'DRAFT', 'CONFIRMED', 'RECEIVED', 'CANCELLED'].map(s => (
          <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setStatusFilter(s)}>
            {s === 'ALL' ? 'All' : s}
          </button>
        ))}

        <motion.button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Plus size={15} /> New PO
        </motion.button>
      </div>

      {/* Orders Table */}
      <motion.div className="table-container" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="table-header">
          <span className="table-title">
            <Truck size={16} style={{ display: 'inline', marginRight: 8 }} />
            Purchase Orders ({filtered.length})
          </span>
        </div>

        <table>
          <thead>
            <tr>
              <th>PO #</th>
              <th>Vendor</th>
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
                  <div className="empty-icon"><ShoppingBag size={40} strokeWidth={1} /></div>
                  <h3>No purchase orders found</h3>
                  <p>Create your first PO to buy stock from vendors</p>
                </div>
              </td></tr>
            ) : (
              filtered.map((order, i) => {
                const items = order.items?.filter(it => it.product_id) || [];
                const total = items.reduce((s, it) => s + Number(it.cost_price || 0) * Number(it.quantity), 0);
                const isExpanded = expanded === order.id;

                return (
                  <AnimatePresence key={order.id}>
                    <motion.tr
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>PO-{String(order.id).padStart(4, '0')}</td>
                      <td>{order.vendor_name}</td>
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
                                onClick={() => handleAction(order.id, 'confirm', 'Order confirmed!')}>
                                <CheckCircle size={12} /> Confirm
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
                                onClick={() => handleAction(order.id, 'receive', '✅ Stock received and updated!')}>
                                <PackageCheck size={12} /> Receive
                              </motion.button>
                              <motion.button className="btn btn-ghost btn-xs" whileHover={{ scale: 1.05 }}
                                onClick={() => handleAction(order.id, 'cancel', 'Order cancelled')}
                                style={{ color: 'var(--accent-red)' }}>
                                <XCircle size={12} />
                              </motion.button>
                            </>
                          )}
                          {(order.status === 'RECEIVED' || order.status === 'CANCELLED') && (
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
                    {isExpanded && <OrderDetail order={order} />}
                  </AnimatePresence>
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="🛒 New Purchase Order">
        <CreatePOForm products={products} onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
      </Modal>
    </div>
  );
}

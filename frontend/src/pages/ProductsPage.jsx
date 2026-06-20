import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit2, Trash2, Eye, Package,
  ChevronRight, X, Save, AlertCircle, Layers
} from 'lucide-react';
import api from '../api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const EMPTY_FORM = {
  name: '', description: '', sales_price: '', cost_price: '',
  procurement_type: 'PURCHASE', procurement_strategy: 'MTS',
};

const EMPTY_BOM = { components: [], operations: [] };

// ─── KPI Bar ─────────────────────────────────────────────────
function ProductKPIs({ products }) {
  const total       = products.length;
  const mfgCount    = products.filter(p => p.procurement_type === 'MANUFACTURING').length;
  const purchCount  = products.filter(p => p.procurement_type === 'PURCHASE').length;
  const stockValue  = products.reduce((s, p) => s + Number(p.cost_price) * p.on_hand_qty, 0);
  const lowStock    = products.filter(p => p.on_hand_qty <= 10).length;

  const kpis = [
    { label: 'Total Products',   value: total,                                     color: 'blue' },
    { label: 'Manufactured',     value: mfgCount,                                  color: 'purple' },
    { label: 'Purchased',        value: purchCount,                                color: 'cyan' },
    { label: 'Stock Value',      value: `₹${stockValue.toLocaleString('en-IN')}`, color: 'green' },
    { label: 'Low Stock',        value: lowStock,                                  color: 'red' },
  ];

  return (
    <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 24 }}>
      {kpis.map((k, i) => (
        <motion.div key={k.label} className={`kpi-card ${k.color}`}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }} whileHover={{ scale: 1.03 }}>
          <div className="kpi-value" style={{ fontSize: 22 }}>{k.value}</div>
          <div className="kpi-label">{k.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── BoM Editor ──────────────────────────────────────────────
function BomEditor({ productId, productName, allProducts, onClose, toast }) {
  const [bom, setBom]       = useState({ components: [], operations: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    api.get(`/products/${productId}`)
      .then(({ data }) => {
        if (data.bom) {
          setBom({
            components: data.bom.components.map(c => ({ component_id: c.component_id, name: c.component_name, quantity: c.quantity })),
            operations: data.bom.operations.map(o => ({ operation_name: o.operation_name, duration: o.duration })),
          });
        }
      }).finally(() => setLoading(false));
  }, [productId]);

  const addComponent = () => setBom(b => ({ ...b, components: [...b.components, { component_id: '', quantity: 1 }] }));
  const addOperation = () => setBom(b => ({ ...b, operations: [...b.operations, { operation_name: '', duration: 30 }] }));

  const updateComp = (i, field, val) => {
    const c = [...bom.components];
    c[i] = { ...c[i], [field]: val };
    setBom(b => ({ ...b, components: c }));
  };

  const updateOp = (i, field, val) => {
    const o = [...bom.operations];
    o[i] = { ...o[i], [field]: val };
    setBom(b => ({ ...b, operations: o }));
  };

  const removeComp = (i) => setBom(b => ({ ...b, components: b.components.filter((_, idx) => idx !== i) }));
  const removeOp   = (i) => setBom(b => ({ ...b, operations: b.operations.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/products/${productId}/bom`, {
        components: bom.components.map(c => ({ component_id: Number(c.component_id), quantity: Number(c.quantity) })),
        operations: bom.operations.map(o => ({ operation_name: o.operation_name, duration: Number(o.duration) })),
      });
      toast.success('BoM saved successfully!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save BoM');
    } finally {
      setSaving(false);
    }
  };

  const rawMaterials = allProducts.filter(p => p.id !== productId);

  if (loading) return <div className="loading-center" style={{ minHeight: 200 }}><div className="spinner" /></div>;

  return (
    <div>
      {/* Components */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Raw Materials / Components
          </h4>
          <button className="btn btn-ghost btn-xs" onClick={addComponent}><Plus size={13} /> Add</button>
        </div>

        <AnimatePresence>
          {bom.components.length === 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 0' }}>
              No components yet. Click "Add" to add raw materials.
            </motion.p>
          )}
          {bom.components.map((c, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 100px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <select className="form-select" value={c.component_id}
                onChange={(e) => updateComp(i, 'component_id', e.target.value)}>
                <option value="">Select component...</option>
                {rawMaterials.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.on_hand_qty})</option>)}
              </select>
              <input className="form-input" type="number" min="1" value={c.quantity}
                onChange={(e) => updateComp(i, 'quantity', e.target.value)} placeholder="Qty" />
              <button onClick={() => removeComp(i)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: 'var(--accent-red)', cursor: 'pointer', width: 32, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Operations */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Operations / Work Steps
          </h4>
          <button className="btn btn-ghost btn-xs" onClick={addOperation}><Plus size={13} /> Add</button>
        </div>

        <AnimatePresence>
          {bom.operations.length === 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 0' }}>
              No operations yet. Click "Add" to add work steps.
            </motion.p>
          )}
          {bom.operations.map((op, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 140px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input className="form-input" type="text" value={op.operation_name}
                onChange={(e) => updateOp(i, 'operation_name', e.target.value)} placeholder="e.g. Cutting, Polishing..." />
              <div style={{ position: 'relative' }}>
                <input className="form-input" type="number" min="1" value={op.duration}
                  onChange={(e) => updateOp(i, 'duration', e.target.value)} placeholder="mins" />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)' }}>min</span>
              </div>
              <button onClick={() => removeOp(i)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: 'var(--accent-red)', cursor: 'pointer', width: 32, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <motion.button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Save size={14} /> {saving ? 'Saving...' : 'Save BoM'}
        </motion.button>
      </div>
    </div>
  );
}

// ─── Product Form ─────────────────────────────────────────────
function ProductForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Product Name *</label>
        <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Wooden Chair" required />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Product description..." style={{ resize: 'vertical' }} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Sales Price (₹)</label>
          <input className="form-input" type="number" min="0" step="0.01" value={form.sales_price} onChange={e => set('sales_price', e.target.value)} placeholder="0.00" />
        </div>
        <div className="form-group">
          <label className="form-label">Cost Price (₹)</label>
          <input className="form-input" type="number" min="0" step="0.01" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} placeholder="0.00" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Procurement Type</label>
          <select className="form-select" value={form.procurement_type} onChange={e => set('procurement_type', e.target.value)}>
            <option value="PURCHASE">Purchase (Buy from vendor)</option>
            <option value="MANUFACTURING">Manufacturing (Produce in-house)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Procurement Strategy</label>
          <select className="form-select" value={form.procurement_strategy} onChange={e => set('procurement_strategy', e.target.value)}>
            <option value="MTS">MTS — Make to Stock</option>
            <option value="MTO">MTO — Make to Order</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <motion.button className="btn btn-primary btn-sm" onClick={() => onSave(form)} disabled={saving}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Save size={14} /> {saving ? 'Saving...' : 'Save Product'}
        </motion.button>
      </div>
    </div>
  );
}

// ─── Main Products Page ───────────────────────────────────────
export default function ProductsPage() {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [bomProduct, setBomProduct]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const toast = useToast();

  const load = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await api.post('/products', form);
      toast.success('Product created!');
      setShowCreate(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      await api.put(`/products/${editProduct.id}`, form);
      toast.success('Product updated!');
      setEditProduct(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Cannot delete — may be in use'); }
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || p.procurement_type === filter;
    return matchSearch && matchFilter;
  });

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <Toast toasts={toast.toasts} />

      {/* KPI bar */}
      <ProductKPIs products={products} />

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search products..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Filter buttons */}
        {['ALL', 'PURCHASE', 'MANUFACTURING'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}>
            {f === 'ALL' ? 'All' : f === 'PURCHASE' ? '🛒 Purchased' : '🏭 Manufactured'}
          </button>
        ))}

        <motion.button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Plus size={15} /> New Product
        </motion.button>
      </div>

      {/* Product Table */}
      <motion.div className="table-container" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="table-header">
          <span className="table-title">
            <Package size={16} style={{ display: 'inline', marginRight: 8 }} />
            Products ({filtered.length})
          </span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Type</th>
              <th>Strategy</th>
              <th>Sales Price</th>
              <th>Cost Price</th>
              <th>On Hand</th>
              <th>Reserved</th>
              <th>Available</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40 }}>
                <div className="empty-state">
                  <div className="empty-icon"><Package size={40} strokeWidth={1} /></div>
                  <h3>No products found</h3>
                  <p>Create your first product to get started</p>
                </div>
              </td></tr>
            ) : (
              filtered.map((p, i) => {
                const available = p.on_hand_qty - p.reserved_qty;
                return (
                  <motion.tr key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.description.slice(0, 50)}</div>}
                    </td>
                    <td><Badge status={p.procurement_type} /></td>
                    <td>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12,
                        background: p.procurement_strategy === 'MTS' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                        color: p.procurement_strategy === 'MTS' ? 'var(--accent-green)' : 'var(--accent-orange)',
                        fontWeight: 600 }}>
                        {p.procurement_strategy}
                      </span>
                    </td>
                    <td className="text-success">₹{Number(p.sales_price).toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>₹{Number(p.cost_price).toLocaleString('en-IN')}</td>
                    <td style={{ color: p.on_hand_qty <= 10 ? 'var(--accent-red)' : 'var(--text-primary)', fontWeight: p.on_hand_qty <= 10 ? 700 : 400 }}>
                      {p.on_hand_qty}
                      {p.on_hand_qty <= 10 && <AlertCircle size={12} style={{ marginLeft: 4, display: 'inline' }} />}
                    </td>
                    <td style={{ color: 'var(--accent-orange)' }}>{p.reserved_qty}</td>
                    <td style={{ color: available < 0 ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 700 }}>{available}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {/* BoM button — only for manufactured products */}
                        {p.procurement_type === 'MANUFACTURING' && (
                          <motion.button className="btn btn-ghost btn-xs" title="Edit BoM"
                            whileHover={{ scale: 1.05 }} onClick={() => setBomProduct(p)}
                            style={{ color: 'var(--accent-purple)' }}>
                            <Layers size={13} />
                          </motion.button>
                        )}
                        <motion.button className="btn btn-ghost btn-xs" title="Edit" whileHover={{ scale: 1.05 }}
                          onClick={() => setEditProduct(p)}>
                          <Edit2 size={13} />
                        </motion.button>
                        <motion.button className="btn btn-ghost btn-xs" title="Delete" whileHover={{ scale: 1.05 }}
                          onClick={() => handleDelete(p.id, p.name)}
                          style={{ color: 'var(--accent-red)' }}>
                          <Trash2 size={13} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="➕ New Product">
        <ProductForm onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editProduct} onClose={() => setEditProduct(null)} title={`✏️ Edit: ${editProduct?.name}`}>
        {editProduct && (
          <ProductForm
            initial={{ name: editProduct.name, description: editProduct.description || '',
              sales_price: editProduct.sales_price, cost_price: editProduct.cost_price,
              procurement_type: editProduct.procurement_type, procurement_strategy: editProduct.procurement_strategy }}
            onSave={handleEdit} onCancel={() => setEditProduct(null)} saving={saving}
          />
        )}
      </Modal>

      {/* BoM Modal */}
      <Modal isOpen={!!bomProduct} onClose={() => setBomProduct(null)}
        title={`🔩 Bill of Materials: ${bomProduct?.name}`}>
        {bomProduct && (
          <BomEditor productId={bomProduct.id} productName={bomProduct.name}
            allProducts={products} onClose={() => { setBomProduct(null); load(); }} toast={toast} />
        )}
      </Modal>
    </div>
  );
}

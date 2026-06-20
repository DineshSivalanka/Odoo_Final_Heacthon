import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Layers, ArrowUpCircle, ArrowDownCircle,
  AlertTriangle, TrendingUp, Package, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import api from '../api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

// ─── KPI Bar ───────────────────────────────────────────────────
function InventoryKPIs({ products }) {
  const totalUnits  = products.reduce((s, p) => s + p.on_hand_qty, 0);
  const reserved    = products.reduce((s, p) => s + p.reserved_qty, 0);
  const available   = totalUnits - reserved;
  const stockValue  = products.reduce((s, p) => s + Number(p.cost_price) * p.on_hand_qty, 0);
  const lowStock    = products.filter(p => p.on_hand_qty <= 10).length;
  const outOfStock  = products.filter(p => p.on_hand_qty === 0).length;

  const kpis = [
    { label: 'Total Units',    value: totalUnits,                                   color: 'blue',   icon: <Package size={18}/> },
    { label: 'Available',      value: available,                                     color: 'green',  icon: <TrendingUp size={18}/> },
    { label: 'Reserved',       value: reserved,                                      color: 'orange', icon: <Layers size={18}/> },
    { label: 'Stock Value',    value: `₹${stockValue.toLocaleString('en-IN')}`,    color: 'cyan',   icon: <TrendingUp size={18}/> },
    { label: 'Low Stock ≤10',  value: lowStock,                                      color: 'red',    icon: <AlertTriangle size={18}/> },
  ];

  return (
    <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 24 }}>
      {kpis.map((k, i) => (
        <motion.div key={k.label} className={`kpi-card ${k.color}`}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }} whileHover={{ scale: 1.03 }}>
          <div className="kpi-icon">{k.icon}</div>
          <div className="kpi-value" style={{ fontSize: typeof k.value === 'string' ? 16 : 26 }}>{k.value}</div>
          <div className="kpi-label">{k.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Stock Level Bar Chart ─────────────────────────────────────
function StockChart({ products }) {
  const chartData = products
    .filter(p => p.on_hand_qty > 0 || p.reserved_qty > 0)
    .slice(0, 12)
    .map(p => ({
      name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
      available: p.on_hand_qty - p.reserved_qty,
      reserved: p.reserved_qty,
    }));

  return (
    <motion.div className="chart-wrapper" style={{ marginBottom: 24 }}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <div className="chart-title">Stock Levels by Product</div>
      <div className="chart-subtitle">Available vs Reserved units</div>
      {chartData.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}><p>No stock data yet</p></div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="#475569" fontSize={11} />
            <YAxis stroke="#475569" fontSize={11} />
            <Tooltip contentStyle={{ background: '#0f0f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
            <Bar dataKey="available" name="Available" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
            <Bar dataKey="reserved"  name="Reserved"  fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}

// ─── Inventory Table ───────────────────────────────────────────
function InventoryTable({ products, search }) {
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStockStatus = (p) => {
    if (p.on_hand_qty === 0) return { label: 'Out of Stock', color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.12)' };
    if (p.on_hand_qty <= 5)  return { label: 'Critical',     color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.12)' };
    if (p.on_hand_qty <= 10) return { label: 'Low',          color: 'var(--accent-orange)', bg: 'rgba(245,158,11,0.12)' };
    return { label: 'OK', color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.12)' };
  };

  return (
    <motion.div className="table-container" style={{ marginBottom: 24 }}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="table-header">
        <span className="table-title"><Layers size={16} style={{ display: 'inline', marginRight: 8 }} />
          Current Inventory ({filtered.length} products)
        </span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Type</th>
            <th>On Hand</th>
            <th>Reserved</th>
            <th>Available</th>
            <th>Cost Price</th>
            <th>Sales Price</th>
            <th>Stock Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No products found</td></tr>
          ) : (
            filtered.map((p, i) => {
              const available = p.on_hand_qty - p.reserved_qty;
              const stockVal  = Number(p.cost_price) * p.on_hand_qty;
              const status    = getStockStatus(p);
              const pct       = p.on_hand_qty > 0 ? Math.min(100, (available / p.on_hand_qty) * 100) : 0;

              return (
                <motion.tr key={p.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    {/* Mini progress bar */}
                    <div style={{ marginTop: 4, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, width: 80 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: status.color, borderRadius: 2, transition: 'width 0.5s ease' }} />
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10,
                      background: p.procurement_type === 'PURCHASE' ? 'rgba(6,182,212,0.15)' : 'rgba(139,92,246,0.15)',
                      color: p.procurement_type === 'PURCHASE' ? 'var(--accent-cyan)' : 'var(--accent-purple)',
                      fontWeight: 600 }}>
                      {p.procurement_type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.on_hand_qty}</td>
                  <td style={{ color: p.reserved_qty > 0 ? 'var(--accent-orange)' : 'var(--text-muted)' }}>{p.reserved_qty}</td>
                  <td style={{ fontWeight: 700, color: available <= 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{available}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>₹{Number(p.cost_price).toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--accent-green)' }}>₹{Number(p.sales_price).toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>₹{stockVal.toLocaleString('en-IN')}</td>
                  <td>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: status.bg, color: status.color, fontWeight: 600 }}>
                      {status.label}
                    </span>
                  </td>
                </motion.tr>
              );
            })
          )}
        </tbody>
      </table>
    </motion.div>
  );
}

// ─── Stock Ledger Table ────────────────────────────────────────
function LedgerTable({ ledger }) {
  return (
    <motion.div className="table-container"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <div className="table-header">
        <span className="table-title">📋 Stock Ledger — All Movements</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Product</th>
            <th>Change</th>
            <th>Reason</th>
            <th>Reference</th>
            <th>Date & Time</th>
          </tr>
        </thead>
        <tbody>
          {ledger.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              No stock movements yet. Start purchasing or manufacturing!
            </td></tr>
          ) : (
            ledger.map((entry, i) => {
              const isIn = entry.change_qty > 0;
              return (
                <motion.tr key={entry.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{entry.id}</td>
                  <td style={{ fontWeight: 600 }}>{entry.product_name}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700,
                      color: isIn ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {isIn
                        ? <ArrowUpCircle size={15} />
                        : <ArrowDownCircle size={15} />}
                      {isIn ? '+' : ''}{entry.change_qty}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{entry.reason}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {entry.reference_id ? `#${entry.reference_id}` : '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {new Date(entry.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </motion.tr>
              );
            })
          )}
        </tbody>
      </table>
    </motion.div>
  );
}

// ─── Main Inventory Page ───────────────────────────────────────
export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [ledger, setLedger]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [tab, setTab]           = useState('inventory'); // 'inventory' | 'ledger'
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [invRes, ledRes] = await Promise.all([
        api.get('/dashboard/inventory'),
        api.get('/dashboard/stock-ledger'),
      ]);
      setProducts(invRes.data);
      setLedger(ledRes.data);
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <Toast toasts={toast.toasts} />

      {/* KPIs */}
      <InventoryKPIs products={products} />

      {/* Chart */}
      <StockChart products={products} />

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <button className={`btn btn-sm ${tab === 'inventory' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('inventory')}>
          <Layers size={14} /> Inventory
        </button>
        <button className={`btn btn-sm ${tab === 'ledger' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('ledger')}>
          📋 Stock Ledger ({ledger.length})
        </button>

        <div style={{ flex: 1 }} />

        {tab === 'inventory' && (
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" style={{ paddingLeft: 32, width: 220 }}
              placeholder="Search products..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}

        <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tab content */}
      {tab === 'inventory'
        ? <InventoryTable products={products} search={search} />
        : <LedgerTable ledger={ledger} />
      }
    </div>
  );
}

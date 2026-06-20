import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import PurchasePage from './pages/PurchasePage';
import ManufacturingPage from './pages/ManufacturingPage';
import SalesPage from './pages/SalesPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — inside Layout */}
        <Route element={<Layout />}>
          <Route path="/dashboard"      element={<DashboardPage />} />
          <Route path="/products"       element={<ProductsPage />} />
          <Route path="/purchase"       element={<PurchasePage />} />
          <Route path="/manufacturing"  element={<ManufacturingPage />} />
          <Route path="/sales"          element={<SalesPage />} />
          <Route path="/inventory"      element={<InventoryPage />} />
          <Route path="/reports"        element={<ReportsPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import { Link } from 'react-router-dom';
import overview_icon from '../../assets/overview.png';
import cart_icon from '../../assets/cart_icon.png';
import inventory_icon from '../../assets/Product_list_icon.svg';
import supplier_icon from '../../assets/user_icon.png';
import user_icon from '../../assets/user_icon.png';
import order_icon from '../../assets/order_icon.png';
import stats_icon from '../../assets/revenue_icon.png';
import nodes_icon from '../../assets/nodes.png';

const Sidebar = () => {
  const [openSections, setOpenSections] = useState({});
  const [pendingSuppliers, setPendingSuppliers] = useState(0);
  const [zeroStockProducts, setZeroStockProducts] = useState(0);
  const [newOrders, setNewOrders] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch pending suppliers
        const suppliersRes = await fetch('http://localhost:4000/suppliers/pending', {
          headers: { 'auth-token': localStorage.getItem('auth-token') },
        });
        const suppliersData = await suppliersRes.json();
        if (suppliersData.success) {
          setPendingSuppliers(suppliersData.count || 0);
        } else {
          throw new Error(suppliersData.message || 'Failed to fetch pending suppliers');
        }

        // Fetch zero stock products
        const inventoryRes = await fetch('http://localhost:4000/inventory/zerostock', {
          headers: { 'auth-token': localStorage.getItem('auth-token') },
        });
        const inventoryData = await inventoryRes.json();
        if (inventoryData.success) {
          setZeroStockProducts(inventoryData.count || 0);
        } else {
          throw new Error(inventoryData.message || 'Failed to fetch zero stock products');
        }

        // Fetch pending orders
        const ordersRes = await fetch('http://localhost:4000/orders/pending', {
          headers: { 'auth-token': localStorage.getItem('auth-token') },
        });
        const ordersData = await ordersRes.json();
        if (ordersData.success) {
          setNewOrders(ordersData.count || 0);
        } else {
          throw new Error(ordersData.message || 'Failed to fetch pending orders');
        }
      } catch (error) {
        console.error('Error fetching sidebar data:', error);
        setError('Không thể tải dữ liệu. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="sidebar">
      {loading && <div className="sidebar-loading">Đang tải...</div>}
      {error && <div className="sidebar-error">{error}</div>}
      <div className="sidebar-section">
        <h3 className="sidebar-header" onClick={() => toggleSection('overview')}>
          <img src={overview_icon} alt="Tổng quan" className="header-icon" />
          Tổng quan
        </h3>
        {openSections['overview'] && (
          <div className="sidebar-items">
            <Link to={'/revenue'} style={{ textDecoration: 'none' }}>
              <div className="sidebar-item">
                <img src={nodes_icon} alt="Doanh thu" className="node-icon" />
                <p>Doanh thu</p>
              </div>
            </Link>
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-header" onClick={() => toggleSection('checkout')}>
          <img src={cart_icon} alt="Thanh toán" className="header-icon" />
          Thanh toán tại quầy
        </h3>
        {openSections['checkout'] && (
          <div className="sidebar-items">
            <Link to={'/checkout'} style={{ textDecoration: 'none' }}>
              <div className="sidebar-item">
                <img src={nodes_icon} alt="Thanh toán" className="node-icon" />
                <p>Thanh toán tại quầy</p>
              </div>
            </Link>
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-header" onClick={() => toggleSection('inventory')}>
          <img src={inventory_icon} alt="Kho hàng" className="header-icon" />
          Quản lý Kho hàng
        </h3>
        {openSections['inventory'] && (
          <div className="sidebar-items">
            <Link to={'/inventory'} style={{ textDecoration: 'none' }}>
              <div className="sidebar-item" style={{ position: 'relative' }}>
                <img src={nodes_icon} alt="Kho hàng" className="node-icon" />
                <p>Kho hàng</p>
                {zeroStockProducts > 0 && (
                  <span className="notification">{zeroStockProducts}</span>
                )}
              </div>
            </Link>
            <Link to={'/listproduct'} style={{ textDecoration: 'none' }}>
              <div className="sidebar-item">
                <img src={nodes_icon} alt="Nhập hàng" className="node-icon" />
                <p>Nhập hàng</p>
              </div>
            </Link>
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-header" onClick={() => toggleSection('supplier')}>
          <img src={supplier_icon} alt="Nhà cung cấp" className="header-icon" />
          Quản lý Nhà cung cấp
        </h3>
        {openSections['supplier'] && (
          <div className="sidebar-items">
            <Link to={'/addsupplier'} style={{ textDecoration: 'none' }}>
              <div className="sidebar-item" style={{ position: 'relative' }}>
                <img src={nodes_icon} alt="Thêm nhà cung cấp" className="node-icon" />
                <p>Thêm nhà cung cấp</p>
                {pendingSuppliers > 0 && (
                  <span className="notification">{pendingSuppliers}</span>
                )}
              </div>
            </Link>
            <Link to={'/supplierslist'} style={{ textDecoration: 'none' }}>
              <div className="sidebar-item">
                <img src={nodes_icon} alt="Thông tin nhà cung cấp" className="node-icon" />
                <p>Thông tin nhà cung cấp</p>
              </div>
            </Link>
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-header" onClick={() => toggleSection('users')}>
          <img src={user_icon} alt="Người dùng" className="header-icon" />
          Quản lý Người dùng
        </h3>
        {openSections['users'] && (
          <div className="sidebar-items">
            <Link to={'/users'} style={{ textDecoration: 'none' }}>
              <div className="sidebar-item">
                <img src={nodes_icon} alt="Danh sách người dùng" className="node-icon" />
                <p>Danh sách người dùng</p>
              </div>
            </Link>
            <Link to={'/getallcarts'} style={{ textDecoration: 'none' }}>
              <div className="sidebar-item">
                <img src={nodes_icon} alt="Danh sách giỏ hàng" className="node-icon" />
                <p>Danh sách giỏ hàng</p>
              </div>
            </Link>
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-header" onClick={() => toggleSection('orders')}>
          <img src={order_icon} alt="Đơn hàng" className="header-icon" />
          Quản lý đơn hàng
        </h3>
        {openSections['orders'] && (
          <div className="sidebar-items">
            <Link to={'/supplier-orders'} style={{ textDecoration: 'none' }}>
              <div className="sidebar-item">
                <img src={nodes_icon} alt="Đơn đặt hàng" className="node-icon" />
                <p>Đơn đặt hàng</p>
              </div>
            </Link>
            <Link to={'/allorders'} style={{ textDecoration: 'none' }}>
              <div className="sidebar-item" style={{ position: 'relative' }}>
                <img src={nodes_icon} alt="Đơn bán hàng" className="node-icon" />
                <p>Đơn bán hàng</p>
                {newOrders > 0 && (
                  <span className="notification">{newOrders}</span>
                )}
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
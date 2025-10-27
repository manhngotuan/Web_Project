import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import add_product_icon from "../../assets/Product_Cart.svg";
import list_product_icon from "../../assets/Product_list_icon.svg";
import order_icon from "../../assets/order_icon.png";
import "./Sidebar.css";

const Sidebar = () => {
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  const fetchNewOrders = async () => {
    try {
      const supplierId = localStorage.getItem("supplierId");
      if (!supplierId) return;

      const res = await fetch(`http://localhost:4000/getsupplierorders/${supplierId}`);
      const data = await res.json();
      if (data.success) {
        // Chỉ đếm những đơn trạng thái "pending" = "Đơn mới"
        const count = data.orders.filter(order => order.status === "pending").length;
        setNewOrdersCount(count);
      }
    } catch (error) {
      console.error("Lỗi fetch đơn mới:", error);
    }
  };

  useEffect(() => {
    fetchNewOrders();
    const interval = setInterval(fetchNewOrders, 5000); // Cập nhật định kỳ
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="sidebar">
      <Link to="/supplier/addproduct" style={{ textDecoration: "none" }}>
        <div className="sidebar-item">
          <img src={add_product_icon} alt="Add Product Icon" />
          <p>Thêm sản phẩm</p>
        </div>
      </Link>
      <Link to="/supplier/listproduct" style={{ textDecoration: "none" }}>
        <div className="sidebar-item">
          <img src={list_product_icon} alt="List Product Icon" />
          <p>Danh sách sản phẩm</p>
        </div>
      </Link>
      <Link to="/supplier/allorders" style={{ textDecoration: "none", position: "relative" }}>
        <div className="sidebar-item">
          <img src={order_icon} alt="All Orders Icon" />
          <p>Quản lý Đơn Hàng</p>
          {newOrdersCount > 0 && (
            <div className="new-orders-bubble">
              Bạn có {newOrdersCount} đơn hàng mới
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default Sidebar;

import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "./SupplierOrders.css";
import robotoFont from "../Base64";

const formatPrice = (price) => {
  return price ? price.toLocaleString("vi-VN") + " ₫" : "0 ₫";
};

const formatDate = (date) => {
  return date ? new Date(date).toLocaleDateString("vi-VN") : "—";
};

const translateStatus = (status) => {
  switch (status) {
    case "pending": return "Chờ xác nhận";
    case "confirmed": return "Đã xác nhận";
    case "completed": return "Hoàn thành";
    case "canceled": return "Đã hủy";
    default: return status;
  }
};

const SupplierOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest"); // New state for sort option
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 8;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth-token");
      const response = await fetch("http://localhost:4000/supplierorders", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "auth-token": token || "",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.orders)) {
        const mapped = data.orders.map((order) => ({
          _id: order._id || "",
          supplierId: order.supplierId || "",
          supplierName: order.supplierName || "Không xác định",
          items: order.items.map((item) => ({
            ...item,
            name: item.productId?.name || item.name || "Sản phẩm không xác định",
            productId: item.productId?._id || item.productId,
          })),
          status: order.status || "pending",
          createdAt: order.createdAt || "",
          orderDate: order.orderDate || order.createdAt || new Date(),
          completedAt: order.completedAt || null,
          totalAmount: order.items.reduce((sum, item) => sum + (item.importPrice * item.quantity || 0), 0) // Precompute totalAmount
        }));
        setOrders(mapped);
        setFilteredOrders(mapped);
        setError(null);
      } else {
        setError(data.message || "Không thể tải danh sách đơn hàng");
        setOrders([]);
        setFilteredOrders([]);
      }
    } catch (error) {
      console.error("Lỗi khi lấy đơn hàng:", error);
      setError(`Không thể kết nối đến server: ${error.message}`);
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    let results = orders.filter(
      (order) =>
        (order.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (order._id?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    );

    if (statusFilter !== "all") {
      results = results.filter((order) => order.status === statusFilter);
    }

    // Sort based on sortOption
    results.sort((a, b) => {
      switch (sortOption) {
        case "newest":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "highestPrice":
          return b.totalAmount - a.totalAmount;
        case "lowestPrice":
          return a.totalAmount - b.totalAmount;
        case "supplierAZ":
          return a.supplierName.localeCompare(b.supplierName);
        case "supplierZA":
          return b.supplierName.localeCompare(a.supplierName);
        default:
          return 0;
      }
    });

    setFilteredOrders(results);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortOption, orders]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("auth-token");
      const response = await fetch(`http://localhost:4000/supplierorders/${orderId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "auth-token": token || "",
        },
      });
      const data = await response.json();
      if (data.success) {
        setOrders(
          orders.map((o) => (o._id === orderId ? { ...o, status: "canceled" } : o))
        );
        setError(null);
      } else {
        setError(data.message || "Hủy đơn hàng không thành công.");
      }
    } catch (error) {
      console.error("Lỗi khi hủy đơn hàng:", error);
      setError(`Có lỗi xảy ra: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (order) => {
    const doc = new jsPDF();
    doc.addFileToVFS("Roboto-Regular.ttf", robotoFont);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto");

    doc.setFontSize(16);
    doc.text("HÓA ĐƠN ĐẶT HÀNG", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Mã đơn: ${order._id}`, 14, 40);
    doc.text(`Nhà cung cấp: ${order.supplierName}`, 14, 50);
    doc.text(`Ngày đặt: ${formatDate(order.orderDate)}`, 14, 60);
    doc.text(`Trạng thái: ${translateStatus(order.status)}`, 14, 70);

    let startY = order.completedAt ? 90 : 80;
    if (order.completedAt) {
      doc.text(`Hoàn thành: ${formatDate(order.completedAt)}`, 14, 80);
    }

    // Header for product table
    doc.text("Sản phẩm", 14, startY);
    doc.text("Size & SL", 100, startY);
    doc.text("Giá", 140, startY, { align: "right" });
    doc.text("Tổng", 180, startY, { align: "right" });
    startY += 5;
    doc.line(14, startY, 196, startY); // Horizontal line
    startY += 5;

    const groupedItems = order.items.map((item) => ({
      name: item.name || "Sản phẩm không xác định",
      size: item.size || "",
      quantity: item.quantity || 0,
      importPrice: item.importPrice || 0,
    }));

    groupedItems.forEach((item) => {
      const itemTotal = item.importPrice * item.quantity;
      doc.text(item.name, 14, startY, { maxWidth: 80 });
      doc.text(`${item.size} - ${item.quantity}`, 100, startY);
      doc.text(formatPrice(item.importPrice), 140, startY, { align: "right" });
      doc.text(formatPrice(itemTotal), 180, startY, { align: "right" });
      startY += 10;
    });

    const total = groupedItems.reduce(
      (sum, item) => sum + item.importPrice * item.quantity,
      0
    );

    startY += 5;
    doc.line(14, startY, 196, startY); // Horizontal line
    startY += 10;
    doc.text(`Tổng: ${formatPrice(total)}`, 180, startY, { align: "right" });
    startY += 20;
    doc.text("Cảm ơn quý khách!", 105, startY, { align: "center" });

    doc.save(`Invoice_${order._id}.pdf`);
  };

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  if (loading) {
    return <div className="loading">Đang tải danh sách đơn hàng...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="supplier-orders">
      <h2>Danh sách Đơn hàng Nhà cung cấp</h2>

      <div className="filters-container">
        <div className="search-container">
          <input
            type="text"
            placeholder="Tìm kiếm theo mã đơn hoặc nhà cung cấp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="status-filter">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="completed">Hoàn thành</option>
            <option value="canceled">Đã hủy</option>
          </select>
        </div>
        <div className="sort-filter"> {/* New filter for sort options */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="highestPrice">Giá trị cao nhất</option>
            <option value="lowestPrice">Giá trị thấp nhất</option>
            <option value="supplierAZ">Nhà cung cấp A-Z</option>
            <option value="supplierZA">Nhà cung cấp Z-A</option>
          </select>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="orders-grid">
        {currentOrders.length > 0 ? (
          currentOrders.map((order) => (
            <div key={order._id} className="order-card">
              <div className="card-header">
                <h3 title={order._id}>
                  Mã đơn: {order._id.length > 20 ? `${order._id.slice(0, 17)}...` : order._id}
                </h3>
                <span className={`status-badge ${order.status}`}>
                  {translateStatus(order.status)}
                </span>
              </div>

              <div className="card-content">
                <div className="card-section">
                  <h4>Thông tin đơn hàng</h4>
                  <p title={order.supplierName}>
                    <strong>Nhà cung cấp:</strong>{" "}
                    {order.supplierName.length > 20
                      ? `${order.supplierName.slice(0, 17)}...`
                      : order.supplierName}
                  </p>
                  <p>
                    <strong>Số lượng:</strong>{" "}
                    {order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                  </p>
                  <p>
                    <strong>Tổng tiền:</strong> {formatPrice(order.totalAmount)}
                  </p>
                  <p>
                    <strong>Ngày tạo:</strong> {formatDate(order.orderDate)}
                  </p>
                  {order.completedAt && (
                    <p>
                      <strong>Hoàn thành:</strong> {formatDate(order.completedAt)}
                    </p>
                  )}
                </div>
                <div className="card-section">
                  <h4>Sản phẩm</h4>
                  {order.items.length > 0 ? (
                    order.items.map((item, index) => (
                      <p key={index}>
                        <strong>{item.name || "Sản phẩm không xác định"}:</strong>{" "}
                        {item.quantity || 0} (Giá: {formatPrice(item.importPrice)})
                      </p>
                    ))
                  ) : (
                    <p className="empty-text">Không có sản phẩm</p>
                  )}
                </div>
              </div>

              <div className="card-actions">
                {order.status === "pending" && (
                  <button
                    className="cancel-btn"
                    onClick={() => handleCancelOrder(order._id)}
                    title="Hủy đơn hàng"
                  >
                    Hủy
                  </button>
                )}
                <button
                  className="download-btn"
                  onClick={() => handleDownloadPDF(order)}
                  title="Xuất PDF"
                >
                  Xuất PDF
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-text">Không tìm thấy đơn hàng nào.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            Trước
          </button>
          <span>Trang {currentPage} / {totalPages}</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

export default SupplierOrders;
import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import "./AllOrders.css";
import robotoFont from "../AllOrders/Base64";

const formatPrice = (price) => price.toLocaleString("vi-VN") + " VND";
const formatDate = (dateStr) => new Date(dateStr).toLocaleString("vi-VN");

const SupplierOrders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const fetchSupplierOrders = async () => {
    try {
      setLoading(true);
      const supplierId = localStorage.getItem("supplierId");
      const res = await fetch(
        `http://localhost:4000/getsupplierorders/${supplierId}`
      );
      const data = await res.json();
      if (data.success) {
        setOrders(
          data.orders.sort(
            (a, b) => new Date(b.orderDate) - new Date(a.orderDate)
          )
        );
      } else {
        console.error("Lỗi từ API:", data.message);
        setOrders([]);
      }
    } catch (e) {
      console.error("Lỗi khi lấy đơn hàng:", e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Kết nối WebSocket và làm mới dữ liệu khi có đơn hàng mới
  useEffect(() => {
    fetchSupplierOrders(); // Gọi lần đầu khi mount

    const supplierId = localStorage.getItem("supplierId");
    const ws = new WebSocket(`ws://localhost:4000?supplierId=${supplierId}`);

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "newOrder" && !selectedOrder) {
        console.log("New order received:", message.orderId);
        fetchSupplierOrders(); // Làm mới danh sách đơn hàng
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      ws.close();
    };
  }, [selectedOrder]);

  const translateStatus = (status) => {
    switch (status) {
      case "pending":
        return "Mới";
      case "confirmed":
        return "Đang xử lý";
      case "completed":
        return "Hoàn thành";
      case "canceled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  const handleConfirmOrder = async (orderId) => {
    try {
      setLoading(true);
      const res = await fetch(
        `http://localhost:4000/supplierorders/${orderId}/confirm`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      const data = await res.json();
      if (data.success) {
        alert("Đã xác nhận");
        setSelectedOrder(null);
        await fetchSupplierOrders();
        const order = orders.find((o) => o._id === orderId);
        if (order) handleDownloadPDF(order);
      } else {
        alert(`Xác nhận thất bại: ${data.message}`);
      }
    } catch (e) {
      console.error("Lỗi xác nhận đơn hàng:", e);
      alert("Có lỗi xảy ra khi xác nhận đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      setLoading(true);
      const res = await fetch(
        `http://localhost:4000/supplierorders/${orderId}/complete`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      const data = await res.json();
      if (data.success) {
        alert("Đã hoàn thành");
        setSelectedOrder(null);
        await fetchSupplierOrders();
      } else {
        alert(`Hoàn thành thất bại: ${data.message}`);
      }
    } catch (e) {
      console.error("Lỗi hoàn thành đơn hàng:", e);
      alert("Có lỗi xảy ra khi hoàn thành đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      setLoading(true);
      const res = await fetch(
        `http://localhost:4000/supplierorders/${orderId}/cancel`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      const data = await res.json();
      if (data.success) {
        alert("Đã hủy đơn");
        setSelectedOrder(null);
        await fetchSupplierOrders();
      } else {
        alert(`Hủy đơn thất bại: ${data.message}`);
      }
    } catch (e) {
      console.error("Lỗi hủy đơn hàng:", e);
      alert("Có lỗi xảy ra khi hủy đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const groupItems = (items) => {
    return items.map((it) => ({
      productId: it.productId,
      size: it.size,
      quantity: it.quantity,
      importPrice: it.importPrice,
    }));
  };

  // Xuất PDF
  const handleDownloadPDF = (order) => {
    const doc = new jsPDF();
    doc.addFileToVFS("Roboto-Regular.ttf", robotoFont);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto");

    doc.setFontSize(16);
    doc.text("HÓA ĐƠN ĐẶT HÀNG", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Mã đơn: ${order._id}`, 14, 40);
    doc.text(`Ngày đặt: ${formatDate(order.orderDate)}`, 14, 55);
    doc.text(`Trạng thái: ${translateStatus(order.status)}`, 14, 70);

    if (order.completedAt) {
      doc.text(`Hoàn thành: ${formatDate(order.completedAt)}`, 14, 85);
    }

    let startY = order.completedAt ? 105 : 95;

    // header table
    doc.text("Sản phẩm", 14, startY);
    doc.text("Size & SL", 100, startY);
    doc.text("Giá", 140, startY);
    doc.text("Tổng", 180, startY);
    startY += 10;

    const groupedItems = groupItems(order.items);
    groupedItems.forEach((item) => {
      const itemTotal = item.importPrice * item.quantity;

      doc.text(item.productId.name, 14, startY, { maxWidth: 80 });
      doc.text(`${item.size} - ${item.quantity}`, 100, startY);
      doc.text(formatPrice(item.importPrice), 140, startY, { align: "right" });
      doc.text(formatPrice(itemTotal), 200, startY, { align: "right" });

      startY += 10;
    });

    const total = groupedItems.reduce(
      (s, it) => s + it.importPrice * it.quantity,
      0
    );

    startY += 10;
    doc.text(`Tổng: ${formatPrice(total)}`, 14, startY);
    startY += 20;
    doc.text("Cảm ơn quý khách!", 105, startY, { align: "center" });

    doc.save(`Invoice_${order._id}.pdf`);
  };

  // lọc đơn
  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="all-orders">
      <h2 className="allorders-title">Danh sách đơn đặt hàng</h2>

      {/* bộ lọc */}
      <div className="filter-container">
        <select
          className="filter-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Tất cả</option>
          <option value="pending">Mới</option>
          <option value="confirmed">Đang xử lý</option>
          <option value="completed">Hoàn thành</option>
          <option value="canceled">Đã hủy</option>
        </select>
      </div>

      {loading ? (
        <p>Đang tải đơn hàng...</p>
      ) : filteredOrders.length === 0 ? (
        <p>Không có đơn hàng nào.</p>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map((order) => {
            const groupedItems = groupItems(order.items);
            const totalAmount = groupedItems.reduce(
              (s, it) => s + it.importPrice * it.quantity,
              0
            );
            return (
              <div key={order._id} className="order-card">
                <div
                  className="order-summary"
                  onClick={() => setSelectedOrder(order)}
                >
                  <span>
                    <strong>Mã:</strong> {order._id}
                  </span>
                  <span className="highlight-date">
                    Ngày đặt: {formatDate(order.orderDate)}
                  </span>
                  {order.completedAt && (
                    <span className="highlight-completed">
                      Hoàn thành: {formatDate(order.completedAt)}
                    </span>
                  )}
                  <span className={`status-label ${order.status}`}>
                    {translateStatus(order.status)}
                  </span>
                  <span>
                    <strong>Tổng:</strong> {formatPrice(totalAmount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedOrder && (
        <div className="order-overlay active">
          <div className="order-overlay-content">
            <button
              className="close-btn"
              onClick={() => setSelectedOrder(null)}
            >
              Đóng
            </button>
            <h3>Mã đơn: {selectedOrder._id}</h3>
            <p className="highlight-date">
              Ngày đặt: <strong>{formatDate(selectedOrder.orderDate)}</strong>
            </p>
            {selectedOrder.completedAt && (
              <p className="highlight-completed">
                Hoàn thành:{" "}
                <strong>{formatDate(selectedOrder.completedAt)}</strong>
              </p>
            )}
            <p>
              Trạng thái:{" "}
              <span className={`status-label ${selectedOrder.status}`}>
                {translateStatus(selectedOrder.status)}
              </span>
            </p>

            <table className="order-items-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Hình ảnh</th>
                  <th>Size & SL</th>
                  <th>Giá</th>
                  <th>Tổng</th>
                </tr>
              </thead>
              <tbody>
                {groupItems(selectedOrder.items).map((item, idx) => {
                  const itemTotal = item.importPrice * item.quantity;
                  return (
                    <tr key={idx}>
                      <td>{item.productId.name}</td>
                      <td>
                        <img
                          className="product-image"
                          src={item.productId.image}
                          alt={item.productId.name}
                        />
                      </td>
                      <td>
                        {item.size} - {item.quantity}
                      </td>
                      <td>{formatPrice(item.importPrice)}</td>
                      <td>{formatPrice(itemTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="order-total">
              <strong>
                Tổng:{" "}
                {formatPrice(
                  groupItems(selectedOrder.items).reduce(
                    (sum, item) => sum + item.importPrice * item.quantity,
                    0
                  )
                )}
              </strong>
            </div>

            {/* Các nút hành động */}
            <div className="order-actions">
              {selectedOrder.status === "pending" && (
                <>
                  <button
                    className="confirm-btn"
                    onClick={() => handleConfirmOrder(selectedOrder._id)}
                    disabled={loading}
                  >
                    {loading ? "Đang xử lý..." : "Xác nhận"}
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => handleCancelOrder(selectedOrder._id)}
                    disabled={loading}
                  >
                    {loading ? "Đang xử lý..." : "Hủy đơn"}
                  </button>
                </>
              )}
              {selectedOrder.status === "confirmed" && (
                <>
                  <button
                    className="complete-btn"
                    onClick={() => handleCompleteOrder(selectedOrder._id)}
                    disabled={loading}
                  >
                    {loading ? "Đang xử lý..." : "Hoàn thành"}
                  </button>
                </>
              )}
              <button
                className="download-btn"
                onClick={() => handleDownloadPDF(selectedOrder)}
                disabled={loading}
              >
                Xuất PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierOrders;
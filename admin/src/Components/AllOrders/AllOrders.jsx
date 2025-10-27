import React, { useEffect, useState } from "react";
import "./AllOrders.css";
import jsPDF from "jspdf";
import robotoFont from "../Base64";

const formatPrice = (price) => {
  return price ? price.toLocaleString("vi-VN") + " VND" : "0 VND";
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "Đang chờ" : date.toLocaleString("vi-VN");
};

const translateStatus = (status) => {
  switch (status) {
    case "pending":
      return "Mới";
    case "confirmed":
      return "Đã xác nhận";
    case "completed":
      return "Hoàn thành";
    case "canceled":
      return "Đã hủy";
    default:
      return status;
  }
};

const AllOrders = () => {
  const [currentTab, setCurrentTab] = useState("all");
  const [allOrders, setAllOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [confirmedOrders, setConfirmedOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [canceledOrders, setCanceledOrders] = useState([]);
  const [directOrders, setDirectOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("date-desc"); // Mặc định: mới nhất trước

  // Hàm đếm số đơn hàng đang chờ
  const countPendingOrders = () => {
    return pendingOrders.length;
  };

  // Hàm đếm số đơn hàng đã xác nhận
  const countConfirmedOrders = () => {
    return confirmedOrders.length;
  };

  const fetchData = async (tab) => {
    let url;
    if (tab === "all") url = "http://localhost:4000/getallorders";
    else if (tab === "pending") url = "http://localhost:4000/getpendingorders";
    else if (tab === "confirmed") url = "http://localhost:4000/getconfirmedorders";
    else if (tab === "completed") url = "http://localhost:4000/getcompletedorders";
    else if (tab === "canceled") url = "http://localhost:4000/getcanceledorders";
    else if (tab === "direct") url = "http://localhost:4000/directorders"; // Updated endpoint
    else return;

    try {
      setLoading(true);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Lỗi mạng khi lấy đơn hàng ${tab}: ${response.status}`);
      }
      const data = await response.json();
      console.log(`Dữ liệu trả về cho tab ${tab}:`, data);
      if (data.success) {
        const orders = data.orders || [];
        console.log(`Số đơn hàng ${tab}: ${orders.length}`);
        if (tab === "all") setAllOrders(orders);
        else if (tab === "pending") setPendingOrders(orders);
        else if (tab === "confirmed") setConfirmedOrders(orders);
        else if (tab === "completed") setCompletedOrders(orders);
        else if (tab === "canceled") setCanceledOrders(orders);
        else if (tab === "direct") setDirectOrders(orders.map(o => ({ ...o, isDirect: true })));
      } else {
        console.error(`Lỗi khi lấy đơn hàng ${tab}:`, data.message);
        if (tab === "all") setAllOrders([]);
        else if (tab === "pending") setPendingOrders([]);
        else if (tab === "confirmed") setConfirmedOrders([]);
        else if (tab === "completed") setCompletedOrders([]);
        else if (tab === "canceled") setCanceledOrders([]);
        else if (tab === "direct") setDirectOrders([]);
      }
    } catch (error) {
      console.error(`Lỗi khi lấy đơn hàng ${tab}:`, error);
      if (tab === "all") setAllOrders([]);
      else if (tab === "pending") setPendingOrders([]);
      else if (tab === "confirmed") setConfirmedOrders([]);
      else if (tab === "completed") setCompletedOrders([]);
      else if (tab === "canceled") setCanceledOrders([]);
      else if (tab === "direct") setDirectOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData("pending");
    fetchData("confirmed");
    fetchData("direct"); // Fetch direct orders on mount
  }, []);

  useEffect(() => {
    fetchData(currentTab);
  }, [currentTab]);

  const handleSort = (sortType) => {
    setSortBy(sortType);
    const sortOrders = (orders) => {
      const sorted = [...orders];
      if (sortType === "date-desc") {
        return sorted.sort((a, b) => new Date(b.createdAt || b.orderDate) - new Date(a.createdAt || a.orderDate));
      } else if (sortType === "date-asc") {
        return sorted.sort((a, b) => new Date(a.createdAt || a.orderDate) - new Date(b.createdAt || a.orderDate));
      } else if (sortType === "price-desc") {
        return sorted.sort((a, b) => b.totalAmount - a.totalAmount);
      } else if (sortType === "price-asc") {
        return sorted.sort((a, b) => a.totalAmount - b.totalAmount);
      }
      return sorted;
    };

    if (currentTab === "all") setAllOrders(sortOrders(allOrders));
    else if (currentTab === "pending") setPendingOrders(sortOrders(pendingOrders));
    else if (currentTab === "confirmed") setConfirmedOrders(sortOrders(confirmedOrders));
    else if (currentTab === "completed") setCompletedOrders(sortOrders(completedOrders));
    else if (currentTab === "canceled") setCanceledOrders(sortOrders(canceledOrders));
    else if (currentTab === "direct") setDirectOrders(sortOrders(directOrders));
  };

  const handleConfirmOrder = async (orderId) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:4000/confirmorder/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message || "Đã xác nhận đơn hàng");
        setSelectedOrder(null);
        fetchData("all");
        fetchData("pending");
        fetchData("confirmed");
      } else {
        console.error("Lỗi khi xác nhận đơn hàng:", data.message);
        alert(`Lỗi khi xác nhận đơn hàng: ${data.message}`);
      }
    } catch (error) {
      console.error("Lỗi khi xác nhận đơn hàng:", error);
      alert("Có lỗi xảy ra khi xác nhận đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:4000/completeorder/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.success) {
        alert("Đã hoàn thành đơn hàng");
        setSelectedOrder(null);
        fetchData("all");
        fetchData("pending");
        fetchData("confirmed");
        fetchData("completed");
      } else {
        console.error("Error completing order:", data.message);
        alert(`Lỗi khi hoàn thành đơn hàng: ${data.message}`);
      }
    } catch (error) {
      console.error("Error completing order:", error);
      alert("Có lỗi xảy ra khi hoàn thành đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    const reason = prompt("Vui lòng nhập lý do hủy đơn hàng:");
    if (reason) {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:4000/cancelorder/${orderId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cancellationReason: reason.trim() }),
        });
        const data = await response.json();
        if (data.success) {
          alert("Đơn hàng hủy thành công");
          setSelectedOrder(null);
          fetchData("all");
          fetchData("pending");
          fetchData("canceled");
        } else {
          console.error("Error canceling order:", data.message);
          alert(`Lỗi khi hủy đơn hàng: ${data.message}`);
        }
      } catch (error) {
        console.error("Error canceling order:", error);
        alert("Có lỗi xảy ra khi hủy đơn hàng");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDownloadPDF = (order) => {
    const doc = new jsPDF();
    doc.addFileToVFS("Roboto-Regular.ttf", robotoFont);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto");

    doc.setFontSize(16);
    doc.text("HÓA ĐƠN ĐƠN HÀNG", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Mã đơn: ${order._id}`, 14, 40);
    if (order.isDirect) {
      doc.text(`Loại đơn: Đơn hàng trực tiếp tại cửa hàng`, 14, 50);
      doc.text(`Ngày đặt: ${formatDate(order.orderDate || order.createdAt)}`, 14, 60);
    } else {
      doc.text(`Người mua: ${order.userId?.name || "N/A"}`, 14, 50);
      doc.text(`Số điện thoại: ${order.userId?.phone || "N/A"}`, 14, 60);
      doc.text(`Địa chỉ: ${order.shippingAddress?.street || "N/A"}`, 14, 70);
      doc.text(`Ngày đặt: ${formatDate(order.createdAt)}`, 14, 80);
      doc.text(`Ngày xác nhận: ${formatDate(order.confirmedAt)}`, 14, 90);
      doc.text(`Ngày hoàn thành: ${formatDate(order.completionDate)}`, 14, 100);
      if (order.cancellationDate) doc.text(`Ngày hủy: ${formatDate(order.cancellationDate)}`, 14, 110);
      if (order.cancelReason) doc.text(`Lý do hủy: ${order.cancelReason}`, 14, 120);
    }

    let startY = order.isDirect ? 70 : order.cancelReason ? 130 : order.cancellationDate ? 120 : 110;

    doc.text("Sản phẩm", 14, startY);
    doc.text("Size & SL", 80, startY);
    doc.text("Giá", 120, startY, { align: "right" });
    doc.text("Tổng", 180, startY, { align: "right" });
    startY += 5;
    doc.line(14, startY, 196, startY);
    startY += 5;

    order.items.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      doc.text(item.name || "Sản phẩm không xác định", 14, startY, { maxWidth: 60 });
      doc.text(`${item.size || ""} - ${item.quantity || 0}`, 80, startY);
      doc.text(formatPrice(item.price || 0), 120, startY, { align: "right" });
      doc.text(formatPrice(itemTotal), 180, startY, { align: "right" });
      startY += 10;
    });

    startY += 5;
    doc.line(14, startY, 196, startY);
    startY += 10;
    doc.text(`Tổng: ${formatPrice(order.totalAmount)}`, 180, startY, { align: "right" });
    startY += 20;
    doc.text("Cảm ơn quý khách!", 105, startY, { align: "center" });

    doc.save(`Invoice_${order._id}.pdf`);
  };

  let ordersToDisplay = [];
  if (currentTab === "all") ordersToDisplay = allOrders;
  else if (currentTab === "pending") ordersToDisplay = pendingOrders;
  else if (currentTab === "confirmed") ordersToDisplay = confirmedOrders;
  else if (currentTab === "completed") ordersToDisplay = completedOrders;
  else if (currentTab === "canceled") ordersToDisplay = canceledOrders;
  else if (currentTab === "direct") ordersToDisplay = directOrders;

  ordersToDisplay = [...ordersToDisplay].sort((a, b) => {
    if (sortBy === "date-desc") {
      return new Date(b.createdAt || b.orderDate) - new Date(a.createdAt || a.orderDate);
    } else if (sortBy === "date-asc") {
      return new Date(a.createdAt || a.orderDate) - new Date(b.createdAt || a.orderDate);
    } else if (sortBy === "price-desc") {
      return b.totalAmount - a.totalAmount;
    } else if (sortBy === "price-asc") {
      return a.totalAmount - b.totalAmount;
    }
    return 0;
  });

  if (loading) {
    return <div className="loading">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="all-orders">
      <h2 className="allorders-title">Quản Lý Đơn Hàng</h2>
      <div className="tabs">
        <button onClick={() => setCurrentTab("all")} className={currentTab === "all" ? "active" : ""}>
          Tất Cả Đơn Hàng
        </button>
        <div className="tab-wrapper">
          <button onClick={() => setCurrentTab("pending")} className={currentTab === "pending" ? "active" : ""}>
            Đang Chờ
          </button>
          {countPendingOrders() > 0 && <span className="order-count">{countPendingOrders()}</span>}
        </div>
        <div className="tab-wrapper">
          <button onClick={() => setCurrentTab("confirmed")} className={currentTab === "confirmed" ? "active" : ""}>
            Đã Xác Nhận
          </button>
          {countConfirmedOrders() > 0 && <span className="order-count">{countConfirmedOrders()}</span>}
        </div>
        <button onClick={() => setCurrentTab("completed")} className={currentTab === "completed" ? "active" : ""}>
          Hoàn Thành
        </button>
        <button onClick={() => setCurrentTab("canceled")} className={currentTab === "canceled" ? "active" : ""}>
          Đã Hủy
        </button>
        <button onClick={() => setCurrentTab("direct")} className={currentTab === "direct" ? "active" : ""}>
          Đơn Hàng Trực Tiếp
        </button>
      </div>

      <div className="sort-buttons">
        <button
          onClick={() => handleSort(sortBy === "date-desc" ? "date-asc" : "date-desc")}
          className={sortBy.startsWith("date") ? "active" : ""}
        >
          Sắp xếp theo thời gian {sortBy === "date-desc" ? "▼" : sortBy === "date-asc" ? "▲" : ""}
        </button>
        <button
          onClick={() => handleSort(sortBy === "price-desc" ? "price-asc" : "price-desc")}
          className={sortBy.startsWith("price") ? "active" : ""}
        >
          Sắp xếp theo giá {sortBy === "price-desc" ? "▼" : sortBy === "price-asc" ? "▲" : ""}
        </button>
      </div>

      <div className="orders-grid">
        {ordersToDisplay.length > 0 ? (
          ordersToDisplay.map((order) => (
            <div key={order._id} className="order-card" onClick={() => setSelectedOrder(order)}>
              <div className="order-summary">
                <p>
                  <strong>Mã đơn:</strong> {order._id.slice(0, 10)}...
                </p>
                {order.isDirect ? (
                  <>
                    <p>
                      <strong>Loại đơn:</strong> Trực tiếp tại cửa hàng
                    </p>
                    <p>
                      <strong>Tổng tiền:</strong> {formatPrice(order.totalAmount)}
                    </p>
                    <p>
                      <strong>Trạng thái:</strong>{" "}
                      <span className={`status-label ${order.status}`}>
                        {translateStatus(order.status)}
                      </span>
                    </p>
                    <p>
                      <strong>Ngày đặt:</strong> {formatDate(order.orderDate || order.createdAt)}
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      <strong>Người mua:</strong> {order.userId?.name || "N/A"}
                    </p>
                    <p>
                      <strong>Số điện thoại:</strong> {order.userId?.phone || "N/A"}
                    </p>
                    <p>
                      <strong>Địa chỉ:</strong> {order.shippingAddress?.street || "N/A"}
                    </p>
                    <p>
                      <strong>Tổng tiền:</strong> {formatPrice(order.totalAmount)}
                    </p>
                    <p>
                      <strong>Trạng thái:</strong>{" "}
                      <span className={`status-label ${order.status}`}>
                        {translateStatus(order.status)}
                      </span>
                    </p>
                    <p>
                      <strong>Ngày đặt:</strong> {formatDate(order.createdAt)}
                    </p>
                    <p>
                      <strong>Ngày xác nhận:</strong> {formatDate(order.confirmedAt)}
                    </p>
                    <p>
                      <strong>Ngày hoàn thành:</strong> {formatDate(order.completionDate)}
                    </p>
                    {order.cancellationDate && (
                      <p>
                        <strong>Ngày hủy:</strong> {formatDate(order.cancellationDate)}
                      </p>
                    )}
                    {order.cancelReason && (
                      <p>
                        <strong>Lý do hủy:</strong> {order.cancelReason}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="empty-text">Không có đơn hàng nào.</p>
        )}
      </div>

      {selectedOrder && (
        <div className="order-overlay active">
          <div className="order-overlay-content">
            <button className="close-btn" onClick={() => setSelectedOrder(null)}>
              Đóng
            </button>
            <h3>Mã đơn: {selectedOrder._id}</h3>
            {selectedOrder.isDirect ? (
              <>
                <p className="highlight-date">
                  Ngày đặt: <strong>{formatDate(selectedOrder.orderDate || selectedOrder.createdAt)}</strong>
                </p>
                <p>Loại đơn: Đơn hàng trực tiếp tại cửa hàng</p>
                <p>
                  Trạng thái:{" "}
                  <span className={`status-label ${selectedOrder.status}`}>
                    {translateStatus(selectedOrder.status)}
                  </span>
                </p>
              </>
            ) : (
              <>
                <p className="highlight-date">
                  Ngày đặt: <strong>{formatDate(selectedOrder.createdAt)}</strong>
                </p>
                <p>
                  Ngày xác nhận: <strong>{formatDate(selectedOrder.confirmedAt)}</strong>
                </p>
                <p>
                  Ngày hoàn thành: <strong>{formatDate(selectedOrder.completionDate)}</strong>
                </p>
                {selectedOrder.cancellationDate && (
                  <p>
                    Ngày hủy: <strong>{formatDate(selectedOrder.cancellationDate)}</strong>
                  </p>
                )}
                {selectedOrder.cancelReason && (
                  <p>
                    Lý do hủy: <strong>{selectedOrder.cancelReason}</strong>
                  </p>
                )}
                <p>
                  Trạng thái:{" "}
                  <span className={`status-label ${selectedOrder.status}`}>
                    {translateStatus(selectedOrder.status)}
                  </span>
                </p>
                <p>Người mua: {selectedOrder.userId?.name || "N/A"}</p>
                <p>Số điện thoại: {selectedOrder.userId?.phone || "N/A"}</p>
                <p>Địa chỉ: {selectedOrder.shippingAddress?.street || "N/A"}</p>
              </>
            )}
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
                {selectedOrder.items.map((item, idx) => {
                  const itemTotal = item.price * item.quantity;
                  return (
                    <tr key={idx}>
                      <td>{item.name || "Sản phẩm không xác định"}</td>
                      <td>
                        <td>
                          <img
                            className="product-image"
                            src={
                              item.image ||
                              item.productId?.image ||
                              "http://localhost:4000/uploads/no-image.png"
                            }
                            alt={item.name || item.productId?.name || "Image"}
                            onError={(e) => {
                              e.target.src = "http://localhost:4000/uploads/no-image.png";
                            }}
                          />
                        </td>
                      </td>
                      <td>
                        {item.size || ""} - {item.quantity || 0}
                      </td>
                      <td>{formatPrice(item.price || 0)}</td>
                      <td>{formatPrice(itemTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="order-total">
              <strong>Tổng: {formatPrice(selectedOrder.totalAmount)}</strong>
            </div>

            <div className="order-actions">
              {(!selectedOrder.isDirect && (currentTab === "all" || currentTab === "pending") && selectedOrder.status === "pending") && (
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
              {(!selectedOrder.isDirect && (currentTab === "all" || currentTab === "confirmed") && selectedOrder.status === "confirmed") && (
                <button
                  className="complete-btn"
                  onClick={() => handleCompleteOrder(selectedOrder._id)}
                  disabled={loading}
                >
                  {loading ? "Đang xử lý..." : "Hoàn thành"}
                </button>
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

export default AllOrders;
import React, { useEffect, useState } from "react";
import './OrderItem.css';

const formatPrice = (price) => {
  return Number(price || 0).toLocaleString("vi-VN") + " VND";
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "Đang chờ" : date.toLocaleString("vi-VN");
};

const translateStatus = (status) => {
  switch (status) {
    case "pending": return "Đang chờ";
    case "confirmed": return "Đã xác nhận";
    case "completed": return "Đã hoàn thành";
    case "canceled": return "Đã hủy";
    default: return "Không xác định";
  }
};

const OrderItem = () => {
  const [currentTab, setCurrentTab] = useState("all"); // Mặc định là tab "Tất cả"
  const [allOrders, setAllOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [confirmedOrders, setConfirmedOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [canceledOrders, setCanceledOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("date-desc");

  useEffect(() => {
    const fetchOrders = async () => {
      if (!localStorage.getItem('auth-token')) {
        setError("Vui lòng đăng nhập để xem đơn hàng.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);

        // Lấy tất cả đơn hàng
        const allResponse = await fetch('http://localhost:4000/getmyorders', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'auth-token': localStorage.getItem('auth-token'),
            'Content-Type': 'application/json',
          },
        });
        if (!allResponse.ok) throw new Error(`HTTP error! Status: ${allResponse.status}`);
        const allData = await allResponse.json();
        if (allData.success) {
          setAllOrders(allData.orders || []);
        } else {
          setError(allData.message || "Không thể tải danh sách đơn hàng");
        }

        // Lấy đơn hàng pending
        const pendingResponse = await fetch('http://localhost:4000/getpendingorders', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'auth-token': localStorage.getItem('auth-token'),
            'Content-Type': 'application/json',
          },
        });
        if (!pendingResponse.ok) throw new Error(`HTTP error! Status: ${pendingResponse.status}`);
        const pendingData = await pendingResponse.json();
        if (pendingData.success) {
          setPendingOrders(pendingData.orders || []);
        } else {
          setError(pendingData.message || "Không thể tải đơn hàng đang chờ");
        }

        // Lấy đơn hàng confirmed
        const confirmedResponse = await fetch('http://localhost:4000/getconfirmedorders', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'auth-token': localStorage.getItem('auth-token'),
            'Content-Type': 'application/json',
          },
        });
        if (!confirmedResponse.ok) throw new Error(`HTTP error! Status: ${confirmedResponse.status}`);
        const confirmedData = await confirmedResponse.json();
        if (confirmedData.success) {
          setConfirmedOrders(confirmedData.orders || []);
        } else {
          setError(confirmedData.message || "Không thể tải đơn hàng đã xác nhận");
        }

        // Lấy đơn hàng completed
        const completedResponse = await fetch('http://localhost:4000/getmycompletedorders', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'auth-token': localStorage.getItem('auth-token'),
            'Content-Type': 'application/json',
          },
        });
        if (!completedResponse.ok) throw new Error(`HTTP error! Status: ${completedResponse.status}`);
        const completedData = await completedResponse.json();
        if (completedData.success) {
          setCompletedOrders(completedData.orders || []);
        } else {
          setError(completedData.message || "Không thể tải đơn hàng hoàn thành");
        }

        // Lấy đơn hàng canceled
        const canceledResponse = await fetch('http://localhost:4000/getmycanceledorders', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'auth-token': localStorage.getItem('auth-token'),
            'Content-Type': 'application/json',
          },
        });
        if (!canceledResponse.ok) throw new Error(`HTTP error! Status: ${canceledResponse.status}`);
        const canceledData = await canceledResponse.json();
        if (canceledData.success) {
          setCanceledOrders(canceledData.orders || []);
        } else {
          setError(canceledData.message || "Không thể tải đơn hàng bị hủy");
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        setError("Không thể kết nối đến server. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleSort = (sortType) => {
    setSortBy(sortType);
    const sortOrders = (orders) => {
      const sorted = [...orders];
      if (sortType === "date-desc") {
        return sorted.sort((a, b) => new Date(b.createdAt || b.orderDate) - new Date(a.createdAt || a.orderDate));
      } else if (sortType === "date-asc") {
        return sorted.sort((a, b) => new Date(a.createdAt || a.orderDate) - new Date(b.createdAt || b.orderDate));
      } else if (sortType === "price-desc") {
        return sorted.sort((a, b) => b.totalAmount - a.totalAmount);
      } else if (sortType === "price-asc") {
        return sorted.sort((a, b) => a.totalAmount - b.totalAmount);
      }
      return sorted;
    };

    setAllOrders(sortOrders(allOrders));
    setPendingOrders(sortOrders(pendingOrders));
    setConfirmedOrders(sortOrders(confirmedOrders));
    setCompletedOrders(sortOrders(completedOrders));
    setCanceledOrders(sortOrders(canceledOrders));
  };

  const cancelOrder = async (orderId) => {
    const reason = prompt("Vui lòng nhập lý do hủy đơn hàng:");
    if (!reason) return;

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:4000/cancelorder/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': localStorage.getItem('auth-token'),
        },
        body: JSON.stringify({ cancellationReason: reason }),
      });
      const data = await response.json();
      if (data.success) {
        alert("Đơn hàng đã được hủy thành công.");
        setAllOrders((prev) => prev.filter((order) => order._id !== orderId));
        setPendingOrders((prev) => prev.filter((order) => order._id !== orderId));
        setCanceledOrders((prev) => [...prev, { ...data.order, cancelReason: reason }]);
      } else {
        alert(data.message || "Không thể hủy đơn hàng.");
      }
    } catch (error) {
      console.error("Lỗi khi hủy đơn hàng:", error);
      alert("Có lỗi xảy ra khi hủy đơn hàng.");
    } finally {
      setLoading(false);
    }
  };

  const getOrdersForTab = () => {
    switch (currentTab) {
      case "all": return allOrders;
      case "pending": return pendingOrders;
      case "confirmed": return confirmedOrders;
      case "completed": return completedOrders;
      case "canceled": return canceledOrders;
      default: return [];
    }
  };

  if (error) return <div className="error">{error}</div>;

  return (
    <div className="orderitem">
      <div className="orderitem-tabs">
        <button
          className={currentTab === "all" ? "active" : ""}
          onClick={() => setCurrentTab("all")}
        >
          Tất cả ({allOrders.length})
        </button>
        <button
          className={currentTab === "pending" ? "active" : ""}
          onClick={() => setCurrentTab("pending")}
        >
          Đang chờ ({pendingOrders.length})
        </button>
        <button
          className={currentTab === "confirmed" ? "active" : ""}
          onClick={() => setCurrentTab("confirmed")}
        >
          Đã xác nhận ({confirmedOrders.length})
        </button>
        <button
          className={currentTab === "completed" ? "active" : ""}
          onClick={() => setCurrentTab("completed")}
        >
          Đã hoàn thành ({completedOrders.length})
        </button>
        <button
          className={currentTab === "canceled" ? "active" : ""}
          onClick={() => setCurrentTab("canceled")}
        >
          Đã hủy ({canceledOrders.length})
        </button>
      </div>

      <div className="sort-section">
        <label>Sắp xếp theo:</label>
        <select value={sortBy} onChange={(e) => handleSort(e.target.value)}>
          <option value="date-desc">Mới nhất</option>
          <option value="date-asc">Cũ nhất</option>
          <option value="price-desc">Giá cao đến thấp</option>
          <option value="price-asc">Giá thấp đến cao</option>
        </select>
      </div>

      <div className="orderitem-list">
        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : getOrdersForTab().length > 0 ? (
          getOrdersForTab().map((order) => (
            <div key={order._id} className="orderitem-card" onClick={() => setSelectedOrder(order)}>
              <h3>Mã đơn: {order._id}</h3>
              <p>Ngày đặt: {formatDate(order.createdAt || order.orderDate)}</p>
              <p>Tổng: {formatPrice(order.totalAmount)}</p>
              <p className={`status-label ${order.status}`}>
                {translateStatus(order.status)}
              </p>
            </div>
          ))
        ) : (
          <p className="empty-text">Không có đơn hàng nào trong mục này.</p>
        )}
      </div>

      {selectedOrder && (
        <div className="order-overlay active">
          <div className="order-overlay-content">
            <button className="close-btn" onClick={() => setSelectedOrder(null)}>
              Đóng
            </button>
            <h3>Mã đơn: {selectedOrder._id}</h3>
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
            <p>
              Địa chỉ:{" "}
              {selectedOrder.shippingAddress?.fullAddress ||
                (selectedOrder.shippingAddress?.street && selectedOrder.shippingAddress?.ward && selectedOrder.shippingAddress?.city
                  ? `${selectedOrder.shippingAddress.street}, ${selectedOrder.shippingAddress.ward}, ${selectedOrder.shippingAddress.city}`
                  : selectedOrder.shippingAddress?.street || "N/A")}
            </p>
            <p>Số điện thoại giao hàng: {selectedOrder.shippingAddress?.phone || "N/A"}</p>
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
                        <img
                          className="product-image"
                          src={item.productId?.image || "placeholder.jpg"}
                          alt={item.name}
                        />
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
              {selectedOrder.status === "pending" && (
                <button
                  className="cancel-btn"
                  onClick={() => cancelOrder(selectedOrder._id)}
                  disabled={loading}
                >
                  {loading ? "Đang xử lý..." : "Hủy đơn"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderItem;
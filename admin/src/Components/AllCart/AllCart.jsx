/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useRef } from "react";
import PropTypes from 'prop-types';
import cross_icon from "../../assets/cross_icon.png";
import './AllCart.css';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

// Hàm formatPrice
const formatPrice = (price) => {
  return price ? price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "Chưa có giá";
};

// Hàm tính thời gian trong giỏ
const calculateTimeInCart = (addedAt) => {
  const now = new Date();
  const added = new Date(addedAt);
  const diff = Math.floor((now - added) / (1000 * 60 * 60)); // hours
  return diff > 24 ? `${Math.floor(diff / 24)} ngày` : `${diff} giờ`;
};

// Component CartCard
const CartCard = ({ userCart, openCartModal, userSuggestions }) => (
  <div className="cart-card" onClick={() => openCartModal(userCart)}>
    <h3>{userCart.userName}</h3>
    <p>Địa chỉ: <span>{userCart.address}</span></p>
    <p>Số điện thoại: <span>{userCart.phone || 'Chưa có số điện thoại'}</span></p>
    <p>Tổng số lượng sản phẩm: <span>{userCart.cartData.reduce((sum, item) => sum + item.quantity, 0)}</span></p>
    <h4 className="suggestions-title">Sản phẩm gợi ý:</h4>
    <ul className="suggestions-list">
      {(userSuggestions[userCart.userId]?.products || []).map((prod, idx) => (
        <li key={idx} className="suggestion-item">
          {prod.name} - {formatPrice(prod.sellingPrice || prod.priceImport * 1.2)} VND
          <span className="product-details">
            (Danh mục: {prod.category}, Chất liệu: {prod.material || 'N/A'}, 
            Màu: {prod.color || 'N/A'}, Size: {prod.sizes?.map(s => s.size || s).join(', ') || 'N/A'})
          </span>
        </li>
      ))}
      {(!userSuggestions[userCart.userId]?.products || userSuggestions[userCart.userId]?.products.length === 0) && (
        <span className="no-suggestions">
          {userSuggestions[userCart.userId]?.message || 
           "Chưa có gợi ý (có thể do kho hàng trống hoặc không có sản phẩm phù hợp)"}
        </span>
      )}
    </ul>
  </div>
);

// PropTypes cho CartCard
CartCard.propTypes = {
  userCart: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    userName: PropTypes.string.isRequired,
    address: PropTypes.string,
    phone: PropTypes.string,
    cartData: PropTypes.arrayOf(
      PropTypes.shape({
        productId: PropTypes.string.isRequired,
        quantity: PropTypes.number.isRequired,
        size: PropTypes.string,
        productName: PropTypes.string.isRequired,
        image: PropTypes.string,
        category: PropTypes.string,
        priceImport: PropTypes.number,
        material: PropTypes.string,
        color: PropTypes.string,
        addedAt: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
  openCartModal: PropTypes.func.isRequired,
  userSuggestions: PropTypes.objectOf(
    PropTypes.shape({
      success: PropTypes.bool,
      message: PropTypes.string,
      products: PropTypes.arrayOf(
        PropTypes.shape({
          _id: PropTypes.string.isRequired,
          name: PropTypes.string.isRequired,
          category: PropTypes.string,
          material: PropTypes.string,
          color: PropTypes.string,
          sizes: PropTypes.arrayOf(
            PropTypes.oneOfType([
              PropTypes.string,
              PropTypes.shape({ size: PropTypes.string })
            ])
          ),
          sellingPrice: PropTypes.number,
          priceImport: PropTypes.number.isRequired,
        })
      )
    })
  ).isRequired,
};

// Component CartModal
const CartModal = ({ selectedUserCart, closeCartModal, removeFromCart, sendReminder, calculateDisplayPrice, getInventoryByProductId }) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <button className="modal-close-button" onClick={closeCartModal}>
        <img src={cross_icon} alt="Close" className="close-icon" />
      </button>
      <h2 className="allcart-title">Giỏ Hàng của {selectedUserCart.userName}</h2>
      <table className="cart-table">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>Size</th>
            <th>Số lượng</th>
            <th>Hình ảnh</th>
            <th>Giá bán</th>
            <th>Danh mục</th>
            <th>Thời gian trong giỏ</th>
            <th>Xóa</th>
          </tr>
        </thead>
        <tbody>
          {selectedUserCart.cartData.map((item, itemIndex) => (
            <tr key={itemIndex}>
              <td>{item.productName}</td>
              <td>{item.size}</td>
              <td>{item.quantity}</td>
              <td>
                <img src={item.image} alt={item.productName} className="product-image" />
              </td>
              <td>{formatPrice(calculateDisplayPrice(item, getInventoryByProductId(item.productId)))} VND</td>
              <td>{item.category}</td>
              <td>{calculateTimeInCart(item.addedAt)}</td>
              <td>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromCart(selectedUserCart.userId, item.productId, item.size);
                  }}
                  className="delete-button"
                >
                  <img src={cross_icon} alt="Delete" className="delete-icon" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={(e) => {
          e.stopPropagation();
          sendReminder(selectedUserCart.userId);
        }}
        className="reminder-button"
      >
        Gửi nhắc nhở
      </button>
    </div>
  </div>
);

// PropTypes cho CartModal
CartModal.propTypes = {
  selectedUserCart: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    userName: PropTypes.string.isRequired,
    cartData: PropTypes.arrayOf(
      PropTypes.shape({
        productId: PropTypes.string.isRequired,
        productName: PropTypes.string.isRequired,
        size: PropTypes.string,
        quantity: PropTypes.number.isRequired,
        image: PropTypes.string,
        category: PropTypes.string,
        priceImport: PropTypes.number,
        material: PropTypes.string,
        color: PropTypes.string,
        addedAt: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
  closeCartModal: PropTypes.func.isRequired,
  removeFromCart: PropTypes.func.isRequired,
  sendReminder: PropTypes.func.isRequired,
  calculateDisplayPrice: PropTypes.func.isRequired,
  getInventoryByProductId: PropTypes.func.isRequired,
};

const AllCart = () => {
  const [allCarts, setAllCarts] = useState([]);
  const [allInventories, setAllInventories] = useState([]);
  const [stats, setStats] = useState({ totalCarts: 0, totalOrders: 0, abandonedCartRate: 0 });
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [productQuantityChartData, setProductQuantityChartData] = useState({ labels: [], datasets: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('user');
  const [userSuggestions, setUserSuggestions] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStatsVisible, setIsStatsVisible] = useState(true);
  const [selectedUserCart, setSelectedUserCart] = useState(null);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const chartRef = useRef(null);
  const productQuantityChartRef = useRef(null);
  const debounceTimeout = useRef(null);

  // Toggle stats visibility
  const toggleStats = () => {
    setIsStatsVisible(!isStatsVisible);
  };

  // Open modal with user cart details
  const openCartModal = (userCart) => {
    setSelectedUserCart(userCart);
  };

  // Close modal
  const closeCartModal = () => {
    setSelectedUserCart(null);
  };

  // Fetch search suggestions
  const fetchSearchSuggestions = async (term) => {
    if (!term) {
      setSearchSuggestions([]);
      return;
    }
    try {
      setSearchLoading(true);
      const response = await fetch(`http://localhost:4000/search-suggestions?term=${encodeURIComponent(term)}&type=${filterType}`);
      const data = await response.json();
      if (data.success) {
        setSearchSuggestions(data.suggestions.slice(0, 5)); // Giới hạn 5 gợi ý
      } else {
        setSearchSuggestions([]);
      }
    } catch (err) {
      console.error("Lỗi khi lấy gợi ý tìm kiếm:", err);
      setSearchSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      fetchSearchSuggestions(term);
    }, 300); // Debounce 300ms
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion);
    setSearchSuggestions([]);
  };

  // Fetch all data
  const fetchInfo = async () => {
    try {
      setLoading(true);
      const [cartsRes, inventoriesRes, statsRes, chartRes, productQuantityRes] = await Promise.all([
        fetch('http://localhost:4000/getallcarts').then(res => res.json()),
        fetch('http://localhost:4000/getinventory').then(res => res.json()),
        fetch('http://localhost:4000/cart-stats').then(res => res.json()),
        fetch('http://localhost:4000/cart-count-by-category').then(res => res.json()),
        fetch('http://localhost:4000/cart-products-by-quantity').then(res => res.json()),
      ]);

      setAllCarts(cartsRes.carts || []);
      setAllInventories(inventoriesRes.inventory || []);
      setStats(statsRes);
      setChartData({
        labels: chartRes.data.map(d => d.category),
        datasets: [{
          label: 'Số lượng sản phẩm trong giỏ',
          data: chartRes.data.map(d => d.count),
          backgroundColor: chartRes.data.map(d => {
            if (d.category === 'Nam') return 'rgba(75, 192, 192, 0.6)';
            if (d.category === 'Nữ') return 'rgba(219, 39, 119, 0.6)';
            if (d.category === 'Trẻ em') return 'rgba(234, 179, 8, 0.6)';
            return 'rgba(128, 128, 128, 0.6)';
          }),
          borderColor: chartRes.data.map(d => {
            if (d.category === 'Nam') return 'rgba(75, 192, 192, 1)';
            if (d.category === 'Nữ') return 'rgba(219, 39, 119, 1)';
            if (d.category === 'Trẻ em') return 'rgba(234, 179, 8, 1)';
            return 'rgba(128, 128, 128, 1)';
          }),
          borderWidth: 1,
        }],
      });
      setProductQuantityChartData({
        labels: productQuantityRes.data.map(d => d.productName),
        datasets: [{
          label: 'Tổng số lượng trong giỏ',
          data: productQuantityRes.data.map(d => d.totalQuantity),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 0,
        }],
      });
      setError(null);
    } catch (err) {
      setError(`Không thể lấy dữ liệu: ${err.message}`);
      setAllCarts([]);
      setAllInventories([]);
      setStats({ totalCarts: 0, totalOrders: 0, abandonedCartRate: 0 });
      setChartData({ labels: [], datasets: [] });
      setProductQuantityChartData({ labels: [], datasets: [] });
    } finally {
      setLoading(false);
    }
  };

  // Fetch user-specific product suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      const suggestions = {};
      for (const userCart of allCarts) {
        try {
          const res = await fetch('http://localhost:4000/suggest-products-for-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userCart.userId }),
          });
          const data = await res.json();
          suggestions[userCart.userId] = data;
        } catch (err) {
          console.error(`Lỗi gợi ý sản phẩm cho user ${userCart.userId}:`, err);
          suggestions[userCart.userId] = { products: [], message: "Lỗi khi lấy gợi ý" };
        }
      }
      setUserSuggestions(suggestions);
    };

    if (allCarts.length > 0) {
      fetchSuggestions();
    }
  }, [allCarts]);

  // Initialize Chart.js for category chart
  useEffect(() => {
    let chartInstance = null;
    if (chartRef.current && chartData.labels.length > 0) {
      const ctx = chartRef.current.getContext('2d');
      chartInstance = new ChartJS(ctx, {
        type: 'pie',
        data: chartData,
        options: {
          responsive: true,
          plugins: {
            legend: { display: true, position: 'top' },
            title: { display: true, text: 'Phân Phối Sản Phẩm Trong Giỏ Theo Danh Mục', font: { size: 14 } },
            tooltip: {
              backgroundColor: '#333',
              titleColor: '#fff',
              bodyColor: '#fff',
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                  const percentage = ((context.raw / total) * 100).toFixed(1);
                  return `${context.label}: ${context.raw} (${percentage}%)`;
                },
              },
            },
          },
        },
      });
    }
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [chartData]);

  // Initialize Chart.js for product quantity chart
  useEffect(() => {
    let chartInstance = null;
    if (productQuantityChartRef.current && productQuantityChartData.labels.length > 0) {
      const ctx = productQuantityChartRef.current.getContext('2d');
      chartInstance = new ChartJS(ctx, {
        type: 'bar',
        data: productQuantityChartData,
        options: {
          responsive: true,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Sản Phẩm Trong Giỏ Theo Số Lượng', font: { size: 14 } },
            tooltip: {
              backgroundColor: '#333',
              titleColor: '#fff',
              bodyColor: '#fff',
              callbacks: {
                label: function(context) {
                  return `${context.label}: ${context.raw}`;
                },
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              title: { display: true, text: 'Tổng số lượng' },
            },
            y: {
              title: { display: false },
              ticks: {
                padding: 10,
              },
            },
          },
        },
      });
    }
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [productQuantityChartData]);

  useEffect(() => {
    fetchInfo();
  }, []);

  // Send reminder email
  const sendReminder = async (userId) => {
    try {
      const res = await fetch('http://localhost:4000/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Email nhắc nhở đã gửi thành công!");
      } else {
        alert("Lỗi khi gửi email: " + data.message);
      }
    } catch (err) {
      alert("Lỗi server khi gửi email: " + err.message);
    }
  };

  // Remove from cart
  const removeFromCart = async (userId, productId, size) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?")) {
      try {
        const res = await fetch(`http://localhost:4000/removefromcart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, productId, size }),
        });
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data = await res.json();
        if (data.success) {
          alert("Xóa sản phẩm thành công!");
          await fetchInfo();
          if (selectedUserCart && selectedUserCart.userId === userId) {
            const updatedCart = allCarts.find(cart => cart.userId === userId);
            if (updatedCart) {
              setSelectedUserCart(updatedCart);
            } else {
              setSelectedUserCart(null);
            }
          }
        } else {
          alert("Lỗi khi xóa sản phẩm: " + data.message);
        }
      } catch (err) {
        alert("Lỗi server khi xóa sản phẩm: " + err.message);
        console.error("Lỗi xóa sản phẩm:", err);
      }
    }
  };

  const getInventoryByProductId = (productId) => {
    const inventory = allInventories.find(inv =>
      inv.product && (inv.product._id ? inv.product._id.toString() : inv.product.toString()) === productId.toString()
    );
    return inventory;
  };

  const calculateDisplayPrice = (cartItem, inventory) => {
    const safeSellingPrice = Number(inventory?.sellingPrice) || 0;
    const safeImportPrice = Number(cartItem?.priceImport || inventory?.warehousePrice) || 0;
    return safeSellingPrice || (safeImportPrice * 1.2);
  };

  const filteredCarts = allCarts.filter(userCart => {
    if (!searchTerm) return true;
    if (filterType === 'user') return userCart.userName.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType === 'product') return userCart.cartData.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterType === 'value') {
      const totalValue = userCart.cartData.reduce((sum, item) => {
        const inventory = getInventoryByProductId(item.productId);
        const price = calculateDisplayPrice(item, inventory);
        return sum + price * item.quantity;
      }, 0);
      return totalValue >= Number(searchTerm);
    }
    return true;
  });

  if (loading) {
    return <div className="all-cart">Đang tải dữ liệu...</div>;
  }

  if (error) {
    return <div className="all-cart error">{error}</div>;
  }

  return (
    <div className="all-cart-container">
      <div className="header-section">
        <h2 className="allcart-title">Danh Sách Giỏ Hàng</h2>
        <button className="toggle-stats-button" onClick={toggleStats}>
          {isStatsVisible ? 'Ẩn Thống Kê' : 'Hiện Thống Kê'}
        </button>
      </div>
      <div className="filter-container">
        <div className="search-wrapper">
          {searchLoading && <span className="search-loading">Đang tìm...</span>}
          {searchSuggestions.length > 0 && (
            <ul className="search-suggestions">
              {searchSuggestions.map((suggestion, idx) => (
                <li
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="search-suggestion-item"
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
          <option value="user">Theo người dùng</option>
          <option value="product">Theo sản phẩm</option>
          <option value="value">Theo giá trị (lớn hơn hoặc bằng)</option>
        </select>
      </div>
      <div className="cards-section">
        <div className="cards-grid">
          {filteredCarts.map((userCart, index) => (
            <CartCard
              key={index}
              userCart={userCart}
              openCartModal={openCartModal}
              userSuggestions={userSuggestions}
            />
          ))}
        </div>
        {filteredCarts.length === 0 && (
          <p className="no-carts">Không có giỏ hàng nào phù hợp.</p>
        )}
      </div>
      <div className={`stats-section ${!isStatsVisible ? 'hidden' : ''}`}>
        <h2 className="stats-title">Thống Kê Giỏ Hàng</h2>
        <div className="stats-container">
          <div className="stats-card">
            <h3>Tỷ Lệ Giỏ Hàng Bị Bỏ</h3>
            <p>Tổng giỏ hàng: <span>{stats.totalCarts}</span></p>
            <p>Đơn hàng hoàn thành: <span>{stats.totalOrders}</span></p>
            <p>Tỷ lệ bỏ: <span>{stats.abandonedCartRate.toFixed(2)}%</span></p>
          </div>
          <div className="stats-card">
            <h3>Phân Phối Sản Phẩm Trong Giỏ Theo Danh Mục</h3>
            <canvas id="cartChart" ref={chartRef} className="cart-chart"></canvas>
          </div>
          <div className="stats-card">
            <h3>Sản Phẩm Trong Giỏ Theo Số Lượng</h3>
            <canvas id="productQuantityChart" ref={productQuantityChartRef} className="product-quantity-chart"></canvas>
          </div>
        </div>
      </div>
      {selectedUserCart && (
        <CartModal
          selectedUserCart={selectedUserCart}
          closeCartModal={closeCartModal}
          removeFromCart={removeFromCart}
          sendReminder={sendReminder}
          calculateDisplayPrice={calculateDisplayPrice}
          getInventoryByProductId={getInventoryByProductId}
        />
      )}
    </div>
  );
};

export default AllCart;
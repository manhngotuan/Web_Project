// CartItems.jsx
import React, { useContext, useEffect, useState } from "react";
import './CartItems.css';
import { ShopContext } from "../../Context/ShopContext";
import remove_icon from '../Assets/cart_cross_icon.png';

const formatPrice = (price) => {
  return Number(price || 0).toLocaleString("vi-VN");
};

const CartItems = () => {
  const { getTotalCartAmount, cartItems, removeFromCart, clearCart } = useContext(ShopContext);
  const [all_product, setAllProduct] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:4000/allproducts')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.success && Array.isArray(data.products)) {
          setAllProduct(data.products);
          setError(null);
        } else {
          setAllProduct([]);
          setError(data.message || "Không thể tải sản phẩm");
        }
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setAllProduct([]);
        setError("Không thể kết nối đến server. Vui lòng thử lại.");
      });
  }, []);

  const handleCheckout = async () => {
    if (!localStorage.getItem('auth-token')) {
      alert("Vui lòng đăng nhập để tiến hành thanh toán.");
      return;
    }
    const items = Object.keys(cartItems)
      .filter((itemId) => Object.values(cartItems[itemId]).some(qty => qty > 0))
      .map((itemId) => {
        return Object.keys(cartItems[itemId]).map((size) => ({
          productId: itemId,
          size,
          quantity: cartItems[itemId][size],
        }));
      })
      .flat();
    if (items.length === 0) {
      alert("Giỏ hàng trống. Vui lòng thêm sản phẩm.");
      return;
    }
    try {
      const response = await fetch('http://localhost:4000/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': localStorage.getItem('auth-token'),
        },
        body: JSON.stringify({ items }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert("Thanh toán thành công!");
        clearCart();
      } else {
        alert(data.message || "Có lỗi xảy ra trong quá trình thanh toán.");
      }
    } catch (error) {
      console.error("Error during checkout:", error);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    }
  };

  return (
    <div className="cartitems">
      {error ? (
        <p className="error">{error}</p>
      ) : (
        <>
          <div className="cartitems-format-main">
            <p>Sản phẩm</p>
            <p>Tiêu đề</p>
            <p>Giá</p>
            <p>Số lượng</p>
            <p>Tổng</p>
            <p>Hủy</p>
          </div>
          <hr />
          {all_product.map((e) => {
            if (cartItems[e._id]) {
              return Object.keys(cartItems[e._id]).map((size) => {
                if (cartItems[e._id][size] > 0) {
                  return (
                    <div key={`${e._id}-${size}`}>
                      <div className="cartitems-format cartitems-format-main">
                        <img src={e.image} alt={e.name} className="cartitems-product-icon" />
                        <p>{e.name} ({size})</p>
                        <p>{formatPrice(e.sellingPrice || e.importPrice * 1.2)}đ</p>
                        <button className="cartitems-quantity">{cartItems[e._id][size]}</button>
                        <p>{formatPrice((e.sellingPrice || e.importPrice * 1.2) * cartItems[e._id][size])}đ</p>
                        <img
                          className="cartitems-remove-icon"
                          src={remove_icon}
                          onClick={() => removeFromCart(e._id, size)}
                          alt="Xóa"
                        />
                      </div>
                      <hr />
                    </div>
                  );
                }
                return null;
              });
            }
            return null;
          })}
          <div className="cartitems-down">
            <div className="cartitems-total">
              <h1>Hóa đơn</h1>
              <div>
                <div className="cartitems-total-item">
                  <p>Tổng cộng</p>
                  <p>{formatPrice(getTotalCartAmount())}đ</p>
                </div>
                <hr />
                <div className="cartitems-total-item">
                  <p>Miễn phí vận chuyển</p>
                  <p>0đ</p>
                </div>
                <hr />
                <div className="cartitems-total-item">
                  <h3>Tổng</h3>
                  <h3>{formatPrice(getTotalCartAmount())}đ</h3>
                </div>
              </div>
              <button onClick={handleCheckout}>Thanh toán</button>
            </div>
            <div className="cartitems-promocode">
              <p>Nhập mã khuyến mãi (Nếu có)</p>
              <div className="cartitems-promobox">
                <input type="text" placeholder="Mã khuyến mãi" />
                <button>Gửi</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CartItems;
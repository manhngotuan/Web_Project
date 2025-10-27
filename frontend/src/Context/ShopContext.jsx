import React, { createContext, useEffect, useState } from "react";

export const ShopContext = createContext(null);

const getDefaultCart = () => ({});

const ShopContextProvider = (props) => {
  const [all_product, setAll_Product] = useState([]);
  const [cartItems, setCartItems] = useState(getDefaultCart());
  const [myOrders, setMyOrders] = useState([]);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:4000/allproducts');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.products)) {
        setAll_Product(data.products);
        setError(null);
      } else {
        setAll_Product([]);
        setError(data.message || "Không thể tải sản phẩm");
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setAll_Product([]);
      setError("Không thể kết nối đến server. Vui lòng thử lại.");
    }
  };

  const fetchCartData = async () => {
  if (!localStorage.getItem('auth-token')) {
    console.log('No auth token, skipping cart fetch');
    return;
  }
  try {
    const response = await fetch('http://localhost:4000/getcart', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'auth-token': localStorage.getItem('auth-token'),
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    if (data.success) {
      const cartItems = {};
      data.cartData.forEach(item => {
        if (!cartItems[item.productId]) cartItems[item.productId] = {};
        cartItems[item.productId][item.size] = item.quantity;
      });
      setCartItems(cartItems);
      setError(null);
    } else {
      setError(data.message || "Không thể tải giỏ hàng");
    }
  } catch (error) {
    console.error('Error fetching cart:', error);
    setError("Không thể tải giỏ hàng. Vui lòng thử lại.");
  }
};

  const fetchMyOrders = async () => {
    if (!localStorage.getItem('auth-token')) {
      console.log('No auth token, skipping orders fetch');
      return;
    }
    try {
      const response = await fetch('http://localhost:4000/getmyorders', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'auth-token': localStorage.getItem('auth-token'),
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setMyOrders(data.orders || []);
        setError(null);
      } else {
        setError(data.message || "Không thể tải đơn hàng");
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError("Không thể tải đơn hàng. Vui lòng thử lại.");
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCartData();
    fetchMyOrders();
  }, []);

  const addToCart = async (itemId, size) => {
    if (localStorage.getItem('auth-token')) {
      try {
        const response = await fetch('http://localhost:4000/addtocart', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'auth-token': localStorage.getItem('auth-token'),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ itemId, size }),
        });
        const data = await response.json();
        if (data.success) {
          await fetchCartData(); // Đồng bộ lại cart
        } else {
          console.error('Error adding to cart:', data.message);
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
      }
    } else {
      setCartItems((prev) => {
        const newCart = { ...prev };
        if (!newCart[itemId]) newCart[itemId] = {};
        newCart[itemId][size] = (newCart[itemId][size] || 0) + 1;
        return newCart;
      });
    }
  };

  const removeFromCart = async (itemId, size) => {
    if (localStorage.getItem('auth-token')) {
      try {
        const response = await fetch('http://localhost:4000/removefromcart', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'auth-token': localStorage.getItem('auth-token'),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ itemId, size }),
        });
        const data = await response.json();
        if (data.success) {
          await fetchCartData(); // Đồng bộ lại cart
        } else {
          console.error('Error removing from cart:', data.message);
        }
      } catch (error) {
        console.error('Error removing from cart:', error);
      }
    } else {
      setCartItems((prev) => {
        const newCart = { ...prev };
        if (newCart[itemId] && newCart[itemId][size]) {
          newCart[itemId][size] = Math.max(newCart[itemId][size] - 1, 0);
          if (newCart[itemId][size] === 0) delete newCart[itemId][size];
          if (Object.keys(newCart[itemId]).length === 0) delete newCart[itemId];
        }
        return newCart;
      });
    }
  };

  const getTotalCartAmount = () => {
    return Object.keys(cartItems).reduce((total, itemId) => {
      const itemInfo = all_product.find((product) => product._id === itemId);
      if (itemInfo) {
        Object.keys(cartItems[itemId]).forEach((size) => {
          total += (itemInfo.sellingPrice || itemInfo.importPrice * 1.2) * cartItems[itemId][size];
        });
      }
      return total;
    }, 0);
  };

  const getTotalCartItems = () => {
    return Object.values(cartItems).reduce(
      (total, sizes) => total + Object.values(sizes).reduce((sum, qty) => sum + qty, 0),
      0
    );
  };

  const clearCart = () => setCartItems(getDefaultCart());

  const checkout = async () => {
    if (!localStorage.getItem('auth-token')) {
      alert('Vui lòng đăng nhập để tiến hành thanh toán.');
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
      alert('Giỏ hàng trống. Vui lòng thêm sản phẩm.');
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
      const result = await response.json();
      if (result.success) {
        alert('Thanh toán thành công!');
        clearCart();
      } else {
        alert(result.message || 'Đã xảy ra lỗi trong quá trình thanh toán!');
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      alert('Có lỗi xảy ra trong quá trình thanh toán!');
    }
  };

  const contextValue = {
    getTotalCartItems,
    getTotalCartAmount,
    all_product,
    cartItems,
    myOrders,
    addToCart,
    removeFromCart,
    checkout,
    clearCart,
    error,
  };

  return (
    <ShopContext.Provider value={contextValue}>
      {props.children}
    </ShopContext.Provider>
  );
};

export default ShopContextProvider;
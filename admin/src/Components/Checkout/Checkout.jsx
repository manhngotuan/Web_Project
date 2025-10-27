import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import "./Checkout.css";
import cross_icon from "../../assets/cross_icon.png"; // Biểu tượng x
import robotoFont from "../Base64"; // Font hỗ trợ tiếng Việt

// Hàm formatPrice cải tiến
const formatPrice = (price) => {
  if (price === undefined || price === null || isNaN(price) || price <= 0) {
    console.warn("Invalid price:", price);
    return "0 VND";
  }
  return Number(price).toLocaleString("vi-VN") + " VND";
};

const Checkout = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [modalProduct, setModalProduct] = useState(null);
  const [modalSize, setModalSize] = useState("");
  const [modalQuantity, setModalQuantity] = useState(1);
  const [error, setError] = useState(null);

  // Lấy danh sách sản phẩm từ API
  const fetchProducts = async () => {
    try {
      const res = await fetch("http://localhost:4000/getinventory");
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.inventory)) {
        const mapped = data.inventory
          .filter((inv) => inv.product && inv.product._id) // Lọc bỏ các bản ghi có product null
          .map((inv) => ({
            _id: inv.product._id,
            name: inv.product.name || "Không xác định",
            image: inv.product.image || "https://via.placeholder.com/150?text=No+Image",
            sellingPrice: Number(inv.sellingPrice) || Number(inv.product.priceImport * 1.2) || 100000, // Fallback giá mặc định
            stock: inv.stock || [],
          }));
        console.log("Fetched products:", mapped);
        setProducts(mapped);
        setError(null);
      } else {
        setError(data.message || "Không thể tải sản phẩm");
      }
    } catch (err) {
      console.error("Lỗi khi lấy sản phẩm:", err);
      setError("Không thể kết nối đến server. Vui lòng thử lại.");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Thêm sản phẩm vào giỏ hàng
  const handleAddToCart = (product, size = null, quantity = 1) => {
    if (!product.stock || product.stock.length === 0) {
      alert("Sản phẩm này chưa có size hoặc chưa có hàng!");
      return;
    }

    if (!size) {
      setModalProduct(product);
      setModalSize(product.stock[0]?.size || "");
      setModalQuantity(1);
      return;
    }

    const stockItem = product.stock.find((s) => s.size === size);
    if (!stockItem || stockItem.quantity < quantity) {
      alert(`Không đủ hàng cho size ${size}. Tồn kho: ${stockItem?.quantity || 0}`);
      return;
    }

    setCart((prev) => {
      const exist = prev.find((item) => item._id === product._id && item.size === size);
      if (exist) {
        const newQuantity = exist.quantity + quantity;
        if (newQuantity > stockItem.quantity) {
          alert(`Số lượng vượt quá tồn kho cho size ${size}!`);
          return prev;
        }
        return prev.map((item) =>
          item._id === product._id && item.size === size
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        return [...prev, { ...product, size, quantity }];
      }
    });
  };

  // Xử lý thêm từ modal
  const handleModalAdd = () => {
    if (!modalSize || modalQuantity <= 0) {
      alert("Vui lòng chọn size và số lượng hợp lệ!");
      return;
    }
    const stockItem = modalProduct.stock.find((s) => s.size === modalSize);
    if (!stockItem || stockItem.quantity < modalQuantity) {
      alert(`Không đủ hàng cho size ${modalSize}. Tồn kho: ${stockItem?.quantity || 0}`);
      return;
    }
    handleAddToCart(modalProduct, modalSize, modalQuantity);
    setModalProduct(null);
  };

  // Thay đổi số lượng trong giỏ
  const handleQuantityChange = (id, size, value) => {
    const quantity = Number(value);
    if (quantity <= 0) return;
    const product = products.find((p) => p._id === id);
    const stockItem = product?.stock.find((s) => s.size === size);
    if (!stockItem || quantity > stockItem.quantity) {
      alert(`Số lượng vượt quá tồn kho cho size ${size}!`);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item._id === id && item.size === size ? { ...item, quantity } : item
      )
    );
  };

  // Xóa sản phẩm khỏi giỏ
  const handleRemove = (id, size) => {
    setCart((prev) => prev.filter((item) => !(item._id === id && item.size === size)));
  };

  // Tính tổng tiền
  const totalAmount = cart.reduce(
    (sum, item) => sum + (Number(item.sellingPrice) || 0) * item.quantity,
    0
  );

  // Thanh toán
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Chưa có sản phẩm nào để thanh toán!");
      return;
    }

    const items = cart.map((item) => ({
      productId: item._id,
      name: item.name,
      size: item.size,
      quantity: item.quantity,
      price: Number(item.sellingPrice) || 0,
    }));

    try {
      const res = await fetch("http://localhost:4000/directorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, totalAmount }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Thanh toán thành công!");
        generatePDF(items, totalAmount);
        setCart([]);
      } else {
        alert("Thanh toán thất bại: " + (data.message || "Lỗi server"));
      }
    } catch (err) {
      console.error("Lỗi khi thanh toán:", err);
      alert("Có lỗi khi thanh toán! Vui lòng thử lại.");
    }
  };

  // Tạo hóa đơn PDF
  const generatePDF = (items, totalAmount) => {
    const doc = new jsPDF();
    doc.addFileToVFS("Roboto-Regular.ttf", robotoFont);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto");

    doc.setFontSize(16);
    doc.text("HÓA ĐƠN THANH TOÁN", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Ngày: ${new Date().toLocaleString("vi-VN")}`, 14, 40);

    let startY = 60;
    doc.setFontSize(10);
    doc.text("STT", 14, startY);
    doc.text("Sản phẩm", 30, startY);
    doc.text("Size", 90, startY);
    doc.text("SL", 110, startY);
    doc.text("Giá", 130, startY);
    doc.text("Tổng", 160, startY);

    startY += 8;
    items.forEach((item, index) => {
      const name = item.name.length > 30 ? item.name.substring(0, 27) + "..." : item.name;
      doc.text(`${index + 1}`, 14, startY);
      doc.text(name, 30, startY);
      doc.text(`${item.size}`, 90, startY);
      doc.text(`${item.quantity}`, 110, startY);
      doc.text(formatPrice(item.price), 130, startY);
      doc.text(formatPrice(item.price * item.quantity), 160, startY);
      startY += 8;
    });

    startY += 10;
    doc.setFontSize(12);
    doc.text(`Tổng cộng: ${formatPrice(totalAmount)}`, 14, startY);

    startY += 20;
    doc.text("Cảm ơn quý khách!", 105, startY, { align: "center" });

    doc.save(`Invoice_${Date.now()}.pdf`);
  };

  // Lọc sản phẩm theo tìm kiếm
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search))
  );

  return (
    <div className="checkout-container">
      <div className="product-list">
        <h2>Danh Sách Sản Phẩm</h2>
        <input
          type="text"
          placeholder="Tìm sản phẩm hoặc mã vạch..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {error && (
          <div className="error">
            {error}
            <button onClick={fetchProducts} style={{ marginTop: "10px", padding: "8px 16px" }}>
              Thử lại
            </button>
          </div>
        )}
        <div className="products-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p) => (
              <div key={p._id} className="product-card">
                <img src={p.image} alt={p.name} />
                <h4>{p.name}</h4>
                <p>{formatPrice(p.sellingPrice)}</p>
                <div className="size-buttons">
                  {p.stock.map((s) => (
                    <button
                      key={s.size}
                      disabled={s.quantity === 0}
                      onClick={() => handleAddToCart(p, s.size, 1)}
                      className={s.quantity === 0 ? "disabled" : ""}
                    >
                      {s.size} ({s.quantity})
                    </button>
                  ))}
                </div>
                <button className="add-btn" onClick={() => handleAddToCart(p)}>
                  Thêm
                </button>
              </div>
            ))
          ) : (
            <p>Không tìm thấy sản phẩm.</p>
          )}
        </div>
      </div>

      <div className="cart">
        <h2>Giỏ Hàng</h2>
        {cart.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Số lượng</th>
                <th>Giá</th>
                <th>Tổng</th>
                <th>Xóa</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={`${item._id}-${item.size}`}>
                  <td>{item.name} ({item.size})</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item._id, item.size, e.target.value)}
                    />
                  </td>
                  <td>{formatPrice(item.sellingPrice)}</td>
                  <td>{formatPrice(item.sellingPrice * item.quantity)}</td>
                  <td>
                    <button className="remove-btn" onClick={() => handleRemove(item._id, item.size)}>
                      <img src={cross_icon} alt="Xóa" className="remove-icon" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Giỏ hàng trống.</p>
        )}
        <h3>Tổng: {formatPrice(totalAmount)}</h3>
        <button className="checkout-btn" onClick={handleCheckout} disabled={cart.length === 0}>
          Thanh Toán
        </button>
      </div>

      {modalProduct && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{modalProduct.name}</h3>
              <img
                src={cross_icon}
                alt="Đóng"
                className="modal-close-icon"
                onClick={() => setModalProduct(null)}
              />
            </div>
            <label>Chọn size:</label>
            <div className="size-buttons">
              {modalProduct.stock.map((s) => (
                <button
                  key={s.size}
                  disabled={s.quantity === 0}
                  onClick={() => setModalSize(s.size)}
                  className={modalSize === s.size ? "selected-size" : s.quantity === 0 ? "disabled" : ""}
                >
                  {s.size} ({s.quantity})
                </button>
              ))}
            </div>
            <label>Số lượng:</label>
            <input
              type="number"
              min="1"
              value={modalQuantity}
              onChange={(e) => setModalQuantity(Number(e.target.value))}
            />
            <div className="modal-actions">
              <button className="add-btn" onClick={handleModalAdd}>
                Thêm vào giỏ
              </button>
              <button className="cancel-btn" onClick={() => setModalProduct(null)}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
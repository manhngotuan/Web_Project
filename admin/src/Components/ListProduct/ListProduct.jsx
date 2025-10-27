import React, { useEffect, useState, useRef } from "react";
import "./ListProduct.css";
import refreshIcon from "../../assets/refresh.png"; // icon refresh
import { jsPDF } from "jspdf";
import robotoFont from "../Base64";

const ListProduct = () => {
  const [products, setProducts] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const searchTimer = useRef(null);

  const totalAmount = orderItems.reduce((sum, item) => sum + item.importPrice * item.quantity, 0);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await fetch("http://localhost:4000/suppliers");
        const data = await res.json();
        setSuppliers(data.success ? data.suppliers || [] : []);
      } catch (err) {
        console.error("Lỗi lấy suppliers:", err);
        setSuppliers([]);
      }
    };
    fetchSuppliers();
  }, []);

  const fetchProducts = async (opts = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (opts.search !== undefined) params.append("search", opts.search);
      if (opts.supplier) params.append("supplier", opts.supplier);
      if (opts.minPrice) params.append("minPrice", opts.minPrice);
      if (opts.maxPrice) params.append("maxPrice", opts.maxPrice);

      const url = `http://localhost:4000/api/products?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      setProducts(data && data.success ? data.products || [] : []);
    } catch (err) {
      console.error("Lỗi lấy products:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts({}); }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchProducts({
        search: searchTerm,
        supplier: selectedSupplier,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined
      });
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchTerm, selectedSupplier, minPrice, maxPrice]);

  const normalizeSize = (s) => {
    if (typeof s === "string") return s;
    if (s && typeof s === "object") return s.size || String(s);
    return String(s);
  };

  const addToOrder = (product, size) => {
    const sizeStr = normalizeSize(size);
    const importPrice = product.importPrice ?? product.priceImport ?? 0;
    const supplierName = product.supplier?.companyName || product.supplier?.name || "";

    const keyMatch = (it) => it.productId === product._id && it.size === sizeStr;
    const exist = orderItems.find(keyMatch);

    if (exist) {
      setOrderItems(orderItems.map(it => keyMatch(it) ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setOrderItems([
        ...orderItems,
        {
          productId: product._id,
          name: product.name,
          size: sizeStr,
          quantity: 1,
          importPrice,
          supplierName,
          image: product.image || null
        }
      ]);
    }
  };

  const changeQuantity = (productId, size, value) => {
    const qty = parseInt(value, 10);
    if (qty > 0) {
      setOrderItems(prev =>
        prev.map(it =>
          it.productId === productId && it.size === size
            ? { ...it, quantity: qty }
            : it
        )
      );
    }
  };

  const adjustQuantity = (productId, size, delta) => {
    setOrderItems(prev =>
      prev.map(it =>
        it.productId === productId && it.size === size
          ? { ...it, quantity: Math.max(1, it.quantity + delta) }
          : it
      )
    );
  };

  const removeItem = (productId, size) => {
    setOrderItems(prev => prev.filter(it => !(it.productId === productId && it.size === size)));
  };

  const createOrder = async () => {
    if (orderItems.length === 0) return alert("Chưa có sản phẩm trong đơn.");

    const bySupplier = {};
    for (const it of orderItems) {
      const sid = it.supplierName || "unknown";
      if (!bySupplier[sid]) bySupplier[sid] = [];
      bySupplier[sid].push({
        productId: it.productId,
        size: it.size,
        quantity: it.quantity,
        importPrice: it.importPrice,
        name: it.name,
        image: it.image
      });
    }

    try {
      const results = await Promise.all(
        Object.entries(bySupplier).map(async ([supplierName, items]) => {
          const supplier = suppliers.find(s => (s.companyName || s.name) === supplierName);
          if (!supplier) return { supplierName, ok: false };

          const res = await fetch("http://localhost:4000/supplierorders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ supplierId: supplier._id, items })
          });
          const data = await res.json();

          const orderFromAPI = data.supplierOrder || { _id: "Tạm", orderDate: new Date(), items };
          
          // Chuẩn hóa thông tin để export PDF
          const normalizedOrder = {
            ...orderFromAPI,
            supplierName: supplierName,
            items: orderFromAPI.items.map(item => {
              const fallback = orderItems.find(oi => oi.productId === item.productId);
              return {
                ...item,
                name: item.name || fallback?.name || "???",
                size: item.size || fallback?.size || "N/A",
                importPrice: (item.importPrice ?? fallback?.importPrice) || 0
              };
            })
          };


          return { supplierName, ok: data.success, order: normalizedOrder };
        })
      );

      const allOk = results.every(r => r.ok);
      if (allOk) {
        alert("Tạo đơn nhập hàng thành công!");
        setOrderItems([]);

        // Xuất PDF cho từng supplier
        results.forEach(r => exportOrderPDF(r.order));

      } else {
        alert("Có lỗi xảy ra, kiểm tra console.");
        console.warn(results);
      }
    } catch (err) {
      console.error("Lỗi tạo đơn nhập:", err);
      alert("Không thể tạo đơn nhập.");
    }
  };

  const exportOrderPDF = (order) => {
    const doc = new jsPDF();

    doc.addFileToVFS("Roboto-Regular.ttf", robotoFont);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto");

    doc.setFontSize(16);
    doc.text("HÓA ĐƠN NHẬP HÀNG", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Mã đơn: ${order._id}`, 14, 40);
    doc.text(`Nhà cung cấp: ${order.supplierName}`, 14, 50);
    doc.text(`Ngày tạo: ${new Date(order.orderDate).toLocaleDateString()}`, 14, 60);

    let startY = 80;
    doc.text("STT", 14, startY);
    doc.text("Sản phẩm", 34, startY);
    doc.text("Size", 104, startY);
    doc.text("SL", 134, startY);
    doc.text("Giá nhập", 164, startY);

    startY += 10;
    order.items.forEach((item, idx) => {
      doc.text(`${idx + 1}`, 14, startY);
      doc.text(`${item.name}`, 34, startY);
      doc.text(`${item.size}`, 104, startY);
      doc.text(`${item.quantity}`, 134, startY);
      doc.text(`${Number(item.importPrice).toLocaleString()}₫`, 164, startY);
      startY += 10;
    });

    const totalAmount = order.items.reduce((sum, item) => sum + item.importPrice * item.quantity, 0);
    startY += 10;
    doc.text(`Tổng cộng: ${totalAmount.toLocaleString()}₫`, 14, startY);

    startY += 20;
    doc.text("Cảm ơn đã nhập hàng!", 105, startY, { align: "center" });

    doc.save(`DonNhap_${order._id}.pdf`);
  };

  return (
    <div className="listproduct-page">
      <div className="product-list">
        <div className="list-header">
          <h2>Danh sách sản phẩm</h2>
          <div className="filters">
            <input
              className="search-input"
              placeholder="Tìm theo tên..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <select
              className="price-input"
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
            >
              <option value="">Tất cả nhà cung cấp</option>
              {suppliers.map(s => (
                <option key={s._id} value={s._id}>{s.companyName || s.name || s._id}</option>
              ))}
            </select>
            <input
              className="price-input"
              placeholder="Giá từ (₫)"
              type="number" min="0" value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
            />
            <input
              className="price-input"
              placeholder="Đến (₫)"
              type="number" min="0" value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
            />
            <button
              className="btn-refresh"
              onClick={() => {
                setSearchTerm("");
                setSelectedSupplier("");
                setMinPrice("");
                setMaxPrice("");
                fetchProducts({});
              }}
            >
              <img src={refreshIcon} alt="reset" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : products.length === 0 ? (
          <div className="no-data">Không có sản phẩm.</div>
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Tên</th>
                <th>Danh mục</th>
                <th>Giá nhập</th>
                <th>Sizes</th>
                <th>Tồn kho</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p._id}>
                  <td className="thumb-cell">
                    {p.image ? <img className="thumb" src={p.image} alt={p.name} /> : <div className="thumb placeholder">no image</div>}
                  </td>
                  <td className="name-col">
                    <div className="prod-name">{p.name}</div>
                    <div className="supplier-name">{p.supplier?.companyName || p.supplier?.name || ""}</div>
                  </td>
                  <td>{p.category}</td>
                  <td>{Number(p.importPrice || p.priceImport || 0).toLocaleString()}₫</td>
                  <td>
                    <div className="sizes">
                      {Array.isArray(p.sizes) && p.sizes.length > 0
                        ? p.sizes.map((s, idx) => (
                            <button key={idx} className="add-size-btn" onClick={() => addToOrder(p, normalizeSize(s))}>
                              {normalizeSize(s)}
                            </button>
                          ))
                        : <span>—</span>}
                    </div>
                  </td>
                  <td>
                    {Array.isArray(p.stock) && p.stock.length > 0
                      ? p.stock.map((st, i) => <div key={i} className="stock-row">{st.size}: {st.quantity}</div>)
                      : <span>0</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <aside className="order-summary">
        <h2>Đơn nhập hàng</h2>
        {orderItems.length === 0 ? (
          <p className="empty">Chưa có sản phẩm nào</p>
        ) : (
          <div className="order-items">
            {orderItems.map((it, idx) => (
              <div className="order-item" key={idx}>
                <div className="left">
                  {it.image && <img src={it.image} alt={it.name} className="item-thumb" />}
                  <div>
                    <div className="item-name">{it.name}</div>
                    <div className="item-supplier">Nhà cung cấp: {it.supplierName}</div>
                    <div className="item-meta">Size {it.size}</div>
                    <div className="item-price">{Number(it.importPrice || 0).toLocaleString()}₫</div>
                  </div>
                </div>
                <div className="right">
                  <div className="quantity-control">
                    <button onClick={() => adjustQuantity(it.productId, it.size, -1)}>-</button>
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={e => changeQuantity(it.productId, it.size, e.target.value)}
                    />
                    <button onClick={() => adjustQuantity(it.productId, it.size, 1)}>+</button>
                    <button className="remove-btn" onClick={() => removeItem(it.productId, it.size)}>Xóa</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="summary-footer">
          <div className="total">Tổng (tạm): {Number(totalAmount).toLocaleString()}₫</div>
          <button className="create-btn" onClick={createOrder} disabled={orderItems.length === 0}>Tạo đơn nhập</button>
        </div>
      </aside>
    </div>
  );
};

export default ListProduct;

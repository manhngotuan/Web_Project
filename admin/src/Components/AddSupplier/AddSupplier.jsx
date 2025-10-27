import React, { useState, useEffect } from "react";
import './AddSupplier.css';

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const pickColor = (name = "") => {
  const palette = [
    "#6C5CE7", "#00B894", "#0984E3", "#E17055",
    "#00CEC9", "#FD79A8", "#E84393", "#2d3436",
  ];
  const sum = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return palette[sum % palette.length];
};

const AddSupplier = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoading(true);
      try {
        const response = await fetch("http://localhost:4000/suppliers");
        const data = await response.json();
        if (!data.success) throw new Error(data.message || "Lỗi server");

        const unapproved = (data.suppliers || []).filter((s) => !s.isApproved);
        setSuppliers(unapproved);

        const productData = {};
        await Promise.all(
          unapproved.map(async (s) => {
            try {
              const res = await fetch(
                `http://localhost:4000/getproductsbysupplier/${s._id}`
              );
              const resData = await res.json();
              productData[s._id] = resData.success ? resData.products : [];
            } catch {
              productData[s._id] = [];
            }
          })
        );
        setProducts(productData);
      } catch (err) {
        setMessage("Lỗi tải dữ liệu: " + (err.message || err));
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`http://localhost:4000/suppliers/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setSuppliers((prev) => prev.filter((s) => s._id !== id));
        if (selectedSupplier && selectedSupplier._id === id) setSelectedSupplier(null);
        setMessage("Đã xác nhận hợp tác!");
      } else {
        setMessage(data.message || "Xác nhận thất bại");
      }
    } catch (err) {
      setMessage("Lỗi khi xác nhận: " + (err.message || err));
    }
  };

  const showDetail = (supplier) => setSelectedSupplier(supplier);
  const closeDetail = () => setSelectedSupplier(null);

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="supplier-container">
      <h2 className="page-title">Nhà cung cấp chờ xác nhận</h2>

      {message && <div className="alert">{message}</div>}

      <div className="top-row">
        <input
          className="search-bar"
          placeholder="Tìm theo tên hoặc email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="empty">Không có nhà cung cấp nào.</div>
      ) : (
        <div className="supplier-list">
          {filtered.map((s) => (
            <div
              key={s._id}
              className="supplier-card clickable"
              onClick={() => showDetail(s)}
            >
              <div className="card-left">
                {s.avatar || s.image ? (
                  <img src={s.avatar || s.image} alt={s.name} className="avatar-img" />
                ) : (
                  <div
                    className="avatar-initials"
                    style={{ backgroundColor: pickColor(s.name) }}
                  >
                    {getInitials(s.name)}
                  </div>
                )}
              </div>

              <div className="card-body">
                <div className="supplier-name">{s.name}</div>
                <div className="supplier-company">{s.companyName || "—"}</div>
                <div className="supplier-meta">
                  <div><strong>Email:</strong> {s.email || "—"}</div>
                  <div><strong>SĐT:</strong> {s.phone || "—"}</div>
                  <div><strong>Sản phẩm:</strong> {products[s._id]?.length || 0}</div>
                  {s.website && (
                    <div className="supplier-website">
                      <a href={s.website} target="_blank" rel="noreferrer">{s.website}</a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSupplier && (
        <div className="overlay fade-in" role="dialog" aria-modal="true">
          <div className="detail-modal slide-in">
            <div className="detail-header">
              <h3>Danh sách sản phẩm của {selectedSupplier.name}</h3>
              <div className="detail-actions">
                <button
                  className="btn-approve"
                  onClick={() => handleApprove(selectedSupplier._id)}
                >
                  Xác nhận
                </button>
                <button className="btn-close" onClick={closeDetail}>Đóng</button>
              </div>
            </div>

            <div className="supplier-details">
              <p><strong>Công ty:</strong> {selectedSupplier.companyName || "—"}</p>
              <p><strong>Email:</strong> {selectedSupplier.email || "—"}</p>
              <p><strong>Địa chỉ:</strong> {selectedSupplier.address || "—"}</p>
              <p><strong>SĐT:</strong> {selectedSupplier.phone || "—"}</p>
              {selectedSupplier.website && (
                <p><strong>Website:</strong> <a href={selectedSupplier.website} target="_blank" rel="noreferrer">{selectedSupplier.website}</a></p>
              )}
              <p><strong>Sản phẩm:</strong> {products[selectedSupplier._id]?.length || 0}</p>
            </div>

            {products[selectedSupplier._id] &&
            products[selectedSupplier._id].length > 0 ? (
              <div className="table-wrap">
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>Ảnh</th>
                      <th>Tên</th>
                      <th>Giá nhập</th>
                      <th>Danh mục</th>
                      <th>Mô tả</th>
                      <th>Màu sắc</th>
                      <th>Kích cỡ</th>
                      <th>Chất liệu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products[selectedSupplier._id].map((p) => (
                      <tr key={p._id}>
                        <td className="td-image">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="prod-img" />
                          ) : (
                            <div className="prod-placeholder">—</div>
                          )}
                        </td>
                        <td>{p.name || "—"}</td>
                        <td>{p.importPrice != null ? `${Number(p.importPrice).toLocaleString()} VNĐ` : "—"}</td>
                        <td>{p.category || "—"}</td>
                        <td>{p.description || "—"}</td>
                        <td>{p.color || "—"}</td>
                        <td>{Array.isArray(p.sizes) && p.sizes.length ? p.sizes.join(", ") : "—"}</td>
                        <td>{p.material || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">Nhà cung cấp này chưa có sản phẩm.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddSupplier;
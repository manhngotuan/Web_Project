import React, { useEffect, useState } from "react";
import "./Inventory.css";

const formatPrice = (price) =>
  price == null ? "0" : price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [sortImport, setSortImport] = useState(null);

  // State để lưu giá mới khi cập nhật
  const [priceEdit, setPriceEdit] = useState({ inventoryId: null, value: "" });

  const fetchProducts = async () => {
    try {
      const res = await fetch("http://localhost:4000/getinventory");
      const data = await res.json();
      if (data.success) {
        const mapped = data.inventory
          .filter((inv) => inv.product) // check null
          .map((inv) => ({
            _idInventory: inv._id,
            _id: inv.product._id,
            name: inv.product.name,
            category: inv.product.category,
            supplier: inv.product.supplier,
            importPrice: inv.warehousePrice,
            sellingPrice: inv.sellingPrice ?? 0, // mặc định 0 nếu null
            stock: inv.stock,
            image: inv.product.image,
          }));
        setProducts(mapped);
      }
    } catch (err) {
      console.error("Lỗi fetch sản phẩm:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const suppliers = [
    ...new Set(products.map((p) => p.supplier?.name).filter(Boolean)),
  ];

  const filteredProducts = products
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => (categoryFilter ? p.category === categoryFilter : true))
    .filter((p) => (supplierFilter ? p.supplier?.name === supplierFilter : true))
    .filter((p) => {
      if (!statusFilter) return true;
      const totalQty = p.stock?.reduce((acc, s) => acc + s.quantity, 0) || 0;
      if (statusFilter === "out") return totalQty <= 0;
      if (statusFilter === "low-stock") return totalQty > 0 && totalQty < 10;
      if (statusFilter === "available") return totalQty >= 10;
      return true;
    })
    .sort((a, b) => {
      if (!sortImport) return 0;
      if (sortImport === "asc") return a.importPrice - b.importPrice;
      if (sortImport === "desc") return b.importPrice - a.importPrice;
      return 0;
    });

  const toggleSortImport = () => {
    if (sortImport === null) setSortImport("asc");
    else if (sortImport === "asc") setSortImport("desc");
    else setSortImport(null);
  };

  const handleUpdatePrice = async (inventoryId, oldPrice) => {
    const newPriceStr = window.prompt("Nhập giá bán mới:", oldPrice || 0);
    const newPrice = parseInt(newPriceStr, 10);
    if (!newPrice || newPrice <= 0) return alert("Giá bán không hợp lệ!");

    try {
      const res = await fetch("http://localhost:4000/updateSellingPrice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryId, sellingPrice: newPrice }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Cập nhật giá bán thành công!");
        fetchProducts();
      } else {
        alert(data.message || "Cập nhật thất bại!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật giá bán!");
    }
  };

  const handleQuickAdd = async (productId, supplierId, importPrice) => {
    const size = prompt("Nhập size muốn thêm (ví dụ: S, M, L):");
    const qtyStr = prompt("Nhập số lượng muốn thêm:");
    const quantity = parseInt(qtyStr, 10);

    if (!size || !quantity || quantity <= 0) return alert("Thông tin không hợp lệ!");

    if (!supplierId) return alert("Sản phẩm chưa có nhà cung cấp!");

    try {
      // Tạo đơn nhập hàng mới
      const res = await fetch("http://localhost:4000/supplierorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          items: [
            {
              productId,
              size,
              quantity,
              importPrice
            }
          ]
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Tạo đơn nhập hàng thành công! Đợi supplier confirm để cập nhật kho.");
        fetchProducts();
      } else {
        alert(data.message || "Tạo đơn nhập hàng thất bại!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi tạo đơn nhập hàng!");
    }
  };


  return (
    <div className="inventory">
      <h1 className="inventory-title">Kho hàng</h1>
      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Hình ảnh</th>
              <th>
                <input
                  type="text"
                  placeholder="Tìm sản phẩm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="filter-input"
                />
              </th>
              <th>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Tất cả</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Trẻ em">Trẻ em</option>
                </select>
              </th>
              <th>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Tất cả</option>
                  {suppliers.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </th>
              <th>
                Giá nhập{" "}
                <button onClick={toggleSortImport} className="sort-btn">
                  {sortImport === "asc"
                    ? "↑"
                    : sortImport === "desc"
                    ? "↓"
                    : "↕"}
                </button>
              </th>
              <th>Giá bán</th>
              <th>Tồn kho</th>
              <th>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Tất cả</option>
                  <option value="out">Hết hàng</option>
                  <option value="low-stock">Sắp hết</option>
                  <option value="available">Còn hàng</option>
                </select>
              </th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => {
                const totalQty = p.stock?.reduce((acc, s) => acc + s.quantity, 0);
                let statusText = "";
                let statusClass = "";
                if (totalQty <= 0) {
                  statusText = "Hết hàng";
                  statusClass = "out";
                } else if (totalQty < 10) {
                  statusText = "Sắp hết";
                  statusClass = "low-stock";
                } else {
                  statusText = "Còn hàng";
                  statusClass = "available";
                }
                return (
                  <tr key={p._idInventory}>
                    <td>
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="inventory-image"
                        />
                      ) : (
                        <span>Không có ảnh</span>
                      )}
                    </td>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td>{p.supplier?.name || "Không rõ"}</td>
                    <td>{formatPrice(p.importPrice)}đ</td>
                    <td>
                      {formatPrice(p.sellingPrice)}đ{" "}
                      <button
                        className="update-price-btn"
                        onClick={() =>
                          handleUpdatePrice(p._idInventory, p.sellingPrice)
                        }
                      >
                        Sửa
                      </button>
                    </td>
                    <td>
                      {p.stock && p.stock.length > 0 ? (
                        p.stock.map((s) => (
                          <div key={s._id}>
                            {s.size}: {s.quantity}
                          </div>
                        ))
                      ) : (
                        <span>Chưa có</span>
                      )}
                    </td>
                    <td>
                      <span className={`status ${statusClass}`}>{statusText}</span>
                    </td>
                    <td>
                      <button
                        className="quick-add-btn"
                        onClick={() =>
                          handleQuickAdd(p._id, p.supplier?._id, p.importPrice)
                        }
                      >
                        Nhập hàng
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: "center" }}>
                  Không có sản phẩm nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;

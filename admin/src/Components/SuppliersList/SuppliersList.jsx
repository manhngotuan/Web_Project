import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import "./SuppliersList.css";

const SuppliersList = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplierProducts, setSelectedSupplierProducts] = useState([]);
  const [selectedSupplierName, setSelectedSupplierName] = useState("");
  const suppliersPerPage = 6;

  const fetchSuppliersAndOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth-token");

      // Fetch all suppliers
      const supplierResponse = await fetch("http://localhost:4000/suppliers", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "auth-token": token || "",
        },
      });
      if (!supplierResponse.ok) {
        throw new Error(`HTTP error! Status: ${supplierResponse.status}`);
      }
      const supplierData = await supplierResponse.json();
      if (!supplierData.success || !Array.isArray(supplierData.suppliers)) {
        throw new Error(supplierData.message || "Không thể tải danh sách nhà cung cấp");
      }

      // Fetch completed customer orders
      const completedOrdersResponse = await fetch("http://localhost:4000/getcompletedorders", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "auth-token": token || "",
        },
      });
      if (!completedOrdersResponse.ok) {
        throw new Error(`HTTP error! Status: ${completedOrdersResponse.status}`);
      }
      const completedOrdersData = await completedOrdersResponse.json();
      if (!completedOrdersData.success || !Array.isArray(completedOrdersData.orders)) {
        throw new Error(completedOrdersData.message || "Không thể tải danh sách đơn hàng hoàn thành");
      }

      // Fetch inventory
      const inventoryResponse = await fetch("http://localhost:4000/getinventory", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "auth-token": token || "",
        },
      });
      if (!inventoryResponse.ok) {
        throw new Error(`HTTP error! Status: ${inventoryResponse.status}`);
      }
      const inventoryData = await inventoryResponse.json();
      const validInventory = inventoryData.inventory.filter(item => item.product && item.product._id);
      if (inventoryData.inventory.length !== validInventory.length) {
        console.warn(`Found ${inventoryData.inventory.length - validInventory.length} invalid inventory items with missing product or _id`);
      }

      // Map suppliers with calculated metrics
      const mappedSuppliers = await Promise.all(
        supplierData.suppliers.map(async (s) => {
          // Fetch supplier orders
          const supplierOrdersResponse = await fetch(`http://localhost:4000/getsupplierorders/${s._id}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "auth-token": token || "",
            },
          });
          const supplierOrdersData = await supplierOrdersResponse.json();
          const supplierOrders = supplierOrdersData.success ? supplierOrdersData.orders : [];

          // Calculate order counts
          const pendingCount = supplierOrders.filter((o) => o.status === "pending").length;
          const confirmedCount = supplierOrders.filter((o) => o.status === "confirmed").length;
          const completedCount = supplierOrders.filter((o) => o.status === "completed").length;
          const canceledCount = supplierOrders.filter((o) => o.status === "canceled").length;

          // Fetch supplier's products
          const productsResponse = await fetch(`http://localhost:4000/allproducts?supplier=${s._id}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "auth-token": token || "",
            },
          });
          const productsData = await productsResponse.json();
          const productCount = productsData.success ? productsData.products.length : 0;
          const productIds = productsData.success ? productsData.products.map((p) => p._id.toString()) : [];

          // Calculate usedProductCount
          let usedProductCount = 0;
          completedOrdersData.orders.forEach(order => {
            order.items.forEach(item => {
              const productIdStr = item.productId?._id ? item.productId._id.toString() : item.productId?.toString();
              if (productIds.includes(productIdStr)) {
                usedProductCount += item.quantity || 0;
              }
            });
          });

          // Calculate importedProductCount from completed SupplierOrders
          let importedProductCount = 0;
          const completedSupplierOrders = supplierOrders.filter((o) => o.status === "completed");
          for (const order of completedSupplierOrders) {
            for (const item of order.items) {
              importedProductCount += item.quantity || 0;
            }
          }

          return {
            _id: s._id || "",
            name: s.name || "—",
            companyName: s.companyName || "Không xác định",
            address: s.address || "—",
            phone: s.phone || "—",
            email: s.email || "—",
            website: s.website || "—",
            isApproved: s.isApproved || false,
            productCount,
            usedProductCount,
            importedProductCount,
            pendingCount,
            confirmedCount,
            completedCount,
            canceledCount,
          };
        })
      );

      setSuppliers(mappedSuppliers);
      setFilteredSuppliers(mappedSuppliers);
      setError(null);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      setError(`Không thể kết nối đến server: ${error.message}`);
      setSuppliers([]);
      setFilteredSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierProducts = async (supplierId, companyName) => {
    try {
      const token = localStorage.getItem("auth-token");
      const response = await fetch(`http://localhost:4000/getproductsbysupplier/${supplierId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "auth-token": token || "",
        },
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.products)) {
        setSelectedSupplierProducts(data.products);
        setSelectedSupplierName(companyName);
        setShowModal(true);
      } else {
        setError("Không thể tải danh sách sản phẩm của nhà cung cấp.");
        setSelectedSupplierProducts([]);
        setShowModal(true);
      }
    } catch (error) {
      console.error("Lỗi khi lấy sản phẩm:", error);
      setError(`Có lỗi xảy ra khi lấy sản phẩm: ${error.message}`);
      setSelectedSupplierProducts([]);
      setShowModal(true);
    }
  };

  useEffect(() => {
    fetchSuppliersAndOrders();
  }, []);

  useEffect(() => {
    let results = suppliers.filter(
      (supplier) =>
        (supplier.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (supplier.address?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    );

    if (statusFilter === "approved") {
      results = results.filter((supplier) => supplier.isApproved);
    } else if (statusFilter === "pending") {
      results = results.filter((supplier) => !supplier.isApproved);
    }

    if (sortConfig.key) {
      results.sort((a, b) => {
        const aValue = a[sortConfig.key] || (typeof a[sortConfig.key] === "boolean" ? a[sortConfig.key] : 0);
        const bValue = b[sortConfig.key] || (typeof b[sortConfig.key] === "boolean" ? b[sortConfig.key] : 0);
        if (sortConfig.key === "isApproved") {
          return sortConfig.direction === "asc"
            ? (aValue ? 1 : -1) - (bValue ? 1 : -1)
            : (bValue ? 1 : -1) - (aValue ? 1 : -1);
        }
        if (typeof aValue === "string") {
          return sortConfig.direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      });
    }

    setFilteredSuppliers(results);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, suppliers, sortConfig]);

  const sortBy = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const indexOfLastSupplier = currentPage * suppliersPerPage;
  const indexOfFirstSupplier = indexOfLastSupplier - suppliersPerPage;
  const currentSuppliers = filteredSuppliers.slice(indexOfFirstSupplier, indexOfLastSupplier);
  const totalPages = Math.ceil(filteredSuppliers.length / suppliersPerPage);

  const deleteSupplier = async (id) => {
    const confirmDelete = window.confirm("Xoá nhà cung cấp sẽ xoá tất cả sản phẩm thuộc nhà cung cấp này. Bạn có chắc chắn muốn xoá?");
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("auth-token");
      const response = await fetch(`http://localhost:4000/removesupplier/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "auth-token": token || "",
        },
      });
      const data = await response.json();
      if (data.success) {
        setSuppliers(suppliers.filter((s) => s._id !== id));
        setSuccessMessage("Nhà cung cấp đã được xoá thành công!");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.message || "Xoá nhà cung cấp không thành công.");
      }
    } catch (error) {
      console.error("Lỗi khi xoá nhà cung cấp:", error);
      setError(`Có lỗi xảy ra khi xoá nhà cung cấp: ${error.message}`);
    }
  };

  const stopCooperation = async (id) => {
    const confirmStop = window.confirm("Dừng hợp tác sẽ đặt isApproved = false và gửi email thông báo đến supplier. Bạn có chắc chắn?");
    if (!confirmStop) return;

    try {
      const token = localStorage.getItem("auth-token");
      const response = await fetch(`http://localhost:4000/suppliers/${id}/stop-cooperation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "auth-token": token || "",
        },
      });
      const data = await response.json();
      if (data.success) {
        setSuppliers(
          suppliers.map((s) =>
            s._id === id ? { ...s, isApproved: false } : s
          )
        );
        setSuccessMessage("Đã dừng hợp tác với nhà cung cấp!");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.message || "Dừng hợp tác không thành công.");
      }
    } catch (error) {
      console.error("Lỗi khi dừng hợp tác:", error);
      setError(`Có lỗi xảy ra khi dừng hợp tác: ${error.message}`);
    }
  };

  const approveSupplier = async (id) => {
    const confirmApprove = window.confirm("Xác nhận hợp tác sẽ đặt isApproved = true và gửi email thông báo đến supplier. Bạn có chắc chắn?");
    if (!confirmApprove) return;

    try {
      const token = localStorage.getItem("auth-token");
      const response = await fetch(`http://localhost:4000/suppliers/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "auth-token": token || "",
        },
      });
      const data = await response.json();
      if (data.success) {
        setSuppliers(
          suppliers.map((s) =>
            s._id === id ? { ...s, isApproved: true } : s
          )
        );
        setSuccessMessage("Đã xác nhận hợp tác với nhà cung cấp!");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.message || "Xác nhận hợp tác không thành công.");
      }
    } catch (error) {
      console.error("Lỗi khi xác nhận hợp tác:", error);
      setError(`Có lỗi xảy ra khi xác nhận hợp tác: ${error.message}`);
    }
  };

  const formatPrice = (price) => {
    return price ? price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "0";
  };

  const defaultImage = "/default-image.png";

  const exportToExcel = () => {
    const exportData = filteredSuppliers.map((s) => ({
      "Tên công ty": s.companyName,
      "Tên đại diện": s.name,
      "Địa chỉ": s.address,
      "Số điện thoại": s.phone,
      "Email": s.email,
      "Website": s.website,
      "Số sản phẩm": s.productCount,
      "Sản phẩm đã nhập": s.importedProductCount,
      "Sản phẩm đã bán": s.usedProductCount,
      "Đơn hàng mới": s.pendingCount,
      "Đơn hàng đang xử lý": s.confirmedCount,
      "Đơn hàng đã hoàn thành": s.completedCount,
      "Đơn hàng đã hủy": s.canceledCount,
      "Trạng thái": s.isApproved ? "Đã xác nhận" : "Chưa xác nhận",
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Suppliers");
    XLSX.writeFile(workbook, `Suppliers_${Date.now()}.xlsx`);
  };

  if (loading) {
    return <div className="loading">Đang tải danh sách nhà cung cấp...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="suppliers-list">
      <h2>Danh sách Nhà Cung Cấp</h2>

      {successMessage && <div className="success">{successMessage}</div>}

      <div className="filters-container">
        <div className="search-container">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, công ty, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="status-filter">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="approved">Đã xác nhận</option>
            <option value="pending">Chưa xác nhận</option>
          </select>
        </div>
        <button onClick={exportToExcel} className="export-btn">
          Xuất Excel
        </button>
      </div>

      <div className="suppliers-grid">
        {currentSuppliers.length > 0 ? (
          currentSuppliers.map((supplier) => (
            <div key={supplier._id} className="supplier-card">
              <div className="card-header">
                <h3 onClick={() => sortBy("companyName")} title={supplier.companyName}>
                  {supplier.companyName.length > 25 ? `${supplier.companyName.slice(0, 22)}...` : supplier.companyName}
                  {sortConfig.key === "companyName" && (
                    <span className="sort-icon">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                  )}
                </h3>
                <span className={`status-badge ${supplier.isApproved ? "approved" : "pending"}`} onClick={() => sortBy("isApproved")}>
                  {supplier.isApproved ? "Đã xác nhận" : "Chưa xác nhận"}
                  {sortConfig.key === "isApproved" && (
                    <span className="sort-icon">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                  )}
                </span>
              </div>

              <div className="card-section">
                <h4>Thông tin liên hệ</h4>
                <p title={supplier.name} onClick={() => sortBy("name")}>
                  <strong>Tên:</strong> {supplier.name.length > 20 ? `${supplier.name.slice(0, 17)}...` : supplier.name}
                  {sortConfig.key === "name" && (
                    <span className="sort-icon">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                  )}
                </p>
                <p title={supplier.email} onClick={() => sortBy("email")}>
                  <strong>Email:</strong> {supplier.email.length > 20 ? `${supplier.email.slice(0, 17)}...` : supplier.email}
                  {sortConfig.key === "email" && (
                    <span className="sort-icon">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                  )}
                </p>
                <p title={supplier.phone} onClick={() => sortBy("phone")}>
                  <strong>SĐT:</strong> {supplier.phone}
                  {sortConfig.key === "phone" && (
                    <span className="sort-icon">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                  )}
                </p>
                <p title={supplier.address} onClick={() => sortBy("address")}>
                  <strong>Địa chỉ:</strong> {supplier.address.length > 25 ? `${supplier.address.slice(0, 22)}...` : supplier.address}
                  {sortConfig.key === "address" && (
                    <span className="sort-icon">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                  )}
                </p>
                <p title={supplier.website} onClick={() => sortBy("website")}>
                  <strong>Website:</strong> {supplier.website.length > 20 ? `${supplier.website.slice(0, 17)}...` : supplier.website || "—"}
                  {sortConfig.key === "website" && (
                    <span className="sort-icon">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                  )}
                </p>
              </div>

              <div className="card-content">
                <div className="card-section">
                  <h4>Thông tin sản phẩm</h4>
                  <p onClick={() => sortBy("productCount")}>
                    <strong>Sản phẩm:</strong> {supplier.productCount}
                    {sortConfig.key === "productCount" && (
                      <span className="sort-icon">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                    )}
                  </p>
                  <p onClick={() => sortBy("importedProductCount")}>
                    <strong>Đã nhập:</strong> {supplier.importedProductCount}
                    {sortConfig.key === "importedProductCount" && (
                      <span className="sort-icon">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                    )}
                  </p>
                  <p onClick={() => sortBy("usedProductCount")}>
                    <strong>Đã bán:</strong> {supplier.usedProductCount}
                    {sortConfig.key === "usedProductCount" && (
                      <span className="sort-icon">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                    )}
                  </p>
                </div>
                <div className="card-section">
                  <h4>Thông tin đơn hàng</h4>
                  <p onClick={() => sortBy("pendingCount")}>
                    <strong>Mới:</strong> {supplier.pendingCount}
                    {sortConfig.key === "pendingCount" && (
                      <span className="sort-icon">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                    )}
                  </p>
                  <p onClick={() => sortBy("confirmedCount")}>
                    <strong>Đang xử lý:</strong> {supplier.confirmedCount}
                    {sortConfig.key === "confirmedCount" && (
                      <span className="sort-icon">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                    )}
                  </p>
                  <p onClick={() => sortBy("completedCount")}>
                    <strong>Hoàn thành:</strong> {supplier.completedCount}
                    {sortConfig.key === "completedCount" && (
                      <span className="sort-icon">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                    )}
                  </p>
                  <p onClick={() => sortBy("canceledCount")}>
                    <strong>Đã hủy:</strong> {supplier.canceledCount}
                    {sortConfig.key === "canceledCount" && (
                      <span className="sort-icon">{sortConfig.direction === "asc" ? " ▲" : " ▼"}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="card-actions">
                {supplier.isApproved ? (
                  <>
                    <button className="stop-btn" onClick={() => stopCooperation(supplier._id)} title="Dừng hợp tác">
                      Dừng
                    </button>
                    <button
                      className="view-products-btn"
                      onClick={() => fetchSupplierProducts(supplier._id, supplier.companyName)}
                      title="Xem sản phẩm"
                    >
                      Xem SP
                    </button>
                  </>
                ) : (
                  <>
                    <button className="approve-btn" onClick={() => approveSupplier(supplier._id)} title="Xác nhận hợp tác">
                      Xác nhận
                    </button>
                    <button className="delete-btn" onClick={() => deleteSupplier(supplier._id)} title="Xoá nhà cung cấp">
                      Xoá
                    </button>
                    <button
                      className="view-products-btn"
                      onClick={() => fetchSupplierProducts(supplier._id, supplier.companyName)}
                      title="Xem sản phẩm"
                    >
                      Xem SP
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="no-suppliers">Không tìm thấy nhà cung cấp nào.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            Trước
          </button>
          <span>Trang {currentPage} / {totalPages}</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            Sau
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Sản phẩm của {selectedSupplierName}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              {selectedSupplierProducts.length > 0 ? (
                <div className="product-grid">
                  {selectedSupplierProducts.map((product) => (
                    <div className="product-card" key={product._id}>
                      <div className="product-image-wrapper">
                        <img
                          src={product.image || defaultImage}
                          alt={product.name}
                          className="product-card-img"
                        />
                      </div>
                      <div className="product-card-info">
                        <h3>{product.name}</h3>
                        <p className="category">Phân loại: {product.category}</p>
                        <p className="price">Giá nhập: {formatPrice(product.importPrice)} ₫</p>
                        <p className="style">Kiểu dáng: {product.style || "N/A"}</p>
                        <p className="color">Màu sắc: {product.color || "N/A"}</p>
                        <p className="material">Chất liệu: {product.material || "N/A"}</p>
                        <div className="sizes">
                          {product.sizes && product.sizes.length > 0 ? (
                            product.sizes.map((s, i) => (
                              <span key={i} className="size-tag">
                                {s.size || s}
                              </span>
                            ))
                          ) : (
                            <span className="size-tag empty">Chưa có size</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-text">Nhà cung cấp này chưa có sản phẩm nào.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersList;
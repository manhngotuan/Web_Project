import React, { useState } from "react";
import "./AddProductManual.css";
import "./AddProductModal.css";
import upload_area from "../../assets/upload_area.svg";
import * as XLSX from "xlsx";

const AddProduct = () => {
  const [mode, setMode] = useState("manual"); // manual | bulk
  const [image, setImage] = useState(null);
  const [productDetails, setProductDetails] = useState({
    name: "",
    category: "",
    priceImport: "",
    barcode: "",
    style: "",
    color: "",
    material: "",
    description: "",
    sizes: [],
  });
  const [sizeInput, setSizeInput] = useState("");
  const [barcodeError, setBarcodeError] = useState("");
  const [bulkProducts, setBulkProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null); // State để theo dõi file XLSX/CSV

  // Manual mode
  const imageHandler = (e) => setImage(e.target.files[0]);

  const changeHandler = (e) => {
    setProductDetails({ ...productDetails, [e.target.name]: e.target.value });
    if (e.target.name === "barcode") setBarcodeError("");
  };

  const addSize = () => {
    if (!sizeInput) return alert("Vui lòng nhập size!");
    if (productDetails.sizes.includes(sizeInput)) {
      return alert("Size đã tồn tại!");
    }
    setProductDetails({
      ...productDetails,
      sizes: [...productDetails.sizes, sizeInput],
    });
    setSizeInput("");
  };

  const removeSize = (index) => {
    const newSizes = productDetails.sizes.filter((_, i) => i !== index);
    setProductDetails({ ...productDetails, sizes: newSizes });
  };

  const Add_Product = async () => {
    try {
      const supplierId = localStorage.getItem("supplierId");
      if (!supplierId) return alert("Bạn chưa đăng nhập nhà cung cấp!");

      if (!image) return alert("Vui lòng chọn ảnh sản phẩm!");
      if (
        !productDetails.name ||
        !productDetails.category ||
        !productDetails.priceImport ||
        !productDetails.barcode
      ) {
        return alert("Vui lòng điền đầy đủ thông tin sản phẩm!");
      }
      if (productDetails.sizes.length === 0)
        return alert("Vui lòng thêm ít nhất một size!");

      // Check for duplicate barcode
      const barcodeCheck = await fetch("http://localhost:4000/checkbarcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: productDetails.barcode, supplierId }),
      }).then((res) => res.json());

      if (!barcodeCheck.success) {
        setBarcodeError("Mã vạch đã tồn tại, vui lòng nhập mã khác!");
        return;
      }

      // Upload image
      const formData = new FormData();
      formData.append("product", image);

      const uploadResponse = await fetch("http://localhost:4000/upload", {
        method: "POST",
        body: formData,
      }).then((res) => res.json());

      if (!uploadResponse.success) return alert("Upload ảnh thất bại");

      const product = {
        ...productDetails,
        sizes: productDetails.sizes.map((s) => ({ size: s })),
        image: uploadResponse.image_url,
        supplierId,
      };

      const result = await fetch("http://localhost:4000/addproduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      }).then((res) => res.json());

      if (result.success) {
        alert("Thêm sản phẩm thành công!");
        setProductDetails({
          name: "",
          category: "",
          priceImport: "",
          barcode: "",
          style: "",
          color: "",
          material: "",
          description: "",
          sizes: [],
        });
        setImage(null);
      } else {
        if (result.message && result.message.includes("duplicate key")) {
          setBarcodeError("Mã vạch đã tồn tại, vui lòng nhập mã khác!");
        }
        alert("Thêm sản phẩm thất bại: " + (result.message || "Không rõ"));
      }
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi thêm sản phẩm!");
    }
  };

  // Bulk mode
  const handleBulkImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkFile(file); // Lưu file để hiển thị tên

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (jsonData.length < 1) return alert("File không có dữ liệu!");

      const headers = jsonData[0].map((h) =>
        h ? h.toString().trim().toLowerCase() : ""
      );

      const expectedFields = [
        "name",
        "category",
        "priceimport",
        "barcode",
        "style",
        "color",
        "material",
        "sizes",
        "description",
      ];

      const fieldMap = {};
      expectedFields.forEach((field) => {
        const index = headers.findIndex((h) => h === field);
        if (index !== -1) fieldMap[field] = index;
      });

      const requiredFields = ["name", "category", "priceimport", "barcode"];
      const missing = requiredFields.filter((f) => fieldMap[f] === undefined);
      if (missing.length > 0) {
        return alert(`File thiếu cột bắt buộc: ${missing.join(", ")}`);
      }

      const products = jsonData
        .slice(1)
        .map((row) => {
          const sizesStr =
            fieldMap.sizes !== undefined ? row[fieldMap.sizes] || "" : "";
          return {
            name: row[fieldMap.name] ? row[fieldMap.name].toString().trim() : "",
            category: row[fieldMap.category]
              ? row[fieldMap.category].toString().trim()
              : "",
            priceImport:
              fieldMap.priceimport !== undefined
                ? parseFloat(row[fieldMap.priceimport]) || 0
                : 0,
            barcode: row[fieldMap.barcode]
              ? row[fieldMap.barcode].toString().trim()
              : "",
            style:
              fieldMap.style !== undefined && row[fieldMap.style]
                ? row[fieldMap.style].toString().trim()
                : "",
            color:
              fieldMap.color !== undefined && row[fieldMap.color]
                ? row[fieldMap.color].toString().trim()
                : "",
            material:
              fieldMap.material !== undefined && row[fieldMap.material]
                ? row[fieldMap.material].toString().trim()
                : "",
            description:
              fieldMap.description !== undefined && row[fieldMap.description]
                ? row[fieldMap.description].toString().trim()
                : "",
            sizes: sizesStr
              ? sizesStr
                  .toString()
                  .split(",")
                  .map((s) => s.trim())
              : [],
            imageFile: null,
            status: null,
          };
        })
        .filter((p) => p.name && p.category && p.priceImport && p.barcode);

      setBulkProducts(products);
      setIsModalOpen(true);
    };
    reader.readAsBinaryString(file);
  };

  const setBulkImage = (index, file) => {
    const updated = [...bulkProducts];
    updated[index].imageFile = file;
    setBulkProducts(updated);
  };

  const updateBulkProduct = (index, field, value) => {
    const updated = [...bulkProducts];
    if (field === "sizes") {
      updated[index][field] = value.split(",").map((s) => s.trim());
    } else if (field === "priceImport") {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setBulkProducts(updated);
  };

  const removeBulkProduct = (index) => {
    const updated = bulkProducts.filter((_, i) => i !== index);
    setBulkProducts(updated);
    if (updated.length === 0) setIsModalOpen(false); // Close modal if no products remain
  };

  const Add_Bulk_Products = async () => {
    const supplierId = localStorage.getItem("supplierId");
    if (!supplierId) return alert("Bạn chưa đăng nhập nhà cung cấp!");
    if (bulkProducts.length === 0) return alert("Chưa có sản phẩm để thêm!");

    try {
      // Check for duplicate barcodes
      const barcodeCheck = await fetch("http://localhost:4000/checkbarcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcodes: bulkProducts.map((p) => p.barcode),
          supplierId,
        }),
      }).then((res) => res.json());

      const updatedProducts = [...bulkProducts];
      barcodeCheck.results.forEach((result, index) => {
        if (!result.success) {
          updatedProducts[index].status = {
            success: false,
            message: "Mã vạch đã tồn tại!",
          };
        }
      });
      setBulkProducts(updatedProducts);

      // Proceed with adding products that don't have barcode errors
      const results = await Promise.all(
        bulkProducts.map(async (p, index) => {
          if (p.status && !p.status.success) {
            return p.status;
          }
          try {
            if (!p.name || !p.category || !p.priceImport || !p.barcode) {
              return { success: false, message: "Thiếu thông tin bắt buộc!" };
            }
            if (!p.imageFile) {
              return { success: false, message: "Chưa chọn ảnh sản phẩm!" };
            }
            if (p.sizes.length === 0) {
              return { success: false, message: "Chưa có size!" };
            }

            const formData = new FormData();
            formData.append("product", p.imageFile);
            const uploadRes = await fetch("http://localhost:4000/upload", {
              method: "POST",
              body: formData,
            }).then((res) => res.json());
            if (!uploadRes.success) {
              return { success: false, message: "Upload ảnh thất bại!" };
            }

            const product = {
              ...p,
              sizes: p.sizes.map((s) => ({ size: s })),
              image: uploadRes.image_url,
              supplierId,
            };

            const addRes = await fetch("http://localhost:4000/addproduct", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(product),
            }).then((res) => res.json());

            if (!addRes.success) {
              return { success: false, message: addRes.message || "Thêm thất bại" };
            }

            return { success: true, message: "Thành công" };
          } catch (err) {
            return { success: false, message: err.message || "Có lỗi xảy ra" };
          }
        })
      );

      const updated = bulkProducts.map((p, i) => ({
        ...p,
        status: results[i],
      }));

      setBulkProducts(updated);
    } catch (error) {
      console.error(error);
      alert("Có lỗi khi thêm bulk sản phẩm!");
    }
  };

  return (
    <div className="add-product">
      <h2 className="form-title">Thêm sản phẩm mới</h2>
      <div className="mode-selection">
        <button
          className={mode === "manual" ? "mode-btn active" : "mode-btn"}
          onClick={() => setMode("manual")}
        >
          Thêm thủ công
        </button>
        <button
          className={mode === "bulk" ? "mode-btn active" : "mode-btn"}
          onClick={() => setMode("bulk")}
        >
          Thêm nhanh bằng XLSX/CSV
        </button>
      </div>

      {mode === "manual" ? (
        <>
          <div className="addproduct-itemfield">
            <p>Tên sản phẩm</p>
            <input
              type="text"
              name="name"
              value={productDetails.name}
              onChange={changeHandler}
              placeholder="Nhập tên sản phẩm"
            />
          </div>

          <div className="addproduct-itemfield">
            <p>Mã vạch</p>
            <input
              type="text"
              name="barcode"
              value={productDetails.barcode}
              onChange={changeHandler}
              placeholder="Nhập mã vạch"
              className={barcodeError ? "input-error" : ""}
            />
            {barcodeError && <span className="error-text">{barcodeError}</span>}
          </div>

          <div className="addproduct-itemfield-row">
            <div className="addproduct-itemfield">
              <p>Giá nhập (VNĐ)</p>
              <input
                type="number"
                name="priceImport"
                value={productDetails.priceImport}
                onChange={changeHandler}
                placeholder="Nhập giá nhập"
              />
            </div>
            <div className="addproduct-itemfield">
              <p>Phân loại</p>
              <select
                name="category"
                value={productDetails.category}
                onChange={changeHandler}
                className="add-product-selector"
              >
                <option value="">Chọn phân loại</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Trẻ em">Trẻ em</option>
              </select>
            </div>
          </div>

          <div className="addproduct-itemfield-row">
            <div className="addproduct-itemfield">
              <p>Kiểu dáng</p>
              <input
                type="text"
                name="style"
                value={productDetails.style}
                onChange={changeHandler}
                placeholder="Ví dụ: Áo sơ mi, Quần jeans..."
              />
            </div>
            <div className="addproduct-itemfield">
              <p>Màu sắc</p>
              <input
                type="text"
                name="color"
                value={productDetails.color}
                onChange={changeHandler}
                placeholder="Ví dụ: Đỏ, Xanh..."
              />
            </div>
          </div>

          <div className="addproduct-itemfield">
            <p>Chất liệu</p>
            <input
              type="text"
              name="material"
              value={productDetails.material}
              onChange={changeHandler}
              placeholder="Ví dụ: Cotton, Len..."
            />
          </div>

          <div className="addproduct-itemfield">
            <p>Mô tả</p>
            <textarea
              name="description"
              value={productDetails.description}
              onChange={changeHandler}
              placeholder="Mô tả sản phẩm..."
              rows="4"
              className="add-product-textarea"
            />
          </div>

          <div className="addproduct-itemfield">
            <p>Danh sách size</p>
            <div className="size-input-group">
              <input
                type="text"
                value={sizeInput}
                onChange={(e) => setSizeInput(e.target.value)}
                placeholder="VD: S, M, 38..."
              />
              <button type="button" onClick={addSize} className="size-add-btn">
                + Thêm
              </button>
            </div>
            <ul className="size-list">
              {productDetails.sizes.map((s, i) => (
                <li key={i}>
                  {s}
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeSize(i)}
                  >
                    X
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="addproduct-itemfield">
            <label htmlFor="file-input">
              <img
                src={image ? URL.createObjectURL(image) : upload_area}
                alt="Thumbnail"
                className="addproduct-thumbnail-img"
              />
            </label>
            <input
              onChange={imageHandler}
              type="file"
              name="image"
              id="file-input"
              hidden
            />
          </div>

          <button onClick={Add_Product} className="addproduct-btn">
            Thêm sản phẩm
          </button>
        </>
      ) : (
        <div className="addproduct-itemfield">
          <label htmlFor="bulk-file-input" className="upload-area">
            <img
              src={upload_area}
              alt="Upload XLSX/CSV"
              className="addproduct-thumbnail-img"
            />
            <span className="upload-area-text">
              {bulkFile ? "Thay file XLSX/CSV" : "Chọn file XLSX/CSV"}
            </span>
          </label>
          <input
            type="file"
            accept=".xlsx,.csv"
            id="bulk-file-input"
            onChange={handleBulkImport}
            hidden
          />
          {bulkFile && (
            <span className="image-selected">{bulkFile.name}</span>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Chỉnh sửa sản phẩm</h2>
              <button
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <table className="bulk-table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Phân loại</th>
                  <th>Giá nhập</th>
                  <th>Mã vạch</th>
                  <th>Kiểu dáng</th>
                  <th>Màu sắc</th>
                  <th>Chất liệu</th>
                  <th>Mô tả</th>
                  <th>Sizes</th>
                  <th>Ảnh</th>
                  <th>Trạng thái</th>
                  <th>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {bulkProducts.map((p, index) => (
                  <tr
                    key={index}
                    className={p.status && !p.status.success ? "row-error" : ""}
                  >
                    <td>
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) =>
                          updateBulkProduct(index, "name", e.target.value)
                        }
                        placeholder="Tên sản phẩm"
                      />
                    </td>
                    <td>
                      <select
                        value={p.category}
                        onChange={(e) =>
                          updateBulkProduct(index, "category", e.target.value)
                        }
                      >
                        <option value="">Chọn phân loại</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Trẻ em">Trẻ em</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={p.priceImport}
                        onChange={(e) =>
                          updateBulkProduct(index, "priceImport", e.target.value)
                        }
                        placeholder="Giá nhập"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={p.barcode}
                        onChange={(e) =>
                          updateBulkProduct(index, "barcode", e.target.value)
                        }
                        placeholder="Mã vạch"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={p.style}
                        onChange={(e) =>
                          updateBulkProduct(index, "style", e.target.value)
                        }
                        placeholder="Kiểu dáng"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={p.color}
                        onChange={(e) =>
                          updateBulkProduct(index, "color", e.target.value)
                        }
                        placeholder="Màu sắc"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={p.material}
                        onChange={(e) =>
                          updateBulkProduct(index, "material", e.target.value)
                        }
                        placeholder="Chất liệu"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={p.description}
                        onChange={(e) =>
                          updateBulkProduct(index, "description", e.target.value)
                        }
                        placeholder="Mô tả"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={p.sizes.join(", ")}
                        onChange={(e) =>
                          updateBulkProduct(index, "sizes", e.target.value)
                        }
                        placeholder="Sizes (cách nhau bởi dấu phẩy)"
                      />
                    </td>
                    <td>
                      <label htmlFor={`bulk-file-input-${index}`} className="upload-area">
                        <img
                          src={p.imageFile ? URL.createObjectURL(p.imageFile) : upload_area}
                          alt="Upload"
                          className="addproduct-thumbnail-img"
                        />
                        <span className="upload-area-text">
                          {p.imageFile ? "Thay ảnh" : "Chọn ảnh"}
                        </span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        id={`bulk-file-input-${index}`}
                        onChange={(e) => setBulkImage(index, e.target.files[0])}
                        hidden
                      />
                      {p.imageFile && (
                        <span className="image-selected">{p.imageFile.name}</span>
                      )}
                    </td>
                    <td className="status-cell">
                      {p.status ? (
                        p.status.success ? (
                          <span className="status-success">
                            ✅ {p.status.message}
                          </span>
                        ) : (
                          <span className="status-error">
                            ❌ {p.status.message}
                          </span>
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="remove-product-btn"
                        onClick={() => removeBulkProduct(index)}
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={Add_Bulk_Products} className="addproduct-btn">
              Thêm tất cả sản phẩm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddProduct;
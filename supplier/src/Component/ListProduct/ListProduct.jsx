import React, { useEffect, useState } from "react";
import "./ListProduct.css";
import cross_icon from "../../assets/cross_icon.png";

const formatPrice = (price) => {
  return price ? price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "0";
};

const defaultImage = "/default-image.png";

const ListProduct = () => {
  const [products, setProducts] = useState([]);

  // Lấy danh sách sản phẩm của supplier
  const fetchProducts = async () => {
    const supplierId = localStorage.getItem("supplierId");
    if (!supplierId) return alert("Bạn chưa đăng nhập nhà cung cấp!");

    try {
      const res = await fetch(
        `http://localhost:4000/getproductsbysupplier/${supplierId}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Lỗi khi lấy sản phẩm:", error);
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Xóa sản phẩm
  const remove_product = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
    try {
      await fetch("http://localhost:4000/removeproduct", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: id }),
      });
      fetchProducts();
    } catch (error) {
      console.error("Lỗi khi xóa sản phẩm:", error);
    }
  };

  return (
    <div className="list-product">
      <h1 className="listproduct-title">Sản phẩm của bạn</h1>

      {products.length > 0 ? (
        <div className="product-grid">
          {products.map((product) => (
            <div className="product-card" key={product._id}>
              <div className="product-image-wrapper">
                <img
                  src={product.image || defaultImage}
                  alt={product.name}
                  className="product-card-img"
                />
                <img
                  onClick={() => remove_product(product._id)}
                  src={cross_icon}
                  alt="Xóa"
                  className="remove-icon"
                />
              </div>
              <div className="product-card-info">
                <h3>{product.name}</h3>
                <p className="category">Phân loại: {product.category}</p>
                <p className="price">
                  Giá nhập: {formatPrice(product.importPrice)} đ
                </p>
                <p className="style">Kiểu dáng: {product.style || "N/A"}</p>
                <p className="color">Màu sắc: {product.color || "N/A"}</p>
                <p className="material">Chất liệu: {product.material || "N/A"}</p>

                <div className="sizes">
                  {product.sizes && product.sizes.length > 0 ? (
                    product.sizes.map((s, i) => (
                      <span key={i} className="size-tag">
                        {s}
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
        <p className="empty-text">Bạn chưa có sản phẩm nào.</p>
      )}
    </div>
  );
};

export default ListProduct;
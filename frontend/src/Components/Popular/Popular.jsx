import React, { useContext, useMemo } from "react";
import './Popular.css';
import Item from "../Item/Item";
import { ShopContext } from "../../Context/ShopContext.jsx";

const Popular = () => {
  const { all_product, error } = useContext(ShopContext);

  // Sử dụng useMemo để tối ưu hóa lọc sản phẩm
  const popularProducts = useMemo(() => {
    return all_product
      .filter((item) => item.category === "Nữ" && item.available)
      .slice(0, 4);
  }, [all_product]);

  // Kiểm tra trạng thái loading
  const isLoading = !error && all_product.length === 0;

  return (
    <div className="popular">
      <h1>Phổ biến</h1>
      <hr />
      {isLoading ? (
        <div className="loading">Đang tải sản phẩm...</div>
      ) : error ? (
        <div className="error">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '10px', padding: '8px 16px' }}
          >
            Thử lại
          </button>
        </div>
      ) : popularProducts.length > 0 ? (
        <div className="popular-item">
          {popularProducts.map((item) => (
            <Item
              key={item._id}
              id={item._id}
              name={item.name}
              image={item.image}
              sellingPrice={item.sellingPrice}
              importPrice={item.importPrice} // Đảm bảo khớp với endpoint
              available={item.available}
            />
          ))}
        </div>
      ) : (
        <p>Không có sản phẩm phổ biến nào.</p>
      )}
    </div>
  );
};

export default Popular;
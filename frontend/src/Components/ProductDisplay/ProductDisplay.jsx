import React, { useContext, useState } from "react";
import './ProductDisplay.css';
import star_icon from "../Assets/star_icon.png";
import star_dull_icon from "../Assets/star_dull_icon.png";
import { ShopContext } from "../../Context/ShopContext";

const formatPrice = (price) => {
  return Number(price || 0).toLocaleString("vi-VN");
};

const ProductDisplay = ({ product }) => {
  const { addToCart } = useContext(ShopContext);
  const [selectedSize, setSelectedSize] = useState(product.stock?.[0]?.size || "S");

  // Generate star rating dynamically (assuming product.rating is a number from 0 to 5)
  const renderStars = (rating = 4) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <img
          key={i}
          src={i <= rating ? star_icon : star_dull_icon}
          alt={i <= rating ? "filled star" : "empty star"}
        />
      );
    }
    return stars;
  };

  return (
    <div className="productdisplay">
      <div className="productdisplay-left">
        <div className="productdisplay-img-list">
          {/* Use product.images if available, fallback to single image */}
          {[product.image, product.image, product.image, product.image].map((img, index) => (
            <img key={index} src={img} alt={`${product.name} ${index + 1}`} />
          ))}
        </div>
        <div className="productdisplay-img">
          <img className="productdisplay-main-img" src={product.image} alt={product.name} />
        </div>
      </div>
      <div className="productdisplay-right">
        <h1>{product.name}</h1>
        <div className="productdisplay-right-stars">
          {renderStars(product.rating)}
          <span>({product.reviews?.length || 122})</span>
        </div>
        <div className="productdisplay-right-prices">
          {product.importPrice && (
            <div className="productdisplay-right-price-old">
              {formatPrice(product.importPrice)}đ
            </div>
          )}
          <div className="productdisplay-right-price-new">
            {formatPrice(product.sellingPrice || product.importPrice * 1.2)}đ
          </div>
        </div>
        <div className="productdisplay-right-description">
          {product.description || "Áo sơ mi nhẹ, dệt kim, chui đầu, bó sát, có đường viền cổ tròn và tay áo ngắn, mặc bên trong hoặc áo khoác ngoài."}
        </div>
        <div className="productdisplay-right-sizes">
          <h2>Chọn Size</h2>
          <div className="productdisplay-right-size">
            {product.stock?.map((s) => (
              <div
                key={s.size}
                className={`size-option ${selectedSize === s.size ? "size-selected" : ""} ${s.quantity <= 0 ? "size-disabled" : ""}`}
                onClick={() => s.quantity > 0 && setSelectedSize(s.size)}
                title={s.quantity > 0 ? `Còn ${s.quantity} sản phẩm` : "Hết hàng"}
              >
                {s.size} {s.quantity > 0 && <span>({s.quantity})</span>}
              </div>
            ))}
          </div>
        </div>
        <button
          className="add-to-cart-btn"
          onClick={() => product.available && addToCart(product._id, selectedSize)}
          disabled={!product.available}
        >
          Thêm vào giỏ hàng
        </button>
        <p className="productdisplay-right-category">
          <span>Phân loại: </span>{product.category || "Nam"}, {product.style || "Dài tay"}
        </p>
        <p className="productdisplay-right-category">
          <span>Gắn thẻ: </span>Hiện đại, Mới nhất
        </p>
      </div>
    </div>
  );
};

export default ProductDisplay;
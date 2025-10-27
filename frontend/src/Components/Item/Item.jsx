import React from "react";
import "./Item.css";
import { Link } from "react-router-dom";

// Hàm formatPrice cải tiến
const formatPrice = (price) => {
  if (price === undefined || price === null || isNaN(price) || price <= 0) {
    console.warn("Invalid price:", price);
    return "0";
  }
  return Number(price).toLocaleString("vi-VN");
};

const Item = ({ id, image, name, sellingPrice, importPrice, available }) => {
  console.log("Item props:", { id, name, sellingPrice, importPrice, available });

  // Tính giá bán an toàn
  const safeSellingPrice = Number(sellingPrice) || 0;
  const safeImportPrice = Number(importPrice) || 0;
  const displayPrice = safeSellingPrice || (safeImportPrice * 1.2);
  // Giá gạch bỏ: giả định giá gốc cao hơn giá bán (1.5x importPrice nếu không có sellingPrice)
  const originalPrice = safeSellingPrice ? safeSellingPrice * 1.2 : safeImportPrice * 1.5;

  return (
    <div className="item">
      <Link to={`/product/${id}`}>
        <img
          onClick={() => window.scrollTo(0, 0)}
          src={image || "https://via.placeholder.com/150?text=No+Image"}
          alt={name}
        />
      </Link>
      <p>{name}</p>
      <div className="item-prices">
        <div className="item-price-new">{formatPrice(displayPrice)} đ</div>
        {displayPrice > 0 && originalPrice > displayPrice && (
          <div className="item-price-old">{formatPrice(originalPrice)} đ</div>
        )}
      </div>
      {!available && <div className="item-unavailable">Hết hàng</div>}
    </div>
  );
};

export default Item;

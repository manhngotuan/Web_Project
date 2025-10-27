// RelatedProducts.jsx
import React, { useEffect, useState } from "react";
import './RelatedProducts.css';
import Item from "../Item/Item";

const RelatedProducts = ({ category }) => {
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:4000/api/products?category=${category || 'Nam'}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.success && Array.isArray(data.products)) {
          setRelatedProducts(data.products.slice(0, 4));
          setError(null);
        } else {
          setRelatedProducts([]);
          setError(data.message || "Không thể tải sản phẩm tương tự");
        }
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setRelatedProducts([]);
        setError("Không thể kết nối đến server. Vui lòng thử lại.");
      });
  }, [category]);

  return (
    <div className="relatedproducts">
      <h1>Sản phẩm tương tự</h1>
      <hr />
      {error ? (
        <p className="error">{error}</p>
      ) : relatedProducts.length > 0 ? (
        <div className="relatedproducts-item">
          {relatedProducts.map((item, i) => (
            <Item
              key={item._id || i}
              id={item._id}
              name={item.name}
              image={item.image}
              sellingPrice={item.sellingPrice}
              importPrice={item.importPrice}
              available={item.available}
            />
          ))}
        </div>
      ) : (
        <p>Không có sản phẩm tương tự.</p>
      )}
    </div>
  );
};

export default RelatedProducts;
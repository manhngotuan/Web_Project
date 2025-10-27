// NewCollections.jsx
import React, { useEffect, useState } from "react";
import './NewCollections.css';
import Item from '../Item/Item';

const NewCollections = () => {
  const [new_collection, setNew_collection] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:4000/newproducts')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("New products API:", data);
        if (data.success && Array.isArray(data.products)) {
          setNew_collection(data.products);
          setError(null);
        } else {
          setNew_collection([]);
          setError(data.message || "Không thể tải sản phẩm mới");
        }
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setNew_collection([]);
        setError("Không thể kết nối đến server. Vui lòng thử lại.");
      });
  }, []);

  return (
    <div className="new-collections">
      <h1>Bộ sưu tập mới</h1>
      <hr />
      {error ? (
        <p className="error">{error}</p>
      ) : new_collection.length > 0 ? (
        <div className="collections">
          {new_collection.map((item, i) => (
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
        <p>Không có sản phẩm mới nào.</p>
      )}
    </div>
  );
};

export default NewCollections;
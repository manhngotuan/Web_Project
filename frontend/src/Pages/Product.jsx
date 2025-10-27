import React, { useContext, useState, useEffect } from "react";
import { ShopContext } from "../Context/ShopContext";
import { useParams } from "react-router-dom";
import Breadcrum from "../Components/Breadcrums/Breadcrum";
import ProductDisplay from "../Components/ProductDisplay/ProductDisplay";
import DescriptionBox from "../Components/DescriptionBox/DescriptionBox";
import RelatedProducts from "../Components/RelatedProducts/RelatedProducts";

const Product = () => {
  const { productId } = useParams();
  const { all_product } = useContext(ShopContext);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:4000/product/${productId}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setProduct(data.product);
          setError(null);
        } else {
          throw new Error(data.message || "Không tìm thấy sản phẩm.");
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        if (retryCount < maxRetries) {
          // Retry the request after a delay
          setTimeout(() => {
            setRetryCount(retryCount + 1);
          }, 1000);
        } else {
          setError(err.message || "Lỗi khi lấy thông tin sản phẩm. Vui lòng thử lại sau.");
        }
      } finally {
        setLoading(false);
      }
    };

    // Check if product exists in all_product to avoid unnecessary API calls
    const cachedProduct = all_product.find((e) => e._id === productId);
    if (cachedProduct) {
      setProduct(cachedProduct);
      setLoading(false);
      setError(null);
    } else {
      fetchProduct();
    }
  }, [productId, all_product, retryCount]);

  // Validate product data before rendering components
  const isValidProduct = product && product._id && product.category;

  return (
    <div className="product-page">
      {loading ? (
        <div className="loading">Đang tải sản phẩm...</div>
      ) : error ? (
        <div className="error">
          {error}
          <button
            onClick={() => {
              setRetryCount(0);
              setError(null);
              setLoading(true);
            }}
            style={{ marginTop: "10px", padding: "8px 16px" }}
          >
            Thử lại
          </button>
        </div>
      ) : !isValidProduct ? (
        <div className="error">Sản phẩm không tồn tại hoặc dữ liệu không hợp lệ.</div>
      ) : (
        <>
          <Breadcrum product={product} />
          <ProductDisplay product={product} />
          <DescriptionBox description={product.description} />
          <RelatedProducts category={product.category} />
        </>
      )}
    </div>
  );
};

export default Product;
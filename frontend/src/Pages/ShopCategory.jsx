import React, { useContext, useState, useEffect } from "react";
import "./CSS/ShopCategory.css";
import { ShopContext } from "../Context/ShopContext";
import Item from "../Components/Item/Item";

const ShopCategory = (props) => {
  const { all_product, error, refetch } = useContext(ShopContext);
  const [sortOption, setSortOption] = useState("default");
  const [filters, setFilters] = useState({
    colors: [],
    sizes: [],
    styles: [],
    materials: [],
  });
  const [availableFilters, setAvailableFilters] = useState({
    colors: [],
    sizes: [],
    styles: [],
    materials: [],
  });

  // Lọc sản phẩm theo category trước
  const categoryProducts = all_product.filter(
    (item) => item.category && item.category.toLowerCase() === props.category.toLowerCase()
  );

  // Thu thập các giá trị filter khả dụng từ sản phẩm trong category
  useEffect(() => {
    const colorsSet = new Set();
    const sizesSet = new Set();
    const stylesSet = new Set();
    const materialsSet = new Set();

    categoryProducts.forEach((item) => {
      if (item.color && typeof item.color === "string") colorsSet.add(item.color);
      if (item.sizes && Array.isArray(item.sizes)) {
        item.sizes.forEach((sizeObj) => {
          if (sizeObj.size && typeof sizeObj.size === "string") sizesSet.add(sizeObj.size);
        });
      }
      if (item.style && typeof item.style === "string") stylesSet.add(item.style);
      if (item.material && typeof item.material === "string") materialsSet.add(item.material);
    });

    setAvailableFilters({
      colors: Array.from(colorsSet),
      sizes: Array.from(sizesSet),
      styles: Array.from(stylesSet),
      materials: Array.from(materialsSet),
    });

    // Debug: Kiểm tra availableFilters
    console.log("Available Filters:", {
      colors: Array.from(colorsSet),
      sizes: Array.from(sizesSet),
      styles: Array.from(stylesSet),
      materials: Array.from(materialsSet),
    });
  }, [props.category, all_product]);

  // Xử lý thay đổi filter
  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (newFilters[filterType].includes(value)) {
        newFilters[filterType] = newFilters[filterType].filter((v) => v !== value);
      } else {
        newFilters[filterType] = [...newFilters[filterType], value];
      }
      // Debug: Kiểm tra filters sau khi thay đổi
      console.log("Updated Filters:", newFilters);
      return newFilters;
    });
  };

  // Áp dụng filters
  const filteredProducts = categoryProducts.filter((item) => {
    const colorMatch =
      filters.colors.length === 0 ||
      (item.color && typeof item.color === "string" && filters.colors.includes(item.color));
    const sizeMatch =
      filters.sizes.length === 0 ||
      (item.sizes &&
        Array.isArray(item.sizes) &&
        item.sizes.some((sizeObj) => sizeObj.size && filters.sizes.includes(sizeObj.size)));
    const styleMatch =
      filters.styles.length === 0 ||
      (item.style && typeof item.style === "string" && filters.styles.includes(item.style));
    const materialMatch =
      filters.materials.length === 0 ||
      (item.material && typeof item.material === "string" && filters.materials.includes(item.material));

    return colorMatch && sizeMatch && styleMatch && materialMatch;
  });

  // Debug: Kiểm tra filteredProducts
  useEffect(() => {
    console.log("Filtered Products:", filteredProducts);
  }, [filteredProducts]);

  // Sắp xếp sản phẩm sau khi filter
  let sortedProducts = [...filteredProducts];
  if (sortOption === "price-asc") {
    sortedProducts = sortedProducts.sort(
      (a, b) => (a.sellingPrice || a.importPrice * 1.2) - (b.sellingPrice || b.importPrice * 1.2)
    );
  } else if (sortOption === "price-desc") {
    sortedProducts = sortedProducts.sort(
      (a, b) => (b.sellingPrice || b.importPrice * 1.2) - (a.sellingPrice || a.importPrice * 1.2)
    );
  } else if (sortOption === "newest") {
    sortedProducts = sortedProducts.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  const bannerImage = props.banner || "https://via.placeholder.com/1200x300?text=Default+Banner";

  return (
    <div className="shop-category">
      <img className="shopcategory-banner" src={bannerImage} alt={`${props.category} banner`} />
      <div className="shopcategory-content">
        {/* Sidebar filters bên trái */}
        <div className="shopcategory-filters">
          <h3>Bộ lọc</h3>

          {/* Filter Màu sắc */}
          {availableFilters.colors.length > 0 && (
            <div className="filter-section">
              <h4>Màu sắc</h4>
              {availableFilters.colors.map((color) => (
                <div key={`color-${color}`} className="filter-item">
                  <input
                    type="checkbox"
                    id={`color-${color}`}
                    checked={filters.colors.includes(color)}
                    onChange={() => handleFilterChange("colors", color)}
                  />
                  <label htmlFor={`color-${color}`}>{color}</label>
                </div>
              ))}
            </div>
          )}

          {/* Filter Kích cỡ */}
          {availableFilters.sizes.length > 0 && (
            <div className="filter-section">
              <h4>Kích cỡ</h4>
              {availableFilters.sizes.map((size) => (
                <div key={`size-${size}`} className="filter-item">
                  <input
                    type="checkbox"
                    id={`size-${size}`}
                    checked={filters.sizes.includes(size)}
                    onChange={() => handleFilterChange("sizes", size)}
                  />
                  <label htmlFor={`size-${size}`}>{size}</label>
                </div>
              ))}
            </div>
          )}

          {/* Filter Kiểu dáng */}
          {availableFilters.styles.length > 0 && (
            <div className="filter-section">
              <h4>Kiểu dáng</h4>
              {availableFilters.styles.map((style) => (
                <div key={`style-${style}`} className="filter-item">
                  <input
                    type="checkbox"
                    id={`style-${style}`}
                    checked={filters.styles.includes(style)}
                    onChange={() => handleFilterChange("styles", style)}
                  />
                  <label htmlFor={`style-${style}`}>{style}</label>
                </div>
              ))}
            </div>
          )}

          {/* Filter Chất liệu */}
          {availableFilters.materials.length > 0 && (
            <div className="filter-section">
              <h4>Chất liệu</h4>
              {availableFilters.materials.map((material) => (
                <div key={`material-${material}`} className="filter-item">
                  <input
                    type="checkbox"
                    id={`material-${material}`}
                    checked={filters.materials.includes(material)}
                    onChange={() => handleFilterChange("materials", material)}
                  />
                  <label htmlFor={`material-${material}`}>{material}</label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nội dung chính */}
        <div className="shopcategory-main">
          <div className="shopcategory-indexSort">
            <p>
              <span>Hiển thị 1-{Math.min(sortedProducts.length, 12)}</span> trong số{" "}
              {sortedProducts.length} sản phẩm
            </p>
            <div className="shopcategory-sort">
              <label htmlFor="sort-select">Sắp xếp theo:</label>
              <select
                id="sort-select"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="sort-select"
              >
                <option value="default">Mặc định</option>
                <option value="price-asc">Giá: Thấp đến Cao</option>
                <option value="price-desc">Giá: Cao đến Thấp</option>
                <option value="newest">Mới nhất</option>
              </select>
            </div>
          </div>
          {error ? (
            <div className="error">
              {error}
              <button onClick={refetch} style={{ marginTop: "10px", padding: "8px 16px" }}>
                Thử lại
              </button>
            </div>
          ) : sortedProducts.length > 0 ? (
            <div className="shopcategory-product">
              {sortedProducts.slice(0, 12).map((item) => (
                <Item
                  key={item._id}
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
            <p>Không có sản phẩm nào trong danh mục {props.category}.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopCategory;
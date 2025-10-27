import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./Component/Navbar/Navbar";
import Suppliers from "./Pages/Suppliers/Suppliers";
import SupplierLoginSignup from "./Pages/Suppliers/LoginSignup";

const App = () => {
  const token = localStorage.getItem("supplier-auth-token");

  return (
    <div>
      <Navbar />
      <Routes>
        {/* Trang login Supplier */}
        <Route path="/supplier/login" element={<SupplierLoginSignup />} />

        {/* Các trang Supplier (chỉ cho vào nếu có token) */}
        <Route
          path="/supplier/*"
          element={token ? <Suppliers /> : <Navigate to="/supplier/login" />}
        />

        {/* Nếu gõ sai đường dẫn thì về login */}
        <Route path="*" element={<Navigate to="/supplier/login" />} />
      </Routes>
    </div>
  );
};

export default App;

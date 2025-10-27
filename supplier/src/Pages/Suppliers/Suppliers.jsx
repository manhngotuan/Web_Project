import React from "react";
import './Suppliers.css';
import Sidebar from "../../Component/Sidebar/Sidebar";
import { Routes, Route, Navigate } from "react-router-dom";
import AddProduct from "../../Component/AddProduct/AddProduct";
import ListProduct from "../../Component/ListProduct/ListProduct";
import AllOrders from "../../Component/AllOrders/AllOrders";

const Suppliers = () => {
  return (
    <div className="suppliers">
      <Sidebar />
      <Routes>
        <Route path="addproduct" element={<AddProduct />} />
        <Route path="listproduct" element={<ListProduct />} />
        <Route path="allorders" element={<AllOrders />} />
        <Route path="*" element={<Navigate to="listproduct" />} />
      </Routes>
    </div>
  );
};

export default Suppliers;

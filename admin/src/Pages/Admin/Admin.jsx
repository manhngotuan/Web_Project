import React from "react";
import './Admin.css';
import Sidebar from "../../Components/Sidebar/Sidebar";
import { Routes, Route } from "react-router-dom";
import ListProduct from "../../Components/ListProduct/ListProduct";
import AllCart from "../../Components/AllCart/AllCart";
import AllUsers from "../../Components/AllUsers/AllUsers";
import AllOrders from "../../Components/AllOrders/AllOrders";
import AddSupplier from "../../Components/AddSupplier/AddSupplier";
import SuppliersList from "../../Components/SuppliersList/SuppliersList";
import Revenue from "../../Components/Revenue/Revenue";
import Checkout from "../../Components/Checkout/Checkout";
import Inventory from "../../Components/Inventory/Inventory";
import SupplierOrders from "../../Components/SupplierOrders/SupplierOrders";

const Admin = () => {
  return (
    <div className="admin">
      <Sidebar />
      <Routes>
        <Route path='/checkout' element={<Checkout />} />
        <Route path='/inventory' element={<Inventory />} />
        <Route path='/listproduct' element={<ListProduct />} />
        <Route path='/getallcarts' element={<AllCart />} />
        <Route path='/users' element={<AllUsers />} />
        <Route path='/allorders' element={<AllOrders />} />
        <Route path='/addsupplier' element={<AddSupplier />} />
        <Route path='/supplierslist' element={<SuppliersList />} />
        <Route path='/revenue' element={<Revenue />} />
        <Route path='/supplier-orders' element={<SupplierOrders />} />
      </Routes>
    </div>
  );
};

export default Admin;
import React, { useState } from "react";
import './LoginSignup.css';

const SupplierLoginSignup = () => {
    const [state, setState] = useState("Đăng nhập");
    const [formData, setFormData] = useState({
        name: "",
        password: "",
        email: "",
        companyName: "",
        address: "",
        phone: "",
        website: ""
    });

    const changeHandler = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            state === "Đăng nhập" ? login() : signup();
        }
    };

    const login = async () => {
        let responseData;
        await fetch('http://localhost:4000/supplier/login', {
            method: 'POST',
            headers: { 
                Accept: 'application/json', 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                email: formData.email, 
                password: formData.password 
            }),
        })
        .then(res => res.json())
        .then(data => responseData = data);

        if (responseData.success) {
            // Lưu token
            if (responseData.token) {
                localStorage.setItem('supplier-auth-token', responseData.token);
            }
            // Lưu supplierId
            if (responseData.supplier && responseData.supplier._id) {
                localStorage.setItem('supplierId', responseData.supplier._id);
            }

            // Redirect
            window.location.href = "/supplier";
        } else {
            alert(responseData.message || "Đăng nhập thất bại!");
        }
    };


    const signup = async () => {
        let responseData;
        await fetch('http://localhost:4000/supplier/signup', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: formData.name,
                companyName: formData.companyName,
                address: formData.address,
                phone: formData.phone,
                email: formData.email,
                website: formData.website,
                password: formData.password
            }),
        })
        .then(res => res.json())
        .then(data => responseData = data);

        if (responseData.success) {
            // lưu token để App.jsx kiểm tra
            if (responseData.token) {
            localStorage.setItem('supplier-auth-token', responseData.token);
            }
            // vẫn lưu supplierId nếu cần
            if (responseData.supplier && responseData.supplier._id) {
            localStorage.setItem('supplierId', responseData.supplier._id);
            }
            // redirect đến trang supplier (giữ route bảo vệ trong App.jsx)
            window.location.href = "/supplier";
        } else {
            alert(responseData.message || "Thao tác thất bại!");
        }
    };

    return (
        <div className="loginsignup">
            <div className="loginsignup-container">
                <h1>{state} (Nhà cung cấp)</h1>
                <div className="loginsignup-fields" onKeyDown={handleKeyDown}>
                    {state === "Đăng ký" && (
                        <>
                            <input name='name' value={formData.name} onChange={changeHandler} type="text" placeholder="Tên người đại diện" />
                            <input name='companyName' value={formData.companyName} onChange={changeHandler} type="text" placeholder="Tên công ty" />
                            <input name='address' value={formData.address} onChange={changeHandler} type="text" placeholder="Địa chỉ công ty" />
                            <input name='phone' value={formData.phone} onChange={changeHandler} type="text" placeholder="Số điện thoại" />
                            <input name='website' value={formData.website} onChange={changeHandler} type="text" placeholder="Website công ty" />
                        </>
                    )}
                    <input name='email' value={formData.email} onChange={changeHandler} type="email" placeholder="Địa chỉ Email" />
                    <input name='password' value={formData.password} onChange={changeHandler} type="password" placeholder="Mật khẩu" />
                </div>
                <button onClick={() => state === "Đăng nhập" ? login() : signup()}>Tiếp tục</button>
                {state === "Đăng ký"
                    ? <p className="switch-text">Đã có tài khoản? <span className="switch-link" onClick={() => setState("Đăng nhập")}>Đăng nhập</span></p>
                    : <p className="switch-text">Tạo tài khoản? <span className="switch-link" onClick={() => setState("Đăng ký")}>Đăng ký</span></p>}
            </div>
        </div>
    );
};

export default SupplierLoginSignup;

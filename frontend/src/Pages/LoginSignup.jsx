import React, { useState } from "react";
import './CSS/LoginSignup.css';
import provincesData from '../Pages/LocalData/mongo_data_vn_unit.json';
import checkIcon from "../Components/Assets/check.png";

const LoginSignup = () => {
  const [state, setState] = useState("Đăng nhập");
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    phone: "",
    street: "",
    ward: "",
    province: ""
  });

  const [wards, setWards] = useState([]);
  const [validEmail, setValidEmail] = useState(true);
  const [emailChecked, setEmailChecked] = useState(false);

  const changeHandler = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === "province") {
      const selectedProvince = provincesData.find(p => p.FullName === value);
      setWards(selectedProvince?.Wards || []);
      setFormData(prev => ({ ...prev, province: value, ward: "" }));
    }

    if (name === "email" && state === "Đăng ký") {
      const regex = /\S+@\S+\.\S+/;
      if (regex.test(value)) {
        fetch("http://localhost:4000/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: value }),
        })
          .then(r => r.json())
          .then(data => {
            setValidEmail(!data.exists);
            setEmailChecked(true);
          })
          .catch(() => {
            setValidEmail(false);
            setEmailChecked(true);
          });
      } else {
        setValidEmail(false);
        setEmailChecked(false);
      }
    }
  };

  const login = async () => {
    let responseData;
    await fetch('http://localhost:4000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email, password: formData.password }),
    }).then(r => r.json()).then(data => responseData = data);

    if (responseData.success) {
      localStorage.setItem('auth-token', responseData.token);
      window.location.replace("/");
    } else alert(responseData.errors);
  };

  const signup = async () => {
    if (!agree) {
      alert("Bạn cần đồng ý với điều khoản và điều kiện để đăng ký.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert("Mật khẩu không khớp!");
      return;
    }
    if (!validEmail) {
      alert("Email đã được sử dụng!");
      return;
    }

    let responseData;
    const addressObj = {
      street: formData.street,
      ward: formData.ward,
      city: formData.province,
      phone: formData.phone
    };

    await fetch('http://localhost:4000/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.username,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        address: addressObj
      }),
    }).then(r => r.json()).then(data => responseData = data);

    if (responseData.success) {
      localStorage.setItem('auth-token', responseData.token);
      window.location.replace("/");
    } else alert(responseData.errors);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    state === "Đăng nhập" ? login() : signup();
  };

  return (
    <div className="loginsignup">
      <div className="loginsignup-container">
        <h1>{state}</h1>
        <form className="loginsignup-fields" onSubmit={handleSubmit}>

          {state === "Đăng ký" && (
            <>
              {/* Họ và tên */}
              <input
                name='username'
                value={formData.username}
                onChange={changeHandler}
                type="text"
                placeholder="Họ và tên"
                required
              />
            </>
          )}

          {/* Email */}
          <div className="field-with-check">
            <input
              name='email'
              value={formData.email}
              onChange={changeHandler}
              type="email"
              placeholder="Địa chỉ Email"
              required
            />
            {state === "Đăng ký" && validEmail && emailChecked && <img src={checkIcon} alt="ok" />}
          </div>
          {state === "Đăng ký" && emailChecked && !validEmail && (
            <p className="error-text">Email đã được sử dụng</p>
          )}

          {/* Password */}
          <div className="password-field">
            <input
              name='password'
              value={formData.password}
              onChange={changeHandler}
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              required
            />
            <span onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "Ẩn" : "Hiển thị"}
            </span>
          </div>

          {state === "Đăng ký" && (
            <>
              {/* Confirm password */}
              <div className="field-with-check">
                <input
                  name='confirmPassword'
                  value={formData.confirmPassword}
                  onChange={changeHandler}
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu"
                  required
                />
                {formData.confirmPassword && formData.confirmPassword === formData.password &&
                  <img src={checkIcon} alt="ok" />}
              </div>

              {/* Phone */}
              <div className="field-with-check">
                <input
                  name='phone'
                  value={formData.phone}
                  onChange={changeHandler}
                  type="text"
                  placeholder="Số điện thoại"
                  required
                />
                {formData.phone && <img src={checkIcon} alt="ok" />}
              </div>

              {/* Địa chỉ */}
              <input
                name='street'
                value={formData.street}
                onChange={changeHandler}
                type="text"
                placeholder="Số nhà / Đường"
                required
              />

              <select
                name='province'
                value={formData.province}
                onChange={changeHandler}
                required
                className="input-like"
              >
                <option value="">Chọn Tỉnh / Thành phố</option>
                {provincesData.map(p => (
                  <option key={p.Code} value={p.FullName}>{p.FullName}</option>
                ))}
              </select>

              <select
                name='ward'
                value={formData.ward}
                onChange={changeHandler}
                required
                className="input-like"
              >
                <option value="">Chọn Xã / Phường</option>
                {wards.map(w => (
                  <option key={w.Code} value={w.FullName}>{w.FullName}</option>
                ))}
              </select>

              {/* Checkbox agree */}
              <div className="loginsignup-agree">
                <div
                  className={`custom-checkbox ${agree ? "checked" : ""}`}
                  onClick={() => setAgree(!agree)}
                >
                  {agree && <img src={checkIcon} alt="checked" />}
                </div>
                <p>Tôi đồng ý với điều khoản và điều kiện.</p>
              </div>
            </>
          )}

          <button type="submit">Tiếp tục</button>
        </form>

        {state === "Đăng ký"
          ? <p className="loginsignup-login">Đã có tài khoản? <span onClick={() => setState("Đăng nhập")}>Đăng nhập</span></p>
          : <p className="loginsignup-login">Tạo tài khoản? <span onClick={() => setState("Đăng ký")}>Đăng ký</span></p>
        }
      </div>
    </div>
  );
};

export default LoginSignup;

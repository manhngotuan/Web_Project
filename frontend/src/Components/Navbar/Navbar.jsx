import React, { useContext, useRef, useState, useEffect } from "react";
import "./Navbar.css";
import logo from "../Assets/logo.png";
import cart_icon from "../Assets/cart_icon.png";
import order_icon from "../Assets/order_icon.png";
import user_icon from "../Assets/user_icon.png";
import checkIcon from "../Assets/check.png";
import { Link } from "react-router-dom";
import { ShopContext } from "../../Context/ShopContext";
import provincesData from "../../Pages/LocalData/mongo_data_vn_unit.json";

const Navbar = () => {
  const [menu, setMenu] = useState("shop");
  const { getTotalCartItems } = useContext(ShopContext);
  const menuRef = useRef();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    street: "",
    ward: "",
    province: "",
  });
  const [editMode, setEditMode] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [wards, setWards] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Lấy thông tin người dùng
  useEffect(() => {
    const token = localStorage.getItem("auth-token");
    if (token) {
      fetch("http://localhost:4000/getuser", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "auth-token": token,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            const address = data.user.addresses?.[0] || {};
            setUserData({
              name: data.user.name || "",
              email: data.user.email || "",
              phone: data.user.phone || address.phone || "",
              street: address.street || "",
              ward: address.ward || "",
              province: address.city || "",
            });
            if (address.city) {
              const selectedProvince = provincesData.find((p) => p.FullName === address.city);
              setWards(selectedProvince?.Wards || []);
            }
          } else {
            setError(data.message || "Không thể tải thông tin người dùng.");
          }
        })
        .catch((err) => {
          console.error("Lỗi khi lấy thông tin:", err);
          setError("Không thể kết nối đến server.");
        });

      fetch("http://localhost:4000/getmyorderscount", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "auth-token": token,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setOrderCount(data.count);
          }
        })
        .catch((err) => console.error("Lỗi khi lấy số đơn hàng:", err));
    }
  }, []);

  // Xử lý logout
  const handleLogout = () => {
    localStorage.removeItem("auth-token");
    window.location.replace("/");
  };

  // Xử lý thay đổi form
  const changeHandler = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
    if (name === "province") {
      const selectedProvince = provincesData.find((p) => p.FullName === value);
      setWards(selectedProvince?.Wards || []);
      setUserData((prev) => ({ ...prev, province: value, ward: "" }));
    }
  };

  // Xử lý cập nhật thông tin
  const handleProfileUpdate = async () => {
    if (!userData.name || !userData.email) {
      setError("Tên và email là bắt buộc!");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(userData.email)) {
      setError("Email không hợp lệ!");
      return;
    }
    if (userData.phone && !/^\d{10,11}$/.test(userData.phone)) {
      setError("Số điện thoại phải có 10-11 chữ số!");
      return;
    }
    const addressObj = {
      street: userData.street,
      ward: userData.ward,
      city: userData.province,
      phone: userData.phone,
    };
    try {
      const response = await fetch("http://localhost:4000/updateuser", {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("auth-token"),
        },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          address: addressObj,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage("Cập nhật thông tin thành công!");
        setError(null);
        setEditMode(false);
        setTimeout(() => {
          setSuccessMessage(null);
          setShowProfileModal(false);
        }, 2000);
      } else {
        setError(data.message || "Cập nhật thông tin thất bại.");
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật:", err);
      setError("Có lỗi khi cập nhật thông tin.");
    }
  };

  // Xử lý đổi mật khẩu
  const handlePasswordChange = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError("Vui lòng nhập đầy đủ các trường mật khẩu!");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Mật khẩu mới không khớp!");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }
    try {
      const response = await fetch("http://localhost:4000/changepassword", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("auth-token"),
        },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage("Đổi mật khẩu thành công!");
        setError(null);
        setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => {
          setSuccessMessage(null);
          setShowPasswordModal(false);
        }, 2000);
      } else {
        setError(data.message || "Đổi mật khẩu thất bại.");
      }
    } catch (err) {
      console.error("Lỗi khi đổi mật khẩu:", err);
      setError("Có lỗi khi đổi mật khẩu.");
    }
  };

  return (
    <div className="navbar">
      <div className="nav-logo">
        <img src={logo} alt="logo" />
        <p>Mn Shop</p>
      </div>
      <ul ref={menuRef} className="nav-menu">
        <li onClick={() => setMenu("shop")}>
          <Link style={{ textDecoration: "none" }} to="/">
            Trang chủ
          </Link>
          {menu === "shop" ? <hr /> : null}
        </li>
        <li onClick={() => setMenu("mens")}>
          <Link style={{ textDecoration: "none" }} to="/mens">
            Nam
          </Link>
          {menu === "mens" ? <hr /> : null}
        </li>
        <li onClick={() => setMenu("womens")}>
          <Link style={{ textDecoration: "none" }} to="/womens">
            Nữ
          </Link>
          {menu === "womens" ? <hr /> : null}
        </li>
        <li onClick={() => setMenu("kids")}>
          <Link style={{ textDecoration: "none" }} to="/kids">
            Trẻ em
          </Link>
          {menu === "kids" ? <hr /> : null}
        </li>
      </ul>
      <div className="nav-login-cart">
        {localStorage.getItem("auth-token") ? (
          <div className="user-menu">
            <span className="welcome-text">Xin chào, {userData.name}</span>
            <img
              src={user_icon}
              alt="User"
              className="user-icon"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            />
            {userMenuOpen && (
              <div className="user-dropdown">
                <button onClick={() => setShowProfileModal(true)}>Thông tin người dùng</button>
                <button onClick={() => setShowPasswordModal(true)}>Đổi mật khẩu</button>
                <button onClick={handleLogout}>Đăng xuất</button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login">
            <button>Đăng nhập</button>
          </Link>
        )}
        <div className="nav-icon-wrapper">
          <Link to="/orders">
            <img src={order_icon} alt="Orders" />
          </Link>
          {orderCount > 0 && (
            <div className={`nav-order-count ${orderCount > 0 ? "bounce" : ""}`}>
              {orderCount}
            </div>
          )}
        </div>
        <div className="nav-icon-wrapper">
          <Link to="/cart">
            <img src={cart_icon} alt="Cart" />
          </Link>
          {getTotalCartItems() > 0 && (
            <div className={`nav-cart-count ${getTotalCartItems() > 0 ? "bounce" : ""}`}>
              {getTotalCartItems()}
            </div>
          )}
        </div>
      </div>

      {/* Modal thông tin cá nhân */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Thông tin người dùng</h2>
            {error && <div className="error">{error}</div>}
            {successMessage && <div className="success">{successMessage}</div>}
            {editMode ? (
              <form>
                <label>Tên <span className="required">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={userData.name}
                  onChange={changeHandler}
                  placeholder="Nhập tên"
                />
                <label>Email <span className="required">*</span></label>
                <input
                  type="email"
                  name="email"
                  value={userData.email}
                  onChange={changeHandler}
                  placeholder="Nhập email"
                />
                <label>Số điện thoại</label>
                <input
                  type="text"
                  name="phone"
                  value={userData.phone}
                  onChange={changeHandler}
                  placeholder="Nhập số điện thoại"
                />
                <label>Số nhà / Đường</label>
                <input
                  type="text"
                  name="street"
                  value={userData.street}
                  onChange={changeHandler}
                  placeholder="Nhập số nhà / đường"
                />
                <label>Tỉnh / Thành phố</label>
                <select
                  name="province"
                  value={userData.province}
                  onChange={changeHandler}
                  className="input-like"
                >
                  <option value="">Chọn Tỉnh / Thành phố</option>
                  {provincesData.map((p) => (
                    <option key={p.Code} value={p.FullName}>
                      {p.FullName}
                    </option>
                  ))}
                </select>
                <label>Xã / Phường</label>
                <select
                  name="ward"
                  value={userData.ward}
                  onChange={changeHandler}
                  className="input-like"
                >
                  <option value="">Chọn Xã / Phường</option>
                  {wards.map((w) => (
                    <option key={w.Code} value={w.FullName}>
                      {w.FullName}
                    </option>
                  ))}
                </select>
                <div className="modal-buttons">
                  <button type="button" onClick={handleProfileUpdate}>
                    Lưu
                  </button>
                  <button type="button" className="cancel" onClick={() => setEditMode(false)}>
                    Hủy
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-display">
                <p><strong>Tên:</strong> {userData.name}</p>
                <p><strong>Email:</strong> {userData.email}</p>
                <p><strong>Số điện thoại:</strong> {userData.phone || "—"}</p>
                <p>
                  <strong>Địa chỉ:</strong>{" "}
                  {userData.street ? `${userData.street}, ${userData.ward}, ${userData.province}` : "Chưa có địa chỉ"}
                </p>
                <div className="modal-buttons">
                  <button type="button" onClick={() => setEditMode(true)}>
                    Chỉnh sửa
                  </button>
                  <button type="button" className="cancel" onClick={() => setShowProfileModal(false)}>
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal đổi mật khẩu */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Đổi mật khẩu</h2>
            {error && <div className="error">{error}</div>}
            {successMessage && <div className="success">{successMessage}</div>}
            <form>
              <label>Mật khẩu cũ <span className="required">*</span></label>
              <div className="password-field">
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                >
                  {showOldPassword ? "Ẩn" : "Hiển thị"}
                </span>
              </div>
              <label>Mật khẩu mới <span className="required">*</span></label>
              <div className="password-field">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? "Ẩn" : "Hiển thị"}
                </span>
              </div>
              <label>Xác nhận mật khẩu <span className="required">*</span></label>
              <div className="password-field">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? "Ẩn" : "Hiển thị"}
                </span>
                {passwordData.confirmPassword && passwordData.confirmPassword === passwordData.newPassword && (
                  <img className="check-icon" src={checkIcon} alt="ok" />
                )}
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={handlePasswordChange}>
                  Đổi mật khẩu
                </button>
                <button type="button" className="cancel" onClick={() => setShowPasswordModal(false)}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
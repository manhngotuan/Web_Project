import React, { useEffect, useState, useRef } from "react";
import "./Navbar.css";
import navlogo from "../../assets/nav-logo.svg";
import userIcon from "../../assets/user-interface.png";
import checkIcon from "../../assets/check.png";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [supplierData, setSupplierData] = useState({
    name: "",
    companyName: "",
    email: "",
    address: "",
    phone: "",
    website: "",
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const dropdownRef = useRef(null);

  // Kiểm tra trạng thái đăng nhập
  useEffect(() => {
    const token = localStorage.getItem("supplier-auth-token");
    if (token) {
      setIsLoggedIn(true);
      fetchSupplierData(token);
    } else {
      setIsLoggedIn(false);
      navigate("/supplier/login");
    }
  }, [navigate]);

  // Xử lý click ngoài dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lấy thông tin nhà cung cấp
  const fetchSupplierData = async (token) => {
    try {
      const response = await fetch("http://localhost:4000/getsupplier", {
        method: "GET",
        headers: {
          "auth-token": token,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
          handleLogout();
          return;
        }
        if (response.status === 404) {
          setError("Nhà cung cấp không tồn tại. Vui lòng đăng nhập lại.");
          handleLogout();
          return;
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.supplier) {
        setSupplierData({
          name: data.supplier.name || "",
          companyName: data.supplier.companyName || "",
          email: data.supplier.email || "",
          address: data.supplier.address || "",
          phone: data.supplier.phone || "",
          website: data.supplier.website || "",
        });
        setError(null);
      } else {
        setError(data.message || "Không thể tải thông tin nhà cung cấp.");
        handleLogout();
      }
    } catch (err) {
      console.error("Lỗi khi lấy thông tin:", err);
      setError("Không thể kết nối đến server. Vui lòng thử lại.");
    }
  };

  // Xử lý logout
  const handleLogout = () => {
    localStorage.removeItem("supplier-auth-token");
    setIsLoggedIn(false);
    setDropdownOpen(false);
    setProfileModalOpen(false);
    setPasswordModalOpen(false);
    setIsEditing(false);
    navigate("/supplier/login");
  };

  // Xử lý cập nhật thông tin
  const handleProfileUpdate = async () => {
    if (!supplierData.name || !supplierData.companyName || !supplierData.email || !supplierData.address || !supplierData.phone) {
      setError("Tên, tên công ty, email, địa chỉ và số điện thoại là bắt buộc!");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(supplierData.email)) {
      setError("Email không hợp lệ!");
      return;
    }
    if (!/^\d{10,11}$/.test(supplierData.phone)) {
      setError("Số điện thoại phải có 10-11 chữ số!");
      return;
    }
    if (supplierData.website && !/^https?:\/\/\S+$/.test(supplierData.website)) {
      setError("Website không hợp lệ (phải bắt đầu bằng http:// hoặc https://)!");
      return;
    }
    try {
      const response = await fetch("http://localhost:4000/updatesupplier", {
        method: "PUT",
        headers: {
          "auth-token": localStorage.getItem("supplier-auth-token"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(supplierData),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage("Cập nhật thông tin thành công!");
        setError(null);
        setIsEditing(false);
        setTimeout(() => {
          setSuccessMessage(null);
          setProfileModalOpen(false);
        }, 2000);
      } else {
        setError(data.message || "Cập nhật thông tin thất bại.");
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật:", err);
      setError("Có lỗi khi cập nhật thông tin. Vui lòng thử lại.");
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
      const response = await fetch("http://localhost:4000/changesupplierpassword", {
        method: "POST",
        headers: {
          "auth-token": localStorage.getItem("supplier-auth-token"),
          "Content-Type": "application/json",
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
          setPasswordModalOpen(false);
        }, 2000);
      } else {
        setError(data.message || "Đổi mật khẩu thất bại.");
      }
    } catch (err) {
      console.error("Lỗi khi đổi mật khẩu:", err);
      setError("Có lỗi khi đổi mật khẩu. Vui lòng thử lại.");
    }
  };

  // Xử lý thay đổi form
  const handleProfileChange = (e) => {
    setSupplierData({ ...supplierData, [e.target.name]: e.target.value });
  };

  // Xử lý nút Hủy trong modal thông tin
  const handleCancel = () => {
    if (isEditing) {
      setIsEditing(false);
      fetchSupplierData(localStorage.getItem("supplier-auth-token")); // Reset data về trạng thái ban đầu
    } else {
      setProfileModalOpen(false);
    }
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="navbar">
      <div className="nav-left">
        <img src={navlogo} alt="logo" className="nav-logo" />
      </div>
      <div className="nav-center">
        <span className="portal-title">Cổng Nhà Cung Cấp</span>
      </div>
      <div className="nav-right">
        {isLoggedIn ? (
          <div className="user-menu" ref={dropdownRef}>
            <img
              src={userIcon}
              alt="user"
              className="user-avatar"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            />
            {dropdownOpen && (
              <div className="dropdown">
                <button
                  onClick={() => {
                    setProfileModalOpen(true);
                    setDropdownOpen(false);
                    setIsEditing(false);
                  }}
                >
                  Thông tin nhà cung cấp
                </button>
                <button
                  onClick={() => {
                    setPasswordModalOpen(true);
                    setDropdownOpen(false);
                  }}
                >
                  Đổi mật khẩu
                </button>
                <button onClick={handleLogout}>Đăng xuất</button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="primary"
            onClick={() => navigate("/supplier/login")}
          >
            Đăng nhập
          </button>
        )}
      </div>

      {/* Modal thông tin nhà cung cấp */}
      {profileModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setProfileModalOpen(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Thông tin Nhà Cung Cấp</h2>
            {error && <div className="error">{error}</div>}
            {successMessage && <div className="success">{successMessage}</div>}
            <div className="modal-body">
              <label>
                Tên người đại diện <span className="required">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={supplierData.name}
                onChange={handleProfileChange}
                placeholder="Nhập tên người đại diện"
                disabled={!isEditing}
              />
              <label>
                Tên công ty <span className="required">*</span>
              </label>
              <input
                type="text"
                name="companyName"
                value={supplierData.companyName}
                onChange={handleProfileChange}
                placeholder="Nhập tên công ty"
                disabled={!isEditing}
              />
              <label>
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={supplierData.email}
                onChange={handleProfileChange}
                placeholder="Nhập email"
                disabled={!isEditing}
              />
              <label>
                Địa chỉ <span className="required">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={supplierData.address}
                onChange={handleProfileChange}
                placeholder="Nhập địa chỉ"
                disabled={!isEditing}
              />
              <label>
                Số điện thoại <span className="required">*</span>
              </label>
              <input
                type="text"
                name="phone"
                value={supplierData.phone}
                onChange={handleProfileChange}
                placeholder="Nhập số điện thoại"
                disabled={!isEditing}
              />
              <label>Website</label>
              <input
                type="text"
                name="website"
                value={supplierData.website}
                onChange={handleProfileChange}
                placeholder="Nhập website (nếu có)"
                disabled={!isEditing}
              />
            </div>
            <div className="modal-actions">
              {!isEditing ? (
                <>
                  <button className="edit" onClick={() => setIsEditing(true)}>
                    Chỉnh sửa
                  </button>
                  <button className="cancel" onClick={handleCancel}>
                    Đóng
                  </button>
                </>
              ) : (
                <>
                  <button className="save" onClick={handleProfileUpdate}>
                    Lưu thay đổi
                  </button>
                  <button className="cancel" onClick={handleCancel}>
                    Hủy
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal đổi mật khẩu */}
      {passwordModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setPasswordModalOpen(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Đổi mật khẩu</h2>
            {error && <div className="error">{error}</div>}
            {successMessage && <div className="success">{successMessage}</div>}
            <div className="modal-body">
              <label>
                Mật khẩu cũ <span className="required">*</span>
              </label>
              <div className="password-field">
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={passwordData.oldPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      oldPassword: e.target.value,
                    })
                  }
                  placeholder="Nhập mật khẩu cũ"
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                >
                  {showOldPassword ? "Ẩn" : "Hiển thị"}
                </span>
              </div>
              <label>
                Mật khẩu mới <span className="required">*</span>
              </label>
              <div className="password-field">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  placeholder="Nhập mật khẩu mới"
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? "Ẩn" : "Hiển thị"}
                </span>
              </div>
              <label>
                Xác nhận mật khẩu <span className="required">*</span>
              </label>
              <div className="password-field">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Xác nhận mật khẩu mới"
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? "Ẩn" : "Hiển thị"}
                </span>
                {passwordData.confirmPassword &&
                  passwordData.confirmPassword === passwordData.newPassword && (
                    <img
                      className="check-icon"
                      src={checkIcon}
                      alt="ok"
                    />
                  )}
              </div>
            </div>
            <div className="modal-actions">
              <button className="save" onClick={handlePasswordChange}>
                Đổi mật khẩu
              </button>
              <button
                className="cancel"
                onClick={() => setPasswordModalOpen(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
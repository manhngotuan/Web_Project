import React, { useState } from 'react';
import './Navbar.css';
import navlogo from '../../assets/nav-logo.svg';
import navProfile from '../../assets/nav-profile.png';
import checkIcon from '../../assets/check.png';

const Navbar = ({ setIsLoggedIn }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');

  const handleProfileClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
    setError(''); // Xóa lỗi khi mở dropdown
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken'); // Xóa token khi logout
    setIsLoggedIn(false);
    setIsDropdownOpen(false); // Đóng dropdown
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }
    try {
      const response = await fetch('http://localhost:4000/admin/changepassword', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await response.json();
      if (data.success) {
        alert('Đổi mật khẩu thành công!');
        setIsModalOpen(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setError('');
        setIsDropdownOpen(false); // Đóng dropdown sau khi đổi mật khẩu
      } else {
        setError(data.message || 'Đổi mật khẩu thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối đến server. Vui lòng thử lại.');
      console.error('Error changing password:', err);
    }
  };

  const openChangePasswordModal = () => {
    setIsModalOpen(true);
    setIsDropdownOpen(false); // Đóng dropdown khi mở modal
    setError(''); // Xóa lỗi khi mở modal
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setError('');
  };

  const isPasswordMatch = newPassword && confirmNewPassword && newPassword === confirmNewPassword;

  return (
    <div className="navbar">
      <img src={navlogo} alt="" className="nav-logo" />
      <div className="nav-right">
        <img
          src={navProfile}
          alt=""
          className="nav-profile"
          onClick={handleProfileClick}
          style={{ cursor: 'pointer' }}
        />
        {isDropdownOpen && (
          <div className="nav-dropdown">
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={openChangePasswordModal}>
                Đổi mật khẩu
              </button>
              <button className="dropdown-item" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </div>
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="change-password-modal">
            <form className="change-password-form" onSubmit={handleChangePassword}>
              <h2>Đổi mật khẩu</h2>
              <div className="input-group">
                <input
                  type="password"
                  placeholder="Mật khẩu cũ"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <input
                  type="password"
                  placeholder="Mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <input
                  type="password"
                  placeholder="Xác nhận mật khẩu mới"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
                {isPasswordMatch && (
                  <img src={checkIcon} alt="Check" className="check-icon" />
                )}
              </div>
              {error && <p className="error">{error}</p>}
              <div className="modal-buttons">
                <button type="submit" className="change-password-btn">
                  Xác nhận
                </button>
                <button type="button" className="cancel-btn" onClick={closeModal}>
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
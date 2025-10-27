import React, { useEffect, useState } from "react";
import Navbar from "./Components/Navbar/Navbar";
import Admin from "./Pages/Admin/Admin";
import Login from "./Pages/Login/Login";

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Kiểm tra token trong localStorage khi ứng dụng khởi động
    const token = localStorage.getItem('adminToken');
    if (token) {
      // (Tuỳ chọn) Gửi yêu cầu đến server để xác thực token nếu cần
      setIsLoggedIn(true);
    }
  }, []);

  if (!isLoggedIn) {
    return <Login setIsLoggedIn={setIsLoggedIn} />;
  }

  return (
    <div>
      <Navbar setIsLoggedIn={setIsLoggedIn} />
      <Admin />
    </div>
  );
};

export default App;
import React, { useEffect, useState } from "react";
import './AllUsers.css';

const AllUsers = () => {
    const [allUsers, setAllUsers] = useState([]);
    const [userStats, setUserStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editedUser, setEditedUser] = useState({});
    const [sortBy, setSortBy] = useState("date-desc"); // Default: sort by date descending

    // Fetch all users
    const fetchInfo = async () => {
        try {
            setLoading(true);
            const res = await fetch('http://localhost:4000/users');
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            const data = await res.json();
            const users = Array.isArray(data) ? data : data.users || [];
            setAllUsers(users);
            setError(null);
        } catch (err) {
            console.error("Lỗi khi lấy danh sách người dùng:", err);
            setError(`Không thể lấy dữ liệu người dùng. Lỗi: ${err.message}`);
            setAllUsers([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch user statistics
    const fetchUserStats = async () => {
        try {
            const [ordersRes, completedRes, canceledRes] = await Promise.all([
                fetch(`http://localhost:4000/getallorders`),
                fetch(`http://localhost:4000/getcompletedorders`),
                fetch(`http://localhost:4000/getcanceledorders`),
            ]);

            const ordersData = await ordersRes.json();
            const completedData = await completedRes.json();
            const canceledData = await canceledRes.json();

            const allOrders = ordersData.orders || [];
            const allCompleted = completedData.orders || [];
            const allCanceled = canceledData.orders || [];

            const stats = {};

            allOrders.forEach(order => {
                const userId = order.userId?._id;
                if (userId) {
                    if (!stats[userId]) {
                        stats[userId] = { totalOrders: 0, completedOrders: 0, canceledOrders: 0, totalSpent: 0 };
                    }
                    stats[userId].totalOrders += 1;
                }
            });

            allCompleted.forEach(order => {
                const userId = order.userId?._id || order.userId;
                if (userId) {
                    if (!stats[userId]) {
                        stats[userId] = { totalOrders: 0, completedOrders: 0, canceledOrders: 0, totalSpent: 0 };
                    }
                    stats[userId].totalOrders += 1;
                    stats[userId].completedOrders += 1;
                    stats[userId].totalSpent += order.totalAmount || 0;
                }
            });

            allCanceled.forEach(order => {
                const userId = order.userId?._id || order.userId;
                if (userId) {
                    if (!stats[userId]) {
                        stats[userId] = { totalOrders: 0, completedOrders: 0, canceledOrders: 0, totalSpent: 0 };
                    }
                    stats[userId].totalOrders += 1;
                    stats[userId].canceledOrders += 1;
                }
            });

            Object.keys(stats).forEach(userId => {
                const total = stats[userId].totalOrders;
                if (total > 0) {
                    stats[userId].completionRate = ((stats[userId].completedOrders / total) * 100).toFixed(2) + '%';
                    stats[userId].cancelRate = ((stats[userId].canceledOrders / total) * 100).toFixed(2) + '%';
                } else {
                    stats[userId].completionRate = '0%';
                    stats[userId].cancelRate = '0%';
                }
            });

            setUserStats(stats);
        } catch (error) {
            console.error(`Lỗi khi lấy thống kê người dùng:`, error);
        }
    };

    // Delete user
    const deleteUser = async (userId) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
            try {
                const res = await fetch(`http://localhost:4000/removeuser/${userId}`, {
                    method: 'DELETE'
                });
                const data = await res.json();
                if (data.success) {
                    alert(data.message);
                    await fetchInfo(); // Refresh user list
                } else {
                    alert("Có lỗi xảy ra khi xóa người dùng: " + data.message);
                }
            } catch (err) {
                alert("Lỗi server khi xóa người dùng.");
                console.error("Lỗi xóa người dùng:", err);
            }
        }
    };

    // Open user details modal
    const openUserDetails = (user) => {
        setSelectedUser(user);
        setEditedUser({ ...user, addresses: user.addresses ? [...user.addresses] : [] });
        setEditMode(false);
    };

    // Close modal
    const closeModal = () => {
        setSelectedUser(null);
        setEditMode(false);
    };

    // Update user
    const updateUser = async () => {
        try {
            const res = await fetch(`http://localhost:4000/updateuser/${editedUser._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editedUser)
            });
            const data = await res.json();
            if (data.success) {
                alert("Cập nhật người dùng thành công!");
                await fetchInfo(); // Refresh user list
                closeModal();
            } else {
                alert("Lỗi cập nhật: " + data.message);
            }
        } catch (err) {
            alert("Lỗi server khi cập nhật người dùng.");
            console.error("Lỗi cập nhật:", err);
        }
    };

    // Handle sorting
    const handleSort = (sortType) => {
        setSortBy(sortType);
        const sortedUsers = [...allUsers].sort((a, b) => {
            const statsA = userStats[a._id] || { totalOrders: 0, completedOrders: 0, canceledOrders: 0, totalSpent: 0, completionRate: '0%', cancelRate: '0%' };
            const statsB = userStats[b._id] || { totalOrders: 0, completedOrders: 0, canceledOrders: 0, totalSpent: 0, completionRate: '0%', cancelRate: '0%' };

            if (sortType === "date-desc") {
                return new Date(b.date) - new Date(a.date);
            } else if (sortType === "date-asc") {
                return new Date(a.date) - new Date(b.date);
            } else if (sortType === "totalOrders-desc") {
                return (statsB.totalOrders || 0) - (statsA.totalOrders || 0);
            } else if (sortType === "totalOrders-asc") {
                return (statsA.totalOrders || 0) - (statsB.totalOrders || 0);
            } else if (sortType === "completedOrders-desc") {
                return (statsB.completedOrders || 0) - (statsA.completedOrders || 0);
            } else if (sortType === "completedOrders-asc") {
                return (statsA.completedOrders || 0) - (statsB.completedOrders || 0);
            } else if (sortType === "canceledOrders-desc") {
                return (statsB.canceledOrders || 0) - (statsA.canceledOrders || 0);
            } else if (sortType === "canceledOrders-asc") {
                return (statsA.canceledOrders || 0) - (statsB.canceledOrders || 0);
            } else if (sortType === "totalSpent-desc") {
                return (statsB.totalSpent || 0) - (statsA.totalSpent || 0);
            } else if (sortType === "totalSpent-asc") {
                return (statsA.totalSpent || 0) - (statsB.totalSpent || 0);
            } else if (sortType === "completionRate-desc") {
                return parseFloat(statsB.completionRate) - parseFloat(statsA.completionRate);
            } else if (sortType === "completionRate-asc") {
                return parseFloat(statsA.completionRate) - parseFloat(statsB.completionRate);
            } else if (sortType === "cancelRate-desc") {
                return parseFloat(statsB.cancelRate) - parseFloat(statsA.cancelRate);
            } else if (sortType === "cancelRate-asc") {
                return parseFloat(statsA.cancelRate) - parseFloat(statsB.cancelRate);
            }
            return 0;
        });
        setAllUsers(sortedUsers);
    };

    // Fetch data on component mount
    useEffect(() => {
        const fetchData = async () => {
            await fetchInfo();
            await fetchUserStats();
        };
        fetchData();
    }, []);

    // Filter users based on search term
    const filteredUsers = allUsers.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="all-users">Đang tải dữ liệu...</div>;
    }

    if (error) {
        return (
            <div className="all-users error">
                <p>{error}</p>
                <button onClick={fetchInfo} className="retry-button">Thử lại</button>
            </div>
        );
    }

    return (
        <div className="all-users">
            <h1>Quản lý Người dùng</h1>
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Tìm kiếm theo tên hoặc email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="allusers-format-main">
                <p>Tên</p>
                <p>Địa chỉ</p>
                <p>SĐT</p>
                <p>Email</p>
                <p 
                    className={`sortable ${sortBy.startsWith("date") ? "active" : ""}`} 
                    onClick={() => handleSort(sortBy === "date-desc" ? "date-asc" : "date-desc")}
                >
                    Ngày đăng ký {sortBy === "date-desc" ? "▼" : sortBy === "date-asc" ? "▲" : ""}
                </p>
                <p 
                    className={`sortable ${sortBy.startsWith("totalOrders") ? "active" : ""}`} 
                    onClick={() => handleSort(sortBy === "totalOrders-desc" ? "totalOrders-asc" : "totalOrders-desc")}
                >
                    Tổng đơn {sortBy === "totalOrders-desc" ? "▼" : sortBy === "totalOrders-asc" ? "▲" : ""}
                </p>
                <p 
                    className={`sortable ${sortBy.startsWith("completedOrders") ? "active" : ""}`} 
                    onClick={() => handleSort(sortBy === "completedOrders-desc" ? "completedOrders-asc" : "completedOrders-desc")}
                >
                    Đơn hoàn thành {sortBy === "completedOrders-desc" ? "▼" : sortBy === "completedOrders-asc" ? "▲" : ""}
                </p>
                <p 
                    className={`sortable ${sortBy.startsWith("canceledOrders") ? "active" : ""}`} 
                    onClick={() => handleSort(sortBy === "canceledOrders-desc" ? "canceledOrders-asc" : "canceledOrders-desc")}
                >
                    Đơn hủy {sortBy === "canceledOrders-desc" ? "▼" : sortBy === "canceledOrders-asc" ? "▲" : ""}
                </p>
                <p 
                    className={`sortable ${sortBy.startsWith("totalSpent") ? "active" : ""}`} 
                    onClick={() => handleSort(sortBy === "totalSpent-desc" ? "totalSpent-asc" : "totalSpent-desc")}
                >
                    Tổng chi tiêu {sortBy === "totalSpent-desc" ? "▼" : sortBy === "totalSpent-asc" ? "▲" : ""}
                </p>
                <p 
                    className={`sortable ${sortBy.startsWith("completionRate") ? "active" : ""}`} 
                    onClick={() => handleSort(sortBy === "completionRate-desc" ? "completionRate-asc" : "completionRate-desc")}
                >
                    Tỷ lệ hoàn thành {sortBy === "completionRate-desc" ? "▼" : sortBy === "completionRate-asc" ? "▲" : ""}
                </p>
                <p 
                    className={`sortable ${sortBy.startsWith("cancelRate") ? "active" : ""}`} 
                    onClick={() => handleSort(sortBy === "cancelRate-desc" ? "cancelRate-asc" : "cancelRate-desc")}
                >
                    Tỷ lệ hủy {sortBy === "cancelRate-desc" ? "▼" : sortBy === "cancelRate-asc" ? "▲" : ""}
                </p>
                <p>Hành động</p>
            </div>
            <div className="allusers-allusers">
                {filteredUsers.map((user) => (
                    <React.Fragment key={user._id}>
                        <hr />
                        <div className="allusers-format">
                            <p>{user.name}</p>
                            <p>{user.addresses?.[0]?.fullAddress || 'Chưa có địa chỉ'}</p>
                            <p>{user.phone || 'Chưa có số điện thoại'}</p>
                            <p>{user.email}</p>
                            <p>{new Date(user.date).toLocaleDateString('vi-VN')}</p>
                            <p>{userStats[user._id]?.totalOrders || 0}</p>
                            <p>{userStats[user._id]?.completedOrders || 0}</p>
                            <p>{userStats[user._id]?.canceledOrders || 0}</p>
                            <p>{(userStats[user._id]?.totalSpent || 0).toLocaleString('vi-VN')} VND</p>
                            <p>{userStats[user._id]?.completionRate || '0%'}</p>
                            <p>{userStats[user._id]?.cancelRate || '0%'}</p>
                            <div className="actions">
                                <button onClick={() => openUserDetails(user)} className="view-button">Xem</button>
                                <button onClick={() => deleteUser(user._id)} className="delete-button">Xóa</button>
                            </div>
                        </div>
                    </React.Fragment>
                ))}
            </div>

            {/* Modal for user details and editing */}
            {selectedUser && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Chi tiết Người dùng: {selectedUser.name}</h2>
                        {editMode ? (
                            <>
                                <label>Tên:</label>
                                <input
                                    value={editedUser.name || ''}
                                    onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                                />
                                <label>Email:</label>
                                <input
                                    value={editedUser.email || ''}
                                    onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                                />
                                <label>SĐT:</label>
                                <input
                                    value={editedUser.phone || ''}
                                    onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                                />
                                <label>Địa chỉ (mặc định):</label>
                                <input
                                    value={editedUser.addresses?.[0]?.fullAddress || ''}
                                    onChange={(e) => {
                                        const addresses = [...editedUser.addresses];
                                        addresses[0] = { ...addresses[0], fullAddress: e.target.value };
                                        setEditedUser({ ...editedUser, addresses });
                                    }}
                                />
                                <div className="modal-actions">
                                    <button onClick={updateUser} className="save-button">Lưu</button>
                                    <button onClick={() => setEditMode(false)} className="cancel-button">Hủy</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p><strong>Email:</strong> {selectedUser.email}</p>
                                <p><strong>SĐT:</strong> {selectedUser.phone || 'Chưa có'}</p>
                                <p><strong>Ngày đăng ký:</strong> {new Date(selectedUser.date).toLocaleString('vi-VN')}</p>
                                <p><strong>Địa chỉ:</strong></p>
                                <ul>
                                    {selectedUser.addresses?.map((addr, idx) => (
                                        <li key={idx}>{addr.fullAddress}</li>
                                    )) || <li>Chưa có địa chỉ</li>}
                                </ul>
                                <p><strong>Giỏ hàng hiện tại:</strong> {selectedUser.cartData?.length || 0} sản phẩm</p>
                                <p><strong>Tổng đơn hàng:</strong> {userStats[selectedUser._id]?.totalOrders || 0}</p>
                                <p><strong>Đơn hoàn thành:</strong> {userStats[selectedUser._id]?.completedOrders || 0}</p>
                                <p><strong>Đơn hủy:</strong> {userStats[selectedUser._id]?.canceledOrders || 0}</p>
                                <p><strong>Tổng chi tiêu:</strong> {(userStats[selectedUser._id]?.totalSpent || 0).toLocaleString('vi-VN')} VND</p>
                                <p><strong>Tỷ lệ hoàn thành:</strong> {userStats[selectedUser._id]?.completionRate || '0%'}</p>
                                <p><strong>Tỷ lệ hủy:</strong> {userStats[selectedUser._id]?.cancelRate || '0%'}</p>
                                <div className="modal-actions">
                                    <button onClick={() => setEditMode(true)} className="edit-button">Chỉnh sửa</button>
                                    <button onClick={closeModal} className="close-button">Đóng</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllUsers;
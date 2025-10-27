import React, { useEffect, useState } from "react";
import { Line, Pie, Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from "chart.js";
import './Revenue.css';

// Register Chart.js components, including Filler
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const Revenue = () => {
    const [thongKe, setThongKe] = useState({
        tongDoanhThu: 0,
        tongLoiNhuan: 0,
        tongDonHang: 0,
        giaTriDonHangTB: 0,
        doanhThuThoiGian: [],
        loiNhuanSanPham: [],
        loiNhuanNhaCungCap: [],
        phanBoGiaTriDonHang: { duoi500k: 0, tu500kDen1tr: 0, tu1trDen2tr: 0, tren2tr: 0 }
    });
    const [dangTai, setDangTai] = useState(true);
    const [loi, setLoi] = useState(null);
    const [thoiGianView, setThoiGianView] = useState('month'); // 'day' or 'month'
    const [loiNhuanView, setLoiNhuanView] = useState('product'); // 'product' or 'supplier'

    // Fetch data from endpoints
    const layDuLieu = async () => {
        try {
            setDangTai(true);
            const [donHangRes, hoanThanhRes, directOrdersRes, tonKhoRes, supplierOrdersRes] = await Promise.all([
                fetch('http://localhost:4000/getallorders'),
                fetch('http://localhost:4000/getcompletedorders'),
                fetch('http://localhost:4000/directorders'), // Added DirectOrder fetch
                fetch('http://localhost:4000/getinventory'),
                fetch('http://localhost:4000/supplierorders')
            ]);

            const duLieuDonHang = await donHangRes.json();
            const duLieuHoanThanh = await hoanThanhRes.json();
            const duLieuDirectOrders = await directOrdersRes.json();
            const duLieuTonKho = await tonKhoRes.json();
            const duLieuSupplierOrders = await supplierOrdersRes.json();

            const tatCaDonHang = duLieuDonHang.orders || [];
            const donHangHoanThanh = duLieuHoanThanh.orders || [];
            const directOrders = duLieuDirectOrders.orders || [];
            const tonKho = duLieuTonKho.inventory || [];
            const supplierOrders = duLieuSupplierOrders.orders || [];

            // Validate inventory data
            const validTonKho = tonKho.filter(item => item.product && item.product._id);
            if (tonKho.length !== validTonKho.length) {
                console.warn(`Found ${tonKho.length - validTonKho.length} invalid inventory items with missing product or _id`);
            }

            // Combine completed orders and direct orders for revenue and profit calculations
            const allCompletedOrders = [...donHangHoanThanh, ...directOrders];

            // Calculate total revenue
            const tongDoanhThu = allCompletedOrders.reduce((tong, donHang) => tong + (donHang.totalAmount || 0), 0);

            // Calculate total profit
            let tongLoiNhuan = 0;
            const inventoryMap = new Map(validTonKho.map(item => [item.product._id.toString(), item]));
            
            allCompletedOrders.forEach(donHang => {
                donHang.items.forEach(item => {
                    const productIdStr = item.productId?._id ? item.productId._id.toString() : item.productId?.toString();
                    const inventory = productIdStr ? inventoryMap.get(productIdStr) : null;
                    if (inventory) {
                        const profitPerUnit = (item.price || 0) - (inventory.warehousePrice || 0);
                        tongLoiNhuan += profitPerUnit * (item.quantity || 0);
                    } else {
                        console.warn(`No inventory found for productId: ${JSON.stringify(item.productId)}`);
                    }
                });
            });

            // Total orders (including direct orders)
            const tongDonHang = tatCaDonHang.length + directOrders.length;
            const giaTriDonHangTB = tongDonHang > 0 ? tongDoanhThu / tongDonHang : 0;

            // Revenue and profit by time (day/month)
            const doanhThuThoiGianMap = {};
            const loiNhuanThoiGianMap = {};
            allCompletedOrders.forEach(donHang => {
                const ngay = new Date(donHang.completionDate || donHang.orderDate || donHang.createdAt);
                const key = thoiGianView === 'month' 
                    ? `${ngay.getFullYear()}-${String(ngay.getMonth() + 1).padStart(2, '0')}`
                    : ngay.toISOString().split('T')[0];
                doanhThuThoiGianMap[key] = (doanhThuThoiGianMap[key] || 0) + (donHang.totalAmount || 0);
                let profit = 0;
                donHang.items.forEach(item => {
                    const productIdStr = item.productId?._id ? item.productId._id.toString() : item.productId?.toString();
                    const inventory = productIdStr ? inventoryMap.get(productIdStr) : null;
                    if (inventory) {
                        const profitPerUnit = (item.price || 0) - (inventory.warehousePrice || 0);
                        profit += profitPerUnit * (item.quantity || 0);
                    }
                });
                loiNhuanThoiGianMap[key] = (loiNhuanThoiGianMap[key] || 0) + profit;
            });

            const doanhThuThoiGian = Object.entries(doanhThuThoiGianMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([thoiGian, doanhThu]) => ({ thoiGian, doanhThu, loiNhuan: loiNhuanThoiGianMap[thoiGian] || 0 }));

            // Profit by product
            const loiNhuanSanPhamMap = {};
            allCompletedOrders.forEach(donHang => {
                donHang.items.forEach(item => {
                    const productIdStr = item.productId?._id ? item.productId._id.toString() : item.productId?.toString();
                    const inventory = productIdStr ? inventoryMap.get(productIdStr) : null;
                    if (inventory) {
                        const tenSanPham = inventory.product?.name || 'Không xác định';
                        const profitPerUnit = (item.price || 0) - (inventory.warehousePrice || 0);
                        loiNhuanSanPhamMap[tenSanPham] = (loiNhuanSanPhamMap[tenSanPham] || 0) + profitPerUnit * (item.quantity || 0);
                    }
                });
            });
            const loiNhuanSanPham = Object.entries(loiNhuanSanPhamMap)
                .sort(([a, valA], [b, valB]) => valB - valA)
                .slice(0, 5)
                .map(([sanPham, loiNhuan]) => ({ sanPham, loiNhuan }));

            // Profit by supplier
            const loiNhuanNhaCungCapMap = {};
            allCompletedOrders.forEach(donHang => {
                donHang.items.forEach(item => {
                    const productIdStr = item.productId?._id ? item.productId._id.toString() : item.productId?.toString();
                    const inventory = productIdStr ? inventoryMap.get(productIdStr) : null;
                    if (inventory && inventory.product?.supplier) {
                        const supplierName = inventory.product.supplier.name || 'Không xác định';
                        const profitPerUnit = (item.price || 0) - (inventory.warehousePrice || 0);
                        loiNhuanNhaCungCapMap[supplierName] = (loiNhuanNhaCungCapMap[supplierName] || 0) + profitPerUnit * (item.quantity || 0);
                    }
                });
            });
            const loiNhuanNhaCungCap = Object.entries(loiNhuanNhaCungCapMap)
                .sort(([a, valA], [b, valB]) => valB - valA)
                .slice(0, 5)
                .map(([nhaCungCap, loiNhuan]) => ({ nhaCungCap, loiNhuan }));

            // Order value distribution (including direct orders)
            const allOrdersForDistribution = [...tatCaDonHang, ...directOrders];
            const phanBoGiaTriDonHang = {
                duoi500k: Math.round(allOrdersForDistribution.filter(d => (d.totalAmount || 0) < 500000).length / (allOrdersForDistribution.length || 1) * 100),
                tu500kDen1tr: Math.round(allOrdersForDistribution.filter(d => (d.totalAmount || 0) >= 500000 && (d.totalAmount || 0) < 1000000).length / (allOrdersForDistribution.length || 1) * 100),
                tu1trDen2tr: Math.round(allOrdersForDistribution.filter(d => (d.totalAmount || 0) >= 1000000 && (d.totalAmount || 0) < 2000000).length / (allOrdersForDistribution.length || 1) * 100),
                tren2tr: Math.round(allOrdersForDistribution.filter(d => (d.totalAmount || 0) >= 2000000).length / (allOrdersForDistribution.length || 1) * 100)
            };

            setThongKe({
                tongDoanhThu,
                tongLoiNhuan,
                tongDonHang,
                giaTriDonHangTB,
                doanhThuThoiGian,
                loiNhuanSanPham,
                loiNhuanNhaCungCap,
                phanBoGiaTriDonHang
            });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu thống kê:", err);
            setLoi("Không thể tải dữ liệu thống kê.");
        } finally {
            setDangTai(false);
        }
    };

    useEffect(() => {
        layDuLieu();
    }, [thoiGianView]);

    if (dangTai) return <div className="thong-ke-ban-hang">Đang tải dữ liệu...</div>;
    if (loi) return <div className="thong-ke-ban-hang loi">{loi}</div>;

    const dinhDangTienTe = (giaTri) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(giaTri);

    // Chart data
    const duLieuDoanhThuThoiGian = {
        labels: thongKe.doanhThuThoiGian.map(m => m.thoiGian),
        datasets: [
            {
                label: 'Doanh Thu (VND)',
                data: thongKe.doanhThuThoiGian.map(m => m.doanhThu),
                borderColor: '#4A90E2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Lợi Nhuận (VND)',
                data: thongKe.doanhThuThoiGian.map(m => m.loiNhuan),
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4
            }
        ]
    };

    const duLieuLoiNhuan = {
        labels: loiNhuanView === 'product' 
            ? thongKe.loiNhuanSanPham.map(p => p.sanPham)
            : thongKe.loiNhuanNhaCungCap.map(s => s.nhaCungCap),
        datasets: [{
            label: 'Lợi Nhuận (VND)',
            data: loiNhuanView === 'product'
                ? thongKe.loiNhuanSanPham.map(p => p.loiNhuan)
                : thongKe.loiNhuanNhaCungCap.map(s => s.loiNhuan),
            backgroundColor: '#36A2EB'
        }]
    };

    const duLieuPhanBoGiaTri = {
        labels: ['Dưới 500k', '500k-1tr', '1tr-2tr', 'Trên 2tr'],
        datasets: [{
            data: [
                thongKe.phanBoGiaTriDonHang.duoi500k,
                thongKe.phanBoGiaTriDonHang.tu500kDen1tr,
                thongKe.phanBoGiaTriDonHang.tu1trDen2tr,
                thongKe.phanBoGiaTriDonHang.tren2tr
            ],
            backgroundColor: ['#FF6384', '#36A2EB', '#4BC0C0', '#FFCE56']
        }]
    };

    const tuyChonBieuDo = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                enabled: true,
                callbacks: {
                    label: (context) => {
                        if (context.dataset.label === 'Doanh Thu (VND)' || context.dataset.label === 'Lợi Nhuận (VND)') {
                            return `${context.dataset.label}: ${dinhDangTienTe(context.raw)}`;
                        }
                        return `${context.dataset.label}: ${context.raw}`;
                    }
                }
            }
        },
        scales: {
            y: { beginAtZero: true }
        }
    };

    const tuyChonBieuDoTron = {
        responsive: true,
        plugins: {
            legend: { position: 'bottom' },
            tooltip: { enabled: true }
        }
    };

    return (
        <div className="thong-ke-ban-hang">
            <h1>Tổng quan</h1>

            {/* KPIs */}
            <div className="the-kpi">
                <div className="kpi doanh-thu">
                    <h3>Tổng Doanh Thu</h3>
                    <p>{dinhDangTienTe(thongKe.tongDoanhThu)}</p>
                </div>
                <div className="kpi loi-nhuan">
                    <h3>Tổng Lợi Nhuận</h3>
                    <p>{dinhDangTienTe(thongKe.tongLoiNhuan)}</p>
                </div>
                <div className="kpi don-hang">
                    <h3>Tổng Đơn Hàng</h3>
                    <p>{thongKe.tongDonHang}</p>
                </div>
                <div className="kpi gia-tri-tb">
                    <h3>Giá Trị Đơn Hàng TB</h3>
                    <p>{dinhDangTienTe(thongKe.giaTriDonHangTB)}</p>
                </div>
            </div>

            {/* Chart Controls */}
            <div className="chart-controls">
                <div className="control-group">
                    <label>Chọn khoảng thời gian: </label>
                    <select value={thoiGianView} onChange={(e) => setThoiGianView(e.target.value)}>
                        <option value="month">Theo Tháng</option>
                        <option value="day">Theo Ngày</option>
                    </select>
                </div>
                <div className="control-group">
                    <label>Chọn loại lợi nhuận: </label>
                    <select value={loiNhuanView} onChange={(e) => setLoiNhuanView(e.target.value)}>
                        <option value="product">Theo Sản Phẩm</option>
                        <option value="supplier">Theo Nhà Cung Cấp</option>
                    </select>
                </div>
            </div>

            {/* Chart Grid */}
            <div className="luoi-bieu-do">
                {/* Revenue and Profit Over Time */}
                <div className="khu-vuc-bieu-do">
                    <h3>Doanh Thu & Lợi Nhuận Theo {thoiGianView === 'month' ? 'Tháng' : 'Ngày'}</h3>
                    <div className="bieu-do">
                        <Line data={duLieuDoanhThuThoiGian} options={tuyChonBieuDo} />
                    </div>
                </div>

                {/* Profit by Product/Supplier */}
                <div className="khu-vuc-bieu-do">
                    <h3>Lợi Nhuận Theo {loiNhuanView === 'product' ? 'Sản Phẩm' : 'Nhà Cung Cấp'} (Top 5)</h3>
                    <div className="bieu-do">
                        <Bar data={duLieuLoiNhuan} options={{ ...tuyChonBieuDo, plugins: { legend: { display: false } } }} />
                    </div>
                </div>

                {/* Order Value Distribution */}
                <div className="khu-vuc-bieu-do">
                    <h3>Phân Bố Giá Trị Đơn Hàng</h3>
                    <div className="bieu-do">
                        <Pie data={duLieuPhanBoGiaTri} options={tuyChonBieuDoTron} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Revenue;
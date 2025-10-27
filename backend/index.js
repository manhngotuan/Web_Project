const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { error, log } = require("console");
const WebSocket = require("ws");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const robotoFont = require("./Base64");

app.use(express.json());
app.use(cors());

// Tích hợp WebSocket với server HTTP
const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

// Lưu trữ client WebSocket theo supplierId
const clients = new Map();

// Xử lý kết nối WebSocket
wss.on("connection", (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split("?")[1]);
  const supplierId = urlParams.get("supplierId");
  if (supplierId) {
    clients.set(supplierId, ws);
    console.log(`WebSocket client connected for supplierId: ${supplierId}`);

    ws.on("close", () => {
      clients.delete(supplierId);
      console.log(`WebSocket client disconnected for supplierId: ${supplierId}`);
    });
  }
});

// Cấu hình nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "cuahangmnbot@gmail.com", 
    pass: "medw vhtu aibq zfmh",
  },
});

// Database Connection with MongoDB
mongoose.connect("mongodb+srv://manhngotuan4:Sktt1.kaka@manhnt.e7mm44x.mongodb.net/project").then(async () => {
  console.log("Connected to MongoDB");

  // Khởi tạo Admin nếu chưa tồn tại
  const defaultAdminPassword = "admin123"; // Mật khẩu mặc định, có thể thay đổi sau
  let admin = await Admin.findOne();
  if (!admin) {
    admin = new Admin({ password: defaultAdminPassword });
    await admin.save();
    console.log("Admin account created with default password");
  } else {
    console.log("Admin account already exists");
  }
}).catch(err => {
  console.error("Error connecting to MongoDB:", err);
});

// Schema cho Admin
const Admin = mongoose.model("Admin", {
  password: { type: String, required: true },
});

// API Creation
app.get("/", (req, res) => {
  res.send("Express App is running");
});

// Image Storage Engine
const storage = multer.diskStorage({
  destination: './upload/images',
  filename: (req, file, cb) => {
    return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage: storage });

// Creating upload endpoint for images
app.use('/images', express.static('upload/images'));

app.post("/upload", upload.single('product'), (req, res) => {
  res.json({
    success: 1,
    image_url: `http://localhost:${port}/images/${req.file.filename}`,
  });
});

// Schema cho Supplier
const Supplier = mongoose.model("Supplier", {
  name: { type: String, required: true },
  companyName: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  website: { type: String },
  isApproved: { type: Boolean, default: false },
});

// Middleware to fetch supplier
const fetchSupplier = async (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) {
    return res.status(401).json({ success: false, message: "Không tìm thấy token." });
  }
  try {
    const data = jwt.verify(token, 'secret_ecom');
    req.supplierId = data.supplier.id;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Token không hợp lệ." });
  }
};

// GET /getsupplier
app.get('/getsupplier', fetchSupplier, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.supplierId);
    if (!supplier) return res.status(404).json({ success: false, message: "Nhà cung cấp không tồn tại" });
    res.json({ success: true, supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Count suppliers pending approval
app.get("/suppliers/pending", async (req, res) => {
  try {
    const pendingSuppliers = await Supplier.find({ isApproved: false }).countDocuments();
    res.json({ success: true, count: pendingSuppliers });
  } catch (error) {
    console.error("Lỗi khi đếm nhà cung cấp đang chờ:", error);
    res.status(500).json({ success: false, message: "Không thể đếm nhà cung cấp đang chờ" });
  }
});

// PUT /updatesupplier
app.put('/updatesupplier', fetchSupplier, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.supplierId, req.body, { new: true, runValidators: true });
    if (!supplier) return res.status(404).json({ success: false, message: "Nhà cung cấp không tồn tại" });
    res.json({ success: true, supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /changesupplierpassword
app.post('/changesupplierpassword', fetchSupplier, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.supplierId);
    if (!supplier) return res.status(404).json({ success: false, message: "Nhà cung cấp không tồn tại" });
    if (req.body.oldPassword !== supplier.password) {
      return res.status(400).json({ success: false, message: "Mật khẩu cũ không đúng" });
    }
    supplier.password = req.body.newPassword;
    await supplier.save();
    res.json({ success: true, message: "Đổi mật khẩu thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint cho Admin login
app.post("/admin/login", async (req, res) => {
  try {
    const { password } = req.body;
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin chưa được cấu hình" });
    }
    if (password === admin.password) {
      const token = jwt.sign({ admin: { id: admin._id } }, 'secret_ecom', { expiresIn: '1h' });
      return res.json({ success: true, token });
    } else {
      return res.json({ success: false, message: "Mật khẩu không đúng" });
    }
  } catch (error) {
    console.error("Lỗi đăng nhập admin:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// Endpoint để thay đổi mật khẩu admin (tuỳ chọn, để admin có thể cập nhật mật khẩu)
app.put("/admin/changepassword", async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin chưa được cấu hình" });
    }
    if (oldPassword !== admin.password) {
      return res.status(400).json({ success: false, message: "Mật khẩu cũ không đúng" });
    }
    admin.password = newPassword;
    await admin.save();
    res.json({ success: true, message: "Đổi mật khẩu admin thành công" });
  } catch (error) {
    console.error("Lỗi đổi mật khẩu admin:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// Product: gian hàng của Supplier
const Product = mongoose.model("Product", {
  name: { type: String, required: true },
  description: String,
  category: { type: String, enum: ["Nam", "Nữ", "Trẻ em"], required: true },
  priceImport: { type: Number, required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
  style: String,
  color: String,
  sizes: [
    {
      size: { type: String, required: true },
    },
  ],
  material: String,
  image: { type: String, required: true },
  barcode: String,
  date: { type: Date, default: Date.now },
});

// Schema for Users
const Users = mongoose.model('Users', {
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  phone: { type: String },
  password: { type: String, required: true },
  addresses: [
    {
      street: { type: String, required: true },
      ward: { type: String, required: true },
      city: { type: String, required: true },
      phone: { type: String, required: true },
      fullAddress: { type: String },
    },
  ],
  cartData: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      size: { type: String, required: true },
      quantity: { type: Number, required: true, default: 1 },
      addedAt: { type: Date, default: Date.now },
    },
  ],
  date: { type: Date, default: Date.now },
});

// Middleware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) {
    return res.status(401).json({ success: false, errors: "Token không hợp lệ" });
  }
  try {
    const data = jwt.verify(token, 'secret_ecom');
    req.user = data.user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, errors: "Xác thực thất bại" });
  }
};

// Inventory: kho chính
const Inventory = mongoose.model("Inventory", {
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  warehousePrice: { type: Number, required: true },
  sellingPrice: {
    type: Number,
    default: function () {
      return this.warehousePrice * 1.2; // Default sellingPrice is warehousePrice * 1.2
    },
  },
  stock: [
    {
      size: { type: String, required: true },
      quantity: { type: Number, required: true },
    },
  ],
  date: { type: Date, default: Date.now },
});

// Schema for Order
const Order = mongoose.model("Order", {
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      size: { type: String, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
    },
  ],
  totalAmount: { type: Number, required: true },
  shippingAddress: {
    street: { type: String, required: true },
    ward: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: String, required: true },
    fullAddress: { type: String },
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "canceled"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date },
  completionDate: { type: Date },
  cancellationDate: { type: Date },
  cancelReason: { type: String },
});

// Schema for SupplierOrder
const SupplierOrder = mongoose.model("SupplierOrder", {
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      size: { type: String, required: true },
      quantity: { type: Number, required: true },
      importPrice: { type: Number, required: true },
    },
  ],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "confirmed", "completed", "canceled"], default: "pending" },
  orderDate: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

// Schema for DirectOrder
const DirectOrder = mongoose.model("DirectOrder", {
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      size: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ["completed"], default: "completed" },
  orderDate: { type: Date, default: Date.now },
});

// Endpoint to get all direct orders
app.get("/directorders", async (req, res) => {
  try {
    const orders = await DirectOrder.find()
      .populate({
        path: "items.productId",
        select: "name image",
        populate: { path: "supplier", select: "name companyName" },
      })
      .lean();

    const mappedOrders = orders.map((order) => ({
      _id: order._id || "",
      items: order.items.map((item) => ({
        productId: item.productId?._id || item.productId,
        name: item.productId?.name || "Sản phẩm không xác định",
        image: item.productId?.image || "placeholder.jpg",
        size: item.size || "",
        quantity: item.quantity || 0,
        price: item.price || 0,
      })),
      totalAmount: order.totalAmount || 0,
      status: order.status || "completed",
      orderDate: order.orderDate || new Date(),
    }));

    res.json({ success: true, orders: mappedOrders });
  } catch (error) {
    console.error("Lỗi lấy danh sách đơn hàng trực tiếp:", error);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách đơn hàng trực tiếp" });
  }
});

// Function to generate PDF for SupplierOrder
async function generateSupplierOrderPDF(order, supplier) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const pdfPath = `./order_${order._id}.pdf`;
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Chuyển Base64 thành buffer và đăng ký font
    const fontBuffer = Buffer.from(robotoFont, 'base64');
    doc.registerFont('Roboto', fontBuffer);
    doc.font('Roboto');

    // Tiêu đề
    doc.fontSize(18).text('HÓA ĐƠN NHẬP HÀNG', { align: 'center' });
    doc.moveDown(4);

    // Thông tin đơn hàng
    doc.fontSize(12);
    doc.text(`Mã đơn: ${order._id}`, 30, doc.y);
    doc.text(`Nhà cung cấp: ${supplier.name} (${supplier.companyName})`, 30, doc.y + 15);
    doc.text(`Email: ${supplier.email}`, 30, doc.y + 15);
    doc.text(`Ngày tạo: ${new Date(order.createdAt).toLocaleDateString('vi-VN')}`, 30, doc.y + 15);
    doc.moveDown(4);

    // Lấy thông tin sản phẩm
    const itemsWithProductDetails = await Promise.all(
      order.items.map(async (item) => {
        const product = await Product.findById(item.productId);
        return {
          ...item,
          name: product ? product.name : 'Unknown Product',
          quantity: item.quantity || 0,
          importPrice: item.importPrice || 0,
          size: item.size || 'N/A',
        };
      })
    );

    // Lọc các mục hợp lệ
    const validItems = itemsWithProductDetails.filter(item => item.quantity > 0 && item.importPrice > 0);

    // Tiêu đề bảng
    let startY = doc.y;
    doc.fontSize(12).text('Danh sách sản phẩm:', 30, startY);
    doc.moveDown(1.5);
    const tableTop = doc.y;
    const tableLeft = 30;
    const tableWidth = 540; // Chiều rộng bảng trên A4 (595pt - 2*30pt margin)
    const colWidths = [40, 220, 60, 60, 80, 80]; // STT, Sản phẩm, Size, SL, Giá nhập, Tổng
    const colPositions = [
      tableLeft,
      tableLeft + 40,
      tableLeft + 260,
      tableLeft + 320,
      tableLeft + 380,
      tableLeft + 460
    ];

    // Tiêu đề cột và đường viền
    doc.fontSize(10);
    doc.text('STT', colPositions[0], tableTop, { align: 'center', width: colWidths[0] });
    doc.text('Sản phẩm', colPositions[1], tableTop, { width: colWidths[1], align: 'left' });
    doc.text('Size', colPositions[2], tableTop, { align: 'center', width: colWidths[2] });
    doc.text('SL', colPositions[3], tableTop, { align: 'center', width: colWidths[3] });
    doc.text('Giá nhập', colPositions[4], tableTop, { align: 'right', width: colWidths[4] });
    doc.text('Tổng', colPositions[5], tableTop, { align: 'right', width: colWidths[5] });

    // Vẽ đường kẻ ngang và dọc
    doc.moveTo(tableLeft, tableTop + 12).lineTo(tableLeft + tableWidth, tableTop + 12).stroke(); // Đường ngang trên
    colPositions.forEach((x, i) => {
      if (i < colPositions.length - 1) {
        doc.moveTo(x + colWidths[i], tableTop).lineTo(x + colWidths[i], tableTop + 12).stroke(); // Đường dọc
      }
    });
    startY = tableTop + 15;

    // Nội dung bảng
    if (validItems.length === 0) {
      doc.text('Không có sản phẩm hợp lệ.', tableLeft, startY);
    } else {
      validItems.forEach((item, idx) => {
        if (startY > 720) { // Kiểm tra tràn trang (A4 height ~842pt - margin - footer)
          doc.addPage();
          startY = 50;
          doc.text('Danh sách sản phẩm:', 30, startY);
          doc.moveDown(1.5);
          doc.text('STT', colPositions[0], startY + 15, { align: 'center', width: colWidths[0] });
          doc.text('Sản phẩm', colPositions[1], startY + 15, { width: colWidths[1], align: 'left' });
          doc.text('Size', colPositions[2], startY + 15, { align: 'center', width: colWidths[2] });
          doc.text('SL', colPositions[3], startY + 15, { align: 'center', width: colWidths[3] });
          doc.text('Giá nhập', colPositions[4], startY + 15, { align: 'right', width: colWidths[4] });
          doc.text('Tổng', colPositions[5], startY + 15, { align: 'right', width: colWidths[5] });
          doc.moveTo(tableLeft, startY + 27).lineTo(tableLeft + tableWidth, startY + 27).stroke();
          colPositions.forEach((x, i) => {
            if (i < colPositions.length - 1) {
              doc.moveTo(x + colWidths[i], startY + 15).lineTo(x + colWidths[i], startY + 27).stroke();
            }
          });
          startY += 30;
        }
        doc.text(`${idx + 1}`, colPositions[0], startY, { align: 'center', width: colWidths[0] });
        doc.text(item.name, colPositions[1], startY, { width: colWidths[1], align: 'left', ellipsis: true }); // Thêm ellipsis
        doc.text(item.size, colPositions[2], startY, { align: 'center', width: colWidths[2] });
        doc.text(item.quantity.toString(), colPositions[3], startY, { align: 'center', width: colWidths[3] });
        doc.text(`${Number(item.importPrice).toLocaleString('vi-VN')}₫`, colPositions[4], startY, { align: 'right', width: colWidths[4] });
        doc.text(`${(item.importPrice * item.quantity).toLocaleString('vi-VN')}₫`, colPositions[5], startY, { align: 'right', width: colWidths[5] });
        startY += 20; // Tăng khoảng cách dòng
        doc.moveTo(tableLeft, startY).lineTo(tableLeft + tableWidth, startY).stroke(); // Đường ngang dưới mỗi dòng
        colPositions.forEach((x, i) => {
          if (i < colPositions.length - 1) {
            doc.moveTo(x + colWidths[i], startY - 20).lineTo(x + colWidths[i], startY).stroke(); // Đường dọc
          }
        });
      });
    }

    // Vẽ đường kẻ ngang dưới bảng
    doc.moveTo(tableLeft, startY).lineTo(tableLeft + tableWidth, startY).stroke();

    // Tổng cộng
    const totalAmount = validItems.reduce((sum, item) => sum + item.importPrice * item.quantity, 0);
    doc.moveDown(2);
    doc.font('Roboto').fontSize(14).text(`Tổng cộng: ${totalAmount.toLocaleString('vi-VN')}₫`, tableLeft + tableWidth - 120, startY + 10, { align: 'right' });

    // Footer
    doc.moveDown(4);
    doc.fontSize(10).text('Cảm ơn đã hợp tác!', { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', reject);
  });
}

// Endpoint để supplier thêm sản phẩm mới
app.post('/addproduct', async (req, res) => {
  try {
    const {
      name, description, category, priceImport, supplierId, style, color, sizes, material, image, barcode,
    } = req.body;

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(400).json({ success: false, message: "Nhà cung cấp không hợp lệ!" });
    }

    const product = new Product({
      name, description, category, priceImport, supplier: supplierId, style, color, sizes, material, image, barcode,
    });

    await product.save();

    // Gửi thông báo WebSocket tới admin nếu nhà cung cấp đã được xác nhận
    if (supplier.isApproved) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "newProduct",
              productId: product._id,
            })
          );
        }
      });
    }

    res.json({ success: true, message: "Sản phẩm đã được thêm thành công!", product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Thêm sản phẩm thất bại" });
  }
});

// Example /checkbarcode endpoint
app.post('/checkbarcode', async (req, res) => {
  try {
    const { barcode, supplierId } = req.body;
    const existingProduct = await Product.findOne({ barcode, supplier: supplierId });
    if (existingProduct) {
      return res.json({ success: false, message: "Mã vạch đã tồn tại!" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// Example /checkbarcodes endpoint
app.post('/checkbarcodes', async (req, res) => {
  try {
    const { barcodes, supplierId } = req.body;
    const results = await Promise.all(
      barcodes.map(async (barcode) => {
        const existingProduct = await Product.findOne({ barcode, supplier: supplierId });
        return { barcode, success: !existingProduct };
      })
    );
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// Endpoint để lấy sản phẩm cho trang nhập hàng (chỉ từ nhà cung cấp đã xác nhận)
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find()
      .populate({
        path: "supplier",
        match: { isApproved: true },
        select: 'name companyName',
      })
      .lean();

    const filteredProducts = products.filter((product) => product.supplier !== null);
    res.json({ success: true, products: filteredProducts });
  } catch (error) {
    console.error("Lỗi lấy sản phẩm:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// Endpoint to get all products (for shopping page, from Inventory)
app.get('/allproducts', async (req, res) => {
  try {
    const inventories = await Inventory.find()
      .populate({
        path: 'product',
        populate: { path: 'supplier', select: 'name companyName' },
      });

    const products = inventories
      .filter(inv => inv.product)
      .map(inv => ({
        _id: inv.product._id,
        name: inv.product.name,
        image: inv.product.image,
        sellingPrice: inv.sellingPrice || inv.product.priceImport * 1.2,
        importPrice: inv.product.priceImport,
        available: inv.stock.some(s => s.quantity > 0),
        stock: inv.stock.map(s => ({ size: s.size, quantity: s.quantity })),
        category: inv.product.category,
        description: inv.product.description,
        supplier: inv.product.supplier,
        style: inv.product.style,
        color: inv.product.color,
        sizes: inv.product.sizes.map(s => (typeof s === 'string' ? s : s.size)),
        material: inv.product.material,
        barcode: inv.product.barcode,
        date: inv.product.date,
      }));

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm nào" });
    }

    res.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching all products:", error);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách sản phẩm" });
  }
});

// Endpoint để lấy chi tiết sản phẩm theo ID từ Inventory
app.get('/product/:id', async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ product: req.params.id })
      .populate({
        path: 'product',
        populate: { path: 'supplier', select: 'name companyName' },
      });

    if (!inventory || !inventory.product) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });
    }

    const prod = inventory.product;
    const productData = {
      _id: prod._id,
      name: prod.name,
      image: prod.image,
      sellingPrice: inventory.sellingPrice || prod.priceImport * 1.2,
      importPrice: prod.priceImport,
      available: inventory.stock.some(s => s.quantity > 0),
      stock: inventory.stock.map(s => ({ size: s.size, quantity: s.quantity })),
      category: prod.category,
      description: prod.description,
      supplier: prod.supplier,
      style: prod.style,
      color: prod.color,
      sizes: prod.sizes.map(s => (typeof s === 'string' ? s : s.size)),
      material: prod.material,
      barcode: prod.barcode,
      date: prod.date,
    };

    res.json({ success: true, product: productData });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ success: false, message: "Lỗi khi lấy sản phẩm" });
  }
});

// Endpoint để xóa sản phẩm
app.post('/removeproduct', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.body.id);
    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: "Sản phẩm không tồn tại!" });
    }
    await Inventory.deleteMany({ product: req.body.id });
    console.log("Đã xóa:", deletedProduct.name);
    res.json({ success: true, name: deletedProduct.name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Xóa sản phẩm thất bại!" });
  }
});

// Lấy sản phẩm theo supplier
app.get("/getproductsbysupplier/:supplierId", async (req, res) => {
  try {
    const { supplierId } = req.params;
    const products = await Product.find({ supplier: supplierId });
    const inventories = await Inventory.find({ product: { $in: products.map(p => p._id) } });

    const inventoryMap = {};
    inventories.forEach(inv => {
      const totalQty = inv.stock.reduce((sum, s) => sum + s.quantity, 0);
      inventoryMap[inv.product.toString()] = {
        sellingPrice: inv.sellingPrice || 0,
        quantity: totalQty,
        available: totalQty > 0,
        stock: inv.stock,
      };
    });

    const result = products.map(prod => ({
      _id: prod._id,
      name: prod.name,
      image: prod.image,
      sellingPrice: inventoryMap[prod._id.toString()]?.sellingPrice || prod.priceImport * 1.2,
      importPrice: prod.priceImport,
      available: inventoryMap[prod._id.toString()]?.available || false,
      stock: inventoryMap[prod._id.toString()]?.stock || [],
      category: prod.category,
      description: prod.description,
      supplier: prod.supplier,
      style: prod.style,
      color: prod.color,
      sizes: prod.sizes.map(s => (typeof s === 'string' ? s : s.size)),
      material: prod.material,
      barcode: prod.barcode,
      date: prod.date,
    }));

    res.json({ success: true, products: result });
  } catch (error) {
    console.error("Error fetching products by supplier:", error);
    res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
});

// API: GET /api/products
app.get('/api/products', async (req, res) => {
  try {
    const { search, supplier, category, minPrice, maxPrice } = req.query;

    const query = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    if (supplier) query.supplier = supplier;
    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.priceImport = {};
      if (minPrice) query.priceImport.$gte = Number(minPrice);
      if (maxPrice) query.priceImport.$lte = Number(maxPrice);
    }

    const products = await Product.find(query).populate('supplier', 'name companyName');
    const productIds = products.map(p => p._id);
    const inventories = await Inventory.find({ product: { $in: productIds } });

    const inventoryMap = {};
    inventories.forEach(inv => {
      const totalQty = inv.stock.reduce((sum, s) => sum + (s.quantity || 0), 0);
      inventoryMap[inv.product.toString()] = {
        sellingPrice: inv.sellingPrice || 0,
        quantity: totalQty,
        available: totalQty > 0,
        stock: inv.stock.map(s => ({ size: s.size, quantity: s.quantity })),
      };
    });

    const result = products.map(prod => {
      const inv = inventoryMap[prod._id.toString()];
      return {
        _id: prod._id,
        name: prod.name,
        description: prod.description,
        category: prod.category,
        importPrice: prod.priceImport,
        sellingPrice: inv ? inv.sellingPrice || prod.priceImport * 1.2 : prod.priceImport * 1.2,
        supplier: prod.supplier,
        supplierId: prod.supplier ? prod.supplier._id : null,
        style: prod.style,
        color: prod.color,
        sizes: prod.sizes.map(s => (typeof s === 'string' ? s : s.size)),
        material: prod.material,
        image: prod.image,
        barcode: prod.barcode,
        date: prod.date,
        quantity: inv ? inv.quantity : 0,
        available: inv ? inv.available : false,
        stock: inv ? inv.stock : [],
      };
    });

    res.json({ success: true, products: result });
  } catch (err) {
    console.error("Lỗi khi lấy /api/products:", err);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách sản phẩm" });
  }
});

// Endpoint to get popular products in women category
app.get('/popularinwomen', async (req, res) => {
  try {
    const inventories = await Inventory.find()
      .populate({
        path: 'product',
        match: { category: "Nữ" },
        populate: { path: 'supplier', select: 'name companyName' },
      })
      .where('available').equals(true);

    const products = inventories
      .filter(inv => inv.product)
      .slice(0, 4)
      .map(inv => ({
        _id: inv.product._id,
        name: inv.product.name,
        image: inv.product.image,
        sellingPrice: inv.sellingPrice || inv.product.priceImport * 1.2,
        importPrice: inv.product.priceImport,
        available: inv.stock.some(s => s.quantity > 0),
        stock: inv.stock.map(s => ({ size: s.size, quantity: s.quantity })),
        category: inv.product.category,
        description: inv.product.description,
        supplier: inv.product.supplier,
        style: inv.product.style,
        color: inv.product.color,
        sizes: inv.product.sizes.map(s => (typeof s === 'string' ? s : s.size)),
        material: inv.product.material,
        barcode: inv.product.barcode,
        date: inv.product.date,
      }));

    res.json({ success: true, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi khi lấy sản phẩm nổi bật" });
  }
});

// Endpoint to get new products
app.get('/newproducts', async (req, res) => {
  try {
    const inventories = await Inventory.find()
      .populate({
        path: 'product',
        populate: { path: 'supplier', select: 'name companyName' },
      })
      .sort({ date: -1 })
      .limit(8);

    const products = inventories
      .filter(inv => inv.product)
      .map(inv => ({
        _id: inv.product._id,
        name: inv.product.name,
        image: inv.product.image,
        sellingPrice: inv.sellingPrice || inv.product.priceImport * 1.2,
        importPrice: inv.product.priceImport,
        available: inv.stock.some(s => s.quantity > 0),
        stock: inv.stock.map(s => ({ size: s.size, quantity: s.quantity })),
        category: inv.product.category,
        description: inv.product.description,
        supplier: inv.product.supplier,
        style: inv.product.style,
        color: inv.product.color,
        sizes: inv.product.sizes.map(s => (typeof s === 'string' ? s : s.size)),
        material: inv.product.material,
        barcode: inv.product.barcode,
        date: inv.product.date,
      }));

    res.json({ success: true, products });
  } catch (err) {
    console.error("Error fetching new products:", err);
    res.status(500).json({ success: false, message: "Có lỗi khi lấy sản phẩm mới" });
  }
});

// Endpoint to get cart
app.post('/getcart', fetchUser, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id).populate('cartData.productId', 'name image category priceImport style material color sizes');
    if (!user) {
      return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
    }
    const formattedCart = user.cartData.map(item => ({
      productId: item.productId._id.toString(),
      productName: item.productId?.name || 'Unknown Product',
      image: item.productId?.image || '',
      category: item.productId?.category || '',
      priceImport: item.productId?.priceImport || 0,
      style: item.productId?.style || '',
      material: item.productId?.material || '',
      color: item.productId?.color || '',
      sizes: item.productId?.sizes?.map(s => s.size) || [],
      size: item.size,
      quantity: item.quantity,
      addedAt: item.addedAt,
    }));
    res.json({ success: true, cartData: formattedCart });
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ success: false, message: "Có lỗi khi lấy giỏ hàng" });
  }
});

// New endpoint for cart stats (tỷ lệ abandoned carts)
app.get('/cart-stats', async (req, res) => {
  try {
    const totalCarts = await Users.countDocuments({ 'cartData.0': { $exists: true } });
    const totalOrders = await Order.countDocuments({ status: "completed" });
    const abandonedCarts = Math.max(0, totalCarts - totalOrders);
    const stats = {
      totalCarts,
      totalOrders,
      abandonedCartRate: totalCarts > 0 ? (abandonedCarts / totalCarts) * 100 : 0
    };
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// New endpoint for cart count by date (biểu đồ)
app.get('/cart-count-by-date', async (req, res) => {
  try {
    const { type } = req.query; // 'day' or 'month'
    const aggregation = [
      { $unwind: "$cartData" },
      { $group: {
          _id: type === 'month' ? { $dateToString: { format: "%Y-%m", date: "$cartData.addedAt" } } : { $dateToString: { format: "%Y-%m-%d", date: "$cartData.addedAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];
    const data = await Users.aggregate(aggregation);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu biểu đồ:", error);
    res.status(500).json({ success: false, message: "Không thể lấy dữ liệu biểu đồ" });
  }
});

// Cart count by category
app.get('/cart-count-by-category', async (req, res) => {
  try {
    const users = await Users.find({ 'cartData.0': { $exists: true } })
      .populate('cartData.productId')
      .lean();

    const categoryCounts = users.reduce((acc, user) => {
      user.cartData.forEach(item => {
        const category = item.productId?.category || 'Unknown';
        acc[category] = (acc[category] || 0) + item.quantity;
      });
      return acc;
    }, {});

    const data = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("Lỗi lấy dữ liệu giỏ hàng theo danh mục:", error);
    res.status(500).json({ success: false, message: "Không thể lấy dữ liệu giỏ hàng theo danh mục" });
  }
});

app.get('/cart-products-by-quantity', async (req, res) => {
  try {
    const cartProducts = await Users.aggregate([
      { $unwind: '$cartData' },
      {
        $group: {
          _id: '$cartData.productId',
          totalQuantity: { $sum: '$cartData.quantity' },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      { $unwind: '$productDetails' },
      {
        $project: {
          productId: '$_id',
          productName: '$productDetails.name',
          totalQuantity: 1,
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }, // Limit to top 10 products for chart readability
    ]);

    res.json({ success: true, data: cartProducts });
  } catch (error) {
    console.error("Error fetching cart products by quantity:", error);
    res.status(500).json({ success: false, message: "Không thể lấy dữ liệu sản phẩm trong giỏ hàng" });
  }
});

// Suggest products for a specific user
app.post('/suggest-products-for-user', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await Users.findById(userId).populate('cartData.productId');
    if (!user) {
      return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
    }
    if (!user.cartData || user.cartData.length === 0) {
      return res.status(400).json({ success: false, message: "Giỏ hàng trống" });
    }

    // Thu thập thông tin từ giỏ hàng
    const cartCategories = [...new Set(user.cartData.map(item => item.productId?.category).filter(Boolean))];
    const cartMaterials = [...new Set(user.cartData.map(item => item.productId?.material).filter(Boolean))];
    const cartColors = [...new Set(user.cartData.map(item => item.productId?.color).filter(Boolean))];
    const cartSizes = [...new Set(user.cartData.map(item => item.size).filter(Boolean))];
    const cartProductIds = user.cartData.map(item => item.productId?._id.toString());

    // Lấy danh sách sản phẩm từ kho
    const inventories = await Inventory.find({ available: true }).populate('product');
    console.log(`User ${userId}: Total inventories: ${inventories.length}`); // Log số sản phẩm trong kho

    const products = inventories
      .filter(inv => inv.product && !cartProductIds.includes(inv.product._id.toString()))
      .map(inv => ({
        _id: inv.product._id,
        name: inv.product.name,
        category: inv.product.category || 'N/A',
        material: inv.product.material || 'N/A',
        color: inv.product.color || 'N/A',
        sizes: inv.product.sizes || [],
        priceImport: inv.product.priceImport || 0,
        sellingPrice: inv.sellingPrice || inv.product.priceImport * 1.2,
        image: inv.product.image || '',
        stock: inv.stock || 0,
        date: inv.product.date || new Date(),
      }));

    console.log(`User ${userId}: Candidates after filtering: ${products.length}`); // Log số candidates

    // Tính điểm phù hợp
    const scoredProducts = products.map(product => {
      let score = 0;
      if (cartCategories.includes(product.category)) score += 3;
      if (cartMaterials.includes(product.material)) score += 2;
      if (cartColors.includes(product.color)) score += 2;
      if (product.sizes.some(s => cartSizes.includes(s.size || s))) score += 1;
      return { ...product, score };
    });

    console.log(`User ${userId}: Scored products: ${JSON.stringify(scoredProducts.map(p => ({ name: p.name, score: p.score })))}`);

    // Lấy top 2 sản phẩm score >= 1
    let suggestions = scoredProducts
      .filter(p => p.score >= 1)
      .sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date))
      .slice(0, 2);

    // Fallback: Nếu không đủ 2, lấy sản phẩm mới nhất
    if (suggestions.length < 2) {
      const fallback = scoredProducts
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 2 - suggestions.length);
      suggestions = [...suggestions, ...fallback];
    }

    // Nếu vẫn rỗng, trả về thông báo rõ ràng
    if (suggestions.length === 0) {
      return res.json({
        success: false,
        message: "Không tìm thấy sản phẩm phù hợp trong kho. Có thể kho trống hoặc tất cả sản phẩm phù hợp đã trong giỏ.",
        products: [],
      });
    }

    res.json({ success: true, products: suggestions });
  } catch (error) {
    console.error(`Lỗi gợi ý sản phẩm cho user ${userId}:`, error);
    res.status(500).json({ success: false, message: "Lỗi server khi lấy gợi ý sản phẩm" });
  }
});

// Send reminder email
app.post('/send-reminder', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await Users.findById(userId).populate('cartData.productId');
    if (!user) {
      return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
    }
    if (!user.cartData || user.cartData.length === 0) {
      return res.status(400).json({ success: false, message: "Giỏ hàng trống" });
    }

    const cartItems = user.cartData.map(item => ({
      name: item.productId?.name || 'Unknown Product',
      size: item.size,
      quantity: item.quantity,
    }));

    const emailContent = `
      Chào ${user.name},
      
      Bạn có ${cartItems.length} sản phẩm trong giỏ hàng của mình:
      ${cartItems.map(item => `- ${item.name} (Size: ${item.size}, Số lượng: ${item.quantity})`).join('\n')}
      
      Hoàn tất đơn hàng của bạn để nhận nhiều ưu đãi!.
      
      Trân trọng,
      Hệ thống
    `;

    await transporter.sendMail({
      to: user.email,
      subject: "Giỏ hàng đang chờ bạn thanh toán",
      text: emailContent,
    });

    res.json({ success: true, message: "Email nhắc nhở đã được gửi" });
  } catch (error) {
    console.error("Lỗi gửi email nhắc nhở:", error);
    res.status(500).json({ success: false, message: "Không thể gửi email nhắc nhở" });
  }
});

// Endpoint to add product to cart
app.post('/addtocart', fetchUser, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
    }
    const { itemId, size } = req.body;
    if (!itemId || !size) {
      return res.status(400).json({ success: false, message: "Thiếu itemId hoặc size" });
    }

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ success: false, message: "itemId không hợp lệ" });
    }

    const inventory = await Inventory.findOne({ product: itemId });
    if (!inventory || !inventory.stock.some(s => s.size === size && s.quantity > 0)) {
      return res.status(400).json({ success: false, message: "Sản phẩm hoặc size không khả dụng" });
    }

    const cartItem = user.cartData.find(
      item => item.productId.toString() === itemId && item.size === size
    );

    if (cartItem) {
      cartItem.quantity += 1;
    } else {
      user.cartData.push({ productId: itemId, size, quantity: 1, addedAt: new Date() });
    }

    await user.save();
    res.json({ success: true, message: "Đã thêm vào giỏ hàng" });
  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).json({ success: false, message: "Có lỗi khi thêm vào giỏ hàng" });
  }
});

// Endpoint to remove product from cart
app.post('/removefromcart', async (req, res) => {
  try {
    const { userId, productId, size } = req.body;
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
    }

    user.cartData = user.cartData.filter(
      item => !(item.productId.toString() === productId && item.size === size)
    );
    await user.save();

    res.json({ success: true, message: "Xóa sản phẩm khỏi giỏ hàng thành công" });
  } catch (error) {
    console.error("Lỗi xóa sản phẩm khỏi giỏ hàng:", error);
    res.status(500).json({ success: false, message: "Không thể xóa sản phẩm khỏi giỏ hàng" });
  }
});

// Existing endpoints (unchanged, included for completeness)
app.get('/allsuppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find({ isApproved: true });
    res.json({ success: true, suppliers });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint for checkout
app.post('/checkout', fetchUser, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Dữ liệu giỏ hàng không hợp lệ" });
    }

    // Validate shipping address
    if (!user.addresses || user.addresses.length === 0) {
      return res.status(400).json({ success: false, message: "Người dùng chưa có địa chỉ giao hàng" });
    }
    const shippingAddress = user.addresses[0];
    if (!shippingAddress.street || !shippingAddress.ward || !shippingAddress.city || !shippingAddress.phone) {
      return res.status(400).json({ success: false, message: "Địa chỉ giao hàng thiếu thông tin bắt buộc (street, ward, city, phone)" });
    }

    let totalAmount = 0;
    const orderItems = [];
    const suppliersToOrder = new Map();

    for (const item of items) {
      const { productId, size, quantity } = item;
      if (!productId || !size || !quantity || quantity <= 0) {
        return res.status(400).json({ success: false, message: "Dữ liệu sản phẩm không hợp lệ" });
      }

      const inventory = await Inventory.findOne({ product: productId }).populate('product');
      if (!inventory) {
        return res.status(404).json({ success: false, message: `Sản phẩm ${productId} không tồn tại trong kho` });
      }

      const stockItem = inventory.stock.find(s => s.size === size);
      const availableQty = stockItem ? stockItem.quantity : 0;

      if (availableQty < quantity) {
        const supplierId = inventory.product.supplier?.toString();
        if (!supplierId) {
          return res.status(400).json({ success: false, message: `Sản phẩm ${productId} không có supplier` });
        }
        const neededQty = quantity - availableQty;
        if (!suppliersToOrder.has(supplierId)) {
          suppliersToOrder.set(supplierId, []);
        }
        suppliersToOrder.get(supplierId).push({
          productId,
          size,
          quantity: neededQty,
          importPrice: inventory.warehousePrice || inventory.product.priceImport,
        });

        if (stockItem) stockItem.quantity = 0;
      } else {
        stockItem.quantity -= quantity;
      }

      inventory.available = inventory.stock.some(s => s.quantity > 0);
      await inventory.save();

      totalAmount += (inventory.sellingPrice || 0) * quantity;
      orderItems.push({
        productId,
        size,
        name: inventory.product.name,
        quantity,
        price: inventory.sellingPrice || 0,
        supplierId: inventory.product.supplier,
      });
    }

    for (const [supplierId, supplierItems] of suppliersToOrder) {
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) continue;

      const totalAmountSupplier = supplierItems.reduce((sum, item) => sum + item.importPrice * item.quantity, 0);
      const supplierOrder = new SupplierOrder({
        supplierId,
        items: supplierItems,
        totalAmount: totalAmountSupplier,
        status: "pending",
      });
      await supplierOrder.save();

      const ws = clients.get(supplierId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "newOrder", orderId: supplierOrder._id }));
      }
      const pdfPath = await generateSupplierOrderPDF(supplierOrder, supplier);
      await transporter.sendMail({
        to: supplier.email,
        subject: "Thông báo đơn nhập hàng mới",
        text: `Chào ${supplier.name},\n\nBạn vừa nhận được một đơn nhập hàng mới (Mã: ${supplierOrder._id}). Vui lòng xem chi tiết đơn hàng trong tệp PDF đính kèm.\n\nTrân trọng,\nHệ thống`,
        attachments: [
          {
            filename: `order_${supplierOrder._id}.pdf`,
            path: pdfPath,
          },
        ],
      });
      fs.unlink(pdfPath, (err) => { if (err) console.error("Error deleting PDF file:", err); });
    }

    const order = new Order({
      userId: user._id,
      items: orderItems,
      totalAmount,
      shippingAddress: {
        street: shippingAddress.street,
        ward: shippingAddress.ward,
        city: shippingAddress.city,
        phone: shippingAddress.phone,
        fullAddress: shippingAddress.fullAddress || `${shippingAddress.street}, ${shippingAddress.ward}, ${shippingAddress.city}`,
      },
      status: 'pending',
    });
    await order.save();

    user.cartData = [];
    await user.save();

    res.json({ success: true, message: "Thanh toán thành công", order });
  } catch (error) {
    console.error("Error during checkout:", error);
    res.status(500).json({ success: false, message: "Có lỗi xảy ra trong quá trình thanh toán" });
  }
});

// Endpoint to get my orders
app.get('/getmyorders', fetchUser, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate('items.productId', 'name image')
      .populate('userId', 'name phone addresses') // Add userId population
      .sort({ orderDate: -1 });
    if (orders.length === 0) {
      return res.json({ success: true, message: "No orders found for this user.", orders: [] });
    }
    const formattedOrders = await Promise.all(orders.map(async (order) => {
      const items = await Promise.all(order.items.map(async (item) => {
        const inventory = await Inventory.findOne({ product: item.productId._id });
        return {
          ...item.toObject(),
          price: item.price || (inventory?.sellingPrice || item.productId.priceImport * 1.2),
        };
      }));
      return { ...order.toObject(), items };
    }));
    res.json({ success: true, orders: formattedOrders });
  } catch (error) {
    console.error("Error fetching user's orders:", error);
    res.status(500).json({ success: false, message: "An error occurred while retrieving orders." });
  }
});

// Endpoint to get my completed orders
app.get('/getmycompletedorders', fetchUser, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id, status: "completed" })
      .populate('items.productId', 'name image')
      .sort({ createdAt: -1 });
    if (orders.length === 0) {
      return res.json({ success: true, message: "Không có đơn hàng hoàn thành nào.", orders: [] });
    }
    const formattedOrders = await Promise.all(orders.map(async (order) => {
      const items = await Promise.all(order.items.map(async (item) => {
        const inventory = await Inventory.findOne({ product: item.productId._id });
        return {
          ...item.toObject(),
          price: item.price || (inventory?.sellingPrice || item.productId.priceImport * 1.2),
        };
      }));
      return { ...order.toObject(), items };
    }));
    res.json({ success: true, orders: formattedOrders });
  } catch (error) {
    console.error("Error fetching completed orders:", error);
    res.status(500).json({ success: false, message: "Có lỗi xảy ra khi lấy đơn hàng hoàn thành." });
  }
});

// Endpoint to get my canceled orders
app.get('/getmycanceledorders', fetchUser, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id, status: "canceled" })
      .populate('items.productId', 'name image')
      .sort({ createdAt: -1 });
    if (orders.length === 0) {
      return res.json({ success: true, message: "Không có đơn hàng đã hủy nào.", orders: [] });
    }
    const formattedOrders = await Promise.all(orders.map(async (order) => {
      const items = await Promise.all(order.items.map(async (item) => {
        const inventory = await Inventory.findOne({ product: item.productId._id });
        return {
          ...item.toObject(),
          price: item.price || (inventory?.sellingPrice || item.productId.priceImport * 1.2),
        };
      }));
      return { ...order.toObject(), items };
    }));
    res.json({ success: true, orders: formattedOrders });
  } catch (error) {
    console.error("Error fetching canceled orders:", error);
    res.status(500).json({ success: false, message: "Có lỗi xảy ra khi lấy đơn hàng đã hủy." });
  }
});

// Endpoint to get user's order count (excluding completed orders)
app.get('/getmyorderscount', fetchUser, async (req, res) => {
  try {
    const totalCount = await Order.countDocuments({ userId: req.user.id, status: { $in: ['pending', 'confirmed', 'canceled'] } });
    res.json({
      success: true,
      count: totalCount,
    });
  } catch (error) {
    console.error("Error fetching order count:", error);
    res.status(500).json({ success: false, message: "Lỗi khi lấy số lượng đơn hàng" });
  }
});

// Endpoint to create a new order
app.post('/order', fetchUser, async (req, res) => {
  try {
    const { items, totalAmount } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Danh sách sản phẩm rỗng" });
    }

    const order = new Order({
      userId: req.user.id,
      items,
      totalAmount,
    });

    await order.save();
    res.json({ success: true, order });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, message: "Lỗi khi tạo đơn hàng" });
  }
});

// Get all carts
app.get('/getallcarts', async (req, res) => {
  try {
    const users = await Users.find({ 'cartData.0': { $exists: true } })
      .populate('cartData.productId')
      .lean();

    const carts = users.map(user => ({
      userId: user._id,
      userName: user.name,
      address: user.addresses[0]?.fullAddress || 'Chưa có địa chỉ',
      phone: user.phone || 'Chưa có số điện thoại',
      cartData: user.cartData.map(item => ({
        productId: item.productId?._id,
        productName: item.productId?.name || 'Sản phẩm không rõ',
        size: item.size,
        quantity: item.quantity,
        image: item.productId?.image,
        category: item.productId?.category,
        priceImport: item.productId?.priceImport,
        style: item.productId?.style,
        material: item.productId?.material,
        color: item.productId?.color,
        addedAt: item.addedAt,
      })),
    }));

    res.json({ success: true, carts });
  } catch (error) {
    console.error("Lỗi lấy giỏ hàng:", error);
    res.status(500).json({ success: false, message: "Không thể lấy dữ liệu giỏ hàng" });
  }
});

// Function to generate PDF for Order
const generateOrderPDF = (order, user) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const pdfPath = path.join(__dirname, `order_${order._id}.pdf`);
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.registerFont("Roboto", Buffer.from(robotoFont, "base64"));
    doc.font("Roboto").fontSize(16);
    doc.text("HÓA ĐƠN ĐƠN HÀNG", { align: "center" });

    doc.fontSize(12);
    doc.text(`Mã đơn: ${order._id}`, 50, 100);
    doc.text(`Người mua: ${user?.name || "N/A"}`, 50, 120);
    doc.text(`Số điện thoại: ${user?.phone || "N/A"}`, 50, 140);
    doc.text(`Địa chỉ: ${order.shippingAddress?.street || "N/A"}`, 50, 160);
    doc.text(`Ngày đặt: ${new Date(order.createdAt).toLocaleString("vi-VN")}`, 50, 180);
    if (order.confirmedAt) doc.text(`Ngày xác nhận: ${new Date(order.confirmedAt).toLocaleString("vi-VN")}`, 50, 200);
    if (order.completionDate) doc.text(`Ngày hoàn thành: ${new Date(order.completionDate).toLocaleString("vi-VN")}`, 50, 220);
    if (order.cancellationDate) doc.text(`Ngày hủy: ${new Date(order.cancellationDate).toLocaleString("vi-VN")}`, 50, 240);
    if (order.cancelReason) doc.text(`Lý do hủy: ${order.cancelReason}`, 50, 260);

    let startY = order.cancelReason ? 280 : order.cancellationDate ? 260 : order.completionDate ? 240 : order.confirmedAt ? 220 : 200;
    doc.text("Sản phẩm", 50, startY);
    doc.text("Size & SL", 200, startY);
    doc.text("Giá", 300, startY, { align: "right" });
    doc.text("Tổng", 400, startY, { align: "right" });
    startY += 10;
    doc.moveTo(50, startY).lineTo(500, startY).stroke();
    startY += 10;

    order.items.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      doc.text(item.name || "Sản phẩm không xác định", 50, startY, { width: 150 });
      doc.text(`${item.size || ""} - ${item.quantity || 0}`, 200, startY);
      doc.text((item.price || 0).toLocaleString("vi-VN") + " VND", 300, startY, { align: "right" });
      doc.text(itemTotal.toLocaleString("vi-VN") + " VND", 400, startY, { align: "right" });
      startY += 20;
    });

    startY += 10;
    doc.moveTo(50, startY).lineTo(500, startY).stroke();
    startY += 20;
    doc.text(`Tổng: ${order.totalAmount.toLocaleString("vi-VN")} VND`, 400, startY, { align: "right" });
    startY += 30;
    doc.text("Cảm ơn quý khách!", 50, startY, { align: "center" });

    doc.end();
    stream.on("finish", () => resolve(pdfPath));
    stream.on("error", (err) => reject(err));
  });
};

// Endpoint to get all orders
app.get("/getallorders", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name phone address")
      .populate("items.productId", "name image");
    res.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách đơn hàng" });
  }
});

// Get confirmed orders
app.get("/getconfirmedorders", async (req, res) => {
  try {
    const orders = await Order.find({ status: "confirmed" })
      .populate("userId", "name phone address")
      .populate("items.productId", "name image");
    res.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching confirmed orders:", error);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách đơn hàng đã xác nhận" });
  }
});

// Endpoint xác nhận đơn hàng
app.post("/confirmorder/:id", async (req, res) => {
  try {
    // Tìm đơn hàng và populate thông tin user
    const order = await Order.findById(req.params.id).populate("userId");
    if (!order) {
      return res.status(404).json({ success: false, message: "Đơn hàng không tồn tại" });
    }
    if (order.status !== "pending") {
      return res.status(400).json({ success: false, message: "Đơn hàng không ở trạng thái chờ xác nhận" });
    }

    // Cập nhật trạng thái đơn hàng
    order.status = "confirmed";
    order.confirmedAt = new Date();
    await order.save();

    // Kiểm tra email người dùng trước khi gửi
    if (order.userId && order.userId.email) {
      await transporter.sendMail({
        to: order.userId.email,
        subject: "Xác nhận đơn hàng",
        text: `Chào ${order.userId.name || "Khách hàng"},\n\nĐơn hàng của bạn (Mã: ${order._id}) đã được xác nhận.\n\nTrân trọng,\nHệ thống`,
      });
      res.json({ success: true, message: "Xác nhận đơn hàng thành công", order });
    } else {
      console.warn(`Không thể gửi email cho đơn hàng ${order._id}: Thiếu địa chỉ email người dùng ${order.userId?._id}`);
      res.json({
        success: true,
        message: "Xác nhận đơn hàng thành công, nhưng không thể gửi email thông báo do thiếu địa chỉ email",
        order,
      });
    }
  } catch (error) {
    console.error("Lỗi khi xác nhận đơn hàng:", error);
    res.status(500).json({ success: false, message: "Không thể xác nhận đơn hàng" });
  }
});

// Complete an order
app.post("/completeorder/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }
    if (order.status !== "confirmed") {
      return res.status(400).json({ success: false, message: "Chỉ đơn hàng đã xác nhận mới có thể hoàn thành" });
    }

    order.status = "completed";
    order.completionDate = new Date();
    await order.save();

    res.json({ success: true, message: "Hoàn thành đơn hàng thành công", order });
  } catch (error) {
    console.error("Error completing order:", error);
    res.status(500).json({ success: false, message: "Không thể hoàn thành đơn hàng" });
  }
});
// Cancel an order
app.post("/cancelorder/:orderId", async (req, res) => {
  try {
    const { cancellationReason } = req.body;
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }
    if (order.status !== "pending") {
      return res.status(400).json({ success: false, message: "Chỉ đơn hàng đang chờ xử lý mới có thể hủy" });
    }

    order.status = "canceled";
    order.cancellationDate = new Date();
    order.cancelReason = cancellationReason || "Không có lý do";
    await order.save();

    res.json({ success: true, message: "Hủy đơn hàng thành công", order });
  } catch (error) {
    console.error("Error canceling order:", error);
    res.status(500).json({ success: false, message: "Không thể hủy đơn hàng" });
  }
});

// Lấy danh sách đơn hàng đang chờ xác nhận
app.get("/getpendingorders", async (req, res) => {
  try {
    const orders = await Order.find({ status: "pending" })
      .populate({
        path: "userId",
        select: "name phone email",
      })
      .populate({
        path: "items.productId",
        select: "name image",
      })
      .lean(); // Tối ưu hiệu suất

    // Định dạng lại dữ liệu để khớp với frontend
    const mappedOrders = orders.map((order) => ({
      _id: order._id || "",
      userId: {
        _id: order.userId?._id || "",
        name: order.userId?.name || "N/A",
        phone: order.userId?.phone || "N/A",
        email: order.userId?.email || "N/A",
      },
      items: order.items.map((item) => ({
        productId: {
          _id: item.productId?._id || item.productId,
          name: item.productId?.name || "Sản phẩm không xác định",
          image: item.productId?.image || "placeholder.jpg",
        },
        size: item.size || "",
        name: item.name || "Sản phẩm không xác định",
        price: item.price || 0,
        quantity: item.quantity || 0,
      })),
      totalAmount: order.totalAmount || 0,
      shippingAddress: {
        street: order.shippingAddress?.street || "N/A",
        ward: order.shippingAddress?.ward || "N/A",
        city: order.shippingAddress?.city || "N/A",
        phone: order.shippingAddress?.phone || "N/A",
        fullAddress: order.shippingAddress?.fullAddress || "N/A",
      },
      status: order.status || "pending",
      createdAt: order.createdAt || new Date(),
      confirmedAt: order.confirmedAt || null,
      completionDate: order.completionDate || null,
      cancellationDate: order.cancellationDate || null,
      cancelReason: order.cancelReason || "",
    }));

    res.json({ success: true, orders: mappedOrders });
  } catch (error) {
    console.error("Lỗi lấy danh sách đơn hàng đang chờ:", error);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách đơn hàng đang chờ" });
  }
});

// Count pending orders
app.get("/orders/pending", async (req, res) => {
  try {
    const pendingOrders = await Order.find({ status: "pending" }).countDocuments();
    res.json({ success: true, count: pendingOrders });
  } catch (error) {
    console.error("Lỗi khi đếm đơn hàng mới:", error);
    res.status(500).json({ success: false, message: "Không thể đếm đơn hàng mới" });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find().populate("items.productId", "name supplier");
    res.json({ success: true, orders });
  } catch (error) {
    console.error("Lỗi lấy danh sách đơn hàng:", error);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách đơn hàng" });
  }
});

// Endpoint to get all canceled orders
app.get("/getcanceledorders", async (req, res) => {
  try {
    const orders = await Order.find({ status: "canceled" })
      .populate("userId", "name phone address")
      .populate("items.productId", "name image");
    res.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching canceled orders:", error);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách đơn hàng đã hủy" });
  }
});

// Endpoint to get all completed orders
app.get("/getcompletedorders", async (req, res) => {
  try {
    const orders = await Order.find({ status: "completed" })
      .populate("userId", "name phone address")
      .populate("items.productId", "name image");
    res.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching completed orders:", error);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách đơn hàng hoàn thành" });
  }
});

// Thanh toán tại quầy (không cần userId)
app.post("/checkout/counter", async (req, res) => {
  try {
    const { items, totalAmount } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: "Danh sách sản phẩm rỗng" });

    for (const item of items) {
      const inventory = await Inventory.findOne({ product: item.productId }).populate('product');
      if (!inventory || !inventory.product) {
        return res.status(400).json({
          success: false,
          message: `Không tìm thấy sản phẩm: ${item.productId}`,
        });
      }

      const sizeStock = inventory.stock.find(s => s.size === item.size);
      if (!sizeStock || sizeStock.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Không đủ tồn kho cho sản phẩm: ${inventory.product.name} size ${item.size}`,
        });
      }

      sizeStock.quantity -= item.quantity;
      inventory.available = inventory.stock.some(s => s.quantity > 0);
      await inventory.save();
    }

    const order = new Order({
      items,
      totalAmount,
      status: "completed",
      orderDate: new Date(),
    });

    await order.save();
    res.json({ success: true, message: "Thanh toán thành công", order });
  } catch (error) {
    console.error("Lỗi thanh toán tại quầy:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// API lưu đơn trực tiếp
app.post("/directorder", async (req, res) => {
  try {
    const { items, totalAmount } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Danh sách sản phẩm rỗng" });
    }

    for (const item of items) {
      const inventory = await Inventory.findOne({ product: item.productId });
      if (!inventory) return res.status(400).json({ success: false, message: `Không tìm thấy sản phẩm: ${item.productId}` });

      const sizeStock = inventory.stock.find(s => s.size === item.size);
      if (!sizeStock || sizeStock.quantity < item.quantity) {
        return res.status(400).json({ success: false, message: `Không đủ tồn kho cho size ${item.size}` });
      }
      sizeStock.quantity -= item.quantity;
      inventory.available = inventory.stock.some(s => s.quantity > 0);
      await inventory.save();
    }

    const order = new DirectOrder({ items, totalAmount, status: "completed" });
    await order.save();

    res.json({ success: true, message: "Lưu đơn trực tiếp thành công", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// Endpoint to get all products, grouped by supplier
app.get('/getallproducts', async (req, res) => {
  try {
    const inventories = await Inventory.find()
      .populate({
        path: 'product',
        populate: { path: 'supplier', select: 'name companyName' },
      });

    const groupedProducts = inventories.reduce((acc, inv) => {
      if (!inv.product) return acc;
      const supplierName = inv.product.supplier?.name || "Unknown";
      if (!acc[supplierName]) acc[supplierName] = [];

      acc[supplierName].push({
        _id: inv.product._id,
        name: inv.product.name,
        image: inv.product.image,
        sellingPrice: inv.sellingPrice || inv.product.priceImport * 1.2,
        importPrice: inv.product.priceImport,
        available: inv.stock.some(s => s.quantity > 0),
        stock: inv.stock,
        category: inv.product.category,
        description: inv.product.description,
        supplier: inv.product.supplier,
        style: inv.product.style,
        color: inv.product.color,
        sizes: inv.product.sizes.map(s => (typeof s === 'string' ? s : s.size)),
        material: inv.product.material,
        barcode: inv.product.barcode,
        date: inv.product.date,
      });

      return acc;
    }, {});

    res.json({ success: true, groupedProducts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Lỗi khi lấy sản phẩm" });
  }
});

// Endpoint cho supplier lấy sản phẩm của mình
app.get('/supplier/products', async (req, res) => {
  try {
    const supplierId = req.query.supplierId;
    if (!supplierId) return res.status(400).json({ success: false, message: "Chưa cung cấp supplierId" });

    const inventories = await Inventory.find()
      .populate({
        path: 'product',
        match: { supplier: supplierId },
        populate: { path: 'supplier', select: 'name companyName' },
      })
      .where('product').ne(null);

    const products = inventories.map(inv => ({
      _id: inv.product._id,
      name: inv.product.name,
      image: inv.product.image,
      sellingPrice: inv.sellingPrice || inv.product.priceImport * 1.2,
      importPrice: inv.product.priceImport,
      available: inv.stock.some(s => s.quantity > 0),
      stock: inv.stock,
      category: inv.product.category,
      description: inv.product.description,
      supplier: inv.product.supplier,
      style: inv.product.style,
      color: inv.product.color,
      sizes: inv.product.sizes.map(s => (typeof s === 'string' ? s : s.size)),
      material: inv.product.material,
      barcode: inv.product.barcode,
      date: inv.product.date,
    }));

    res.json({ success: true, products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Có lỗi khi lấy sản phẩm" });
  }
});

// Đăng ký, Đăng nhập, Chỉnh sửa thông tin, Xoá tài khoản Users

// Endpoint to check email tồn tại
app.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập email!" });
    }

    const existingUser = await Users.findOne({ email });

    if (existingUser) {
      return res.json({ success: false, exists: true, message: "Email đã được đăng ký!" });
    }

    res.json({ success: true, exists: false, message: "Email có thể sử dụng." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, exists: false, message: "Lỗi server!" });
  }
});

// Endpoint to register user
app.post('/signup', async (req, res) => {
  try {
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
      return res.status(400).json({ success: false, errors: "Email đã được đăng ký!" });
    }

    let addressObj = null;
    if (req.body.address && typeof req.body.address === "object") {
      const street = req.body.address.street || "";
      const ward = req.body.address.ward || "";
      const city = req.body.address.city || "";
      const phone = req.body.address.phone || req.body.phone || "";

      addressObj = {
        street,
        ward,
        city,
        phone,
        fullAddress: `${street} - ${ward} - ${city}`,
      };
    }

    const user = new Users({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      password: req.body.password,
      addresses: addressObj ? [addressObj] : [],
      cartData: [], // Khởi tạo cartData là mảng rỗng
    });

    await user.save();

    const data = { user: { id: user.id } };
    const token = jwt.sign(data, 'secret_ecom');
    res.json({ success: true, token });
  } catch (error) {
    console.error("Lỗi khi đăng ký:", error);
    res.status(500).json({ success: false, message: "Đăng ký thất bại" });
  }
});

// Endpoint to login
app.post('/login', async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = { user: { id: user.id } };
      const token = jwt.sign(data, 'secret_ecom');
      res.json({ success: true, token });
    } else {
      res.json({ success: false, errors: "Mật khẩu không khớp!" });
    }
  } else {
    res.json({ success: false, errors: "Email không trùng khớp với tài khoản nào!" });
  }
});

// Endpoint to get user data
app.get('/users', async (req, res) => {
  try {
    const users = await Users.find();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/getuser", fetchUser, async (req, res) => {
  try {
    let user = await Users.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// Endpoint to delete user by ID
app.delete('/removeuser/:id', async (req, res) => {
  try {
    await Users.findByIdAndDelete(req.params.id);
    console.log(`Đã xóa người dùng với ID: ${req.params.id}`);
    res.json({ success: true, message: "Xóa người dùng thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Có lỗi xảy ra khi xóa người dùng!" });
  }
});

// Endpoint to update user address
app.put('/update-address/:id', async (req, res) => {
  try {
    const { street, ward, city, phone } = req.body;

    const fullAddress = `${street} - ${ward} - ${city}`;

    const updatedUser = await Users.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "addresses.0.street": street,
          "addresses.0.ward": ward,
          "addresses.0.city": city,
          "addresses.0.phone": phone,
          "addresses.0.fullAddress": fullAddress,
        },
      },
      { new: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng!" });
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Cập nhật địa chỉ thất bại!" });
  }
});

// Update user information
app.put('/updateuser', fetchUser, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.user.id;

    const updatedUser = await Users.findByIdAndUpdate(
      userId,
      { name, email, phone },
      { new: true, runValidators: true },
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng!" });
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Email đã tồn tại!" });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Cập nhật thông tin thất bại!" });
  }
});

// Change user password
app.post('/changepassword', fetchUser, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin mật khẩu!" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Mật khẩu mới không khớp!" });
    }

    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng!" });
    }

    if (user.password !== oldPassword) {
      return res.status(400).json({ success: false, message: "Mật khẩu cũ không đúng!" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Đổi mật khẩu thành công!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Đổi mật khẩu thất bại!" });
  }
});

// Endpoint để admin xác nhận hợp tác với nhà cung cấp
app.post('/suppliers/:id/approve', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Không tìm thấy nhà cung cấp" });
    }
    supplier.isApproved = true;
    await supplier.save();

    // Gửi email thông báo xác nhận hợp tác
    await transporter.sendMail({
      to: supplier.email,
      subject: "Xác nhận hợp tác",
      text: `Chào ${supplier.name},\n\nTài khoản nhà cung cấp của bạn đã được xác nhận hợp tác. Sản phẩm của bạn giờ đây sẽ hiển thị trong danh sách nhập hàng của chúng tôi.\nChúng tôi sẽ gửi thông báo khi có đơn hàng gửi đến bạn. Rất mong được hợp tác với bạn!\n\nTrân trọng,\nCửa hàng Mn`,
    });

    res.json({ success: true, message: "Đã xác nhận hợp tác với nhà cung cấp" });
  } catch (error) {
    console.error("Lỗi xác nhận nhà cung cấp:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// Endpoint để admin dừng hợp tác
app.post('/suppliers/:id/stop-cooperation', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Không tìm thấy nhà cung cấp" });
    }
    supplier.isApproved = false;
    await supplier.save();

    // Gửi email thông báo dừng hợp tác
    await transporter.sendMail({
      to: supplier.email,
      subject: "Thông báo dừng hợp tác",
      text: `Chào ${supplier.name},\n\nChúng tôi tiếc thông báo rằng hợp tác với công ty của bạn đã bị dừng. Sản phẩm của bạn sẽ không còn hiển thị trong hệ thống nhập hàng.\nNếu bạn có câu hỏi, vui lòng liên hệ chúng tôi.\n\nTrân trọng,\nCửa hàng Mn`,
    });

    res.json({ success: true, message: "Đã dừng hợp tác với nhà cung cấp" });
  } catch (error) {
    console.error("Lỗi dừng hợp tác:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// API to get all suppliers with product & used count
app.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find({});
    if (suppliers.length === 0) {
      return res.status(400).json({ success: false, message: "No suppliers found!" });
    }

    const supplierWithCounts = await Promise.all(
      suppliers.map(async (supplier) => {
        // Đếm số sản phẩm của nhà cung cấp
        const productCount = await Product.countDocuments({ supplier: supplier._id });

        // Đếm số sản phẩm đã bán (usedProductCount) từ đơn hàng hoàn thành
        const usedProductCountAgg = await Order.aggregate([
          { $unwind: "$items" },
          { $match: { "items.supplierId": supplier._id, status: "completed" } },
          { $group: { _id: null, total: { $sum: "$items.quantity" } } },
        ]);
        const usedProductCount = usedProductCountAgg[0]?.total || 0;

        // Đếm số đơn hàng theo trạng thái
        const orderCounts = await SupplierOrder.aggregate([
          { $match: { supplierId: supplier._id } },
          { $group: {
              _id: "$status",
              count: { $sum: 1 }
            }
          },
        ]);

        const pendingCount = orderCounts.find(c => c._id === "pending")?.count || 0;
        const confirmedCount = orderCounts.find(c => c._id === "confirmed")?.count || 0;
        const completedCount = orderCounts.find(c => c._id === "completed")?.count || 0;
        const canceledCount = orderCounts.find(c => c._id === "canceled")?.count || 0;

        // Tính lợi nhuận từ đơn hàng hoàn thành
        const profitAgg = await Order.aggregate([
          { $unwind: "$items" },
          { $match: { "items.supplierId": supplier._id, status: "completed" } },
          {
            $lookup: {
              from: "inventories",
              localField: "items.productId",
              foreignField: "product",
              as: "inventory"
            }
          },
          { $unwind: "$inventory" },
          {
            $project: {
              itemProfit: {
                $multiply: [
                  { $subtract: ["$items.price", "$inventory.warehousePrice"] },
                  "$items.quantity"
                ]
              }
            }
          },
          { $group: { _id: null, totalProfit: { $sum: "$itemProfit" } } }
        ]);
        const profit = profitAgg[0]?.totalProfit || 0;

        return {
          ...supplier.toObject(),
          productCount,
          usedProductCount,
          pendingCount,
          confirmedCount,
          completedCount,
          canceledCount,
          profit,
        };
      }),
    );

    res.json({ success: true, suppliers: supplierWithCounts });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// API to delete a supplier by ID
app.delete('/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSupplier = await Supplier.findByIdAndDelete(id);
    if (!deletedSupplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }
    res.json({ success: true, message: "Supplier deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete supplier" });
  }
});

// Endpoint to delete a supplier by ID
app.delete('/removesupplier/:id', async (req, res) => {
  try {
    const supplierId = req.params.id;
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    const deletedProducts = await Product.deleteMany({ supplier: supplierId });
    console.log(`Deleted ${deletedProducts.deletedCount} products associated with supplier ID: ${supplierId}`);

    await Supplier.findByIdAndDelete(supplierId);
    console.log(`Supplier with ID: ${supplierId} has been deleted`);

    res.json({ success: true, message: "Supplier and associated products deleted successfully" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ success: false, message: "An error occurred while deleting the supplier and products" });
  }
});

// Supplier signup
app.post('/supplier/signup', async (req, res) => {
  try {
    const { name, companyName, address, phone, email, password, website } = req.body;
    if (!name || !companyName || !address || !phone || !email || !password) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }

    const existingSupplier = await Supplier.findOne({ email });
    if (existingSupplier) {
      return res.status(400).json({ success: false, message: "Email đã tồn tại" });
    }

    const newSupplier = new Supplier({
      name, companyName, address, phone, email, password, website, isApproved: false,
    });

    await newSupplier.save();
    const payload = { supplier: { id: newSupplier._id } };
    const token = jwt.sign(payload, 'secret_ecom');

    res.status(201).json({ success: true, message: "Đăng ký thành công", supplier: newSupplier, token });
  } catch (error) {
    console.error("Error in /supplier/signup:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi đăng ký supplier" });
  }
});

// Supplier login
app.post('/supplier/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const supplier = await Supplier.findOne({ email });
    if (!supplier) {
      return res.status(400).json({ success: false, message: "Email không tồn tại" });
    }

    if (supplier.password !== password) {
      return res.status(400).json({ success: false, message: "Sai mật khẩu" });
    }

    const payload = { supplier: { id: supplier._id } };
    const token = jwt.sign(payload, 'secret_ecom');

    res.json({ success: true, message: "Đăng nhập thành công", supplier, token });
  } catch (error) {
    console.error("Error in /supplier/login:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi đăng nhập supplier" });
  }
});

// Create Supplier Order
app.post("/supplierorders", async (req, res) => {
  try {
    const { supplierId, items } = req.body;
    if (!supplierId || !items || !items.length) {
      return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ!" });
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(400).json({ success: false, message: "Nhà cung cấp không hợp lệ!" });
    }

    // Fetch product names for items
    const populatedItems = await Promise.all(
      items.map(async (item) => {
        const product = await Product.findById(item.productId).select("name");
        if (!product) {
          throw new Error(`Sản phẩm ${item.productId} không tồn tại`);
        }
        return {
          ...item,
          name: product.name,
        };
      })
    );

    const totalAmount = populatedItems.reduce((sum, item) => sum + item.importPrice * item.quantity, 0);

    const supplierOrder = new SupplierOrder({
      supplierId,
      items: populatedItems,
      totalAmount,
      status: "pending",
    });

    await supplierOrder.save();

    // Gửi thông báo WebSocket đến supplier
    const ws = clients.get(supplierId.toString());
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "newOrder", orderId: supplierOrder._id }));
    }

    // Generate PDF
    const pdfPath = await generateSupplierOrderPDF(supplierOrder, supplier);

    // Gửi email thông báo đơn nhập hàng với PDF đính kèm
    await transporter.sendMail({
      to: supplier.email,
      subject: "Thông báo đơn nhập hàng mới",
      text: `Chào ${supplier.name},\n\nBạn vừa nhận được một đơn nhập hàng mới (Mã: ${supplierOrder._id}). Vui lòng xem chi tiết đơn hàng trong tệp PDF đính kèm.\n\nTrân trọng,\nHệ thống`,
      attachments: [
        {
          filename: `order_${supplierOrder._id}.pdf`,
          path: pdfPath,
        },
      ],
    });

    // Xóa file PDF sau khi gửi
    fs.unlink(pdfPath, (err) => {
      if (err) console.error("Error deleting PDF file:", err);
    });

    res.json({ success: true, message: "Tạo đơn nhập hàng thành công", supplierOrder });
  } catch (error) {
    console.error("Lỗi tạo đơn nhập hàng:", error);
    res.status(500).json({ success: false, message: "Không thể tạo đơn nhập hàng" });
  }
});

// Get all supplier orders
app.get("/supplierorders", async (req, res) => {
  try {
    const orders = await SupplierOrder.find()
      .populate({
        path: "supplierId",
        select: "companyName",
      })
      .populate({
        path: "items.productId",
        select: "name", // Populate tên sản phẩm
      })
      .lean(); // Tối ưu hiệu suất

    const mappedOrders = orders.map((order) => ({
      _id: order._id || "",
      supplierId: order.supplierId?._id || "",
      supplierName: order.supplierId?.companyName || "Không xác định",
      items: order.items.map((item) => ({
        ...item,
        name: item.productId?.name || "Sản phẩm không xác định", // Dự phòng
        productId: item.productId?._id || item.productId, // Giữ ID sản phẩm
      })),
      status: order.status || "pending",
      createdAt: order.createdAt || "",
      orderDate: order.orderDate || order.createdAt || new Date(),
      completedAt: order.completedAt || null,
    }));

    res.json({ success: true, orders: mappedOrders });
  } catch (error) {
    console.error("Lỗi lấy danh sách đơn hàng:", error);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách đơn hàng" });
  }
});

// Confirm supplier order
app.post("/supplierorders/:id/confirm", async (req, res) => {
  try {
    const order = await SupplierOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Đơn hàng không tồn tại" });
    if (order.status !== "pending") return res.status(400).json({ success: false, message: "Đơn hàng không ở trạng thái chờ xác nhận" });
    order.status = "confirmed";
    await order.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Lỗi xác nhận đơn hàng:", error);
    res.status(500).json({ success: false, message: "Không thể xác nhận đơn hàng" });
  }
});

// Supplier hoàn thành đơn nhập hàng
app.post("/supplierorders/:id/complete", async (req, res) => {
  try {
    const order = await SupplierOrder.findById(req.params.id).populate("items.productId");
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn nhập hàng" });

    if (order.status !== "confirmed") {
      return res.status(400).json({ success: false, message: "Chỉ đơn đang xử lý mới được hoàn thành" });
    }

    for (const item of order.items) {
      const productId = item.productId._id || item.productId; // Ensure correct productId
      let inventory = await Inventory.findOne({ product: productId });

      if (!inventory) {
        // Create new inventory entry with default sellingPrice
        inventory = new Inventory({
          product: productId,
          warehousePrice: item.importPrice,
          sellingPrice: item.importPrice * 1.2, // Set default sellingPrice
          stock: [{ size: item.size, quantity: item.quantity }],
        });
      } else {
        // Update existing inventory
        const sizeStock = inventory.stock.find((s) => s.size === item.size);
        if (sizeStock) {
          sizeStock.quantity += item.quantity;
        } else {
          inventory.stock.push({ size: item.size, quantity: item.quantity });
        }
      }

      // Update availability based on stock
      inventory.available = inventory.stock.some((s) => s.quantity > 0);
      await inventory.save();
    }

    order.status = "completed";
    order.completedAt = new Date();
    await order.save();

    // Notify connected clients via WebSocket
    const ws = clients.get(order.supplierId.toString());
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "orderCompleted", orderId: order._id }));
    }

    res.json({ success: true, message: "Nhập kho thành công", order });
  } catch (error) {
    console.error("Lỗi hoàn tất đơn nhập:", error);
    res.status(500).json({ success: false, message: "Không thể hoàn tất đơn nhập hàng" });
  }
});

// Cancel supplier order
app.post("/supplierorders/:id/cancel", async (req, res) => {
  try {
    const order = await SupplierOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Đơn hàng không tồn tại" });
    if (order.status === "completed" || order.status === "canceled") return res.status(400).json({ success: false, message: "Đơn hàng không thể hủy" });
    order.status = "canceled";
    await order.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Lỗi hủy đơn hàng:", error);
    res.status(500).json({ success: false, message: "Không thể hủy đơn hàng" });
  }
});

// Supplier xem đơn nhập hàng của mình
app.get("/getsupplierorders/:supplierId", async (req, res) => {
  try {
    const { supplierId } = req.params;
    const orders = await SupplierOrder.find({ supplierId })
      .populate("items.productId", "name image");

    res.json({ success: true, orders });
  } catch (error) {
    console.error("Lỗi supplier lấy đơn nhập:", error);
    res.status(500).json({ success: false, message: "Không thể lấy đơn nhập hàng" });
  }
});

// Supplier xác nhận đơn nhập hàng
app.post("/supplierorders/:id/confirm", async (req, res) => {
  try {
    const order = await SupplierOrder.findById(req.params.id).populate("items.productId");
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });

    if (order.status !== "pending") {
      return res.status(400).json({ success: false, message: "Đơn này đã xác nhận hoặc hoàn thành" });
    }

    order.status = "confirmed";
    await order.save();

    res.json({ success: true, message: "Đơn hàng đã xác nhận", order });
  } catch (error) {
    console.error("Lỗi xác nhận đơn:", error);
    res.status(500).json({ success: false, message: "Không thể xác nhận đơn hàng" });
  }
});

// Supplier hoàn thành đơn nhập hàng
app.post("/supplierorders/:id/complete", async (req, res) => {
  try {
    const order = await SupplierOrder.findById(req.params.id).populate("items.productId");
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn nhập hàng" });

    if (order.status !== "confirmed") {
      return res.status(400).json({ success: false, message: "Chỉ đơn đang xử lý mới được hoàn thành" });
    }

    for (const item of order.items) {
      let inventory = await Inventory.findOne({ product: item.productId._id });
      if (!inventory) {
        inventory = new Inventory({
          product: item.productId._id,
          warehousePrice: item.importPrice,
          stock: [{ size: item.size, quantity: item.quantity }],
        });
      } else {
        const sizeStock = inventory.stock.find(s => s.size === item.size);
        if (sizeStock) {
          sizeStock.quantity += item.quantity;
        } else {
          inventory.stock.push({ size: item.size, quantity: item.quantity });
        }
      }
      inventory.available = inventory.stock.some(s => s.quantity > 0);
      await inventory.save();
    }

    order.status = "completed";
    order.completedAt = new Date();
    await order.save();

    res.json({ success: true, message: "Nhập kho thành công", order });
  } catch (error) {
    console.error("Lỗi hoàn tất đơn nhập:", error);
    res.status(500).json({ success: false, message: "Không thể hoàn tất đơn nhập hàng" });
  }
});

// Supplier hủy đơn nhập hàng
app.post("/supplierorders/:id/cancel", async (req, res) => {
  try {
    const order = await SupplierOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ success: false, message: "Chỉ đơn hàng Mới mới có thể hủy" });
    }

    order.status = "canceled";
    await order.save();

    res.json({ success: true, message: "Đơn hàng đã được hủy", order });
  } catch (error) {
    console.error("Lỗi hủy đơn hàng:", error);
    res.status(500).json({ success: false, message: "Không thể hủy đơn hàng" });
  }
});

// Admin cập nhật trạng thái đơn nhập hàng
app.post("/updatesupplierorder/:orderId", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatus = ["pending", "confirmed", "completed", "canceled"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
    }

    const order = await SupplierOrder.findByIdAndUpdate(
      req.params.orderId,
      { status },
      { new: true },
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn nhập hàng" });
    }

    res.json({ success: true, message: "Cập nhật trạng thái thành công", order });
  } catch (error) {
    console.error("Lỗi cập nhật đơn nhập hàng:", error);
    res.status(500).json({ success: false, message: "Không thể cập nhật trạng thái" });
  }
});

// Lấy danh sách Inventory
app.get('/getinventory', async (req, res) => {
    try {
        const inventory = await Inventory.find({ product: { $ne: null } })
            .populate({
                path: 'product',
                populate: { path: 'supplier', select: 'name _id' },
            });
        res.json({ success: true, inventory });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Không thể lấy dữ liệu kho hàng" });
    }
});

// Count products with zero stock
app.get("/inventory/zerostock", async (req, res) => {
  try {
    const zeroStockProducts = await Inventory.find({
      stock: { $not: { $elemMatch: { quantity: { $gt: 0 } } } } // All sizes have quantity = 0
    }).countDocuments();
    res.json({ success: true, count: zeroStockProducts });
  } catch (error) {
    console.error("Lỗi khi đếm sản phẩm hết hàng:", error);
    res.status(500).json({ success: false, message: "Không thể đếm sản phẩm hết hàng" });
  }
});

// Cập nhật giá bán (sellingPrice) cho sản phẩm trong inventory
app.post("/updateSellingPrice", async (req, res) => {
  try {
    const { inventoryId, sellingPrice } = req.body;
    if (!inventoryId || sellingPrice == null) {
      return res.json({ success: false, message: "Thiếu dữ liệu!" });
    }

    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      return res.json({ success: false, message: "Không tìm thấy sản phẩm trong kho!" });
    }

    inventory.sellingPrice = sellingPrice;
    await inventory.save();

    res.json({ success: true, message: "Cập nhật giá bán thành công!" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Lỗi khi cập nhật giá bán!" });
  }
});

// Cập nhật giá bán theo productId
app.put("/inventory/:productId/price", async (req, res) => {
  try {
    const { sellingPrice } = req.body;
    const inv = await Inventory.findOneAndUpdate(
      { product: req.params.productId },
      { $set: { sellingPrice } },
      { new: true },
    );
    if (!inv) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm trong kho" });
    }
    res.json({ success: true, inventory: inv });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi khi cập nhật giá bán" });
  }
});

// Thêm tồn kho
app.post("/inventory/:productId/addstock", async (req, res) => {
  try {
    const { size, quantity } = req.body;
    const productId = req.params.productId;

    // Validate input
    if (!size || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
    }

    let inventory = await Inventory.findOne({ product: productId });
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Sản phẩm không tồn tại" });
    }

    if (!inventory) {
      // Create new inventory entry
      inventory = new Inventory({
        product: productId,
        warehousePrice: product.priceImport,
        sellingPrice: product.priceImport * 1.2, // Set default sellingPrice
        stock: [{ size, quantity: Number(quantity) }],
      });
    } else {
      // Update existing inventory
      const stockItem = inventory.stock.find((s) => s.size === size);
      if (stockItem) {
        stockItem.quantity += Number(quantity);
      } else {
        inventory.stock.push({ size, quantity: Number(quantity) });
      }
    }

    // Update availability
    inventory.available = inventory.stock.some((s) => s.quantity > 0);
    await inventory.save();

    res.json({ success: true, inventory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi khi nhập hàng" });
  }
});

server.listen(port, (error) => {
  if (!error) {
    console.log("Server Running on Port " + port);
  } else {
    console.log("Error: " + error);
  }
});
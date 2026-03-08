const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const Product = require('./models/Product');
require('dotenv').config();


const app = express();
const PORT = 3000;

mongoose.connect('mongodb+srv://trandacphu321_db_user:bin7102004@clustermyshop.snh1p5t.mongodb.net/').then(() => {
  console.log('Connected to MongoDB Atlas');
}).catch(err => {
  console.error('Database connection error:', err);
});

// 1. Cấu hình View Engine là EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 2. Middleware xử lý dữ liệu từ form và JSON (rất quan trọng để test API bằng Postman)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 3. Cấu hình Session để lưu giỏ hàng
app.use(session({
    secret: 'theanh-secret-key', // Khóa bảo mật session
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Đặt là false vì chạy localhost chưa có HTTPS
}));

// 4. Kết nối MongoDB
const uri = process.env.MONGO_CNT;
mongoose.connect(uri)
    .then(() => console.log('Đã kết nối MongoDB thành công!'))
    .catch(err => console.error('Lỗi kết nối Database:', err));

// 5. Khởi động server

// ==========================================
// CÁC API DÀNH CHO POSTMAN
// ==========================================

// 1. Lấy danh sách sản phẩm (GET)
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 2. Tạo sản phẩm mới (POST)
app.post('/api/products', async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.status(201).json({ message: 'Tạo sản phẩm thành công!', product: newProduct });
    } catch (error) {
        res.status(400).json({ error: 'Không thể tạo sản phẩm' });
    }
});

// 3. Cập nhật sản phẩm (PUT)
app.put('/api/products/:id', async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ message: 'Cập nhật thành công!', product: updatedProduct });
    } catch (error) {
        res.status(400).json({ error: 'Lỗi cập nhật' });
    }
});

// 4. Xóa sản phẩm (DELETE)
app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Đã xóa sản phẩm!' });
    } catch (error) {
        res.status(400).json({ error: 'Lỗi khi xóa' });
    }
});

// ==========================================
// CÁC ROUTE RENDER GIAO DIỆN (EJS)
// ==========================================

// Trang chủ: Danh sách sản phẩm
app.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        
        // Tính tổng số lượng sản phẩm trong giỏ hàng để hiển thị trên góc phải
        let cartCount = 0;
        if (req.session.cart) {
            req.session.cart.forEach(item => cartCount += item.quantity);
        }

        // Truyền mảng products và số lượng cartCount sang file index.ejs
        res.render('index', { products: products, cartCount: cartCount });
    } catch (error) {
        res.status(500).send('Lỗi khi tải danh sách sản phẩm');
    }
});

// Trang chi tiết sản phẩm
app.get('/product/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        // Tính tổng số lượng giỏ hàng
        let cartCount = 0;
        if (req.session.cart) {
            req.session.cart.forEach(item => cartCount += item.quantity);
        }

        if (!product) {
            return res.status(404).send('Không tìm thấy sản phẩm');
        }

        // Truyền dữ liệu sang file detail.ejs
        res.render('detail', { product: product, cartCount: cartCount });
    } catch (error) {
        res.status(500).send('Lỗi khi tải chi tiết sản phẩm');
    }
});

// ==========================================
// XỬ LÝ GIỎ HÀNG BẰNG SESSION
// ==========================================

// 1. Thêm sản phẩm vào giỏ hàng
app.post('/cart/add/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);

        if (!product) return res.status(404).send('Không tìm thấy sản phẩm!');

        // Khởi tạo giỏ hàng nếu chưa có trong session
        if (!req.session.cart) {
            req.session.cart = [];
        }

        // Kiểm tra xem sản phẩm đã có trong giỏ chưa
        const existingItem = req.session.cart.find(item => item.product._id.toString() === productId);

        if (existingItem) {
            existingItem.quantity += 1; // Nếu có rồi thì cộng dồn số lượng
        } else {
            req.session.cart.push({ product: product, quantity: 1 }); // Nếu chưa thì thêm mới
        }

        // ✅ FIX LỖI: Ép Session lưu lại dữ liệu ngay lập tức và chuyển hướng chuẩn xác
        req.session.save((err) => {
            if (err) {
                console.error('Lỗi khi lưu session:', err);
                return res.status(500).send('Lỗi server');
            }
            // Chuyển hướng thẳng về Trang chủ. Cậu cũng có thể thay '/' thành '/cart' nếu muốn khách bấm xong vào thẳng giỏ hàng nha.
            res.redirect('/'); 
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi thêm vào giỏ hàng');
    }
});

// 2. Hiển thị trang giỏ hàng
app.get('/cart', (req, res) => {
    // Lấy giỏ hàng từ session, nếu không có thì gán là mảng rỗng
    const cart = req.session.cart || [];
    
    let cartCount = 0;
    let totalAmount = 0;

    // Tính tổng số lượng và tổng tiền
    cart.forEach(item => {
        cartCount += item.quantity;
        totalAmount += item.product.price * item.quantity;
    });

    // Back end truyền dữ liệu trực tiếp tới view engine thông qua phương thức res.render
    res.render('cart', { cart: cart, cartCount: cartCount, totalAmount: totalAmount });
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
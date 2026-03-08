const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    imageUrl: { type: String } // Link ảnh sản phẩm để hiển thị cho đẹp
});

module.exports = mongoose.model('Product', productSchema);
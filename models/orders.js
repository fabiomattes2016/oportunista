const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
	pair: {
		type: String,
		required: true,
	},
	quantity: {
		type: Number,
		required: true,
	},
	price: {
		type: Number,
		default: 0,
	},
	side: {
		type: String,
	},
	lastUpdated: {
		type: Date,
		default: Date.now,
	},
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;

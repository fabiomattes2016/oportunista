const mongoose = require("mongoose");

const balanceSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	balance: {
		type: String,
		required: true,
	},
	lastUpdated: {
		type: Date,
		default: Date.now,
	},
});

const Balance = mongoose.model("Balance", balanceSchema);

module.exports = Balance;

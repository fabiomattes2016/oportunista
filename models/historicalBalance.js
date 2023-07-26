const mongoose = require("mongoose");

const historicalBalanceSchema = new mongoose.Schema({
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

const HistoricalBalance = mongoose.model(
	"HistoricalBalance",
	historicalBalanceSchema
);

module.exports = HistoricalBalance;

const mongoose = require("mongoose");

const configSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	value: {
		type: Boolean,
		required: true,
	},
});

const Config = mongoose.model("Config", configSchema);

module.exports = Config;

const mongoose = require("mongoose");

const parameterSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	value: {
		type: String,
		required: true,
	},
});

const Parameter = mongoose.model("Parameter", parameterSchema);

module.exports = Parameter;

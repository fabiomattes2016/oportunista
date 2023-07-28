require("dotenv").config();
const mongoose = require("mongoose");

const Config = require("./models/config");
const Parameter = require("./models/parameters");

async function startConfig() {
	await mongoose.connect(`${process.env.DATABASE_URL}`, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});

	const hasBought = {
		name: "hasBought",
		value: false,
	};

	const isWaitingForSell = {
		name: "isWaitingForSell",
		value: false,
	};

	const binanceKey = {
		name: "binanceKey",
		value: "F5ziJJI7Q1Pc051C51JcSX35X4iN5YO0skU7fcVSb5JBcyAaixLc5URTfZhw85JP",
	};

	const binanceSecret = {
		name: "binanceSecret",
		value: "H6gFJcvwFWSBDuxN7aSEd6dKKjYjobJ2niSEWvCNfqTzELx5ZklbPKCupSvPIVYX",
	};

	const baseAsset = {
		name: "baseAsset",
		value: "USDT",
	};

	const tradingAsset = {
		name: "tradingAsset",
		value: "BTC",
	};

	const tradingAmount = {
		name: "tradingAmount",
		value: 150.0,
	};

	const telegramToken = {
		name: "telegramToken",
		value: "508123001:AAFhe4A7va4O3lvDfRFAoD9C7Rw8VGp9jQA",
	};

	const chatId = {
		name: "chatId",
		value: "6660062274",
	};

	await Config.findOneAndUpdate({ name: "hasBought" }, hasBought, {
		upsert: true,
	});

	await Config.findOneAndUpdate(
		{ name: "isWaitingForSell" },
		isWaitingForSell,
		{
			upsert: true,
		}
	);

	await Parameter.findOneAndUpdate({ name: "binanceKey" }, binanceKey, {
		upsert: true,
	});

	await Parameter.findOneAndUpdate({ name: "binanceSecret" }, binanceSecret, {
		upsert: true,
	});

	await Parameter.findOneAndUpdate({ name: "baseAsset" }, baseAsset, {
		upsert: true,
	});

	await Parameter.findOneAndUpdate({ name: "tradingAsset" }, tradingAsset, {
		upsert: true,
	});

	await Parameter.findOneAndUpdate({ name: "tradingAmount" }, tradingAmount, {
		upsert: true,
	});

	await Parameter.findOneAndUpdate({ name: "telegramToken" }, telegramToken, {
		upsert: true,
	});

	await Parameter.findOneAndUpdate({ name: "chatId" }, chatId, {
		upsert: true,
	});
}

startConfig();

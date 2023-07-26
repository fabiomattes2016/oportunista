require("dotenv").config();
const Binance = require("binance-api-node").default;
const { VWAP } = require("technicalindicators");
const colors = require("colors");
const mongoose = require("mongoose");
const beep = require("beepbeep");
const TelegramBot = require("node-telegram-bot-api");

const Order = require("./models/orders");
const Balance = require("./models/balance");
const Config = require("./models/config");
const HistoricalBalance = require("./models/historicalBalance");

let client = null;

const environment = process.env.ENVIRONMENT;

switch (environment) {
	case "dev":
		client = Binance({
			apiKey: process.env.BINANCE_API_KEY,
			apiSecret: process.env.BINANCE_API_SECRET,
			getTime: Date.now,
			httpBase: "https://testnet.binance.vision",
		});
	case "prod":
		client = Binance({
			apiKey: process.env.BINANCE_API_KEY,
			apiSecret: process.env.BINANCE_API_SECRET,
			getTime: Date.now,
		});
}

const baseAsset = process.env.BASE_ASSET; // Moeda base (USDT)
const tradingAsset = process.env.TRADING_ASSET; // Ativo de negociação (BTC)
const tradingPair = `${tradingAsset}${baseAsset}`;
const tradingAmount = parseFloat(process.env.TRADING_AMOUNT); // Valor em USDT para compra e venda

// Configuração do token do seu bot no Telegram
const telegramToken = process.env.TELEGRAM_TOKEN;
const chatId = process.env.CHAT_ID;
const bot = new TelegramBot(telegramToken, {
	polling: true,
});

// let hasBought = false; // Estado para controlar se o bot já realizou a compra
// let isWaitingForSell = false; // Estado para controlar se o bot está aguardando a venda

let buyPrice = 0;

function formatDateTime(date) {
	const day = date.getDate().toString().padStart(2, "0");
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const year = date.getFullYear();
	const hours = date.getHours().toString().padStart(2, "0");
	const minutes = date.getMinutes().toString().padStart(2, "0");
	const seconds = date.getSeconds().toString().padStart(2, "0");

	return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function isMidnight() {
	const now = new Date();
	const hours = now.getHours();
	const minutes = now.getMinutes();
	const seconds = now.getSeconds();

	return hours === 0 && minutes === 0 && seconds === 0;
}

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
}

async function buy(currentPrice) {
	try {
		await mongoose.connect(`${process.env.DATABASE_URL}`, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});

		const accountInfo = await client.accountInfo();
		const baseAssetBalance = parseFloat(
			accountInfo.balances.find((asset) => asset.asset === baseAsset).free
		);

		const currentDate = new Date();

		const tradingAssetBalance = parseFloat(
			accountInfo.balances.find((asset) => asset.asset === tradingAsset).free
		);

		const balanceBaseAsset = {
			name: baseAsset,
			balance: baseAssetBalance,
			lastUpdated: currentDate,
		};

		const balanceTradingAsset = {
			name: tradingAsset,
			balance: tradingAssetBalance,
			lastUpdated: currentDate,
		};

		const amount = parseFloat(tradingAmount) / parseFloat(currentPrice);

		if (baseAssetBalance < tradingAmount) {
			console.log(
				colors.red(
					`[${formatDateTime(
						new Date()
					)}] Saldo insuficiente para comprar ${tradingAmount} ${baseAsset}`
				)
			);
			return;
		}

		const buyOrder = await client.order({
			symbol: tradingPair,
			side: "BUY",
			quantity: amount.toFixed(6),
			type: "MARKET",
		});

		buyPriceOrder = parseFloat(buyOrder.fills[0].price);

		await Balance.findOneAndUpdate({ name: baseAsset }, balanceBaseAsset, {
			upsert: true,
		});

		await Balance.findOneAndUpdate(
			{ name: tradingAsset },
			balanceTradingAsset,
			{
				upsert: true,
			}
		);

		const newOrder = new Order({
			pair: tradingPair,
			quantity: parseFloat(amount),
			price: parseFloat(currentPrice),
			side: "BUY",
			lastUpdated: currentDate,
		});

		newOrder.save();

		const hasBought = {
			name: "hasBought",
			value: true,
		};

		const isWaitingForSell = {
			name: "isWaitingForSell",
			value: true,
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

		console.log(
			colors.red(
				`[${formatDateTime(new Date())}] Compra efetuada: ${
					buyOrder.fills[0].qty
				} ${tradingAsset} por ${buyPriceOrder.toFixed(2)} ${baseAsset}`
			)
		);
		console.log(
			colors.yellow(
				`[${formatDateTime(
					new Date()
				)}] Saldo atual: ${baseAssetBalance.toFixed(2)}`
			)
		);
		buyPrice = parseFloat(buyOrder.fills[0].price);

		beep(1); // Tocar beep no terminal quando ocorrer uma compra
		bot.sendMessage(
			chatId,
			`[${formatDateTime(new Date())}] Compra efetuada: ${
				buyOrder.fills[0].qty
			} ${tradingAsset} por ${buyPriceOrder.toFixed(2)} ${baseAsset}`
		);
	} catch (error) {
		console.error(`[${formatDateTime(new Date())}] Erro ao comprar:`, error);
	}
}

async function saveSell(
	amount,
	currentPrice,
	currentDate,
	sellOrder,
	baseAssetBalance,
	balanceBaseAsset,
	balanceTradingAsset
) {
	await Balance.findOneAndUpdate({ name: baseAsset }, balanceBaseAsset, {
		upsert: true,
	});

	await Balance.findOneAndUpdate({ name: tradingAsset }, balanceTradingAsset, {
		upsert: true,
	});

	const newOrder = new Order({
		pair: tradingPair,
		quantity: parseFloat(amount),
		price: parseFloat(currentPrice),
		side: "SELL",
		lastUpdated: currentDate,
	});

	newOrder.save();

	const hasBought = {
		name: "hasBought",
		value: false,
	};

	const isWaitingForSell = {
		name: "isWaitingForSell",
		value: false,
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

	let sellPrice = parseFloat(sellOrder.fills[0].price);

	console.log(
		colors.green(
			`[${formatDateTime(new Date())}] Venda efetuada: ${
				sellOrder.fills[0].qty
			} ${tradingAsset} por ${sellPrice.toFixed(2)} ${baseAsset}`
		)
	);

	console.log(
		colors.yellow(
			`[${formatDateTime(new Date())}] Saldo atual: ${baseAssetBalance.toFixed(
				2
			)}`
		)
	);

	beep(1); // Tocar beep no terminal quando ocorrer uma compra

	bot.sendMessage(
		chatId,
		`[${formatDateTime(new Date())}] Venda efetuada: ${
			sellOrder.fills[0].qty
		} ${tradingAsset} por ${sellPrice.toFixed(2)} ${baseAsset}`
	);
}

async function sell(currentPrice) {
	try {
		const accountInfo = await client.accountInfo();
		const currentDate = new Date();

		const baseAssetBalance = parseFloat(
			accountInfo.balances.find((asset) => asset.asset === baseAsset).free
		);

		const tradingAssetBalance = parseFloat(
			accountInfo.balances.find((asset) => asset.asset === tradingAsset).free
		);

		const balanceBaseAsset = {
			name: baseAsset,
			balance: baseAssetBalance,
			lastUpdated: currentDate,
		};

		const balanceTradingAsset = {
			name: tradingAsset,
			balance: tradingAssetBalance,
			lastUpdated: currentDate,
		};

		const amount = parseFloat(tradingAmount) / parseFloat(currentPrice);

		const stopLossPrice = buyPrice - buyPrice * 0.0005;

		if (parseFloat(tradingAssetBalance) < parseFloat(amount)) {
			console.log(
				colors.red(
					`[${formatDateTime(
						new Date()
					)}] Saldo insuficiente para vender ${amount} ${tradingAsset}`
				)
			);
			return;
		}

		let sellOrder = null;

		if (currentPrice <= stopLossPrice) {
			sellOrder = await client.order({
				symbol: tradingPair,
				side: "SELL",
				quantity: amount.toFixed(6),
				type: "MARKET",
			});

			await saveSell(
				amount,
				currentPrice,
				currentDate,
				sellOrder,
				baseAssetBalance,
				balanceBaseAsset,
				balanceTradingAsset
			);
		} else {
			sellOrder = await client.order({
				symbol: tradingPair,
				side: "SELL",
				quantity: amount.toFixed(6),
				type: "MARKET",
			});

			await saveSell(
				amount,
				currentPrice,
				currentDate,
				sellOrder,
				baseAssetBalance,
				balanceBaseAsset,
				balanceTradingAsset
			);
		}
	} catch (error) {
		console.error(`[${formatDateTime(new Date())}] Erro ao vender:`, error);
	}
}

// Função para obter a VWAP Band 1
async function getVWAPBand1(symbol, interval, period) {
	try {
		const historicalData = await client.candles({ symbol, interval });
		const closePrices = historicalData.map((entry) => parseFloat(entry.close));

		const input = {
			open: closePrices,
			high: closePrices,
			low: closePrices,
			close: closePrices,
			volume: historicalData.map((entry) => parseFloat(entry.volume)),
			period,
		};

		const vwap = VWAP.calculate(input);

		return vwap[vwap.length - 1];
	} catch (error) {
		console.error(
			colors.red(
				`[${formatDateTime(new Date())}] Erro ao obter a VWAP Band 1:`,
				error
			)
		);
		throw error;
	}
}

// Preços acima da VWAP
function isAboveVWAPPercentage(currentPrice, vwap) {
	const percentageDifference = ((currentPrice - vwap) / vwap) * 100;

	switch (true) {
		case percentageDifference > 0.55:
			return true;
		case percentageDifference > 0.45:
			return true;
		case percentageDifference > 0.36:
			return true;
		case percentageDifference > 0.24:
			return true;
		case percentageDifference > 0.18:
			return true;
		case percentageDifference > 0.09:
			return true;
		default:
			return false;
	}
}

// Preços abaixo da VWAP
function isBelowVWAPPercentage(currentPrice, vwap) {
	const percentageDifference = ((vwap - currentPrice) / vwap) * 100;

	switch (true) {
		case percentageDifference > 0.55:
			return true;
		case percentageDifference > 0.45:
			return true;
		case percentageDifference > 0.36:
			return true;
		case percentageDifference > 0.24:
			return true;
		case percentageDifference > 0.18:
			return true;
		case percentageDifference > 0.09:
			return true;
		default:
			return false;
	}
}

async function main() {
	console.clear();
	await mongoose.connect(`${process.env.DATABASE_URL}`, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});

	const quoted = baseAsset;
	const pair = tradingAsset;
	const symbol = `${pair}${quoted}`;
	const interval = "1m";
	const period = 20;

	try {
		const vwapBand1 = await getVWAPBand1(symbol, interval, period);

		const ticker = await client.prices({ symbol: tradingPair });
		const currentPrice = parseFloat(ticker[tradingPair]);
		const ConfigHasBought = await Config.findOne({ name: "hasBought" });
		const ConfigIsWaitingForSell = await Config.findOne({
			name: "isWaitingForSell",
		});

		const hasBought = ConfigHasBought.value;
		const isWaitingForSell = ConfigIsWaitingForSell.value;

		if (currentPrice <= vwapBand1 && !hasBought && !isWaitingForSell) {
			await buy(currentPrice);
			// } else if (currentPrice >= vwapBand1 && hasBought && isWaitingForSell) {
			// 	await sell(currentPrice);
		} else if (
			isBelowVWAPPercentage(currentPrice, vwapBand1) &&
			!hasBought &&
			!isWaitingForSell
		) {
			await buy(currentPrice);
		} else if (
			isAboveVWAPPercentage(currentPrice, vwapBand1) &&
			hasBought &&
			isWaitingForSell
		) {
			await sell(currentPrice);
		} else {
			console.log(
				colors.cyan(
					`[${formatDateTime(new Date())}] Aguardando momento de entrar!`
				)
			);
		}

		let meiaNoite = isMidnight();
		const base = await Balance.findOne({ name: baseAsset });
		const trade = await Balance.findOne({ name: tradingAsset });

		if (meiaNoite) {
			const newHistoricalBalBase = new HistoricalBalance({
				name: baseAsset,
				balance: parseFloat(base.balance),
				lastUpdated: new Date(),
			});

			const newHistoricalBalTrade = new HistoricalBalance({
				name: tradingAsset,
				balance: parseFloat(trade.balance),
				lastUpdated: new Date(),
			});

			newHistoricalBalTrade.save();
			newHistoricalBalBase.save();
		}
	} catch (error) {
		console.error(`[${formatDateTime(new Date())}] Ocorreu um erro:`, error);
	}
}

// bot.on("message", (msg) => {
// 	console.log("Chat ID:", msg.chat.id);
// });

// startConfig();

setInterval(main, 5000);

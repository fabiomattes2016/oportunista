const Binance = require("binance-api-node").default;

const client = Binance({
	apiKey: "BArztMUmBNHiWj8ipXPC106OwsxJzTOZ2M1JkcYbEguegAXpWgQS0sr0luCkpx8b",
	apiSecret: "ywXVXL16sPEHJS9TbfxcLqNkrUDJKF1Hp5ETRuBgLLFByFsvF4LuD5Qh9FX4o090",
});

let compraRealizada = false;
let precoCompra = 0;
let pair = "ETHUSDT";

function formatDateTime(date) {
	const day = date.getDate().toString().padStart(2, "0");
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const year = date.getFullYear();
	const hours = date.getHours().toString().padStart(2, "0");
	const minutes = date.getMinutes().toString().padStart(2, "0");
	const seconds = date.getSeconds().toString().padStart(2, "0");

	return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Função para calcular a média móvel exponencial de 9 períodos
function calcularMediaExponencial(arr) {
	if (arr.length === 0) return 0;
	const alpha = 2 / (9 + 1);
	let ema = arr[0];
	for (let i = 1; i < arr.length; i++) {
		ema = arr[i] * alpha + ema * (1 - alpha);
	}
	return ema;
}

// Função para verificar as condições de compra
function verificarCompra(ema9, ema21, candleAnterior) {
	return ema9 < ema21 && candleAnterior.close < ema9;
}

// Função para verificar as condições de venda
function verificarVenda(ema9, ema21, candleAnterior) {
	const precoVenda = precoCompra * 1.001; // Preço de venda com 0,10% a mais que o preço de compra
	const stopLoss = precoCompra * 0.9995; // Stop loss de 0,05% abaixo do preço de compra

	if (
		compraRealizada &&
		ema9 > ema21 &&
		candleAnterior.close > candleAnterior.open &&
		precoVenda > 0 &&
		candleAnterior.close < stopLoss
	) {
		compraRealizada = false;
		console.log(
			`[${formatDateTime(
				new Date()
			)}] Stop Loss atingido: ${symbol} - Preço de venda: ${precoVenda}`
		);
		// Aqui você pode lançar a ordem de venda na Binance com o preço de venda calculado.
	} else if (
		compraRealizada &&
		ema9 > ema21 &&
		candleAnterior.close > candleAnterior.open &&
		precoVenda > 0
	) {
		const lucro = precoVenda - precoCompra;
		compraRealizada = false;
		console.log(
			`[${formatDateTime(
				new Date()
			)}] Hora de vender: ${symbol} - Preço de venda: ${precoVenda} - Lucro: ${lucro}`
		);
		// Aqui você pode lançar a ordem de venda na Binance com o preço de venda calculado.
	}
}

// Função para executar as ações de compra e venda
function executarAcoes(symbol, candles) {
	const ema9 = calcularMediaExponencial(candles.map((candle) => candle.close));
	const ema21 = calcularMediaExponencial(candles.map((candle) => candle.close));

	// console.log(`EMA9: ${ema9}`);
	// console.log(`EMA21: ${ema21}`);

	const candleAnterior = candles[candles.length - 2]; // Último candle fechado

	if (!compraRealizada && verificarCompra(ema9, ema21, candleAnterior)) {
		compraRealizada = true;
		precoCompra = candleAnterior.close;
		console.log(
			`[${formatDateTime(
				new Date()
			)}] Hora de comprar: ${symbol} - Preço de compra: ${precoCompra}`
		);
	}

	if (!compraRealizada) {
		console.log(
			`[${formatDateTime(new Date())}] Aguardando momento de entrada!`
		);
	}

	verificarVenda(ema9, ema21, candleAnterior);
}

// Função para obter os dados do mercado e chamar a função de execução de ações
async function analisarMercado(symbol) {
	try {
		const candles = await client.candles({ symbol, interval: "1m" });

		executarAcoes(symbol, candles);
	} catch (error) {
		console.error(error);
	}
}

analisarMercado(pair);

// Intervalo de análise (1 minuto)
setInterval(() => {
	analisarMercado(pair); // Replace 'BTCUSDT' with the cryptocurrency pair you want to trade
}, 1000);

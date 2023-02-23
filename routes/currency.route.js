const { Router } = require("express");
const router = Router();

if (typeof globalThis.fetch !== "function") {
    // Fetch API is available in NODE from version 17.5
    const {
        default: fetch,
        Headers,
        Request,
        Response,
    } = require("node-fetch");

    globalThis.fetch = fetch;
    globalThis.Headers = Headers;
    globalThis.Request = Request;
    globalThis.Response = Response;
}

function fillMissedPairs(normalizedData, availableCurrencies) {
    const knownPairs = {};

    for (const item of normalizedData) {
        const { to, from } = item;
        const key = `${to}:${from}`;

        knownPairs[key] = item;
    }

    const availableCurrenciesList = Object.keys(availableCurrencies);

    for (const currentCurrency of availableCurrenciesList) {
        const oppositeCurrencies = availableCurrenciesList.filter(currency => currency !== currentCurrency);

        for (const oppositeCurrency of oppositeCurrencies) {
            const key = `${currentCurrency}:${oppositeCurrency}`;

            if (!knownPairs[key]) {
                const commonCurrency = oppositeCurrencies.find(currency => {
                    const key1 = `${currentCurrency}:${currency}`;
                    const key2 = `${oppositeCurrency}:${currency}`;

                    return !!knownPairs[key1] && !!knownPairs[key2];
                });

                if (!commonCurrency) {
                    console.warn(`Can't find common currency for:`, currentCurrency, oppositeCurrency);

                    continue;
                }

                const key1 = `${currentCurrency}:${commonCurrency}`;
                const key2 = `${oppositeCurrency}:${commonCurrency}`;

                const currencyDescription1 = knownPairs[key1];
                const currencyDescription2 = knownPairs[key2];

                if (!currencyDescription1 || !currencyDescription2) {
                    continue;
                }

                const object = {
                    id: key,
                    to: currentCurrency,
                    from: oppositeCurrency,
                    buy: currencyDescription1.buy / currencyDescription2.buy,
                    sell: currencyDescription1.sell / currencyDescription2.sell,
                    auto: true,
                };

                knownPairs[key] = object;

                normalizedData.push(object);
            }
        }
    }

    return normalizedData;
}

function normalizeData(arr) {
    const normalizedData = [];

    for (let i = 0; i < arr.length; i++) {
        const curCurrencyObject = arr[i];

        const normalized = {
            id: `${curCurrencyObject.ccy}:${curCurrencyObject.base_ccy}`,
            from: curCurrencyObject.ccy,
            to: curCurrencyObject.base_ccy,
            buy: Number(curCurrencyObject.buy),
            sell: Number(curCurrencyObject.sale),
        };

        const normalizedReversed = {
            id: `${curCurrencyObject.base_ccy}:${curCurrencyObject.ccy}`,
            from: curCurrencyObject.base_ccy,
            to: curCurrencyObject.ccy,
            buy: 1 / normalized.buy,
            sell: 1 / normalized.sell,
        };

        normalizedData.push(normalized, normalizedReversed);
    }

    return normalizedData;
}

function getCurrenciesNames(inputArray, outputObject) {
    for (let i = 0; i < inputArray.length; i++) {
        const currentCurrencyObject = inputArray[i];

        if (!outputObject[currentCurrencyObject.ccy]) {
            outputObject[currentCurrencyObject.ccy] = currentCurrencyObject.ccy;
            outputObject[currentCurrencyObject.base_ccy] = currentCurrencyObject.base_ccy;
        }
    }
}

function fetchBinanceCurrency(currency) {
    return fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${currency}`).then(res => res.json()).then(res => {
        const { symbol, price } = res;

        const fromCurrency = symbol.substring(0, 3); // BTC
        let toCurrency = symbol.substring(3, symbol.length);

        if (toCurrency.length === 4) {
            toCurrency = toCurrency.substring(0, 3);
        }

        return {
            ccy: fromCurrency,
            base_ccy: toCurrency,
            buy: price,
            sale: price,
        };
    });
}

async function getCurrenciesFromBinance(availableCurrencies) {
    return Promise.all(Object.keys(availableCurrencies).map(currency => fetchBinanceCurrency(availableCurrencies[currency])));
}

router.get("/get-all-currencies", async (req, res) => {
    const BINANCE_PAIRS = ["BTCUAH", "BTCUSDT", "BTCEUR"];

    const availableCurrencies = {};

    const currenciesFromPrivatBank = await fetch("https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5").then(res => res.json());
    const binanceCurrencies = await getCurrenciesFromBinance(BINANCE_PAIRS).then(res => res);

    getCurrenciesNames(currenciesFromPrivatBank, availableCurrencies);
    getCurrenciesNames(binanceCurrencies, availableCurrencies);

    const currencies = [...normalizeData(currenciesFromPrivatBank), ...normalizeData(binanceCurrencies)];

    fillMissedPairs(currencies, availableCurrencies);

    res.status(200).json({
        currencies,
        availableCurrencies: Object.keys(availableCurrencies),
    });
});

module.exports = router;
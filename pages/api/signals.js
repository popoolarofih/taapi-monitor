import dns from "dns";
import axios from "axios";

dns.setDefaultResultOrder("ipv4first");

const SECRET = process.env.TAAPI_SECRET;
const RATE_LIMIT_MS = 15_000;

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export default async function handler(req, res) {
  if (!SECRET) {
    return res.status(500).json({ error: "TAAPI_SECRET is missing" });
  }

  try {
    const syRes = await axios.get("https://api.taapi.io/exchange-symbols", {
      params: { secret: SECRET, exchange: "binance" },
    });
    const symbols = syRes.data;
    console.log("Symbols fetched:", symbols.length);
    if (!Array.isArray(symbols)) throw new Error("Symbols not array");

    const results = [];
    const lastRsi = {};

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      console.log("Fetching RSI for:", symbol);

      try {
        const { data } = await axios.get("https://api.taapi.io/rsi", {
          params: { secret: SECRET, exchange: "binance", symbol, interval: "1h" },
        });

        const rsi = data.value;
        let signal = "Hold";
        const prev = lastRsi[symbol];
        if (rsi < 30) signal = "Buy";
        else if (rsi > 70) signal = "Sell";
        else if (prev != null && prev < 30 && rsi >= 30) signal = "Exit Buy";
        else if (prev != null && prev > 70 && rsi <= 70) signal = "Exit Sell";

        lastRsi[symbol] = rsi;
        results.push({ symbol, rsi, signal });

      } catch (err) {
        console.warn("Failed RSI for", symbol, err.response?.status);
      }

      await delay(RATE_LIMIT_MS);
    }

    console.log("Results count:", results.length);
    return res.status(200).json(results);

  } catch (err) {
    console.error("Error fetching symbols:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

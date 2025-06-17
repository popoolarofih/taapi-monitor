// pages/api/signals.js
import dns from "dns";
import axios from "axios";

dns.setDefaultResultOrder("ipv4first");

const SECRET = process.env.TAAPI_SECRET;
const RATE_LIMIT_MS = 15000; // 1 request per 15s – ensures compliance

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  if (!SECRET) {
    return res.status(500).json({ error: "TAAPI_SECRET not set" });
  }

  const results = [];
  const lastRsi = {};

  try {
    const symbolsRes = await axios.get(
      "https://api.taapi.io/exchange-symbols",
      { params: { secret: SECRET, exchange: "binance" } }
    );
    const symbols = symbolsRes.data; // e.g. ["BTC/USDT", "ETH/USDT", ...]

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      // Avoid excessive pulls in testing; remove limit for full 400+ tokens
      if (i >= 50) break;

      try {
        const { data } = await axios.get("https://api.taapi.io/rsi", {
          params: { secret: SECRET, exchange: "binance", symbol, interval: "1h" },
        });

        const rsi = data.value;
        const prev = lastRsi[symbol];
        let signal = "Hold";

        if (rsi < 30) signal = "Buy";
        else if (rsi > 70) signal = "Sell";
        else if (prev != null && prev < 30 && rsi >= 30) signal = "Exit Buy";
        else if (prev != null && prev > 70 && rsi <= 70) signal = "Exit Sell";

        lastRsi[symbol] = rsi;

        results.push({ sNo: i + 1, symbol, rsi, signal });
      } catch (err) {
        if (err.response?.status === 400) {
          console.warn(`⚠️ Invalid symbol skipped: ${symbol}`);
        } else if (err.response?.status === 429) {
          console.warn("🚫 Rate limited. Pausing and retrying...");
          await delay(RATE_LIMIT_MS);
          i--;
        } else {
          console.error(`❌ Error for ${symbol}:`, err.message);
        }
      }

      await delay(RATE_LIMIT_MS);
    }

    res.status(200).json(results);
  } catch (err) {
    console.error("❌ Failed to fetch exchange symbols:", err.message);
    res.status(500).json({ error: "fetch exchange symbols failed" });
  }
}

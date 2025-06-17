import dns from "dns";
import axios from "axios";

dns.setDefaultResultOrder("ipv4first");

const SECRET = process.env.TAAPI_SECRET;
const RATE_LIMIT_MS = 1500; // Reduced for faster fetch within Vercel limits
const MAX_TOKENS = 10;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  if (!SECRET) {
    return res.status(500).json({ error: "TAAPI_SECRET is missing" });
  }

  try {
    // Fetch symbols from TAAPI.io
    const syRes = await axios.get("https://api.taapi.io/exchange-symbols", {
      params: { secret: SECRET, exchange: "binance" },
    });

    const symbols = syRes.data;
    if (!Array.isArray(symbols) || symbols.length === 0) {
      throw new Error("No symbols received");
    }

    console.log("Symbols fetched:", symbols.length);
    const selectedSymbols = symbols.slice(0, MAX_TOKENS); // Limit symbols to avoid timeout

    const results = [];
    const lastRsi = {};

    for (let i = 0; i < selectedSymbols.length; i++) {
      const symbol = selectedSymbols[i];
      console.log("Fetching RSI for:", symbol);

      try {
        const { data } = await axios.get("https://api.taapi.io/rsi", {
          params: {
            secret: SECRET,
            exchange: "binance",
            symbol,
            interval: "1h",
          },
        });

        const rsi = data?.value;
        if (rsi == null) continue;

        let signal = "Hold";
        const prev = lastRsi[symbol];

        if (rsi < 30) signal = "Buy";
        else if (rsi > 70) signal = "Sell";
        else if (prev != null && prev < 30 && rsi >= 30) signal = "Exit Buy";
        else if (prev != null && prev > 70 && rsi <= 70) signal = "Exit Sell";

        lastRsi[symbol] = rsi;

        results.push({
          sNo: i + 1,
          symbol,
          rsi: parseFloat(rsi.toFixed(2)),
          signal,
        });

      } catch (err) {
        console.warn(`❌ Failed to fetch RSI for ${symbol}:`, err.response?.status || err.message);
      }

      await delay(RATE_LIMIT_MS);
    }

    console.log("✅ Signals fetched:", results.length);
    return res.status(200).json(results);
  } catch (err) {
    console.error("❌ API Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

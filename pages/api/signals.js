// pages/api/signals.js
import dns from "dns";
import axios from "axios";
dns.setDefaultResultOrder("ipv4first");

const SECRET = process.env.TAAPI_SECRET;
const MAX_SYMBOLS = 10; // top 10 symbols

export default async function handler(req, res) {
  if (!SECRET) return res.status(500).json({ error: "TAAPI_SECRET is missing" });

  try {
    const { data: symbols } = await axios.get("https://api.taapi.io/exchange-symbols", {
      params: { secret: SECRET, exchange: "binance" },
    });
    if (!Array.isArray(symbols) || symbols.length === 0)
      throw new Error("No symbols fetched");

    const topSymbols = symbols.slice(0, MAX_SYMBOLS);
    const constructs = topSymbols.map((symbol) => ({
      exchange: "binance",
      symbol,
      interval: "1h",
      indicators: [{ indicator: "rsi" }],
    }));

    const { data: bulkRes } = await axios.post("https://api.taapi.io/bulk", {
      secret: SECRET,
      construct: constructs,
    });

    const results = bulkRes.data
      .filter((d) => d.result && typeof d.result.value === "number")
      .map((d, i) => ({
        sNo: i + 1,
        symbol: topSymbols[i],
        rsi: parseFloat(d.result.value.toFixed(2)),
        signal:
          d.result.value < 30
            ? "Buy"
            : d.result.value > 70
            ? "Sell"
            : "Hold",
      }));

    return res.status(200).json(results);
  } catch (err) {
    console.error("API Error:", err.response?.data || err.message);
    return res.status(500).json({ error: err.message });
  }
}

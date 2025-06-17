import axios from "axios";

const SECRET = process.env.TAAPI_SECRET;
const MAX_SYMBOLS = 10;

export default async function handler(req, res) {
  if (!SECRET) return res.status(500).json({ error: "TAAPI_SECRET is missing" });

  try {
    const { data: symbols } = await axios.get("https://api.taapi.io/exchange-symbols", {
      params: { secret: SECRET, exchange: "binance" },
    });
    const top = symbols.slice(0, MAX_SYMBOLS);

    const constructs = top.map((symbol) => ({
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
      .map((d, i) => {
        const rsi = d.result.value;
        const prev = constructs[i].prev;
        let signal = rsi < 30 ? "Buy" : rsi > 70 ? "Sell" : "Hold";
        if (prev != null) {
          if (prev < 30 && rsi >= 30) signal = "Exit Buy";
          if (prev > 70 && rsi <= 70) signal = "Exit Sell";
        }
        constructs[i].prev = rsi;
        return { sNo: i + 1, symbol: top[i], rsi: +rsi.toFixed(2), signal };
      });

    res.status(200).json(results);
  } catch (err) {
    console.error("API Error:", err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
}

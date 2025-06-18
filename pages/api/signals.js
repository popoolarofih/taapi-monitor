import axios from "axios";
import tokens from "../../utils/tokens";

const SECRET = process.env.TAAPI_SECRET;
const CHUNK_SIZE = 10;
const MAX_PARALLEL = 5;

let lastRsi = {}; // Holds previous RSI values across calls

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function fetchBatch(batch, attempt = 0) {
  try {
    const constructs = batch.map((t) => ({
      exchange: "binance",
      symbol: t.symbol,
      interval: "1h",
      indicators: [{ indicator: "rsi" }],
    }));
    const res = await axios.post("https://api.taapi.io/bulk", {
      secret: SECRET,
      construct: constructs,
    });
    return res.data.data.map((d, idx) => ({
      token: batch[idx],
      rsi: d.result?.value,
    }));
  } catch (err) {
    const status = err.response?.status;
    if (status === 429 && attempt < 5) {
      const backoff = err.response.headers["retry-after"]
        ? parseInt(err.response.headers["retry-after"], 10) * 1000
        : 2 ** attempt * 1000;
      await new Promise((r) => setTimeout(r, backoff));
      return fetchBatch(batch, attempt + 1);
    }
    throw err;
  }
}

export default async function handler(req, res) {
  if (!SECRET) {
    return res.status(500).json({ error: "TAAPI_SECRET missing" });
  }

  try {
    const chunks = chunkArray(tokens, CHUNK_SIZE);
    const results = [];

    for (let i = 0; i < chunks.length; i += MAX_PARALLEL) {
      const parallel = chunks.slice(i, i + MAX_PARALLEL).map(fetchBatch);
      const responses = await Promise.all(parallel);
      responses.flat().forEach(({ token, rsi }) => {
        if (typeof rsi !== "number") return;
        const prev = lastRsi[token.symbol];
        let signal = rsi < 30 ? "Buy" : rsi > 70 ? "Sell" : "Hold";
        if (prev != null) {
          if (prev < 30 && rsi >= 30) signal = "Exit Buy";
          if (prev > 70 && rsi <= 70) signal = "Exit Sell";
        }
        lastRsi[token.symbol] = rsi;
        results.push({
          name: token.name,
          symbol: token.symbol,
          rsi: parseFloat(rsi.toFixed(2)),
          signal,
        });
      });
      await new Promise((r) => setTimeout(r, 1000));
    }

    res.status(200).json(results);
  } catch (err) {
    console.error("Bulk fetch error:", err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
}

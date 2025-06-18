import axios from "axios";
import tokens from "../../utils/tokens";

const SECRET = process.env.TAAPI_SECRET;
const CHUNK_SIZE = 10;
const MAX_PARALLEL = 5;
const MAX_RETRIES = 5;
const PAUSE_BETWEEN_GROUPS_MS = 1000;

let lastRsi = {};

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function parseRetryAfter(header) {
  if (!header) return null;
  const num = parseInt(header);
  if (!isNaN(num)) return num * 1000;
  const date = new Date(header).getTime();
  const now = Date.now();
  return date > now ? date - now : null;
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
    return res.data.data.map((d, i) => ({
      token: batch[i],
      rsi: d.result?.value,
    }));
  } catch (err) {
    if (err.response?.status === 429 && attempt < MAX_RETRIES) {
      const wait = parseRetryAfter(err.response.headers["retry-after"]) || 2 ** attempt * 1000;
      await new Promise((r) => setTimeout(r, wait));
      return fetchBatch(batch, attempt + 1);
    }
    throw err;
  }
}

export default async function handler(req, res) {
  if (!SECRET) return res.status(500).json({ error: "Missing TAAPI_SECRET" });

  try {
    const chunks = chunkArray(tokens, CHUNK_SIZE);
    const results = [];

    for (let i = 0; i < chunks.length; i += MAX_PARALLEL) {
      const group = chunks.slice(i, i + MAX_PARALLEL);
      const responses = await Promise.all(group.map(fetchBatch));

      responses.flat().forEach(({ token, rsi }) => {
        if (typeof rsi !== "number") return;
        const key = token.symbol;
        const prev = lastRsi[key];
        let signal = rsi < 30 ? "Buy" : rsi > 70 ? "Sell" : "Hold";
        if (prev != null && ((prev < 30 && rsi >= 30) || (prev > 70 && rsi <= 70))) {
          signal = "Exit";
        }
        lastRsi[key] = rsi;
        results.push({
          name: token.name,
          symbol: key,
          rsi: +rsi.toFixed(2),
          signal,
        });
      });

      await new Promise((r) => setTimeout(r, PAUSE_BETWEEN_GROUPS_MS));
    }

    const sorted = results
      .sort((a, b) => a.rsi - b.rsi)
      .map((item, idx) => ({ ...item, sNo: idx + 1 }));

    res.status(200).json(sorted);
  } catch (err) {
    console.error("Bulk fetch error:", err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
}

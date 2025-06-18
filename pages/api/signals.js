import axios from "axios";
import tokens from "../../utils/tokens";

const SECRET = process.env.TAAPI_SECRET;
const CHUNK_SIZE = 10;
const MAX_PARALLEL = 5;
const MAX_RETRIES = 5;
const PAUSE_MS = 1000;
const REFRESH_MS = 30_000;

let cache = [];
let lastFetch = 0;
let fetchInProgress = null;
let lastRsi = {};

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function fetchBatch(batch, attempt = 0) {
  try {
    const res = await axios.post("https://api.taapi.io/bulk", {
      secret: SECRET,
      construct: batch.map(t => ({
        exchange: "binance",
        symbol: t.symbol,
        interval: "1h",
        indicators: [{ indicator: "rsi" }],
      })),
    });
    return res.data.data.map((d, i) => ({ token: batch[i], rsi: d.result?.value }));
  } catch (err) {
    if (err.response?.status === 429 && attempt < MAX_RETRIES) {
      const wait = (2 ** attempt) * 1000;
      await new Promise(r => setTimeout(r, wait));
      return fetchBatch(batch, attempt + 1);
    }
    throw err;
  }
}

async function fetchAll() {
  const results = [];
  const chunks = chunkArray(tokens, CHUNK_SIZE);

  for (let i = 0; i < chunks.length; i += MAX_PARALLEL) {
    const group = chunks.slice(i, i + MAX_PARALLEL);
    const resArr = await Promise.all(group.map(fetchBatch));

    resArr.flat().forEach(({ token, rsi }) => {
      if (typeof rsi !== "number") return;
      const prev = lastRsi[token.symbol];
      let signal = rsi < 30 ? "Buy" : rsi > 70 ? "Sell" : "Hold";
      if (prev != null && ((prev < 30 && rsi >= 30) || (prev > 70 && rsi <= 70))) {
        signal = "Exit";
      }
      lastRsi[token.symbol] = rsi;
      results.push({ name: token.name, signal });
    });

    await new Promise(r => setTimeout(r, PAUSE_MS));
  }

  cache = results;
  lastFetch = Date.now();
}

export default async function handler(req, res) {
  if (!SECRET) return res.status(500).json({ error: "Missing TAAPI_SECRET" });

  // Serve stale cache immediately if available
  const isStale = Date.now() - lastFetch > REFRESH_MS;
  if (cache.length && !isStale) {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=59"
    );
    return res.status(200).json(cache.map((item, i) => ({
      sNo: i + 1,
      name: item.name,
      signal: item.signal,
    })));
  }

  // If missing or stale, trigger fetch
  if (!fetchInProgress) {
    fetchInProgress = fetchAll().finally(() => fetchInProgress = null);
  }
  await fetchInProgress;

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=30, stale-while-revalidate=59"
  );
  res.status(200).json(cache.map((item, i) => ({
    sNo: i + 1,
    name: item.name,
    signal: item.signal,
  })));
}

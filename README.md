Most Volatile USDT Tokens Dashboard 🚀

A responsive Next.js dashboard that monitors RSI-based “Buy”, “Sell”, “Exit Buy”, and “Exit Sell” signals for Binance USDT trading pairs using TAAPI.IO.

🔧 Features

* **Tailored for USDT pairs** — Automatically fetches Binance symbols, filters for `* / USDT`.
* **High-efficiency bulk fetching** — Uses TAAPI.IO bulk API with 10 symbols/request and 5 parallel calls/second to stay within Expert plan limits (75 calls/15 seconds).
* **Signal logic** — Processes real-time RSI values to compute actionable signals:

  * **Buy** (RSI < 30)
  * **Sell** (RSI > 70)
  * **Exit Buy/Sell** (crossing back past thresholds)
* **Dynamic S/NO** — Assigns serial numbers in ascending order, updated based on table sorting.
* **Interactive frontend** — Sortable columns; live countdown timer; timestamp of last update; color-coded signal highlights; displays user's location.

📁 Project Structure

taapi-monitor/
├── pages/
│   ├── index.js         # Frontend UI
│   └── api/signals.js   # Next.js API route fetching and processing RSI
├── styles/
│   ├── globals.css
│   └── Home.module.css  # Responsive styling
├── utils/
│   └── tokens.js        # Array of { symbol, name } for USDT pairs
├── scripts/
│   └── fetchTokens.js   # Populates tokens.js from TAAPI.IO
├── .env.local           # Holds TAAPI_SECRET
├── package.json
└── README.md

⚙️ Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure `.env.local`**

   ```
   TAAPI_SECRET=your_taapi_secret_here
   ```

3. **Fetch USDT symbols (optional)**

   ```bash
   node scripts/fetchTokens.js
   ```

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000)

🔎 How It Works

1. **Token List**: `scripts/fetchTokens.js` fetches Binance symbols and saves only USDT pairs in `utils/tokens.js`.
2. **Bulk Fetching**: `api/signals.js` batches symbols (10 per request), sends 5 parallel bulk calls per cycle, uses retries/backoff on 429 responses, and renders RSI values with signal logic.
3. **Frontend UI**: `pages/index.js` displays results in a responsive, sortable table and refreshes data every 30 seconds.

📈 Next Tasks

* Scale to support **full USDT token list** (\~400 symbols) with smart batching.
* Integrate **real-time charts**, notifications, or email alerts.
* Add **trade logic** for demo buys/sells and strategy backtesting.
* Optional: support ETF/basket creation or user portfolios.

---

## 💡 Helpful Links

* [TAAPI.IO Bulk API Documentation](https://taapi.io/docs)
* [RSI Indicator Reference](https://www.investopedia.com/terms/r/rsi.asp)

🧠 Summary

This dashboard brings real-time RSI signals for Binance USDT pairs, optimized with bulk fetching and smart pagination. It’s sortable, responsive, and ready to grow—whether into charts, alerts, or trade simulation dashboards.


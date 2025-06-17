require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function main() {
  if (!process.env.TAAPI_SECRET) {
    console.error("🚨 You must set TAAPI_SECRET in your .env file");
    process.exit(1);
  }

  try {
    const res = await axios.get(
      "https://api.taapi.io/exchange-symbols",
      {
        params: {
          secret: process.env.TAAPI_SECRET,
          exchange: "binance",
        },
      }
    );

    const symbols = res.data;
    const formatted = symbols.map((symbol) => ({
      symbol,
      name: symbol.split("/")[0],
    }));

    fs.writeFileSync(
      path.resolve("utils/tokens.js"),
      "module.exports = " + JSON.stringify(formatted, null, 2) + ";\n"
    );

    console.log(`✅ Saved ${formatted.length} tokens to utils/tokens.js`);
  } catch (err) {
    console.error("❌ Failed to fetch tokens:", err.response?.data || err.message);
    process.exit(1);
  }
}

main();

import { useEffect, useState } from "react";
import styles from "../styles/Home.module.css";

export default function Home() {
  const [tokens, setTokens] = useState([]);
  const [lastUpdate, setLastUpdate] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [location, setLocation] = useState("…");
  const [loading, setLoading] = useState(true);

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/signals");
      const data = await res.json();
      setTokens(data);
      setLastUpdate(new Date().toLocaleTimeString());
      setCountdown(30);
    } catch (err) {
      console.error("Failed to fetch signals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 30));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // IP-based location (no permission dialog)
    fetch("https://ip-api.com/json/?fields=city,country")
      .then((r) => r.json())
      .then((d) => setLocation(`${d.city}, ${d.country}`))
      .catch(() => setLocation("Unknown"));
  }, []);

  const getSignalClass = (signal) => {
    if (signal === "Buy") return styles.signalBuy;
    if (signal === "Sell") return styles.signalSell;
    if (signal.startsWith("Exit")) return styles.signalExit;
    return styles.signalHold;
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.title}>Most Volatile — Binance</h1>
        <div className={styles.meta}>
          <span>Last update:</span> <strong>{lastUpdate}</strong>
          {" · "}
          <span>Refreshing in:</span> <strong>{countdown}s</strong>
          {" · "}
          <span>Your location:</span> <strong>{location}</strong>
        </div>
      </header>

      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.loading}>Loading…</div>
        ) : (
          <table className={styles.tokenTable}>
            <thead>
              <tr>
                <th>S/NO</th>
                <th>SYMBOL</th>
                <th>RSI</th>
                <th>SIGNAL</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.symbol}>
                  <td>{t.sNo}</td>
                  <td>{t.symbol}</td>
                  <td>{t.rsi.toFixed(1)}</td>
                  <td className={getSignalClass(t.signal)}>{t.signal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

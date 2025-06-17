import { useEffect, useState } from "react";
import styles from "../styles/Home.module.css";

export default function Home() {
  const [tokens, setTokens] = useState([]);
  const [lastUpdate, setLastUpdate] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [location, setLocation] = useState("Locating...");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/signals");
      const data = await res.json();

      if (!Array.isArray(data)) {
        console.error("Invalid response format:", data);
        setError("Unexpected response from server.");
        return;
      }

      setTokens(data);
      setLastUpdate(new Date().toLocaleTimeString());
      setError("");
    } catch (err) {
      console.error("Failed to fetch signals:", err);
      setError("Unable to load signals.");
    } finally {
      setLoading(false);
      setCountdown(30);
    }
  };

  const fetchLocation = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      if (data.error) throw new Error(data.reason || "Unknown");
      setLocation(`${data.city}, ${data.country_name}`);
    } catch {
      setLocation("Location unavailable");
    }
  };

  useEffect(() => {
    fetchSignals();
    fetchLocation();

    const interval = setInterval(fetchSignals, 30000);
    const countdownInterval = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 30));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, []);

  const getSignalClass = (signal) => {
    if (signal === "Buy") return styles.signalBuy;
    if (signal === "Sell") return styles.signalSell;
    if (signal === "Exit Buy" || signal === "Exit Sell")
      return styles.signalExit;
    return styles.signalHold;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Most Volatile Binance</h1>
        <div className={styles.meta}>
          <p>Next update in: {countdown}s</p>
          <p>Last updated: {lastUpdate || "..."}</p>
          <p>User Location: {location}</p>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.loading}>Loading signals...</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>S/NO</th>
              <th>TOKEN (NAME)</th>
              <th>SIGNAL</th>
            </tr>
          </thead>
          <tbody>
            {tokens.length > 0 ? (
              tokens.map((t, index) => (
                <tr key={t.symbol || index}>
                  <td>{index + 1}</td>
                  <td>{t.symbol}</td>
                  <td className={getSignalClass(t.signal)}>{t.signal}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: "center", padding: "1rem" }}>
                  No signals to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

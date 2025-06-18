import { useState, useEffect, useMemo } from "react";
import styles from "../styles/Home.module.css";

export default function Home() {
  const [data, setData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [loc, setLoc] = useState("Locating...");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState("sNo");
  const [asc, setAsc] = useState(true);

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/signals", { cache: "no-store" });
      const json = await res.json();
      if (!Array.isArray(json)) throw new Error("Invalid response");
      setData(json);
      setLastUpdate(new Date().toLocaleTimeString());
      setError("");
    } catch {
      setError("Error loading signals");
    } finally {
      setLoading(false);
      setCountdown(30);
    }
  };

  useEffect(() => {
    fetchSignals();
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((d) => setLoc(`${d.city}, ${d.country_name}`))
      .catch(() => setLoc("Unavailable"));

    const intv = setInterval(fetchSignals, 30000);
    const cntd = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 30)), 1000);

    return () => {
      clearInterval(intv);
      clearInterval(cntd);
    };
  }, []);

  const getCls = (sig) =>
    sig === "Buy"
      ? styles.signalBuy
      : sig === "Sell"
      ? styles.signalSell
      : sig === "Exit"
      ? styles.signalExit
      : styles.signalHold;

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      const v1 = a[sortKey]; const v2 = b[sortKey];
      if (v1 < v2) return asc ? -1 : 1;
      if (v1 > v2) return asc ? 1 : -1;
      return 0;
    });
    return sorted.map((item, idx) => ({
      ...item,
      sNo: idx + 1,
    }));
  }, [data, sortKey, asc]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Most Volatile Binance</h1>
        <div className={styles.meta}>
          <p>Next update in: {countdown}s</p>
          <p>Last updated: {lastUpdate || "…"}</p>
          <p>Location: {loc}</p>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}
      {loading ? (
        <div className={styles.loading}>Loading signals…</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              {["sNo", "name", "signal"].map((key) => (
                <th
                  key={key}
                  onClick={() => {
                    if (sortKey === key) setAsc(!asc);
                    else { setSortKey(key); setAsc(true); }
                  }}
                  className={styles.sortableHeader}
                >
                  {key === "sNo" ? "S/NO" : key.toUpperCase()}{" "}
                  {sortKey === key ? (asc ? "↑" : "↓") : "↕"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length ? (
              sortedData.map((row) => (
                <tr key={row.name}>
                  <td>{row.sNo}</td>
                  <td>{row.name}</td>
                  <td className={getCls(row.signal)}>{row.signal}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: "center", padding: "1rem" }}>
                  No signals
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

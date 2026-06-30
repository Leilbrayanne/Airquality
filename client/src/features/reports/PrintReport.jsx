import { useRef, useState, useEffect } from "react";
import Sidebar from "../../shared/components/Sidebar";
import { FiPrinter } from "react-icons/fi";
import { useColors } from "../../shared/hooks/useColors";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useApi } from "../../shared/utils/api";
import { useAuth } from "../../shared/contexts/AuthContext";

export default function PrintReport() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readings, setReadings] = useState({});
  const printRef = useRef();
  const c = useColors();
  const { get } = useApi();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const roomsData = await get("/rooms");
        setRooms(roomsData);

        // Fetch current readings for all rooms
        const currentData = await get("/sensors/current");
        const readingMap = {};
        currentData.forEach((r) => {
          if (r.room) readingMap[r.room.roomId] = r;
        });
        setReadings(readingMap);
      } catch (err) {
        console.error("Failed to fetch report data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [get]);

  const handlePrint = () => window.print();

  const chartData = [
    { time: "00:00", pm10: 12 },
    { time: "04:00", pm10: 15 },
    { time: "08:00", pm10: 28 },
    { time: "12:00", pm10: 22 },
    { time: "16:00", pm10: 35 },
    { time: "20:00", pm10: 18 },
    { time: "23:59", pm10: 14 },
  ];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: c.bg,
        transition: "background 0.3s",
      }}
    >
      <Sidebar role={currentUser?.role} userName={currentUser?.username} />
      <main
        style={{ marginLeft: 240, flex: 1, padding: "32px", overflowY: "auto" }}
      >
        {/* Screen controls — hidden on print */}
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 28,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text }}>
              Print Report
            </h1>
            <p style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>
              A4-formatted report ready for printing
            </p>
          </div>
          <button
            onClick={handlePrint}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: c.gradient,
              color: "#fff",
              border: "none",
              padding: "11px 22px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <FiPrinter size={15} /> Print / Save PDF
          </button>
        </div>

        {/* A4 preview */}
        <div
          ref={printRef}
          id="print-area"
          style={{
            background: "#fff",
            color: "#0f172a",
            maxWidth: 794,
            margin: "0 auto",
            padding: "48px",
            boxShadow: "0 4px 40px rgba(0,0,0,0.15)",
            borderRadius: 4,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 32,
              paddingBottom: 20,
              borderBottom: "2px solid #00d4aa",
            }}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
                AirGuard<span style={{ color: "#00d4aa" }}>IQ</span>
              </div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                Hospital Air Quality Monitoring System
              </div>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                IUC Douala — SEAS Department
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                Daily Air Quality Report
              </div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                Date:{" "}
                {new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                Generated: {new Date().toLocaleString("en-GB")}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 12,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Executive Summary
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 12,
              }}
            >
              {[
                { label: "Total Rooms", val: rooms.length, color: "#00d4aa" },
                {
                  label: "Online",
                  val: Object.keys(readings).length,
                  color: "#16a34a",
                },
                {
                  label: "Normal",
                  val: Object.values(readings).filter(
                    (r) => r.latest?.aqi_status === "GOOD",
                  ).length,
                  color: "#16a34a",
                },
                {
                  label: "Warning/Crit",
                  val: Object.values(readings).filter(
                    (r) => r.latest && r.latest.aqi_status !== "GOOD",
                  ).length,
                  color: "#dc2626",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    border: `1px solid #e2e8f0`,
                    borderRadius: 8,
                    padding: "12px 16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{ fontSize: 24, fontWeight: 800, color: s.color }}
                  >
                    {s.val}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 12,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              24-Hour Trend (Hospital Average)
            </div>
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "16px",
              }}
            >
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="pm10"
                    stroke="#00d4aa"
                    fill="url(#pg)"
                    strokeWidth={2}
                    name="PM10 µg/m³"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Room table */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 12,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Room-by-Room Summary
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[
                    "Room",
                    "ID",
                    "PM10 (µg/m³)",
                    "PM2.5 (µg/m³)",
                    "TVOC (ppb)",
                    "Temp (°C)",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        borderBottom: "2px solid #e2e8f0",
                        color: "#475569",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, i) => {
                  const entry = readings[room.roomId] || {};
                  const r = entry.latest || {};
                  return (
                    <tr
                      key={room.roomId}
                      style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          fontWeight: 600,
                          color: "#0f172a",
                        }}
                      >
                        {room.name || room.roomId}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>
                        {room.roomId}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: r.pm10 > 50 ? "#dc2626" : "#16a34a",
                          fontWeight: 600,
                        }}
                      >
                        {r.pm10 ?? "-"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: r.pm25 > 25 ? "#dc2626" : "#16a34a",
                          fontWeight: 600,
                        }}
                      >
                        {r.pm25 ?? "-"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: r.tvoc > 600 ? "#dc2626" : "#16a34a",
                          fontWeight: 600,
                        }}
                      >
                        {r.tvoc ?? "-"}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#475569" }}>
                        {r.temperature ?? "-"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            color:
                              r.aqi_status === "GOOD" ? "#16a34a" : "#dc2626",
                            fontWeight: 700,
                            textTransform: "capitalize",
                          }}
                        >
                          {r.aqi_status
                            ? r.aqi_status.replace(/_/g, " ")
                            : "Offline"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              paddingTop: 16,
              display: "flex",
              justifyContent: "space-between",
              color: "#94a3b8",
              fontSize: 11,
            }}
          >
            <span>PureAir — Confidential Hospital Document</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </main>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          #print-area { box-shadow: none !important; max-width: 100% !important; padding: 20px !important; }
          aside, .sidebar-spacer { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

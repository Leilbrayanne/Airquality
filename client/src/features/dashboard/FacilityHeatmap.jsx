import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiMap, FiThermometer, FiWind, FiActivity, FiInfo, FiX, FiDroplet } from 'react-icons/fi';
import { useColors } from '../../shared/hooks/useColors';
import { useApi } from '../../shared/utils/api';
import { useSocket } from '../../shared/utils/socket';
import Sidebar from '../../shared/components/Sidebar';
import { useAuth } from '../../shared/contexts/AuthContext';

export default function FacilityHeatmap() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [hoveredRoomId, setHoveredRoomId] = useState(null);
  const c = useColors();
  const { get } = useApi();

  // Generate room coordinates dynamically based on actual rooms from API
  const generateRoomCoordinates = (roomList) => {
    const coords = {};
    if (!roomList.length) return coords;
    const cols = Math.max(2, Math.ceil(Math.sqrt(roomList.length)));
    const cellW = Math.floor(620 / cols);
    const cellH = Math.floor(300 / Math.ceil(roomList.length / cols));
    const gap = 10;
    roomList.forEach((r, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      coords[r.roomId] = {
        x: 60 + col * (cellW + gap),
        y: 50 + row * (cellH + gap),
        w: cellW - gap,
        h: cellH - gap,
      };
    });
    return coords;
  };

  const roomCoordinates = generateRoomCoordinates(rooms);

  useSocket('airquality/live', (data) => {
    setRooms(prev => prev.map(r => 
      r.roomId === data.roomId ? { ...r, latest: data } : r
    ));
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await get('/sensors/current');
        const mapped = res.map(r => ({
          roomId: r.room.roomId,
          name: r.room.name || r.room.roomId,
          latest: r.latest
        }));
        setRooms(mapped);
      } catch (err) {
        console.error('Heatmap sync error:', err);
      }
    };
    fetchData();
  }, [get]);

  const getStatusStyle = (status) => {
    if (!status) return { color: c.textFaint };
    const s = String(status).toUpperCase();
    return { color: c.aqi[s] || c.textFaint };
  };

  const displayRoomId = selectedRoomId || hoveredRoomId;
  const activeRoom = rooms.find(r => r.roomId === displayRoomId) || (displayRoomId ? { roomId: displayRoomId, name: displayRoomId, latest: null } : null);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg }}>
      <Sidebar role={user?.role} userName={user?.username} />
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: c.text, display: 'flex', alignItems: 'center', gap: 12 }}>
              <FiMap size={28} color={c.primary} />
              Hospital IAQ Heatmap
            </h1>
            <p style={{ color: c.textMuted, fontSize: 14, marginTop: 4 }}>Visual facility monitoring & compliance floor plan</p>
          </div>
          
          <div style={{ display: 'flex', background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 12, padding: '8px 16px', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.textFaint, fontSize: 11, fontWeight: 700 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.aqi.GOOD }} /> SAFE
            </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.textFaint, fontSize: 11, fontWeight: 700 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.aqi.HAZARDOUS }} /> HAZARDOUS
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 24, padding: 40, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <svg viewBox="0 0 750 400" style={{ width: '100%', height: 'auto' }}>
            <rect x="20" y="20" width="710" height="360" rx="20" fill="transparent" stroke={c.border} strokeWidth="2" />
            <rect x="40" y="40" width="670" height="320" rx="10" fill={c.bgCard2} />

            {Object.entries(roomCoordinates).map(([id, pos]) => {
              const room = rooms.find(r => r.roomId === id) || { roomId: id, name: id, latest: null };
              const style = getStatusStyle(room.latest?.aqi_status);
              const isActive = selectedRoomId === id || hoveredRoomId === id;

              return (
                <g key={id} 
                   onClick={() => setSelectedRoomId(selectedRoomId === id ? null : id)}
                   onMouseEnter={() => setHoveredRoomId(id)} 
                   onMouseLeave={() => setHoveredRoomId(null)} 
                   style={{ cursor: 'pointer', transition: 'all 0.3s' }}>
                  <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx="8" fill={style.color} fillOpacity={isActive ? 0.9 : 0.6} />
                  <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx="8" fill="none" stroke={isActive ? '#fff' : style.color} strokeWidth={isActive ? 3 : 1} strokeOpacity={0.8} />
                  <text x={pos.x + pos.w / 2} y={pos.y + pos.h / 2} textAnchor="middle" style={{ fill: '#fff', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', pointerEvents: 'none' }}>{room.name}</text>
                  <text x={pos.x + pos.w / 2} y={pos.y + pos.h / 2 + 12} textAnchor="middle" style={{ fill: '#fff', fontSize: 8, fontWeight: 700, opacity: 0.8, pointerEvents: 'none' }}>{room.latest ? `AQI ${room.latest.aqi}` : 'OFFLINE'}</text>
                </g>
              );
            })}
          </svg>

          {activeRoom && (
            <div style={{ position: 'absolute', top: 30, right: 30, width: 260, padding: 24, background: `${c.bgCard}F2`, border: `1px solid ${c.border}`, borderRadius: 20, backdropFilter: 'blur(12px)', boxShadow: '0 15px 45px rgba(0,0,0,0.3)', transition: 'all 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: c.text }}>{activeRoom.name}</h3>
                  <p style={{ color: c.textFaint, fontSize: 11, marginTop: 2 }}>ID: {activeRoom.roomId}</p>
                </div>
                <button onClick={() => setSelectedRoomId(null)} style={{ background: 'none', border: 'none', color: c.textMuted, cursor: 'pointer', padding: 0 }}><FiX size={18} /></button>
              </div>

              {activeRoom.latest ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: getStatusStyle(activeRoom.latest.aqi_status).color + '18', color: getStatusStyle(activeRoom.latest.aqi_status).color, borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 800, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {activeRoom.latest.aqi_status} Status
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { icon: FiWind,        label: 'PM10', val: activeRoom.latest.pm10,  unit: 'µg/m³', color: c.primary },
                      { icon: FiActivity,    label: 'TVOC', val: activeRoom.latest.tvoc,  unit: 'ppb',    color: c.accent },
                      { icon: FiThermometer, label: 'Temp', val: activeRoom.latest.temperature, unit: '°C',     color: c.warning },
                      { icon: FiDroplet,     label: 'Hum',  val: activeRoom.latest.humidity,    unit: '%',      color: '#38bdf8' },
                    ].map(m => {
                      const MIcon = m.icon
                      return (
                        <div key={m.label} style={{ background: c.bgCard2, borderRadius: 12, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <MIcon size={12} color={m.color} />
                            <span style={{ fontSize: 10, fontWeight: 600, color: c.textFaint, textTransform: 'uppercase' }}>{m.label}</span>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: c.text }}>{m.val}<span style={{ fontSize: 10, fontWeight: 500, color: c.textFaint, marginLeft: 2 }}>{m.unit}</span></div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: c.textFaint, fontSize: 13 }}>
                  <FiInfo size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <p>Sensor offline or data unavailable</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: 24, padding: 20, background: `${c.accent}10`, border: `1px solid ${c.accent}20`, borderRadius: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ background: c.accent, color: '#fff', padding: 8, borderRadius: 8 }}><FiInfo size={18} /></div>
          <div>
            <h4 style={{ fontWeight: 700, color: c.text, marginBottom: 4 }}>Surveillance Protocol</h4>
            <p style={{ color: c.textSec, fontSize: 13 }}>Click on a room to lock the detail view. Hover over rooms for quick inspections. Color intensities reflect AQI levels across wards.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

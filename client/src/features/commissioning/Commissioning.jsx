import React, { useEffect, useState } from 'react';

export default function Commissioning() {
  const [sessions, setSessions] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [provisionalId, setProvisionalId] = useState('');

  useEffect(() => {
    fetch('/api/nodes/commission/sessions', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setSessions(data))
      .catch(() => setSessions([]));
  }, []);

  const assign = async (e) => {
    e.preventDefault();
    await fetch('/api/nodes/commission/assign', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provisional_id: provisionalId, room_id: roomId, confirmed_by: 'ui', assignment_method: 'MANUAL_CONFIRMATION' })
    });
    const res = await fetch('/api/nodes/commission/sessions', { credentials: 'include' });
    setSessions(await res.json());
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Commissioning Sessions</h2>
      <form onSubmit={assign} style={{ marginBottom: 16 }}>
        <input placeholder="Provisional ID" value={provisionalId} onChange={e => setProvisionalId(e.target.value)} />
        <input placeholder="Room ID" value={roomId} onChange={e => setRoomId(e.target.value)} style={{ marginLeft: 8 }} />
        <button type="submit" style={{ marginLeft: 8 }}>Assign</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th>Provisional</th><th>Node ID</th><th>Room</th><th>Status</th></tr></thead>
        <tbody>
          {sessions.map(s => (
            <tr key={s._id}>
              <td>{s.provisional_id}</td>
              <td>{s.node_id || '-'}</td>
              <td>{s.room ? s.room.roomId : '-'}</td>
              <td>{s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

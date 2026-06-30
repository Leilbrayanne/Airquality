// Minimal smoke-test runner for PureAir API endpoints
// Usage: node scripts/run_api_tests.js

const baseUrl = process.env.BASE_URL || 'http://localhost:5003';
const adminCreds = { email: 'admin@hospital.cm', password: 'admin123' };

async function req(path, opts = {}) {
  const url = baseUrl + path;
  const res = await fetch(url, opts);
  const txt = await res.text();
  let json = null;
  try { json = JSON.parse(txt); } catch (e) { /* not json */ }
  return { status: res.status, headers: res.headers, bodyText: txt, body: json };
}

async function login() {
  const r = await req('/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(adminCreds) });
  if (r.status !== 200 || !r.body || !r.body.token) throw new Error('Login failed: '+r.status+' '+r.bodyText);
  return r.body.token;
}

async function run() {
  console.log('Base URL:', baseUrl);
  const token = await login();
  console.log('Obtained token');

  const auth = { headers: { Authorization: 'Bearer '+token } };

  const tests = [];

  // public endpoints
  tests.push({name:'/health', fn:()=> req('/health')});
  tests.push({name:'/api/public/status', fn:()=> req('/api/public/status')});
  tests.push({name:'/api/public/demo', fn:()=> req('/api/public/demo')});
  tests.push({name:'/api/docs/', fn:()=> req('/api/docs/')});

  // metrics via JWT auth (fallback) to support local testing
  tests.push({name:'/metrics (jwt)', fn:()=> req('/metrics', { headers: { Authorization: 'Bearer '+token } })});

  // auth checks
  tests.push({name:'/api/auth/me (auth)', fn:()=> req('/api/auth/me', { headers: { Authorization: 'Bearer '+token } })});

  // list resources
  tests.push({name:'/api/users (admin)', fn:()=> req('/api/users', { headers: { Authorization: 'Bearer '+token } })});
  tests.push({name:'/api/rooms (auth)', fn:()=> req('/api/rooms', { headers: { Authorization: 'Bearer '+token } })});
  tests.push({name:'/api/sensors/current (auth)', fn:()=> req('/api/sensors/current', { headers: { Authorization: 'Bearer '+token } })});
  tests.push({name:'/api/nodes (auth)', fn:()=> req('/api/nodes', { headers: { Authorization: 'Bearer '+token } })});

  // create a test room, threshold, node, maintenance, then clean up
  const unique = Date.now();

  // create threshold profile
  const thrPayload = { name: 'test-profile-'+unique, pm10:{warning:10,critical:20}, pm25:{warning:5,critical:15}, tvoc:{warning:100,critical:200}, temperature:{warningLow:18,warningHigh:26,criticalHigh:30}, humidity:{warningLow:30,warningHigh:60} };
  tests.push({name:'POST /api/thresholds (admin)', fn:()=> req('/api/thresholds', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify(thrPayload) })});

  // create room
  const roomPayload = { roomId: 'TEST-'+unique, name: 'Test Room '+unique, type: 'ICU', thresholdProfile: null, customThresholds: {} };
  tests.push({name:'POST /api/rooms (admin)', fn:()=> req('/api/rooms', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify(roomPayload) })});

  // create node
  const nodePayload = { node_id: 'TESTNODE-'+unique, mac_address: 'AA:BB:'+unique%100+':00:00:01', firmware: '1.0.0', hardware_version: 'v1', room_id: roomPayload.roomId, status: 'ONLINE', location_method: 'MANUAL', location_confidence: 100 };
  tests.push({name:'POST /api/nodes (admin)', fn:()=> req('/api/nodes', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify(nodePayload) })});

  // reports (csv + pdf) for default room ICU-1
  tests.push({name:'GET /api/reports/export/ICU-1 (auth)', fn:()=> req('/api/reports/export/ICU-1', { headers:{ Authorization:'Bearer '+token } })});
  tests.push({name:'GET /api/reports/pdf/ICU-1 (auth)', fn:()=> req('/api/reports/pdf/ICU-1', { headers:{ Authorization:'Bearer '+token } })});

  // maintenance create
  const maint = { roomId: roomPayload.roomId, actionType: 'CALIBRATION', details: 'Test maintenance' };
  tests.push({name:'POST /api/maintenance (admin)', fn:()=> req('/api/maintenance', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify(maint) })});

  // thresholds list
  tests.push({name:'GET /api/thresholds (auth)', fn:()=> req('/api/thresholds', { headers:{ Authorization:'Bearer '+token } })});

  // alerts list
  tests.push({name:'GET /api/alerts (auth)', fn:()=> req('/api/alerts', { headers:{ Authorization:'Bearer '+token } })});

  // notifications config
  tests.push({name:'GET /api/notifications/config (admin)', fn:()=> req('/api/notifications/config', { headers:{ Authorization:'Bearer '+token } })});

  // audit logs
  tests.push({name:'GET /api/audit-logs (admin)', fn:()=> req('/api/audit-logs', { headers:{ Authorization:'Bearer '+token } })});

  // Commissioning endpoints (discover/assign/validate) - send minimal payloads
  tests.push({name:'POST /api/nodes/commission/discover (auth)', fn:()=> req('/api/nodes/commission/discover', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify({ provisional_id: 'prov-'+unique, node_id: 'prov-node-'+unique, mac_address: 'AA:BB:CC:DD:EE:FF' }) })});

  // Execute tests sequentially and record results
  const results = [];
  for (const t of tests) {
    try {
      process.stdout.write('Running '+t.name+'... ');
      const r = await t.fn();
      const ok = r.status >= 200 && r.status < 300;
      console.log(ok? 'OK':'FAIL', r.status);
      results.push({ name: t.name, status: r.status, ok, body: (typeof r.body === 'object'? JSON.stringify(r.body).slice(0,200): r.bodyText.slice(0,200)) });
    } catch (e) {
      console.log('ERROR', e.message);
      results.push({ name: t.name, status: 'ERR', ok:false, error: e.message });
    }
  }

  // Simple summary
  const failed = results.filter(r=>!r.ok);
  console.log('\nTest summary: total=%d failed=%d', results.length, failed.length);
  if (failed.length) {
    console.log('Failed tests:');
    failed.forEach(f=>console.log('-', f.name, f.status, f.error||''));
    process.exit(2);
  }
  console.log('All smoke tests passed.');
}

run().catch(err=>{ console.error('Test run error:', err); process.exit(1); });

/*
  Student Management smoke test
  - Creates a student
  - Enrolls in the first available batch (if any)
  - Fetches consolidated overview

  Usage:
    node backend/scripts/student_smoke_test.js

  Env:
    API_BASE (default: http://localhost:3000/api)
*/

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';

async function http(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!res.ok) {
    const msg = payload?.message || payload?.error || `${method} ${path} failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

function randomPhone() {
  // 10-digit-ish unique enough phone for tests
  const n = Math.floor(Math.random() * 9000000000) + 1000000000;
  return String(n);
}

async function main() {
  console.log('API_BASE:', API_BASE);

  const batchesResp = await http('GET', '/batches');
  const batches = batchesResp?.data || [];
  const batchId = batches[0]?.id;

  const createResp = await http('POST', '/students', {
    first_name: 'Smoke',
    last_name: 'Test',
    phone: randomPhone(),
    current_class: '10',
    status: 'inquiry',
  });

  const studentId = createResp?.data?.id;
  if (!studentId) throw new Error('No student id returned from create');

  console.log('Created student:', studentId);

  if (batchId) {
    await http('POST', `/students/${studentId}/enroll`, { batch_id: batchId });
    console.log('Enrolled into batch:', batchId);
  } else {
    console.log('No batches found; skipping enroll');
  }

  const overviewResp = await http('GET', `/students/${studentId}/overview?attendance_days=7&exam_limit=5`);
  const overview = overviewResp?.data;

  console.log('Overview keys:', Object.keys(overview || {}));
  console.log('Batches:', (overview?.batches || []).length);
  console.log('Fees:', (overview?.fees || []).length);
  console.log('Attendance summary:', (overview?.attendance_summary || []).length);
  console.log('Recent results:', (overview?.recent_results || []).length);

  console.log('Smoke test PASS');
}

main().catch((err) => {
  console.error('Smoke test FAIL');
  console.error(err);
  if (err.payload) console.error('payload:', JSON.stringify(err.payload, null, 2));
  process.exitCode = 1;
});

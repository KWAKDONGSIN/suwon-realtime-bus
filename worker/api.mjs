// 공기계 앱(Traccar Client·OsmAnd)이 보낸 위치를 읽어 버스별 최근 위치로 보관·조회하는 규칙
export const KEEP = 20;            // 버스마다 최근 위치 20개만 둔다(지난 기록은 쌓지 않음)
export const SERVE_SEC = 600;      // 조회는 최근 10분 것만 준다
const FUTURE_SEC = 60;

// 요청 하나에서 위치 후보들을 꺼낸다. 주소 뒤 값·폼 본문·JSON(옛 평면형, 새 Traccar Client 중첩형) 모두 받는다
export function readReports(url, contentType, body) {
  const out = [];
  const flat = (p) => out.push({ id: p.get('id') || p.get('deviceid'), lat: p.get('lat'), lon: p.get('lon'),
    t: p.get('timestamp'), speed: p.get('speed'), batt: p.get('batt') });
  const q = new URL(url).searchParams;
  if (q.get('lat') != null) flat(q);
  const ct = (contentType || '').toLowerCase();
  if (body && ct.startsWith('application/x-www-form-urlencoded')) flat(new URLSearchParams(body));
  if (body && ct.startsWith('application/json')) {
    const j = JSON.parse(body);
    const locs = Array.isArray(j.location) ? j.location : j.location ? [j.location] : [];
    for (const l of locs) {
      const c = l.coords || {};
      out.push({ id: j.device_id, lat: c.latitude, lon: c.longitude, t: l.timestamp, speed: c.speed,
        batt: l.battery && l.battery.level != null ? Math.round(l.battery.level * 100) : null });
    }
    if (!locs.length && j.lat != null) out.push({ id: j.id, lat: j.lat, lon: j.lon, t: j.timestamp, speed: j.speed, batt: j.batt });
  }
  return out;
}

// 후보 하나를 검사해 {busId, lat, lng, t(유닉스 초)}로 바꾼다. devices: {기기ID: 버스ID}
export function toFix(r, devices, nowSec) {
  const busId = devices[r.id];
  if (!busId) return { ok: false, code: 404 };
  const lat = Number(r.lat), lng = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { ok: false, code: 400 };
  const s = String(r.t ?? '');
  let t = /^\d+(\.\d+)?$/.test(s) ? Number(s) : Date.parse(s) / 1000;
  if (t > 1e12) t /= 1000; // 밀리초로 온 경우
  if (!Number.isFinite(t)) t = nowSec;
  if (t > nowSec + FUTURE_SEC) return { ok: false, code: 400 };
  const fix = { busId, lat, lng, t: Math.round(t) };
  if (r.speed != null && Number.isFinite(Number(r.speed))) fix.speed = Number(r.speed);
  if (r.batt != null && Number.isFinite(Number(r.batt))) fix.batt = Number(r.batt);
  return { ok: true, fix };
}

// 보관 목록에 위치를 넣는다(같은 시각은 새 값으로 바꾸고 시간순 유지, 늦게 도착한 옛 위치도 제자리에)
export function addFix(list, fix) {
  return list.filter((f) => f.t !== fix.t).concat([fix]).sort((a, b) => a.t - b.t).slice(-KEEP);
}

export function recent(all, nowSec) {
  const res = {};
  for (const [busId, list] of Object.entries(all)) {
    const keep = list.filter((f) => nowSec - f.t <= SERVE_SEC);
    if (keep.length) res[busId] = keep;
  }
  return res;
}

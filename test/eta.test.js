// 도착 예상·지연·끊김 판정과 B안 변환기 자체 시험(node test/eta.test.js)
const assert = require('assert');
const D = require('../data.js'), E = require('../eta.js'), B = require('../adapter-b.js');
const R = id => D.ROUTES.find(r => r.id === id);
const at = s => E.hm(s) * 60;
const fixes = (r, from, to, delay) => { const out = []; for (let t = at(from); t <= at(to); t += 30) { const p = E.simulate(r, t, delay); if (p) out.push(p); } return out; };
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// 1) 송내 2호차: 6분 늦게 오는 더미 주행 → 07:41에 지연 약 6분, 승차장 07:56 예상
{ const r = R('songnae2'), f = fixes(r, '07:31', '07:41', 6), e = E.estimate(r, f, at('07:41'));
  ok(e.state === 'toStop', '승차장 가는 중');
  ok(Math.abs(e.delayMin - 6) <= 1, '지연 약 6분: ' + e.delayMin);
  ok(Math.abs(e.etaStop - at('07:56')) <= 90, '승차장 예상 07:56: ' + E.clock(e.etaStop)); }
// 2) 송내 1호차 정시 → 지연 0
{ const r = R('songnae1'), e = E.estimate(r, fixes(r, '07:31', '07:44', 0), at('07:44'));
  ok(e.delayMin === 0, '정시: ' + e.delayMin); }
// 3) 승차장 도착 후 출발 전 → atStop
{ const r = R('songnae1'), e = E.estimate(r, fixes(r, '07:31', '07:50', 0), at('07:50'));
  ok(e.state === 'atStop', '승차장 도착: ' + e.state); }
// 4) 학교로 가는 중 → 학교 도착 예상이 계획(08:52) 근처
{ const r = R('songnae1'), e = E.estimate(r, fixes(r, '08:10', '08:20', 0), at('08:20'));
  ok(e.state === 'toSchool', '학교로 가는 중');
  ok(Math.abs(e.etaSchool - at('08:52')) <= 120, '학교 예상 08:52 근처: ' + E.clock(e.etaSchool)); }
// 5) 도착
{ const r = R('gangnam'), e = E.estimate(r, fixes(r, '08:55', '09:00', 0), at('09:00'));
  ok(e.state === 'arrived', '학교 도착'); }
// 6) 3분 넘게 위치 없음 → stale(예상 시각 안 보여 줌)
{ const r = R('sadang'), f = fixes(r, '07:45', '07:50', 0), e = E.estimate(r, f, at('07:50') + 181);
  ok(e.state === 'stale' && e.etaStop === undefined, '끊김 판정'); }
// 7) 위치 없음
ok(E.estimate(R('sadang'), [], at('07:00')).state === 'none', '운행 전');
// 8) B안 변환기: 정상·모르는 차·깨진 값·오류 응답
{ const map = { '경기70바1001': 'songnae1' };
  const p = B.parse({ resultCode: '00', list: [
    { carNo: '경기70바1001', lat: '37.49', lon: '126.77', gpsTime: '20261126074130' },
    { carNo: '모르는차', lat: '37.49', lon: '126.77', gpsTime: '20261126074130' },
    { carNo: '경기70바1001', lat: 'x', lon: '126.77', gpsTime: '20261126074130' },
    { carNo: '경기70바1001', lat: '37.49', lon: '126.77', gpsTime: '2026112607' } ] }, map);
  ok(p.ok && p.fixes.length === 1 && p.fixes[0].ts === 7 * 3600 + 41 * 60 + 30 && p.fixes[0].busId === 'songnae1', 'B안 정상 1건만');
  ok(!B.parse({ resultCode: '99' }, map).ok, 'B안 오류 응답'); }
// 9) 가상 업체 응답 → 변환 → 예상까지 한 줄로 이어짐
{ const map = {}; D.ROUTES.forEach(r => map[r.carNo] = r.id);
  const resp = B.fake(D.ROUTES, at('07:41'), E.simulate, D.DELAY_TO_STOP, '20261126');
  const p = B.parse(resp, map);
  ok(p.fixes.length === 3, '07:41엔 사당(07:45 출발) 빼고 3대: ' + p.fixes.length); }
// 10) A안 변환기(Traccar Client·GPSLogger의 OsmAnd 형식)
{ const A = require('../adapter-a.js'), map = { 'mirita-songnae2': 'songnae2' };
  const unix = Date.UTC(2026, 10, 25, 22, 41, 30) / 1000; // 한국 11/26 07:41:30
  const p = A.parse(new URLSearchParams('id=mirita-songnae2&lat=37.49&lon=126.77&timestamp=' + unix + '&batt=82'), map);
  ok(p.ok && p.fix.ts === 7 * 3600 + 41 * 60 + 30 && p.fix.busId === 'songnae2' && p.fix.batt === 82, 'A안 OsmAnd 변환·한국 시각');
  ok(!A.parse({ id: 'unknown', lat: '37', lon: '127', timestamp: String(unix) }, map).ok, 'A안 모르는 기기 거절');
  ok(!A.parse({ id: 'mirita-songnae2', lat: '999', lon: '127', timestamp: String(unix) }, map).ok, 'A안 좌표 오류 거절'); }
// 11) 병점 08:50 회차: 일찍 와서 대기(탑승 중) → 정해진 시각에 출발, 3호차는 아직 오는 중
{ const d = D.DELAY_TO_STOP, b1 = R('byeongjeom1'), b3 = R('byeongjeom3');
  ok(E.estimate(b1, fixes(b1, '08:08', '08:25', d.byeongjeom1), at('08:25')).state === 'atStop', '병점 1호차 08:25 탑승 중');
  ok(E.estimate(b1, fixes(b1, '08:08', '08:33', d.byeongjeom1), at('08:33')).state === 'toSchool', '병점 1호차 08:33 출발함');
  const e3 = E.estimate(b3, fixes(b3, '08:28', '08:35', d.byeongjeom3), at('08:35'));
  ok(e3.state === 'toStop' && e3.delayMin === 0, '병점 3호차 08:35 오는 중·지연 없음'); }
console.log('통과 ' + n + '개');

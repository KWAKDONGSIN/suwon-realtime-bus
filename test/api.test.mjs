// 위치 받기 규칙 자체 시험: node --test test/api.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readReports, toFix, addFix, recent, KEEP } from '../worker/api.mjs';

const dev = { 'pp-s10e-test': 'songnae2' };
const now = 1795600000;

test('옛 Traccar·OsmAnd: 주소 뒤 값', () => {
  const r = readReports('https://x/api/v1/osmand?id=pp-s10e-test&lat=37.48&lon=126.77&timestamp=1795599990&speed=8.5&batt=80', '', '');
  const f = toFix(r[0], dev, now);
  assert.deepEqual(f, { ok: true, fix: { busId: 'songnae2', lat: 37.48, lng: 126.77, t: 1795599990, speed: 8.5, batt: 80 } });
});

test('폼 본문', () => {
  const r = readReports('https://x/api/v1/osmand', 'application/x-www-form-urlencoded; charset=utf-8', 'id=pp-s10e-test&lat=37.4&lon=126.7&timestamp=1795599990');
  assert.equal(toFix(r[0], dev, now).fix.lat, 37.4);
});

test('새 Traccar Client JSON(device_id + location.coords, ISO 시각, charset 헤더)', () => {
  const body = JSON.stringify({ device_id: 'pp-s10e-test', location: { timestamp: '2026-11-27T08:00:00.000Z', coords: { latitude: 37.49, longitude: 126.78, speed: 3 }, battery: { level: 0.82 } } });
  const r = readReports('https://x/api/v1/osmand', 'application/json; charset=utf-8', body);
  const f = toFix(r[0], dev, Date.parse('2026-11-27T08:00:10Z') / 1000);
  assert.equal(f.ok, true);
  assert.equal(f.fix.t, Date.parse('2026-11-27T08:00:00Z') / 1000);
  assert.equal(f.fix.batt, 82);
});

test('JSON location 배열(버퍼에 쌓인 것 한꺼번에)', () => {
  const body = JSON.stringify({ device_id: 'pp-s10e-test', location: [
    { timestamp: '2026-11-27T08:00:00Z', coords: { latitude: 37.1, longitude: 126.1 } },
    { timestamp: '2026-11-27T08:00:10Z', coords: { latitude: 37.2, longitude: 126.2 } }] });
  assert.equal(readReports('https://x/', 'application/json', body).length, 2);
});

test('등록 안 된 기기는 404, 좌표 오류·미래 시각은 400', () => {
  assert.equal(toFix({ id: 'nope', lat: 1, lon: 1, t: now }, dev, now).code, 404);
  assert.equal(toFix({ id: 'pp-s10e-test', lat: 91, lon: 1, t: now }, dev, now).code, 400);
  assert.equal(toFix({ id: 'pp-s10e-test', lat: 'x', lon: 1, t: now }, dev, now).code, 400);
  assert.equal(toFix({ id: 'pp-s10e-test', lat: 1, lon: 1, t: now + 3600 }, dev, now).code, 400);
});

test('밀리초 시각과 시각 없음', () => {
  assert.equal(toFix({ id: 'pp-s10e-test', lat: 1, lon: 1, t: now * 1000 }, dev, now).fix.t, now);
  assert.equal(toFix({ id: 'pp-s10e-test', lat: 1, lon: 1 }, dev, now).fix.t, now);
});

test('보관: 시간순·중복 제거·최근 20개', () => {
  let list = [];
  for (let i = 0; i < 25; i++) list = addFix(list, { t: i });
  assert.equal(list.length, KEEP);
  assert.deepEqual(list.map((f) => f.t).slice(0, 2), [5, 6]);
  list = addFix(list, { t: 30 });
  list = addFix(list, { t: 26 }); // 늦게 온 옛 위치도 순서대로 들어가고 새 위치는 남는다
  list = addFix(list, { t: 30, x: 1 }); // 같은 시각은 하나만
  assert.deepEqual(list.map((f) => f.t).slice(-3), [24, 26, 30]);
  assert.equal(list[list.length - 1].x, 1);
});

test('조회는 최근 10분 것만', () => {
  const all = { a: [{ t: now - 700 }, { t: now - 10 }], b: [{ t: now - 900 }] };
  assert.deepEqual(recent(all, now), { a: [{ t: now - 10 }] });
});

// B안: 버스 회사 관제 시스템 응답(가상 형식)을 공통 위치 형식 {busId,lat,lng,ts}로 바꾸는 변환기
(function (root) {
  // 가상 업체 응답 예: {resultCode:'00', list:[{carNo, lat:'37.49', lon:'126.77', gpsTime:'20261126074100', speed:'32'}]}
  // 실제 업체 형식이 정해지면 이 파일만 바꾸면 된다.
  function toSec(gpsTime) { // 'YYYYMMDDHHmmss' → 그날 자정 기준 초
    return (+gpsTime.slice(8, 10)) * 3600 + (+gpsTime.slice(10, 12)) * 60 + (+gpsTime.slice(12, 14));
  }
  function parse(resp, carToBus) {
    if (!resp || resp.resultCode !== '00' || !Array.isArray(resp.list)) return { ok: false, fixes: [], error: '응답 형식 오류' };
    var fixes = [];
    resp.list.forEach(function (x) {
      var busId = carToBus[x.carNo], lat = parseFloat(x.lat), lng = parseFloat(x.lon), t = String(x.gpsTime);
      if (!busId || !isFinite(lat) || !isFinite(lng) || !/^\d{14}$/.test(t)) return; // 모르는 차·깨진 값은 버림
      fixes.push({ busId: busId, lat: lat, lng: lng, ts: toSec(t), source: 'B' });
    });
    return { ok: true, fixes: fixes };
  }
  // 시연용 가상 업체 응답 만들기
  function fake(routes, nowSec, sim, delays, ymd) {
    var pad = function (n) { return (n < 10 ? '0' : '') + n; }, list = [];
    routes.forEach(function (r) {
      var p = sim(r, nowSec, delays[r.id]); if (!p) return;
      var t = p.ts;
      list.push({ carNo: r.carNo, lat: p.lat.toFixed(6), lon: p.lng.toFixed(6), gpsTime: ymd + pad(Math.floor(t / 3600)) + pad(Math.floor(t / 60) % 60) + pad(t % 60), speed: '0' });
    });
    return { resultCode: '00', list: list };
  }
  var api = { parse: parse, fake: fake, toSec: toSec };
  if (typeof module !== 'undefined') module.exports = api; else root.AdapterB = api;
})(this);

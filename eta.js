// 위치→노선 진행 거리·도착 예상·지연·끊김 판정과 더미 주행(A안·B안 공통) 순수 함수
(function (root) {
  var STALE_SEC = 180, AT_STOP_M = 150;
  function hav(a, b) {
    var R = 6371000, r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function cum(path) { var c = [0]; for (var i = 1; i < path.length; i++) c.push(c[i - 1] + hav(path[i - 1], path[i])); return c; }
  // 노선 위 진행 거리(m): 가장 가까운 구간에 투영(평면 근사, 구간이 짧아 충분)
  function progress(path, p) {
    var c = cum(path), best = { d: Infinity, s: 0 };
    for (var i = 1; i < path.length; i++) {
      var a = path[i - 1], b = path[i], k = Math.cos(a[0] * Math.PI / 180);
      var dx = (b[1] - a[1]) * k, dy = b[0] - a[0], px = (p[1] - a[1]) * k, py = p[0] - a[0], len2 = dx * dx + dy * dy;
      var t = len2 ? Math.max(0, Math.min(1, (px * dx + py * dy) / len2)) : 0;
      var q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], d = hav(q, p);
      if (d < best.d) best = { d: d, s: c[i - 1] + hav(a, q) };
    }
    return best;
  }
  function pointAt(path, s) {
    var c = cum(path);
    for (var i = 1; i < path.length; i++) if (s <= c[i]) {
      var t = (s - c[i - 1]) / ((c[i] - c[i - 1]) || 1), a = path[i - 1], b = path[i];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    return path[path.length - 1].slice();
  }
  function hm(s) { var x = s.split(':'); return (+x[0]) * 60 + (+x[1]); } // 자정부터 분
  // 계획 속도(m/s): 차고지→승차장 v1, 승차장→학교 v2
  function planSpeeds(r) {
    var c = cum(r.path), sStop = c[r.stopIndex], sEnd = c[c.length - 1];
    return { v1: sStop / ((hm(r.dep) - hm(r.depotLeave)) * 60), v2: (sEnd - sStop) / ((hm(r.arr) - hm(r.dep)) * 60), sStop: sStop, sEnd: sEnd };
  }
  // fixes: [{lat,lng,ts}] 시간순(ts는 자정 기준 초), nowSec: 지금(초)
  function estimate(r, fixes, nowSec) {
    if (!fixes.length) return { state: 'none' };
    var ps = planSpeeds(r), depSec = hm(r.dep) * 60, last = fixes[fixes.length - 1];
    if (nowSec - last.ts > STALE_SEC) return { state: 'stale', ageSec: nowSec - last.ts };
    var pr = progress(r.path, [last.lat, last.lng]), s = pr.s, v = null;
    var recent = fixes.filter(function (f) { return last.ts - f.ts <= 180; });
    if (recent.length >= 2 && last.ts > recent[0].ts) v = (s - progress(r.path, [recent[0].lat, recent[0].lng]).s) / (last.ts - recent[0].ts);
    // 최근 실제 속도를 쓰되 계획의 30%~시속 90km 사이로 묶음(정차·튐 방지)
    var vEst = function (plan) { return (v && v > 1) ? Math.min(Math.max(v, plan * 0.3), 25) : plan; };
    var out = { state: 'toStop', offRouteM: Math.round(pr.d), progressM: Math.round(s), ageSec: nowSec - last.ts };
    if (s < ps.sStop - AT_STOP_M) {
      out.etaStop = last.ts + (ps.sStop - s) / vEst(ps.v1);
      out.delayMin = Math.max(0, Math.round((out.etaStop - depSec) / 60));
      out.etaSchool = Math.max(out.etaStop + 60, depSec) + (ps.sEnd - ps.sStop) / ps.v2;
    } else if (s <= ps.sStop + AT_STOP_M && last.ts < depSec + 120) {
      out.state = 'atStop'; out.delayMin = 0; out.etaSchool = Math.max(last.ts, depSec) + (ps.sEnd - ps.sStop) / ps.v2;
    } else if (s >= ps.sEnd - AT_STOP_M) {
      out.state = 'arrived';
    } else {
      out.state = 'toSchool'; out.etaSchool = last.ts + (ps.sEnd - s) / vEst(ps.v2);
      out.delayMin = Math.max(0, Math.round((out.etaSchool - hm(r.arr) * 60) / 60));
    }
    return out;
  }
  // 더미 주행: 승차장까지 delayMin 늦게 도착, 1분 정차 후(정시보다 일찍은 안 떠남) 계획 속도로 학교까지
  function simulate(r, nowSec, delayMin) {
    var ps = planSpeeds(r), t0 = hm(r.depotLeave) * 60, arrStop = hm(r.dep) * 60 + (delayMin || 0) * 60;
    var leaveStop = Math.max(hm(r.dep) * 60, arrStop + 60), s;
    if (nowSec < t0) return null;
    if (nowSec <= arrStop) s = ps.sStop * (nowSec - t0) / (arrStop - t0);
    else if (nowSec <= leaveStop) s = ps.sStop;
    else s = Math.min(ps.sEnd, ps.sStop + (nowSec - leaveStop) * ps.v2);
    var p = pointAt(r.path, s);
    return { lat: p[0], lng: p[1], ts: Math.round(nowSec) };
  }
  function clock(sec) { sec = Math.round(sec); var h = Math.floor(sec / 3600) % 24, m = Math.floor(sec / 60) % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  var api = { hav: hav, progress: progress, pointAt: pointAt, estimate: estimate, simulate: simulate, planSpeeds: planSpeeds, hm: hm, clock: clock, STALE_SEC: STALE_SEC };
  if (typeof module !== 'undefined') module.exports = api; else root.Eta = api;
})(this);

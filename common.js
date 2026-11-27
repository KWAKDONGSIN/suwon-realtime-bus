// 시연용 가상 시계·위치 저장소·탭 간 전달(BroadcastChannel+localStorage). 실제 운영에선 서버 API가 이 자리를 맡는다
(function (root) {
  var CK = 'loc-clock', FK = 'loc-fixes', ch = ('BroadcastChannel' in root) ? new BroadcastChannel('mirita-loc') : null;
  function read(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var Clock = {
    get: function () { return read(CK, null) || Clock.reset(7 * 3600 + 35 * 60, 10); },
    reset: function (virtSec, speed) { var c = { realBase: Date.now(), virtBase: virtSec, speed: speed }; write(CK, c); notify('clock'); return c; },
    now: function () { var c = Clock.get(); return c.virtBase + (Date.now() - c.realBase) / 1000 * c.speed; },
    setSpeed: function (speed) { Clock.reset(Clock.now(), speed); },
    real: function () { var d = new Date(); Clock.reset(d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(), 1); }
  };
  var Store = {
    all: function () { return read(FK, {}); },
    of: function (busId) { return Store.all()[busId] || []; },
    push: function (fix) { // fix: {busId,lat,lng,ts,source}
      var a = Store.all(), list = (a[fix.busId] || []).filter(function (f) { return f.ts < fix.ts; });
      list.push(fix); a[fix.busId] = list.slice(-20); write(FK, a); notify('fix');
    },
    clear: function () { write(FK, {}); notify('fix'); }
  };
  // 현장 사건: 병점 "만석 출발" 같은 표시. {busId: {fullAt: 초}}
  var EK = 'loc-events';
  var Events = {
    all: function () { return read(EK, {}); },
    markFull: function (busId, ts) { var a = Events.all(); a[busId] = { fullAt: Math.round(ts) }; write(EK, a); notify('event'); },
    clear: function () { write(EK, {}); notify('event'); }
  };
  var subs = [];
  function notify(kind) { if (ch) ch.postMessage(kind); subs.forEach(function (f) { f(kind); }); }
  function on(f) { subs.push(f); if (ch) ch.onmessage = function (e) { subs.forEach(function (g) { g(e.data); }); };
    root.addEventListener('storage', function () { f('storage'); }); }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  root.Loc = { Clock: Clock, Store: Store, Events: Events, on: on, el: el };
})(this);

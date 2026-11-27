// 지도 그리기를 카카오·오픈스트리트맵 둘 중 하나로 맞춰 주는 얇은 층(학생 화면은 이 함수들만 쓴다)
(function (root) {
  function busHtml(name) { return '<div class="bus-ic" title="' + name + '">🚌</div>'; }
  function schoolHtml() { return '<img src="assets/usw-emblem.png" alt="수원대학교" style="width:30px;height:30px;display:block">'; }
  function stopHtml(name) { return '<div title="' + name + '" style="width:12px;height:12px;border-radius:50%;background:#E9B800;border:2px solid #fff;box-shadow:0 0 0 1px #003670"></div>'; }

  function kakaoView(el, done) {
    var s = document.createElement('script');
    s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=' + encodeURIComponent(MAP_CONFIG.KAKAO_JS_KEY);
    s.onerror = function () { done(null, '카카오 지도를 불러오지 못했습니다(키·도메인 등록 확인).'); };
    s.onload = function () {
      kakao.maps.load(function () {
        var K = kakao.maps, ll = function (p) { return new K.LatLng(p[0], p[1]); };
        var map = new K.Map(el, { center: ll([37.36, 126.93]), level: 10 });
        var ov = function (p, html) { return new K.CustomOverlay({ map: map, position: ll(p), content: html, yAnchor: 0.5, xAnchor: 0.5 }); };
        done({
          line: function (path) { var l = new K.Polyline({ map: map, path: path.map(ll), strokeWeight: 4, strokeColor: '#003670', strokeOpacity: 0.7 });
            return { fade: function (f) { l.setOptions({ strokeOpacity: f ? 0.12 : 0.7 }); } }; },
          stop: function (p, name) { ov(p, stopHtml(name)); },
          school: function (p) { ov(p, schoolHtml()); },
          bus: function (p, name) { var o = ov(p, busHtml(name)); return { move: function (q) { o.setPosition(ll(q)); }, remove: function () { o.setMap(null); } }; },
          fit: function (pts) { var b = new K.LatLngBounds(); pts.forEach(function (p) { b.extend(ll(p)); }); map.setBounds(b, 20, 20, 20, 20); },
          name: 'kakao'
        });
      });
    };
    document.head.appendChild(s);
  }

  function leafletView(el, done) {
    if (!root.L) return done(null, '지도를 불러오지 못했습니다(인터넷 연결 확인).');
    var map = L.map(el, { zoomControl: false }).setView([37.36, 126.93], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap' }).addTo(map);
    var icon = function (html, n) { return L.divIcon({ className: '', html: html, iconSize: [n, n], iconAnchor: [n / 2, n / 2] }); };
    done({
      line: function (path) { var l = L.polyline(path, { color: '#003670', weight: 4, opacity: 0.7 }).addTo(map);
        return { fade: function (f) { l.setStyle({ opacity: f ? 0.12 : 0.7 }); } }; },
      stop: function (p, name) { L.marker(p, { icon: icon(stopHtml(name), 12) }).addTo(map).bindTooltip(name); },
      school: function (p) { L.marker(p, { icon: icon(schoolHtml(), 30) }).addTo(map).bindTooltip('수원대학교'); },
      bus: function (p, name) { var m = L.marker(p, { icon: icon(busHtml(name), 26) }).addTo(map).bindTooltip(name);
        return { move: function (q) { m.setLatLng(q); }, remove: function () { map.removeLayer(m); } }; },
      fit: function (pts) { map.fitBounds(L.latLngBounds(pts), { padding: [20, 20] }); },
      name: 'osm'
    });
  }

  root.MapView = { create: function (el, done) {
    if (!(root.MAP_CONFIG && MAP_CONFIG.KAKAO_JS_KEY)) return leafletView(el, done);
    // 카카오가 안 되면(키·도메인·카카오맵 사용 설정 문제) 오픈스트리트맵으로 돌아간다
    kakaoView(el, function (v, err) { if (v) return done(v); console.warn(err); leafletView(el, done); });
  } };
})(this);

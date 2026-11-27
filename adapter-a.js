// A안: 공기계 앱(Traccar Client·GPSLogger, OsmAnd 형식)이 보낸 값을 공통 위치 형식 {busId,lat,lng,ts}로 바꾸는 변환기
(function (root) {
  // OsmAnd 형식 예: ?id=mirita-songnae2&lat=37.49&lon=126.77&timestamp=1795599660&speed=8.5&batt=82
  // timestamp는 유닉스 초(또는 ISO 문자열). 서버는 이 값을 한국 시각 자정 기준 초로 바꿔 저장한다.
  function kstSec(unix) { var d = new Date((unix + 9 * 3600) * 1000); return d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds(); }
  function parse(params, deviceToBus) {
    var get = function (k) { return params.get ? params.get(k) : params[k]; };
    var busId = deviceToBus[get('id')], lat = parseFloat(get('lat')), lng = parseFloat(get('lon')), t = get('timestamp');
    if (!busId) return { ok: false, error: '등록되지 않은 기기' };
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { ok: false, error: '좌표 오류' };
    var unix = /^\d+$/.test(String(t)) ? +t : Math.floor(Date.parse(t) / 1000);
    if (!isFinite(unix)) return { ok: false, error: '시각 오류' };
    return { ok: true, fix: { busId: busId, lat: lat, lng: lng, ts: kstSec(unix), source: 'A', batt: get('batt') == null ? null : +get('batt') } };
  }
  var api = { parse: parse, kstSec: kstSec };
  if (typeof module !== 'undefined') module.exports = api; else root.AdapterA = api;
})(this);

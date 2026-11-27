# 노선별 실제 도로 경로(차고지→승차장→학교)를 OSRM 공개 서버에서 한 번 받아 paths.js로 저장하는 일회용 도구
# 경로 출처: OSRM(router.project-osrm.org), 지도 자료 © OpenStreetMap 기여자(ODbL). 차고지 좌표는 더미.
import json, math, sys, time, urllib.request
from pathlib import Path

SCHOOL = (37.2141667, 126.97915)
ROUTES = {  # 이름: (차고지 더미, 승차장)
    'songnae': ((37.4950, 126.7700), (37.4873, 126.7534)),
    'gangnam': ((37.5050, 127.0500), (37.4964, 127.0283)),
    'sadang': ((37.4600, 126.9500), (37.4757, 126.9815)),
    'byeongjeom': ((37.2150, 127.0500), (37.2068333, 127.0319167)),
}

def osrm(a, b):
    url = f'https://router.project-osrm.org/route/v1/driving/{a[1]},{a[0]};{b[1]},{b[0]}?overview=full&geometries=geojson'
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'student-shuttle-prototype'}), timeout=30) as r:
        d = json.load(r)
    if d.get('code') != 'Ok':
        raise RuntimeError(f'OSRM 오류: {d.get("code")} {a}->{b}')
    rt = d['routes'][0]
    return [(lat, lng) for lng, lat in rt['geometry']['coordinates']], rt['distance']

def rdp(pts, eps_m=15):  # 점 줄이기(Douglas–Peucker, 평면 근사)
    if len(pts) < 3:
        return pts
    k = 111320 * math.cos(math.radians(pts[0][0]))
    xy = [(p[1] * k, p[0] * 111320) for p in pts]
    (x1, y1), (x2, y2) = xy[0], xy[-1]
    dx, dy = x2 - x1, y2 - y1
    L = math.hypot(dx, dy) or 1e-9
    dmax, idx = -1, 0
    for i in range(1, len(xy) - 1):
        d = abs(dy * xy[i][0] - dx * xy[i][1] + x2 * y1 - y2 * x1) / L
        if d > dmax:
            dmax, idx = d, i
    if dmax <= eps_m:
        return [pts[0], pts[-1]]
    return rdp(pts[:idx + 1], eps_m)[:-1] + rdp(pts[idx:], eps_m)

out = {}
for name, (depot, stop) in ROUTES.items():
    a, da = osrm(depot, stop); time.sleep(1)
    b, db = osrm(stop, SCHOOL); time.sleep(1)
    a, b = rdp(a), rdp(b)
    path = [[round(p[0], 6), round(p[1], 6)] for p in a + b[1:]]
    out[name] = {'path': path, 'stopIndex': len(a) - 1, 'km': round((da + db) / 1000, 1)}
    assert 0 < out[name]['stopIndex'] < len(path) - 1, name
    print(name, len(path), 'points', out[name]['km'], 'km', file=sys.stderr)

js = ('// 노선별 실제 도로 경로(자동 생성: tools/build_paths.py). 경로 출처 OSRM, 지도 자료 © OpenStreetMap 기여자(ODbL). 차고지는 더미\n'
      '(function (root) { var P = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
      "  if (typeof module !== 'undefined') module.exports = P; else root.LocPaths = P; })(this);\n")
Path(__file__).resolve().parent.parent.joinpath('paths.js').write_text(js, encoding='utf-8')

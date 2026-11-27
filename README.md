# 수원대 실시간버스 시제품 (A안·B안, 더미 데이터)

11/25 학생지원처 통화 뒤 방향 전환: 병점 좌석 예약 → 아침 셔틀 위치·도착 예상 + 병점 "지금 탈 수 있는 차·만석 출발·대안 일반 버스".
서버 없이 한 브라우저 안에서 도는 시연판이다. 실제 운영에서는 `common.js`의 저장소 자리를 서버 API가 맡는다.

## 실시간 모드 (11/27 추가, Cloudflare Worker)

시험 기기(공기계 역할 휴대폰)의 **실제 GPS**를 받아 학생 화면에 그린다. 학교 승인 전이므로 버스가 아닌 팀원 휴대폰으로만 시험한다.

- 위치 받기 `POST /api/v1/osmand`: Traccar Client가 보내는 형식(새 앱의 JSON `device_id`+`location.coords`, 옛 앱·OsmAnd의 주소 뒤 값, 폼 본문)을 모두 받는다. 앱은 머리글을 못 넣으므로 **기기 ID 자체가 비밀번호**다. 등록된 기기 ID만 받고(그 밖은 404), 버스마다 최근 위치 20개만 보관한다.
- 조회 `GET /api/v1/buses`: 최근 10분 위치만 준다. 학생 화면은 `student.html#live`(노선 고정은 `#live&sel=songnae2`)에서 5초마다 읽는다.
- 로컬 실행(기기 등록은 `.dev.vars`의 `DEVICES={"pp-local-test":"songnae2"}`):

```powershell
Set-Location "E:/01_진행중/수원대_AI챌린저_2026/조사_20261125/위치서비스_시제품"
node tools/build_public.mjs
node ../../server/node_modules/wrangler/bin/wrangler.js dev --port 8792
```

- 배포(사람이 확인 후): `node tools/build_public.mjs` → `wrangler secret put DEVICES`(긴 무작위 기기 ID) → `wrangler deploy`. 배포 주소를 카카오 앱(1665968) 사이트 도메인에 추가해야 카카오 지도가 뜬다(안 하면 오픈스트리트맵).
- `public/`에는 학교 로고·문서 그림·시험·도구를 넣지 않는다(`tools/build_public.mjs`). 로고가 없으면 화면은 글자만 보인다.
- Traccar Client 설정: 서버 주소 `https://<배포 주소>/api/v1/osmand`, 기기 식별자 = 등록한 기기 ID, 정확도 높음, 간격 10초.
- 시험: `node --test test/api.test.mjs`(8개), `node test/eta.test.js`(19개).

## 실행

```powershell
python -m http.server 8790 --bind 127.0.0.1 --directory "E:/01_진행중/수원대_AI챌린저_2026/조사_20261125/위치서비스_시제품"
```

- 시연 화면: http://localhost:8790 → 왼쪽 A안·B안 고르기 → 시작 → 오른쪽 학생 화면. 위쪽에서 시계를 07:35로 되돌리고 배속(1·10·30)을 바꾼다.
- 시각 고정 화면(발표용): http://localhost:8790/student.html#demo=08:38 , 노선 상세는 `#demo=07:45&sel=songnae2`.
- 카카오 지도는 `http://localhost:8790`에서만 뜬다(카카오 앱에 등록한 주소). 다른 주소·키 문제면 오픈스트리트맵으로 자동 전환.
- 파일을 고친 뒤 화면이 그대로면 브라우저 캐시 때문이다(Ctrl+F5).

## 파일

| 파일 | 역할 |
|---|---|
| index.html | 시연 화면(왼쪽 보내는 쪽, 오른쪽 학생 화면) |
| student.html | 학생 화면: 지도, 병점 3대 묶음(지금 탈 수 있는 차·만석 출발·놓쳤을 때 일반 버스), 유료 노선 카드, 노선 상세 |
| a.html | A안 버스 공기계: 더미 주행 또는 실제 GPS(웹, 화면 켜짐 유지), "만석 출발" 버튼 |
| b.html | B안 운행 시스템 연동 모의: 가상 업체 응답 → 변환 |
| eta.js | 진행 거리·도착 예상·지연·끊김(3분) 판정, 더미 주행 |
| adapter-a.js / adapter-b.js | A안 앱(OsmAnd 형식) / B안 업체 응답 → 공통 형식 |
| data.js | 노선·시각(공지·팀장 관찰), 더미 시나리오, 병점역후문 대안 버스(경기도 버스 API 11/25 16:31 실조회 고정값) |
| paths.js | 실제 도로 경로(OSRM·OpenStreetMap). `tools/build_paths.py`로 다시 만든다 |
| mapview.js / config.js | 지도 층(카카오 / 오픈스트리트맵), 카카오 JavaScript 키 |
| common.js | 시연 시계, 위치·만석 기록(localStorage), 탭 간 전달 |
| assets/ | 수원대 공식 로고·엠블럼(2025 UI 파일, 사용 승인 전) |
| test/eta.test.js | 자체 시험 `node test/eta.test.js` (19개) |

## 한계 (시연판)

- 버스 위치는 더미다. 차고지 좌표·학교 도착 시각도 더미, 경로는 "가장 빠른 자동차 길"이라 실제 셔틀 길과 다를 수 있다.
- 도착 예상은 최근 3분 속도로 남은 거리를 나눈 단순 계산이다(실시간 교통 미반영).
- 병점 대안 버스 시각은 오후에 조회한 고정값이다. 실제 서비스는 서버가 30초마다 경기도 버스 API를 부른다.
- 웹페이지 GPS는 화면이 켜져 있고 맨 앞일 때만 동작한다(W3C). 운영은 공기계 앱(Traccar Client) 권장.

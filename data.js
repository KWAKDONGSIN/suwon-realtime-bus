// 노선·시간표·경로 좌표(더미) — 출발 시각·승차장은 학교 2026-2학기 공지, 좌표·학교 도착 시각은 시연용 근사값
(function (root) {
  var SCHOOL = [37.2141667, 126.97915]; // 경기도 버스 API "수원대학교" 정류소(233000576) 좌표
  var SONGNAE = [[37.4950, 126.7700], [37.4873, 126.7534], [37.4700, 126.7900], [37.4170, 126.8750], [37.3480, 126.9200], [37.2700, 126.9500], SCHOOL];
  var ROUTES = [
    { id: 'songnae1', name: '송내 07:50 · 1호차', stopName: '송내역 고려한증막 앞', dep: '07:50', arr: '08:52',
      path: SONGNAE, stopIndex: 1, depotLeave: '07:31', carNo: '경기70바1001' },
    { id: 'songnae2', name: '송내 07:50 · 2호차', stopName: '송내역 고려한증막 앞', dep: '07:50', arr: '08:52',
      path: SONGNAE, stopIndex: 1, depotLeave: '07:31', carNo: '경기70바1002' },
    { id: 'gangnam', name: '강남 07:50', stopName: '강남역 7번 출구 산업은행 앞', dep: '07:50', arr: '08:50',
      path: [[37.5050, 127.0500], [37.4964, 127.0283], [37.4700, 127.0400], [37.4000, 127.1000], [37.3000, 127.0700], [37.2500, 127.0100], SCHOOL],
      stopIndex: 1, depotLeave: '07:30', carNo: '경기70바1003' },
    { id: 'sadang', name: '사당 08:00', stopName: '사당역 홈플러스 앞', dep: '08:00', arr: '08:55',
      path: [[37.4600, 126.9500], [37.4757, 126.9815], [37.4300, 126.9900], [37.3600, 126.9700], [37.2800, 126.9750], SCHOOL],
      stopIndex: 1, depotLeave: '07:45', carNo: '경기70바1004' }
  ];
  // 병점(무료) 아침 3대: 팀장 관찰 약 08:30·08:40·08:50 차례로 출발(학교 답변: 차면 먼저 출발). 승차장은 병점역후문 정류소(233000701) 좌표
  var BJ = [[37.2150, 127.0500], [37.2068333, 127.0319167], [37.2100, 127.0050], SCHOOL];
  [['1', '08:30', '08:45', '08:08'], ['2', '08:40', '08:55', '08:18'], ['3', '08:50', '09:05', '08:28']].forEach(function (b) {
    ROUTES.push({ id: 'byeongjeom' + b[0], group: 'byeongjeom', name: '병점 08:50 회차 · ' + b[0] + '호차', stopName: '병점역 후문(2·3번 출구)', dep: b[1], arr: b[2],
      path: BJ, stopIndex: 1, depotLeave: b[3], carNo: '경기70바200' + b[0], free: true });
  });
  // 더미 시나리오: 승차장까지 가는 길에 늦어지는 분(음수는 출발보다 일찍 와서 대기). 송내 2호차 6분, 사당 2분 지연.
  var DELAY_TO_STOP = { songnae1: 0, songnae2: 6, gangnam: 0, sadang: 2, byeongjeom1: -12, byeongjeom2: -8, byeongjeom3: -6 };
  // 더미 시나리오: 만석으로 출발하는 차(공기계의 "만석 출발" 버튼을 누른 것으로 침)
  var FULL_DEPART = { byeongjeom1: true, byeongjeom2: true };
  // 병점역후문(233000701)에서 수원대학교 정류소를 지나는 일반 버스. 경기도 버스 도착 정보 API 실제 조회값(2026-11-25 16:31, 시연은 이 고정값)
  var ALT_BUS = { station: '병점역후문', stationId: '233000701', fetchedAt: '11/25 16:31', next: '다음 셔틀 10:00', list: [
    { route: '1551B', to: '수원대학교', min: 2 }, { route: '65', to: '화성시청', min: 2 }, { route: '35-2', to: '동보아파트', min: 5 },
    { route: '1551', to: '수원대학교', min: 6 }, { route: '34-1', to: '협성대학교정문', min: 6 }, { route: '34', to: '협성대학교정문', min: 16 }] };
  // 실제 도로 경로(paths.js, OSRM·OpenStreetMap)가 있으면 직선 근사 대신 쓴다
  var PATHS = (typeof module !== 'undefined') ? require('./paths.js') : root.LocPaths;
  if (PATHS) ROUTES.forEach(function (r) { var p = PATHS[r.id.replace(/\d+$/, '')]; if (p) { r.path = p.path; r.stopIndex = p.stopIndex; } });
  var api = { SCHOOL: SCHOOL, ROUTES: ROUTES, DELAY_TO_STOP: DELAY_TO_STOP, FULL_DEPART: FULL_DEPART, ALT_BUS: ALT_BUS };
  if (typeof module !== 'undefined') module.exports = api; else root.LocData = api;
})(this);

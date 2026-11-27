// 실시간버스 Worker: 공기계 위치 받기(/api/v1/osmand)·학생 화면 조회(/api/v1/buses)·정적 화면 제공
import { DurableObject } from 'cloudflare:workers';
import { readReports, toFix, addFix, recent } from './api.mjs';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

// 위치는 한 곳(Durable Object)에만 둬야 받는 쪽과 보는 쪽이 같은 값을 본다
export class BusHub extends DurableObject {
  async fetch(req) {
    const nowSec = Date.now() / 1000;
    const all = (await this.ctx.storage.get('fixes')) || {};
    if (req.method === 'GET') return json({ serverTime: Math.round(nowSec), buses: recent(all, nowSec) });
    const { fixes } = await req.json();
    for (const f of fixes) all[f.busId] = addFix(all[f.busId] || [], f);
    await this.ctx.storage.put('fixes', all);
    return json({ ok: true, saved: fixes.length });
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const hub = env.BUS_HUB.get(env.BUS_HUB.idFromName('main'));
    if (url.pathname === '/api/v1/buses' && req.method === 'GET') return hub.fetch('https://hub/');
    if (url.pathname === '/api/v1/osmand' && (req.method === 'POST' || req.method === 'GET')) {
      const body = req.method === 'POST' ? await req.text() : '';
      if (body.length > 16384) return json({ error: 'too large' }, 413);
      let reports;
      try { reports = readReports(req.url, req.headers.get('content-type'), body); }
      catch { return json({ error: 'bad body' }, 400); }
      let devices = {};
      try { devices = JSON.parse(env.DEVICES || '{}'); } catch { return json({ error: 'server config' }, 500); }
      const nowSec = Date.now() / 1000, fixes = [];
      let code = reports.length ? 404 : 400;
      for (const r of reports) {
        const res = toFix(r, devices, nowSec);
        if (res.ok) fixes.push(res.fix); else code = res.code;
      }
      if (!fixes.length) return json({ error: code === 404 ? 'unknown device' : 'bad position' }, code);
      return hub.fetch('https://hub/', { method: 'POST', body: JSON.stringify({ fixes }) });
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'not found' }, 404);
    return env.ASSETS.fetch(req);
  }
};

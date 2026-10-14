// Móvil, segunda parte: Mi progreso en tarjetas y gráfica táctil, 320 px sin desbordar y objetivos táctiles de 44 px.
const { suite } = require('./lib');

suite('Móvil: progreso, 320 px y 44 px', async ({ b, URL, ok, MOB, page, open, until, wf, vis, settle, postReady, scheduleTaps, waitRunning, waitResults, tapAndStop }) => {
  const SM = { ...MOB, viewport: { width: 360, height: 640 } }, LAND = { ...MOB, viewport: { width: 844, height: 390 } }, XS = { ...MOB, viewport: { width: 320, height: 640 } };
  // página móvil con ajustes (y, si se pide, progreso) sembrados una sola vez
  const mob = async (opts, seed, prog) => {
    const p = await page(b, opts);
    await p.addInitScript(([seed, prog]) => { if (sessionStorage.mvx) return; sessionStorage.mvx = 1;
      localStorage.setItem('solfeo-ritmico-v1', JSON.stringify({ sv: 3, seen: true, ...seed }));
      if (prog) localStorage.setItem('solfeo-ritmico-progreso-v1', JSON.stringify(prog)); }, [seed || {}, prog || null]);
    await open(p, URL);
    return p;
  };
  const rect = (p, s) => p.$eval(s, e => { const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height }; });
  const overflow = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  // toca todas las notas casi a tiempo y espera los resultados (con el análisis fino, que pide al menos 4 notas)
  const playAll = async (p, btn) => {
    await p.tap(btn || '#bPractice'); await waitRunning(p, 'practice');
    await scheduleTaps(p, [-6, 12, -20, 8, 30, -14, 4, -9], null);
    await waitResults(p); await settle(p);
  };

  // ---------- 33: Mi progreso en el móvil ----------
  const now = Date.now(), sessions = [];
  for (let i = 0; i < 45; i++) sessions.push({ id: 's' + i, t: now - (45 - i) * 28800000, mode: i % 3 ? 'libre' : 'propio', sig: '4/4', bars: 4, bpm: 80 + i % 7, pct: 60 + Math.round(30 * Math.abs(Math.sin(i / 4))), n: 12, exact: 6 + i % 5, good: 3, near: 1, miss: i % 3, extra: 0, mean: (i % 9 - 4) * 8, play: 'bateria', pen: true, sd: 10 + i % 30, exn: i % 3 ? undefined : 'Ritmo largo de prueba' });
  const PROG = { levels: {}, sessions };
  for (const [name, o] of [['390', MOB], ['320', XS]]) {
    p = await mob(o, {}, PROG);
    await p.tap('#tab-progreso'); await p.waitForSelector('#pTable tbody tr'); await settle(p);
    const t = await p.evaluate(() => { const tr = document.querySelector('#pTable tbody tr'), cs = getComputedStyle(tr), w = document.querySelector('.tbl-wrap');
      const reg = [...tr.children].find(td => td.dataset.l === 'Regularidad');
      return { disp: cs.display, th: getComputedStyle(document.querySelector('#pTable thead')).display, rows: document.querySelectorAll('#pTable tbody tr').length, wrapOver: w.scrollWidth - w.clientWidth,
        regLbl: getComputedStyle(reg, '::before').content, regTxt: reg.textContent, pct: tr.querySelector('.c-pct').getBoundingClientRect().right <= innerWidth, tblW: document.querySelector('#pTable table').getBoundingClientRect().width, cw: innerWidth }; });
    ok(t.disp === 'grid' && t.th === 'none' && t.rows === 30, `${name} px: historial como tarjetas (${t.rows} filas)`);
    ok(/Regularidad/.test(t.regLbl) && /±/.test(t.regTxt), `${name} px: la tarjeta incluye «Regularidad»`);
    ok(t.wrapOver <= 0 && t.tblW <= t.cw && t.pct && await overflow(p) <= 0, `${name} px: sin desplazamiento horizontal (tabla ${Math.round(t.tblW)} px)`);
    // gráfica: el tooltip se queda al tocar y se quita al tocar fuera
    const hit = await rect(p, '.ch-hit');
    ok(hit.w > 200, `${name} px: una sola zona de toque ancha (${Math.round(hit.w)} px)`);
    await p.evaluate(() => document.querySelector('#pChart').scrollIntoView({ block: 'center' })); await settle(p);
    const hb = await rect(p, '.ch-hit');
    await p.touchscreen.tap(hb.l + hb.w * 0.4, hb.t + hb.h / 2); await p.waitForTimeout(400);
    const tip1 = await p.evaluate(() => ({ vis: !document.querySelector('#pTip').hidden, txt: document.querySelector('#pTip').textContent, sel: document.querySelectorAll('.ch-dot.sel').length }));
    ok(tip1.vis && /%/.test(tip1.txt) && tip1.sel === 1, `${name} px: tocar un punto fija el tooltip y lo marca`);
    await p.waitForTimeout(500);
    await p.touchscreen.tap(hb.l + hb.w * 0.95, hb.t + hb.h / 2); await p.waitForTimeout(300);
    const tip2 = await p.evaluate(() => ({ vis: !document.querySelector('#pTip').hidden, txt: document.querySelector('#pTip').textContent }));
    ok(tip2.vis && tip2.txt !== tip1.txt, `${name} px: tocar otro lo cambia`);
    await p.touchscreen.tap(20, 20); await p.waitForTimeout(300);
    ok(await p.$eval('#pTip', e => e.hidden) && await p.$$eval('.ch-dot.sel', a => a.length) === 0, `${name} px: tocar fuera lo quita`);
    ok(p.errs.length === 0, `${name} px: sin errores ` + p.errs.join('|')); await p.context().close();
  }
  // escritorio: sigue siendo tabla
  p = await page(b, { viewport: { width: 1200, height: 900 } });
  await p.addInitScript(([prog]) => { localStorage.setItem('solfeo-ritmico-v1', JSON.stringify({ sv: 3, seen: true })); localStorage.setItem('solfeo-ritmico-progreso-v1', JSON.stringify(prog)); }, [PROG]);
  await open(p, URL); await p.click('#tab-progreso'); await p.waitForSelector('#pTable tbody tr');
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('#pTable tbody tr')).display === 'table-row' && getComputedStyle(document.querySelector('#pTable thead')).display !== 'none'), 'escritorio: el historial sigue siendo una tabla');
  const hr = await rect(p, '.ch-hit');
  await p.mouse.move(hr.l + hr.w * 0.5, hr.t + hr.h / 2); await p.waitForTimeout(200);
  ok(await vis(p, '#pTip'), 'escritorio: el tooltip sigue al ratón');
  await p.mouse.move(5, 5); await p.waitForTimeout(200);
  ok(await p.$eval('#pTip', e => e.hidden), 'escritorio: y se va al salir'); await p.context().close();

  // ---------- 320 px: sin desplazamiento horizontal en ninguna vista ----------
  p = await mob(XS, {}, PROG);
  const ov = {};
  ov.libre = await overflow(p);
  await p.evaluate(() => document.querySelectorAll('.fold').forEach(d => { d.open = true; })); ov.libreFolds = await overflow(p);
  await p.tap('#tab-campana'); await p.waitForTimeout(300); ov.campana = await overflow(p);
  await p.tap('#tab-propio'); await p.waitForTimeout(300); ov.propio = await overflow(p);
  await p.evaluate(() => { for (const k of ['q', 'q', 'e', 'e', 'q']) __t.ownApi.ownInsert(k); }); await p.waitForTimeout(300); ov.propioEd = await overflow(p);
  await p.tap('#tab-progreso'); await p.waitForTimeout(400); ov.progreso = await overflow(p);
  ok(Object.values(ov).every(v => v <= 0), '320 px: sin desplazamiento horizontal ' + JSON.stringify(ov));
  await p.evaluate(() => __t.setView('libre')); await p.evaluate(() => { document.querySelector('#welcome').hidden = false; }); ov.welcome = await overflow(p);
  await p.tap('#bPractice'); await waitRunning(p, 'practice'); ov.practicando = await overflow(p); await tapAndStop(p); await waitResults(p); ov.resultados = await overflow(p);
  ok(ov.welcome <= 0 && ov.practicando <= 0 && ov.resultados <= 0, '320 px: bienvenida, práctica y resultados sin desbordar ' + JSON.stringify({ w: ov.welcome, p: ov.practicando, r: ov.resultados }));
  ok(p.errs.length === 0, '320 px: sin errores ' + p.errs.join('|')); await p.context().close();

  // ---------- 35: objetivos táctiles de 44 px ----------
  p = await mob(MOB, {}, PROG);
  const small = () => p.evaluate(() => {
    const sel = 'button, summary, select, textarea, input:not([type=checkbox]):not([type=radio]), label.sw, [role=tab], a[href]:not(.skip)';
    const bad = [];
    document.querySelectorAll(sel).forEach(e => {
      if (e.closest('[hidden]') || e.hidden) return;
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
      if (e.matches('.step,.pal-b,.tab,[data-fold] summary') ? (r.height < 43.5 || r.width < 43.5) : r.height < 43.5)
        bad.push((e.id || e.className || e.tagName) + ':' + e.tagName.toLowerCase() + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + (e.textContent ? ' «' + e.textContent.trim().slice(0, 18) + '»' : ''));
    });
    return bad;
  });
  await p.evaluate(() => { document.querySelectorAll('.fold').forEach(d => { d.open = true; }); document.querySelector('#welcome').hidden = false; });
  let sm = await small(); ok(sm.length === 0, 'Práctica libre: todo mide al menos 44 px de alto ' + sm.join(' | '));
  await p.evaluate(() => { document.querySelector('#welcome').hidden = true; }); await p.tap('#tab-campana'); await p.waitForTimeout(300);
  sm = await small(); ok(sm.length === 0, 'Campaña: todo mide al menos 44 px ' + sm.join(' | '));
  await p.tap('#tab-propio'); await p.waitForTimeout(300);
  await p.evaluate(() => { for (const k of ['q', 'q', 'q', 'q']) __t.ownApi.ownInsert(k); document.activeElement.blur(); }); await p.waitForTimeout(300);
  await p.evaluate(() => { document.querySelector('#ownImport').hidden = false; });
  sm = await small(); ok(sm.length === 0, 'Mis ejercicios: todo mide al menos 44 px ' + sm.join(' | '));
  const eh = await p.evaluate(() => [...document.querySelectorAll('#score .evhit')].map(e => e.getBoundingClientRect().width));
  ok(eh.length === 4 && eh.every(w => w >= 43.5), 'zonas de toque de las figuras de al menos 44 px: ' + eh.map(Math.round).join(','));
  await p.tap('#tab-progreso'); await p.waitForTimeout(400);
  sm = await small(); ok(sm.length === 0, 'Mi progreso: todo mide al menos 44 px ' + sm.join(' | '));
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|')); await p.context().close();
  // escritorio: los controles conservan su tamaño compacto
  p = await page(b); await open(p, URL);
  ok(await p.$eval('#bPlay', e => e.getBoundingClientRect().height) < 44, 'escritorio: botones con su tamaño normal'); await p.context().close();
});

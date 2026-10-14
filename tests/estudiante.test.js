// Mejoras para el estudiante: análisis fino del resultado, bucle de tempo y metrónomo que calla
const { suite } = require('./lib');

const setRhythm = (p, o) => p.evaluate(o => { Object.assign(__t.set, { sig: '4/4', sync: false, ties: false, rests: [], countIn: '1', ramp: false, gap: '0', ...o }); __t.generate(); }, o);
// Registra los clics del metrónomo (hora y nivel) envolviendo click() (función global)
const recordClicks = p => p.evaluate(() => { if (!window.__clOrig) window.__clOrig = window.click; window.__cl = [];
  window.click = function (bus, t, l) { window.__cl.push({ t, l }); return window.__clOrig.apply(this, arguments); }; });
// Clics por compás (0 = primero de la cuenta previa)
const clicksPerBar = (p, n) => p.evaluate(n => { const S = __t.S, bl = __t.score.L * S.spt, c = Array(n).fill(0);
  window.__cl.forEach(x => { const g = Math.floor((x.t - S.t0) / bl + 1e-6); if (g >= 0 && g < n) c[g]++; }); return c; }, n);

suite('Estudiante: análisis, bucle de tempo y metrónomo que calla', async ({ b, URL, ok, page, open, until, wf, scheduleTaps, tapAndStop, waitRunning, waitResults, waitStopped }) => {
  let p = await page(b); await open(p, URL);

  // 1) análisis con toques sintéticos (función pura): 2 compases de corcheas en 4/4
  const an = await p.evaluate(() => {
    const A = __t.studyApi, sig = __t.SIGS['4/4'];
    const mk = f => Array.from({ length: 16 }, (_, k) => ({ err: f(k), bar: k / 8, on: k % 2 === 0, after: false }));
    let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
    const res = {};
    const run = (name, f) => { const a = A.analyzeTaps(mk(f)); res[name] = { trend: a.trend, drift: Math.round(a.drift), sd: Math.round(a.sd), tip: A.analysisTip(a, sig) || '', on: a.on && Math.round(a.on.abs), off: a.off && Math.round(a.off.abs) }; };
    run('acc', k => 40 - k * 6 + rnd() * 8);
    run('drag', k => -30 + k * 6 + rnd() * 8);
    run('irr', k => rnd() * 160);
    run('offRush', k => (k % 2 ? -45 : 0) + rnd() * 6);
    run('offLoose', k => (k % 2 ? (k % 4 === 1 ? 50 : -50) : 0) + rnd() * 6);
    run('late', k => 45 + rnd() * 10);
    run('good', k => rnd() * 16);
    // tras un silencio: las notas tras silencio se adelantan
    const items = Array.from({ length: 12 }, (_, k) => ({ err: k % 3 === 0 ? -50 : 5 + rnd() * 6, bar: k / 6, on: true, after: k % 3 === 0 }));
    const a = A.analyzeTaps(items); res.after = A.analysisTip(a, sig) || '';
    res.few = A.analyzeTaps(mk(k => k).slice(0, 3)) === null;
    return res;
  });
  ok(an.acc.trend === 'acc' && an.acc.drift < -60 && an.acc.tip.startsWith('Aceleras'), `acelera: tendencia ${an.acc.trend}, ${an.acc.drift} ms · ${an.acc.tip}`);
  ok(an.drag.trend === 'drag' && an.drag.drift > 60 && an.drag.tip.startsWith('Te vas retrasando'), `se retrasa: ${an.drag.drift} ms`);
  ok(an.irr.trend === '' && an.irr.sd >= 40 && an.irr.tip.includes('varían'), `irregular: ±${an.irr.sd} ms · ${an.irr.tip}`);
  ok(an.offRush.tip.includes('Te adelantas en los contratiempos') && an.offRush.off > an.offRush.on + 30, 'contratiempos adelantados: ' + an.offRush.tip);
  ok(an.offLoose.tip.includes('menos precisos'), 'contratiempos imprecisos: ' + an.offLoose.tip);
  ok(an.late.sd <= 25 && an.late.tip.includes('siempre') && an.late.tip.includes('latencia'), 'siempre tarde pero regular: ' + an.late.tip);
  ok(an.good.tip === '' && an.good.trend === '' && an.good.sd <= 15, 'bien tocado: sin consejo');
  ok(an.after.includes('Tras los silencios te adelantas'), 'tras un silencio: ' + an.after);
  ok(an.few, 'con menos de 4 notas tocadas no hay análisis');

  // 2) de punta a punta: corcheas con los contratiempos 50 ms antes
  await setRhythm(p, { figs: ['e'], bars: 2, bpm: 100 });
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  await scheduleTaps(p, [0, -50], null); await waitResults(p);
  let r = await p.evaluate(() => ({ vis: !document.querySelector('#rAnal').hidden, tip: document.querySelector('#aTip').textContent,
    rows: [...document.querySelectorAll('#aPos li')].map(li => li.textContent), svg: !!document.querySelector('#aChart svg[role=img][aria-label]'),
    sd: document.querySelector('#aSd').textContent, live: document.querySelector('#srLive').textContent, last: __t.prog.sessions[__t.prog.sessions.length - 1] }));
  ok(r.vis && r.svg, 'resultados: bloque de análisis con mini-gráfica accesible');
  ok(r.tip.includes('contratiempos'), 'consejo sobre los contratiempos: ' + r.tip);
  ok(r.rows.length === 2 && r.rows[0].startsWith('En el tiempo') && r.rows[1].startsWith('A contratiempo') && /antes/.test(r.rows[1]), 'error por posición: ' + r.rows.join(' | '));
  ok(/^±\d+ ms$/.test(r.sd) && typeof r.last.sd === 'number' && typeof r.last.drift === 'number', `sesión con regularidad (sd ${r.last.sd}) y tendencia (drift ${r.last.drift})`);
  ok(await until(p, () => document.querySelector('#srLive').textContent.includes('contratiempos')), 'el consejo también se anuncia');

  // acelerando a lo largo de la pasada
  const heads = await p.evaluate(() => __t.score.flat.filter(e => !e.rest && !e.tie).length);
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  await scheduleTaps(p, Array.from({ length: heads }, (_, k) => 45 - k * 90 / (heads - 1)), null); await waitResults(p);
  r = await p.evaluate(() => ({ d: document.querySelector('#aDrift').textContent, tip: document.querySelector('#aTip').textContent, fit: !!document.querySelector('#aChart .ad-fit.on') }));
  ok(r.d === 'Aceleras' && r.tip.startsWith('Aceleras') && r.fit, `acelerando: «${r.d}» · ${r.tip}`);

  // validación de los campos nuevos de la sesión
  const cs = await p.evaluate(() => { const base = { id: 'abc123', t: 5, mode: 'libre', sig: '4/4', pct: 50 };
    return [cleanSession({ ...base, sd: 18, drift: -40 }), cleanSession({ ...base, sd: 'x', drift: {} }), cleanSession({ ...base, sd: -3, drift: 1e9 })].map(s => [s.sd, s.drift]); });
  ok(JSON.stringify(cs) === '[[18,-40],[null,null],[0,5000]]', 'cleanSession valida sd y drift: ' + JSON.stringify(cs));
  // Mi progreso: columna de regularidad
  await p.click('#tab-progreso');
  ok(await p.evaluate(() => [...document.querySelectorAll('#pTable th')].some(t => t.textContent === 'Regularidad') && /±\d+ ms/.test(document.querySelector('#pTable tbody tr').textContent)), 'Mi progreso muestra la regularidad');
  await p.click('#tab-libre');

  // 3) bucle de tempo: sube de 10 en 10 al pasar del 50 % y para en el tope (220)
  await setRhythm(p, { figs: ['q'], bars: 1, bpm: 200, ramp: true, rampPct: 50, rampStep: 10, rampMax: 220, rampDown: false });
  const n0 = await p.evaluate(() => __t.prog.sessions.length);
  await p.click('#bPractice');
  for (const [k, bpm] of [200, 210, 220].entries()) {
    await wf(p, b => __t.S.running && __t.S.mode === 'practice' && __t.curBpm() === b, bpm, 15000);
    if (k === 1) ok((await p.textContent('#padMain')).includes('Bucle de tempo: 210 ppm'), 'la zona de toque dice el tempo del bucle');
    await scheduleTaps(p, [0], null);
    await wf(p, n => __t.prog.sessions.length === n && !__t.S.running, n0 + k + 1, 15000);
    const t = await p.textContent('#rRampText');
    if (k === 0) ok(t.includes('sube a 210') && await p.$eval('#rRampStop', e => !e.hidden) && !(await p.$eval('#bStop', e => e.disabled)), 'tras la pasada: «sube a 210», con «Parar el bucle» y «Detener» activo');
    if (k === 2) ok(t.includes('Tope alcanzado') && await p.$eval('#rRampStop', e => e.hidden), 'en el tope: el bucle termina · ' + t);
  }
  await p.waitForTimeout(3200);
  r = await p.evaluate(n => ({ run: __t.S.running, bpms: __t.prog.sessions.slice(n).map(s => s.bpm), set: __t.set.bpm, pend: __t.studyApi.rampT }), n0);
  ok(!r.run && !r.pend && JSON.stringify(r.bpms) === '[200,210,220]' && r.set === 220, 'pasadas a 200, 210 y 220 ppm y se detiene: ' + JSON.stringify(r));

  // bajar si no llega; Esc en la pausa detiene el bucle
  await setRhythm(p, { figs: ['q'], bars: 1, bpm: 200, ramp: true, rampPct: 90, rampStep: 10, rampMax: 240, rampDown: true });
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  await waitResults(p);   // sin tocar: termina sola con 0 %
  ok((await p.textContent('#rRampText')).includes('baja a 190'), 'sin llegar al umbral: baja a 190');
  await wf(p, () => __t.S.running && __t.curBpm() === 190, null, 8000);
  await tapAndStop(p); await waitResults(p);
  ok((await p.textContent('#rRampText')).includes('detenido') && !(await p.evaluate(() => __t.studyApi.rampT)), 'Esc durante la pasada: resultados y bucle detenido');
  await p.click('#rAgain'); await waitRunning(p, 'practice'); await waitResults(p);
  ok(await p.evaluate(() => !!__t.studyApi.rampT), 'tras otra pasada vuelve a esperar la siguiente');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(3000);
  ok(await p.evaluate(() => !__t.S.running && !__t.studyApi.rampT) && (await p.textContent('#rRampText')).includes('detenido'), 'Esc en la pausa: no empieza otra pasada');

  // el tope respeta bpmMax (2/2: 120)
  ok(await p.evaluate(() => { Object.assign(__t.set, { sig: '2/2', bpm: 115, rampStep: 10, rampMax: 240, rampDown: false }); __t.generate();
    const t = rampAfter(100, false); rampStop(); return t.includes('sube a 120'); }), 'en 2/2 el bucle no pasa de 120 (bpmMax)');
  await setRhythm(p, { ramp: false });

  // en la campaña el bucle no actúa
  await p.click('#tab-campana');
  ok(await p.evaluate(() => document.querySelector('#ramp').disabled && !document.querySelector('#rampCamp').hidden && document.querySelector('#rampOpts').hidden), 'campaña: bucle de tempo desactivado y explicado');
  await p.click('#tab-libre');
  ok(await p.evaluate(() => !document.querySelector('#ramp').disabled && document.querySelector('#rampCamp').hidden), 'práctica libre: bucle disponible');

  // 4) metrónomo que calla: suena 1 · calla 1 en 4/4 (la cuenta previa siempre suena)
  await setRhythm(p, { figs: ['q'], bars: 4, bpm: 240, gap: '1-1', metro: true, sub: '0', loop: false });
  ok(await p.evaluate(() => { const g = document.querySelector('#gap'); return g.labels.length === 1 && g.options.length === 5; }), 'selector «Compases en silencio» con su etiqueta');
  await recordClicks(p);
  await p.click('#bPlay'); await waitRunning(p, 'play');
  ok(await until(p, () => { const S = __t.S, bl = __t.score.L * S.spt, g = Math.floor((__t.heardAt() - S.t0) / bl); return g === 2 && document.querySelector('#lights').classList.contains('muted'); }, null, 6000), 'compás callado: luces huecas');
  ok(await until(p, () => { const S = __t.S, bl = __t.score.L * S.spt, g = Math.floor((__t.heardAt() - S.t0) / bl); return g === 3 && !document.querySelector('#lights').classList.contains('muted'); }, null, 6000), 'compás con clic: luces normales');
  await waitStopped(p);
  let c = await clicksPerBar(p, 5);
  ok(JSON.stringify(c) === '[4,4,0,4,0]', '4/4 suena 1 · calla 1: clics por compás ' + JSON.stringify(c));
  ok(await p.evaluate(() => !document.querySelector('#lights').classList.contains('muted')), 'al terminar, luces normales');

  // también al practicar (suena 1 · calla 3), con la cuenta entera
  await setRhythm(p, { figs: ['q'], bars: 4, bpm: 240, gap: '1-3', metro: true, sub: '6', countIn: '1' });
  await recordClicks(p);
  await p.click('#bPractice'); await waitRunning(p, 'practice'); await waitResults(p);
  c = await clicksPerBar(p, 5);
  ok(JSON.stringify(c) === '[4,8,0,0,0]', 'práctica, suena 1 · calla 3 (con subdivisión): ' + JSON.stringify(c));

  // amalgama 5/8 en bucle: suena 2 · calla 2, y el recuento sigue entre vueltas
  await setRhythm(p, { sig: '5/8', figs: ['e'], bars: 1, bpm: 240, gap: '2-2', metro: true, sub: '0', loop: true });
  await recordClicks(p);
  await p.click('#bPlay'); await waitRunning(p, 'play');
  await wf(p, () => { const S = __t.S; return __t.heardAt() > S.t0 + 6.2 * __t.score.L * S.spt; }, null, 15000);
  await p.click('#bStop');
  c = await clicksPerBar(p, 6);
  ok(JSON.stringify(c) === '[5,2,2,0,0,2]', '5/8 en bucle, suena 2 · calla 2 (solo pulsos; la cuenta con corcheas): ' + JSON.stringify(c));
  await p.evaluate(() => { __t.set.loop = false; __t.set.gap = '0'; });

  // «Solo metrónomo» también calla
  await p.evaluate(() => { Object.assign(__t.set, { sig: '4/4', bpm: 240, gap: '1-1', sub: '0' }); __t.generate(); });
  await recordClicks(p);
  await p.click('#bMetro'); await waitRunning(p, 'metro');
  const m0 = await p.evaluate(() => __t.S.t0);
  await wf(p, () => __t.S.mBar >= 4, null, 10000);
  await p.click('#bMetro');
  c = await p.evaluate(t0 => { const c = [0, 0, 0, 0]; window.__cl.forEach(x => { const g = Math.floor(x.t - t0 + 1e-6); if (g >= 0 && g < 4) c[g]++; }); return c; }, m0);
  ok(JSON.stringify(c) === '[4,0,4,0]', '«Solo metrónomo», suena 1 · calla 1: ' + JSON.stringify(c));

  // persistencia y validación del ajuste
  ok(await p.evaluate(() => { const s = cleanSettings({ gap: '9-9', rampPct: 500, rampStep: 0, rampMax: 'x', ramp: 'si' }); return s.gap === '0' && s.rampPct === 100 && s.rampStep === 1 && s.rampMax === 140 && s.ramp === false; }), 'cleanSettings valida gap y el bucle');
  ok(!p.errs.length, 'sin errores de consola: ' + p.errs.join(' | '));
  ok(!(await p.csp()).length, 'sin violaciones de CSP');
});

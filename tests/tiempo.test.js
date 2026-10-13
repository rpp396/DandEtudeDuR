// Tiempo y audio: latencia, alineación de toques, planificador, cuenta previa, volumen en vivo, subdivisión y tempo máximo
const { suite } = require('./lib');

// Registra cada fuente de audio que se arranca: {w: hora pedida, now: currentTime al pedirla, buf: es de ruido (nota de percusión)}
const recordStarts = () => {
  window.__starts = [];
  // AudioBufferSourceNode tiene su propio start
  [AudioScheduledSourceNode, AudioBufferSourceNode].forEach(C => { const st = C.prototype.start;
    C.prototype.start = function (w) { window.__starts.push({ w: w || 0, now: this.context.currentTime, buf: this instanceof AudioBufferSourceNode }); return st.apply(this, arguments); }; });
};
// Ritmo de práctica libre a medida (sin pasar por el panel)
const setRhythm = (p, o) => p.evaluate(o => { Object.assign(__t.set, { sig: '4/4', sync: false, ties: false, rests: [], ...o }); __t.generate(); }, o);

suite('Tiempo y audio', async ({ b, URL, ok, MOB, page, open, until, wf, scheduleTaps, tapAndStop, waitRunning, waitResults, waitStopped }) => {
  // 1) alineación óptima (función pura)
  let p = await page(b); await open(p, URL);
  const al = await p.evaluate(() => {
    const mk = (gap, n) => { const ns = Array.from({ length: n }, (_, j) => ({ t: 1 + j * gap })); ns.forEach(x => { x.win = Math.max(0.05, Math.min(0.18, gap / 2)); }); return ns; };
    const own = m => m.every((j, k) => j === k);
    const semi = mk(0.0625, 16), trip = mk(1 / 12, 12), semi160 = mk(60 / 160 / 4, 16);
    const r = {};
    r.semi35 = own(__t.alignTaps(semi, semi.map(n => n.t + 0.035)));
    r.trip45 = own(__t.alignTaps(trip, trip.map(n => n.t + 0.045)));
    r.semi160 = own(__t.alignTaps(semi160, semi160.map(n => n.t + 0.048)));
    // saltarse la nota 5 tocando 20 ms antes: solo esa nota queda sin toque
    const m = __t.alignTaps(semi, semi.filter((_, k) => k !== 5).map(n => n.t - 0.020));
    r.skip = m.filter(j => j < 0).length === 1 && m[5] === -1 && m.every((j, k) => k === 5 || j === (k < 5 ? k : k - 1));
    // un toque de más entre dos notas no desplaza las demás
    const q = mk(0.5, 4), m2 = __t.alignTaps(q, [1, 1.25, 1.5, 2, 2.5]);
    r.extra = JSON.stringify(m2) === '[0,2,3,4]';
    // toques humanos (desvío +10 ± 25 ms) en corcheas a 120 ppm: cada uno con su nota
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const ei = mk(0.25, 64), m3 = __t.alignTaps(ei, ei.map(n => n.t + 0.010 + (rnd() + rnd() + rnd() - 1.5) * 0.05));
    r.human = own(m3);
    // 64 compases de semicorcheas: rápido
    const big = mk(0.0625, 1024), a = performance.now(); __t.alignTaps(big, big.map(n => n.t + 0.02)); r.ms = performance.now() - a;
    return r;
  });
  ok(al.semi35, 'semicorcheas a 240 ppm, 35 ms tarde: cada toque con su nota');
  ok(al.trip45, 'tresillos a 240 ppm, 45 ms tarde: cada toque con su nota');
  ok(al.semi160, 'semicorcheas a 160 ppm, 48 ms tarde: cada toque con su nota');
  ok(al.skip, 'saltarse una nota (toques 20 ms antes): solo falla esa');
  ok(al.extra, 'un golpe de más no desplaza las notas siguientes');
  ok(al.human, 'toques con dispersión humana: cada uno con su nota');
  ok(al.ms < 1500, `alineación de 1024 notas en ${al.ms.toFixed(0)} ms`);

  // 2) de punta a punta: semicorcheas a 240 ppm tocadas 35 ms tarde
  await setRhythm(p, { figs: ['s'], bars: 2, bpm: 240 });
  ok(await p.evaluate(() => __t.score.flat.every(e => e.dur === 3 && !e.rest)), 'ritmo de semicorcheas');
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  await scheduleTaps(p, [35], null);
  await waitResults(p);
  const r240 = await p.evaluate(() => ({ pct: parseInt(document.querySelector('#rPct').textContent), miss: +document.querySelector('#cMiss').textContent, extra: +document.querySelector('#cExtra').textContent, trend: document.querySelector('#rTrend').textContent }));
  ok(r240.pct >= 90 && r240.miss === 0 && r240.extra === 0, `240 ppm +35 ms: ${r240.pct} %, ${r240.miss} fallos, ${r240.extra} de más`);
  ok(r240.trend.includes('atrasarte'), 'tendencia «atrasarte»: ' + r240.trend);

  // 3) piano: la alineación también lleva la duración
  await setRhythm(p, { figs: ['q'], bars: 1, bpm: 120 });
  await p.evaluate(() => { __t.set.hold = true; });
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  await scheduleTaps(p, [0], null); await waitResults(p);
  ok(await p.evaluate(() => !document.querySelector('#durCounts').hidden && +document.querySelector('#cExact').textContent === 4), 'modo piano: resultados con duraciones');
  await p.evaluate(() => { __t.set.hold = false; });

  // 4) detener en la cuenta previa (o sin haber tocado): sin resultados ni sesión
  const n0 = await p.evaluate(() => __t.prog.sessions.length);
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  await p.keyboard.press('Escape'); await waitStopped(p);
  ok(await p.$eval('#results', e => e.hidden) && await p.evaluate(() => __t.prog.sessions.length) === n0, 'Esc en la cuenta previa: sin resultados ni sesión');
  ok(await until(p, () => document.querySelector('#srLive').textContent.includes('sin resultados')), 'se anuncia que no hay resultados');
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  await p.click('#bStop'); await waitStopped(p);
  ok(await p.$eval('#results', e => e.hidden) && await p.evaluate(() => __t.prog.sessions.length) === n0, '«Detener» sin tocar: sin resultados ni sesión');

  // 5) «Sin cuenta»: al practicar hay igualmente un compás de cuenta; al reproducir no
  await p.selectOption('#countIn', '0');
  ok(!(await p.$eval('#countHint', e => e.hidden)), 'aviso «al practicar siempre hay cuenta»');
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  ok(await p.evaluate(() => Math.abs(__t.S.passStart - __t.S.t0 - __t.score.L * __t.S.spt) < 1e-6), 'práctica sin cuenta: un compás de cuenta');
  await p.click('#bPlay'); await waitRunning(p, 'play');
  ok(await p.evaluate(() => __t.S.passStart === __t.S.t0), 'reproducir sin cuenta: empieza enseguida');
  await p.click('#bStop'); await p.selectOption('#countIn', '1');
  ok(await p.$eval('#countHint', e => e.hidden), 'con cuenta, sin aviso');

  // 6) el filtro de la cuenta previa respeta la corrección de latencia: con +200 ms, tocar con el último clic de la cuenta no es golpe de más
  await setRhythm(p, { figs: ['q'], bars: 1, bpm: 240 });
  await p.evaluate(() => { __t.set.offset = 200; });
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  await p.waitForFunction(() => __t.heardAt() >= __t.S.passStart - __t.S.spt * 12 + 0.2);
  await p.keyboard.press('Space');
  await p.waitForTimeout(30);
  ok(await p.evaluate(() => __t.S.taps.length === 0), 'toque en el último tiempo de la cuenta (+200 ms) ignorado');
  await p.click('#bStop'); await p.evaluate(() => { __t.set.offset = 0; });

  // 7) hora del toque = la del evento, no la del manejador
  await setRhythm(p, { figs: ['q'], bars: 1, bpm: 60 });
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  await p.waitForFunction(() => __t.heardAt() >= __t.S.notes[0].t - 0.1);
  const lag = await p.evaluate(() => {
    while (__t.heardAt() < __t.S.notes[0].t);
    const e = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true });
    const end = performance.now() + 80; while (performance.now() < end); // el hilo principal tarda 80 ms en atender el toque
    document.dispatchEvent(e); return (__t.S.taps[0].t - __t.S.notes[0].t) * 1000;
  });
  ok(Math.abs(lag) < 25, `toque atendido 80 ms tarde: desvío ${lag.toFixed(1)} ms`);
  await p.click('#bStop');

  // 8) volumen en vivo
  await p.click('#bPlay'); await waitRunning(p, 'play');
  await p.evaluate(() => { const v = document.querySelector('#metroVol'); v.value = 0.2; v.dispatchEvent(new Event('input')); const r = document.querySelector('#rhythmVol'); r.value = 0.3; r.dispatchEvent(new Event('input')); });
  ok(await until(p, () => Math.abs(__t.S.mBus.gain.value - 0.2) < 0.02 && Math.abs(__t.S.rBus.gain.value - 0.3) < 0.02), 'el volumen del metrónomo y del ritmo cambia mientras suena');
  await p.click('#bStop');

  // 9) punto 1: de «Mis ejercicios» (a medias) a «Práctica libre», «Practicar» vuelve a estar activo
  await p.click('#tab-propio'); await p.click('#ownNew');
  ok(await until(p, () => document.querySelector('#bPractice').disabled), 'ejercicio vacío: «Practicar» deshabilitado');
  await p.click('#tab-libre');
  ok(await until(p, () => !document.querySelector('#bPractice').disabled), 'en Práctica libre «Practicar» está activo');
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|')); await p.context().close();

  // 10) subdivisión y tempo máximo según el compás
  p = await page(b); await p.addInitScript(recordStarts); await open(p, URL);
  await p.click('.sig[data-sig="6/8"]');
  ok(await p.evaluate(() => document.querySelector('#sub option[value="4"]').disabled), '6/8: «Tresillos» deshabilitado');
  await p.evaluate(() => { __t.set.sub = '4'; __t.set.bpm = 60; }); await p.click('.sig[data-sig="4/4"]'); await p.click('.sig[data-sig="6/8"]');
  ok(!(await p.$eval('#subHint', e => e.hidden)), '6/8 con tresillos elegidos: se explica que suenan corcheas');
  const clicksPerBar = async () => {
    await p.evaluate(() => { window.__starts = []; }); await p.click('#bMetro'); await waitRunning(p, 'metro');
    const n = await p.evaluate(() => { const t0 = __t.S.t0, bar = __t.score.L * 60 / (__t.curBpm() * __t.score.sig.click); return __starts.filter(s => s.w >= t0 - 1e-6 && s.w < t0 + bar - 1e-3).length; });
    await p.click('#bMetro'); await waitStopped(p); return n;
  };
  const c68 = await clicksPerBar();
  ok(c68 === 6, '6/8 con «Tresillos»: suenan las 6 corcheas (' + c68 + ')');
  await p.click('.sig[data-sig="4/4"]');
  ok(!(await p.evaluate(() => document.querySelector('#sub option[value="4"]').disabled)) && await p.$eval('#subHint', e => e.hidden), '4/4: «Tresillos» disponible');
  const c44 = await clicksPerBar();
  ok(c44 === 12, '4/4 con tresillos: 4 pulsos + 8 tresillos (' + c44 + ')');
  // tempo máximo: equivalente a negra = 240
  await p.evaluate(() => { __t.set.bpm = 240; }); await p.click('.sig[data-sig="6/8"]');
  ok(await p.evaluate(() => __t.curBpm() === 160 && document.querySelector('#bpmRange').max === '160'), '6/8: tempo máximo 160');
  await p.click('.sig[data-sig="2/2"]'); await p.fill('#bpm', '200'); await p.press('#bpm', 'Enter');
  ok(await p.evaluate(() => __t.curBpm() === 120 && document.querySelector('#bpm').value === '120'), '2/2: tempo máximo 120');
  await p.click('.sig[data-sig="4/4"]'); await p.fill('#bpm', '240'); await p.press('#bpm', 'Enter');
  ok(await p.evaluate(() => __t.curBpm() === 240), '4/4: hasta 240');

  // 11) planificador con margen: 64 compases de semicorcheas a 30 ppm con subdivisión
  await setRhythm(p, { figs: ['s'], bars: 64, bpm: 30, sub: '3', metro: true, timbre: 'golpe', countIn: '0' });
  await p.evaluate(() => { window.__starts = []; });
  const t = await p.evaluate(() => { const a = performance.now(); __t.start('play'); return performance.now() - a; });
  const nodes = await p.evaluate(() => __t.liveSrc.size);
  ok(nodes < 120, `64 compases: ${nodes} fuentes programadas al empezar (start ${t.toFixed(0)} ms)`);
  await p.waitForTimeout(1500);
  ok(await p.evaluate(() => __t.S.running && __t.liveSrc.size > 0 && __t.liveSrc.size < 120), 'sigue sonando con pocas fuentes vivas: ' + await p.evaluate(() => __t.liveSrc.size));
  await p.click('#bStop');
  ok(await p.evaluate(() => __t.liveSrc.size) === 0, 'al detener no queda ninguna fuente pendiente');
  // la pasada suena entera: una nota de percusión por cabeza
  await setRhythm(p, { figs: ['q', 'e'], bars: 4, bpm: 240, sub: '0', timbre: 'golpe', countIn: '0' });
  await p.evaluate(() => { window.__starts = []; });
  await p.click('#bPlay'); await waitRunning(p, 'play'); await waitStopped(p);
  const nn = await p.evaluate(() => [__starts.filter(s => s.buf).length, __t.score.flat.filter(e => !e.rest && !e.tie).length]);
  ok(nn[0] === nn[1], 'reproducir: suenan todas las notas ' + nn.join('/'));

  // 12) tras una pausa del hilo principal no suena lo atrasado de golpe
  const block = ms => p.evaluate(ms => { const end = performance.now() + ms; while (performance.now() < end); }, ms);
  const late = () => p.evaluate(() => __starts.filter(s => s.w < s.now - 0.03).length);
  await setRhythm(p, { figs: ['q'], bars: 1, bpm: 120, countIn: '1' });
  await p.evaluate(() => { window.__starts = []; }); await p.click('#bMetro'); await waitRunning(p, 'metro');
  await block(2500); await p.waitForTimeout(2200);
  ok(await late() === 0 && await p.evaluate(() => __starts.length > 4), 'metrónomo: tras 2,5 s bloqueado no se amontonan clics');
  await p.click('#bMetro'); await waitStopped(p);
  await p.evaluate(() => { __t.set.loop = true; window.__starts = []; }); await p.click('#bPlay'); await waitRunning(p, 'play');
  await block(2500); await p.waitForTimeout(600);
  ok(await late() === 0, 'reproducir en bucle: tras 2,5 s bloqueado no se amontonan sonidos');
  await p.click('#bStop'); await p.evaluate(() => { __t.set.loop = false; });
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|')); await p.context().close();

  // 13) latencia de salida leída en cada toque, no al crear el audio (cuando aún vale 0).
  // Los toques se disparan con una referencia independiente: currentTime − outputLatency del momento.
  const fireHeard = (p, list) => p.evaluate(list => {
    const c = __t.ctx, key = t => document.dispatchEvent(new KeyboardEvent(t, { code: 'Space', key: ' ', bubbles: true }));
    list.forEach(at => { const iv = setInterval(() => { if (c.currentTime - c.outputLatency >= at) { clearInterval(iv); key('keydown'); setTimeout(() => key('keyup'), 40); } }, 2); });
  }, list);
  p = await page(b); await open(p, URL);
  await setRhythm(p, { figs: ['q'], bars: 2, bpm: 120 });
  ok(await p.evaluate(() => !__t.ctx), 'el audio aún no existe');
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  await fireHeard(p, await p.evaluate(() => __t.S.notes.map(n => n.t)));
  await waitResults(p);
  const m1 = await p.evaluate(() => __t.prog.sessions.at(-1).mean);
  ok(Math.abs(m1) <= 15, `primera práctica tras abrir la página: desvío medio ${m1} ms`);
  await p.context().close();

  // la medición de latencia como primera acción no absorbe la latencia de salida
  p = await page(b); await open(p, URL);
  await p.click('#bCalib'); await waitRunning(p, 'calib');
  await fireHeard(p, await p.evaluate(() => Array.from({ length: 16 }, (_, k) => __t.S.passStart + k * __t.S.period)));
  await wf(p, () => !document.querySelector('#calib').hidden, null, 25000);
  const sug = await p.evaluate(() => __t.K.suggest);
  ok(sug != null && Math.abs(sug) <= 10, `medición como primera acción: corrección sugerida ${sug} ms`);
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|')); await p.context().close();
});

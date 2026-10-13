// «Reiniciar» (mantener pulsado 500 ms) en el botón flotante durante la práctica y la medición de latencia
const { suite } = require('./lib');

suite('Reiniciar con pulsación larga (móvil)', async ({ b, URL, ok, MOB, page, open, until, vis, waitRunning, waitResults, tapAndStop }) => {
  const center = (p, sel) => p.$eval(sel, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const passStart = p => p.evaluate(() => __t.S.passStart);
  async function press(p, sel) { const r = await center(p, sel); await p.mouse.move(r.x, r.y); await p.mouse.down(); }

  let p = await page(b, MOB); await open(p, URL);
  ok(!(await vis(p, '#fabRestart')), 'en reposo no hay «Reiniciar»');
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  await p.waitForSelector('#fabRestart', { state: 'visible' });
  ok(await vis(p, '#fabRestart') && await p.$eval('#tapFab', e => e.classList.contains('split')), 'en la práctica: «Reiniciar» + zona de toque');
  ok(await p.$eval('#bPractice', e => e.disabled), '«Practicar» deshabilitado durante la práctica');
  const hit = await p.evaluate(() => { const f = document.querySelector('#tapFab').getBoundingClientRect(), y = f.top + f.height / 2;
    const at = x => document.elementFromPoint(x, y).closest('button')?.id; return [at(f.left + f.width / 6), at(f.left + f.width * 0.4), at(f.left + f.width * 0.85)]; });
  ok(hit[0] === 'fabRestart' && hit[1] === 'tapFab' && hit[2] === 'tapFab', 'tercio izquierdo = Reiniciar, dos tercios = tocar ' + hit);

  // pulsación corta: no reinicia (se espera más de 500 ms desde que se pulsó)
  const t0 = await passStart(p);
  await press(p, '#fabRestart'); await p.waitForTimeout(200); await p.mouse.up();
  ok(!(await p.$eval('#fabRestart', e => e.classList.contains('arming'))), 'al soltar se cancela la animación');
  await p.waitForTimeout(450);
  ok(await passStart(p) === t0 && await p.evaluate(() => __t.S.running && __t.S.mode === 'practice'), 'pulsación corta no reinicia');

  // pulsación larga: la animación se arma y a los 500 ms reinicia, sin esperar a soltar
  await press(p, '#fabRestart');
  ok(await until(p, () => document.querySelector('#fabRestart').classList.contains('arming')), 'al mantener se arma la animación');
  ok(await until(p, t => __t.S.passStart !== t, t0, 5000), 'mantener medio segundo reinicia la práctica');
  await p.mouse.up();
  ok(await p.evaluate(() => __t.S.running && __t.S.mode === 'practice') && !(await vis(p, '#results')), 'el reinicio sigue en práctica y sin resultados');
  ok(await p.evaluate(() => __t.prog.sessions.length) === 0, 'el reinicio no guarda sesión');
  await tapAndStop(p); await waitResults(p);
  ok(!(await vis(p, '#fabRestart')) && !(await p.$eval('#bPractice', e => e.disabled)), 'al terminar: sin «Reiniciar» y «Practicar» habilitado');

  // medición de latencia
  await p.click('#bCalib'); await waitRunning(p, 'calib');
  await p.waitForSelector('#fabRestart', { state: 'visible' });
  ok(await vis(p, '#fabRestart') && await p.$eval('#bPractice', e => e.disabled), 'medición: «Reiniciar» visible y «Practicar» deshabilitado');
  const c0 = await passStart(p);
  await press(p, '#fabRestart');
  ok(await until(p, t => __t.S.running && __t.S.mode === 'calib' && __t.S.passStart !== t, c0, 5000), 'mantener reinicia la medición');
  await p.mouse.up();
  await p.evaluate(() => document.querySelector('#bStop').click());
  ok(await until(p, () => !__t.S.running), 'se puede detener la medición');
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|')); await p.context().close();

  // escritorio
  p = await page(b); await open(p, URL);
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  ok(!(await p.$eval('#bPractice', e => e.disabled)) && !(await vis(p, '#fabRestart')), 'escritorio: sin cambios');
});

// Botón de tres partes de después de practicar (#postFab): Repetir / Nuevo ritmo / Listo|Siguiente
const { suite } = require('./lib');

suite('Botón posterior a la práctica (móvil)', async ({ b, URL, ok, MOB, page, open, until, wf, vis, scheduleTaps, waitRunning, waitResults, settle, postReady, tapAndStop }) => {
  const dur = p => p.evaluate(() => JSON.stringify(__t.score.flat.map(e => e.dur)));
  const postVisible = p => until(p, () => !document.querySelector('#postFab').hidden);
  // Practica y termina con Esc; devuelve cuando los resultados y el botón ya se ven
  const practiceAndStop = async p => {
    // con resultados a la vista el bloque «Practicar» no está en táctil: se repite desde el botón de tres partes
    if (await vis(p, '#results')) { await postReady(p); await p.tap('#pfAgain'); } else await p.click('#bPractice');
    await waitRunning(p, 'practice'); await settle(p);
    await tapAndStop(p); await waitResults(p);
    await wf(p, () => !document.querySelector('#postFab').hidden);
  };

  let p = await page(b, MOB); await open(p, URL);
  await p.evaluate(() => { __t.set.bars = 2; __t.generate(); });
  await p.click('#bPractice'); await waitRunning(p, 'practice'); await settle(p);
  await wf(p, () => !document.querySelector('#tapFab').hidden);
  ok(await vis(p, '#tapFab') && !(await vis(p, '#postFab')), 'durante la práctica: «Toca aquí»');
  await tapAndStop(p);
  ok(await postVisible(p) && !(await vis(p, '#tapFab')), 'al terminar: botón de tres partes');
  ok(await p.textContent('#pfNextLbl') === 'Listo' && !(await p.$eval('#pfNext', e => e.disabled)), 'práctica libre: «Listo» activo');
  await postReady(p);
  // con el botón de tres partes: porcentaje y resumen por encima de él, y «Repetir»/«Nuevo ritmo» no se duplican en los resultados (táctil)
  const cover = await until(p, () => document.querySelector('.res-top').getBoundingClientRect().bottom <= document.querySelector('#postFab').getBoundingClientRect().top, null, 6000);
  ok(cover, 'el porcentaje y el resumen no quedan tapados ' + JSON.stringify(await p.evaluate(() => [Math.round(document.querySelector('.res-top').getBoundingClientRect().bottom), Math.round(document.querySelector('#postFab').getBoundingClientRect().top)])));
  ok(await p.evaluate(() => ['#rAgain', '#rNew'].every(s => getComputedStyle(document.querySelector(s)).display === 'none')), 'no se repiten «Repetir» y «Nuevo ritmo» en los resultados');

  // toque inmediato ignorado: nueva práctica y clic en cuanto aparece el botón
  await practiceAndStop(p);
  const k0 = await dur(p);
  await p.evaluate(() => document.querySelector('#pfNew').click());
  ok(await dur(p) === k0 && await vis(p, '#results'), 'toque en los primeros 700 ms ignorado');
  await postReady(p);
  await p.tap('#pfNew');
  ok(await until(p, () => document.querySelector('#results').hidden && document.querySelector('#postFab').hidden), '«Nuevo ritmo» genera otro y cierra resultados');

  await practiceAndStop(p); await postReady(p);
  await p.tap('#pfAgain');
  ok(await until(p, () => __t.S.running && __t.S.mode === 'practice'), '«Repetir» empieza la práctica');
  await tapAndStop(p); await waitResults(p); await postReady(p);
  ok(await p.$$eval('.mk,.mkx', a => a.length) > 0, 'marcas en la partitura antes de «Listo»');
  await p.tap('#pfNext');
  ok(await until(p, () => document.querySelector('#results').hidden && document.querySelector('#postFab').hidden && !document.querySelector('.mk,.mkx')), '«Listo» cierra resultados y limpia marcas');
  // pestañas
  await practiceAndStop(p);
  await p.evaluate(() => __t.setView('progreso'));
  ok(await until(p, () => document.querySelector('#postFab').hidden), 'oculto en «Mi progreso»');
  await p.evaluate(() => __t.setView('libre'));
  ok(await postVisible(p), 'vuelve al regresar a la práctica con resultados');
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|')); await p.context().close();

  // campaña
  p = await page(b, MOB);
  await p.addInitScript(() => { if (!sessionStorage.x) { sessionStorage.x = 1; localStorage.setItem('solfeo-ritmico-v1', JSON.stringify({ view: 'campana', levelId: 'L1', sv: 2, seen: true })); } });
  await open(p, URL);
  await practiceAndStop(p); await postReady(p);
  ok(await p.textContent('#pfNextLbl') === 'Siguiente' && await p.$eval('#pfNext', e => e.disabled), 'campaña sin superar: «Siguiente» apagado');
  await p.evaluate(() => document.querySelector('#pfNext').click());
  ok(await p.evaluate(() => __t.levelIdx) === 0, 'apagado no avanza');
  await p.tap('#pfAgain'); await waitRunning(p, 'practice');   // con resultados el bloque «Practicar» no está: se repite desde el botón de tres partes
  await scheduleTaps(p, [-6, 12, -20, 8, 30, -14, 4, -9], null);
  await waitResults(p); await postReady(p);
  ok(!(await p.$eval('#pfNext', e => e.disabled)) && await p.evaluate(() => { const s = x => getComputedStyle(document.querySelector(x)).backgroundColor; return s('#pfNext') === s('#pfAgain') && s('#pfNext') === s('#pfNew'); }), 'nivel superado: «Siguiente» activo y con el mismo fondo que los otros');
  await p.tap('#pfNext');
  ok(await until(p, () => __t.levelIdx === 1 && document.querySelector('#postFab').hidden), '«Siguiente» pasa al nivel 2');
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|')); await p.context().close();

  // escritorio: nunca aparece
  p = await page(b); await open(p, URL);
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  await tapAndStop(p); await waitResults(p);
  ok(!(await vis(p, '#postFab')) && !(await vis(p, '#tapFab')), 'escritorio sin botón flotante');
});

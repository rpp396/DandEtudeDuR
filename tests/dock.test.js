// Paleta fija (#ownDock) de «Mis ejercicios» en el móvil
const { suite } = require('./lib');

suite('Paleta fija de Mis ejercicios (móvil)', async ({ b, URL, ok, MOB, page, open, until, wf, settle, postReady, waitRunning, waitResults, tapAndStop }) => {
  const m = await page(b, MOB); await open(m, URL);
  const st = () => m.evaluate(() => {
    const d = document.querySelector('#ownDock'), r = d.getBoundingClientRect();
    return { on: document.body.classList.contains('dock-on'), away: document.body.classList.contains('dock-away'),
      pos: getComputedStyle(d).position, bottom: Math.round(r.bottom), h: d.offsetHeight, fab: !document.querySelector('#tapFab').hidden, post: !document.querySelector('#postFab').hidden,
      sw: document.documentElement.scrollWidth, ih: innerHeight };
  });
  const nota = () => m.evaluate(() => __t.own.cur.notation);
  const notaIs = s => until(m, s => __t.own.cur && __t.own.cur.notation === s, s);
  const tapPal = k => m.tap(`#ownPal .pal-b[data-k="${k}"]`);

  // ejercicio nuevo: la paleta queda fija abajo y no hay «Practicar» flotante
  await m.click('#tab-propio'); await m.click('#ownNew');
  await m.evaluate(() => document.activeElement.blur());
  await wf(m, () => document.body.classList.contains('dock-on') && !document.body.classList.contains('dock-away'));
  await wf(m, () => Math.round(document.querySelector('#ownDock').getBoundingClientRect().bottom) === innerHeight); // espera a que acabe la transición de entrada
  let s = await st();
  ok(s.on && !s.away && s.pos === 'fixed' && s.h > 0 && s.bottom === s.ih, 'ejercicio nuevo: paleta fija abajo ' + JSON.stringify(s));
  ok(!s.fab && s.sw <= 390, 'sin «Practicar» flotante y sin desplazamiento horizontal');

  for (const k of ['q', 'q', 'e', 'e', 'q']) await tapPal(k);
  await m.tap('#ownMods button[data-mod="dot"]'); await tapPal('h');
  ok(await notaIs('q q e e q | h.'), 'toques en la paleta: ' + await nota());
  ok((await st()).on && !(await st()).away, 'tras tocar, la paleta sigue a la vista');

  // con el foco en un campo de texto la paleta se aparta (no quedar sobre el teclado)
  await m.tap('#ownName');
  ok(await until(m, () => document.body.classList.contains('dock-away')), 'foco en el nombre: la paleta se aparta');
  await m.evaluate(() => document.activeElement.blur());
  ok(await until(m, () => !document.body.classList.contains('dock-away')), 'al quitar el foco vuelve');
  await m.tap('#ownUndo');
  ok(await notaIs('q q e e q'), 'deshacer desde la paleta: ' + await nota());
  await tapPal('h'); await tapPal('q'); await tapPal('q');
  ok(await notaIs('q q e e q | h q q') && !(await m.$eval('#ownPractice', e => e.disabled)), 'compás completo: «Practicar» de la paleta habilitado');

  // sigue fija al desplazar la página
  await m.evaluate(() => scrollTo(0, 99999)); await settle(m);
  s = await st();
  ok(s.pos === 'fixed' && s.bottom === s.ih && s.on && !s.away, 'al final de la página la paleta sigue abajo');
  await m.evaluate(() => scrollTo(0, 0)); await settle(m);

  // practicar: la paleta se aparta; con resultados también
  await m.tap('#ownPractice'); await waitRunning(m, 'practice');
  ok((await st()).away, 'practicando: la paleta se aparta');
  await tapAndStop(m); await waitResults(m);
  s = await st();
  ok(s.away && s.post, 'con resultados: paleta apartada y botón de tres partes ' + JSON.stringify({ away: s.away, post: s.post }));
  await m.evaluate(() => __t.setView('libre'));
  ok(await until(m, () => !document.body.classList.contains('dock-on')), 'en Práctica libre no hay paleta fija');

  // escritorio: no se fija
  const d = await page(b); await open(d, URL);
  await d.click('#tab-propio'); await d.click('#ownNew');
  await d.waitForSelector('#ownDock');
  const ds = await d.evaluate(() => ({ on: document.body.classList.contains('dock-on'), pos: getComputedStyle(document.querySelector('#ownDock')).position }));
  ok(!ds.on && ds.pos !== 'fixed', 'escritorio: sin paleta fija ' + JSON.stringify(ds));
  ok(m.errs.length === 0 && d.errs.length === 0, 'sin errores ' + m.errs.concat(d.errs).join('|'));
  await d.context().close(); await m.context().close();

  // la figura resaltada queda por encima de la paleta al escribir mucho (ownReveal)
  const q = await page(b, MOB); await open(q, URL);
  await q.click('#tab-propio'); await q.click('#ownNew'); await q.evaluate(() => { document.activeElement.blur(); scrollTo(0, 0); });
  for (let i = 0; i < 14; i++) await q.tap(`#ownPal .pal-b[data-k="${i % 3 ? 'e' : 'q'}"]`);
  await settle(q);
  const r = await q.evaluate(() => ({ selBottom: document.querySelector('#score .ev.sel').getBoundingClientRect().bottom, dockTop: document.querySelector('#ownDock').getBoundingClientRect().top }));
  ok(r.selBottom <= r.dockTop, 'la figura resaltada queda por encima de la paleta ' + JSON.stringify(r));
  ok(q.errs.length === 0, 'sin errores ' + q.errs.join('|')); await q.context().close();

  // aplicar texto con el teclado abierto y «Editar» tras los resultados
  const t = await page(b, MOB); await open(t, URL);
  await t.tap('#tab-propio'); await t.tap('#ownNew');
  await t.tap('#ownText'); await t.fill('#ownText', 'q q h'); await t.tap('#ownTextApply');
  ok(await until(t, () => __t.own.cur.notation === 'q q h'), 'aplicar texto con el teclado abierto: ' + await t.evaluate(() => __t.own.cur.notation));
  await t.tap('#ownPractice'); await waitRunning(t, 'practice');
  await tapAndStop(t); await waitResults(t); await postReady(t);
  ok(await t.evaluate(() => document.body.classList.contains('dock-away') && !document.querySelector('#postFab').hidden), 'resultados: paleta apartada y botón de tres partes');
  ok(await t.textContent('#pfNewLbl') === 'Editar', 'el botón central dice «Editar»');
  await t.tap('#pfNew');
  ok(await until(t, () => document.querySelector('#results').hidden && document.querySelector('#postFab').hidden && !document.body.classList.contains('dock-away') && document.body.classList.contains('dock-on')), 'tras «Editar»: sin resultados y la paleta vuelve');
  ok(t.errs.length === 0, 'sin errores ' + t.errs.join('|'));
});

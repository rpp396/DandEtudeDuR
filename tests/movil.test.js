// Experiencia en el móvil: «Detener» flotante, resultados encuadrados, textos sin teclado, acciones sin duplicar,
// avisos flotantes, ficha compacta y aviso «Ritmo nuevo» (la segunda parte está en movil-tactil.test.js).
const { suite } = require('./lib');

suite('Experiencia en el móvil', async ({ b, URL, ok, MOB, page, open, until, wf, vis, settle, postReady, scheduleTaps, waitRunning, waitResults, tapAndStop }) => {
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

  // ---------- 29: «Detener» flotante mientras suena «Reproducir» o «Solo metrónomo» ----------
  let p = await mob(MOB);
  await p.tap('#bPlay'); await waitRunning(p, 'play');
  await p.evaluate(() => scrollTo(0, 600)); await settle(p);
  let f = await p.evaluate(() => { const e = document.querySelector('#tapFab'); return { hid: e.hidden, txt: e.textContent, stop: e.classList.contains('stopb') }; });
  ok(!f.hid && f.txt.trim() === 'Detener' && f.stop, '«Reproducir»: el botón flotante dice «Detener» aunque «Detener» de la tarjeta esté fuera de pantalla ' + JSON.stringify(f));
  await p.tap('#tapFab');
  ok(await until(p, () => !__t.S.running && (document.querySelector('#tapFab').hidden || document.querySelector('#fabMain').textContent !== 'Detener')), 'tocar «Detener» flotante para la reproducción');
  await p.tap('#bMetro'); await waitRunning(p, 'metro'); await p.evaluate(() => scrollTo(0, 700));
  ok(await until(p, () => !document.querySelector('#tapFab').hidden && document.querySelector('#fabMain').textContent === 'Detener'), '«Solo metrónomo»: también «Detener» flotante');
  await p.tap('#tapFab');
  ok(await until(p, () => !__t.S.running), '…y lo para');
  // en bucle y con cuenta previa: la cuenta no pisa el texto del botón
  await p.evaluate(() => { __t.set.loop = true; __t.set.countIn = 2; });
  await p.tap('#bPlay'); await waitRunning(p, 'play');
  await p.waitForTimeout(500);
  ok(await p.textContent('#fabMain') === 'Detener', 'durante la cuenta previa de «Reproducir» el botón sigue diciendo «Detener»');
  await p.keyboard.press('Escape'); await p.evaluate(() => { __t.set.loop = false; __t.set.countIn = 1; });
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|')); await p.context().close();
  // escritorio: sin botón flotante
  p = await page(b); await open(p, URL); await p.click('#bPlay'); await waitRunning(p, 'play');
  ok(!(await vis(p, '#tapFab')), 'escritorio: sin «Detener» flotante'); await p.keyboard.press('Escape'); await p.context().close();

  // ---------- 32 y 31: «Practicar» no se duplica; textos sin teclado ----------
  p = await mob(MOB);
  const fabTxt = () => p.evaluate(() => { const e = document.querySelector('#tapFab'); return e.hidden ? '' : e.textContent.trim(); });
  await p.evaluate(() => scrollTo(0, 0)); await settle(p);
  await p.evaluate(() => document.querySelector('#bPractice').scrollIntoView({ block: 'center' })); await settle(p);
  ok(await until(p, () => document.querySelector('#tapFab').hidden), 'con «Practicar» a la vista no sale el flotante «Practicar»');
  await p.evaluate(() => scrollTo(0, scrollY + document.querySelector('#bPractice').getBoundingClientRect().top - (innerHeight - 40))); await settle(p);
  ok(await until(p, () => document.querySelector('#tapFab').textContent.trim() === 'Practicar' && !document.querySelector('#tapFab').hidden), 'con la partitura a la vista y «Practicar» no, sí sale');
  const pt = await p.evaluate(() => ({ main: document.querySelector('#padMain').textContent, sub: document.querySelector('#padSub').textContent, wel: document.querySelector('.welcome').textContent }));
  ok(!/tecla|teclado|\bEsc\b|espaciadora|atajo/i.test(pt.main + pt.sub), 'textos de la partitura sin teclado: «' + pt.main + '» / «' + pt.sub + '»');
  ok(/Practicar/.test(pt.main) && /toca/i.test(pt.sub), 'en su lugar, textos de toque');
  await p.tap('#bPractice'); await waitRunning(p, 'practice');
  await p.waitForTimeout(300);
  const live = await p.evaluate(() => document.querySelector('#srLive').textContent + '|' + document.querySelector('#padSub').textContent);
  ok(!/\bEsc\b/.test(live), 'al empezar la práctica no se habla de Esc: ' + live);
  await tapAndStop(p); await waitResults(p);
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|')); await p.context().close();
  // escritorio: sí hay ayudas de teclado
  p = await page(b); await open(p, URL);
  ok(/Con teclado/.test(await p.textContent('#padSub')), 'escritorio: sigue la ayuda de teclado'); await p.context().close();

  // Mis ejercicios: un solo «Practicar» visible con la paleta fija
  p = await mob(MOB, { view: 'propio' });
  await p.evaluate(() => document.activeElement.blur());
  await wf(p, () => document.body.classList.contains('dock-on') && !document.body.classList.contains('dock-away'));
  for (const k of ['q', 'q', 'q', 'q']) await p.tap(`#ownPal .pal-b[data-k="${k}"]`);
  await p.waitForTimeout(400);
  const vp = () => p.evaluate(() => ['#bPractice', '#ownPractice', '#tapFab'].filter(s => { const e = document.querySelector(s), r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return !e.hidden && cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && /Practicar/.test(e.textContent) && r.bottom > 0 && r.top < innerHeight; }));
  const vv = await vp();
  ok(vv.length === 1 && vv[0] === '#ownPractice', 'Mis ejercicios: un solo «Practicar» visible (' + vv.join(',') + ')');
  const own = await p.evaluate(() => ({ main: document.querySelector('#padMain').textContent, sub: document.querySelector('#padSub').textContent }));
  ok(!/teclado|Retroceso|flechas/i.test(own.main + own.sub) && /paleta/.test(own.sub), 'Mis ejercicios: texto de toque, no de teclado: ' + own.sub);

  // ---------- 12: «Editar» tras los resultados (Mis ejercicios) ----------
  await p.tap('#ownPractice'); await waitRunning(p, 'practice'); await tapAndStop(p); await waitResults(p); await postReady(p);
  const ic = await p.evaluate(() => { const v = s => { const e = document.querySelector(s); return e.getBoundingClientRect().width > 0; }; return { edit: v('#pfNew .ic-edit'), nuevo: v('#pfNew .ic-new') }; });
  ok(ic.edit && !ic.nuevo && await p.textContent('#pfNewLbl') === 'Editar', '«Editar»: icono de lápiz, no el de barajar ' + JSON.stringify(ic));
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.practice')).display === 'none'), 'con resultados no hay bloque Practicar / Medir latencia');
  await p.evaluate(() => { window.__sc = __t.score; window.__n = __t.own.cur.notation; });
  await p.tap('#pfNew');
  ok(await until(p, () => document.querySelector('#results').hidden && document.querySelector('#postFab').hidden && !document.body.classList.contains('dock-away')), '«Editar»: una sola acción, cierra resultados y vuelve la paleta');
  await settle(p);
  const sc = await p.evaluate(() => ({ same: __t.score === window.__sc && __t.own.cur.notation === window.__n, top: document.querySelector('.score-card').getBoundingClientRect().top, y: scrollY, secOwn: document.querySelector('#secOwn').getBoundingClientRect().top }));
  ok(sc.same, 'no regenera el ejercicio (sin generate)');
  ok(sc.top >= -2 && sc.top < 80, 'lleva a la partitura, no a la lista de ejercicios: top ' + Math.round(sc.top));
  // en Práctica libre sigue siendo «Nuevo ritmo» con el icono de barajar
  await p.evaluate(() => __t.setView('libre')); await p.tap('#bPractice'); await waitRunning(p, 'practice'); await tapAndStop(p); await waitResults(p); await postReady(p);
  ok(await p.textContent('#pfNewLbl') === 'Nuevo ritmo' && await p.evaluate(() => document.querySelector('#pfNew .ic-new').getBoundingClientRect().width > 0 && document.querySelector('#pfNew .ic-edit').getBoundingClientRect().width === 0), 'Práctica libre: «Nuevo ritmo» con su icono');
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|')); await p.context().close();

  // ---------- 30: resultados pegados a la partitura y encuadrados (390x844, 360x640, 844x390) ----------
  for (const [name, o] of [['390x844', MOB], ['360x640', SM], ['844x390', LAND]]) {
    p = await mob(o);
    await playAll(p); await postReady(p); await settle(p);
    const r = await p.evaluate(() => { const g = s => document.querySelector(s).getBoundingClientRect(), pf = g('#postFab');
      return { pctT: g('#rPct').top, pctB: g('#rPct').bottom, headB: g('.res-top').bottom, pf: pf.top, card: g('.score-card').bottom, res: g('#results').top, ih: innerHeight,
        practice: getComputedStyle(document.querySelector('.practice')).display, again: getComputedStyle(document.querySelector('#rAgain')).display, rnew: getComputedStyle(document.querySelector('#rNew')).display,
        acts: getComputedStyle(document.querySelector('#resActions')).display, more: document.querySelector('#aMore').open, anal: !document.querySelector('#rAnal').hidden }; });
    ok(r.pctT >= 0 && r.headB <= r.pf, `${name}: porcentaje y resumen por encima del botón de tres partes (pct ${Math.round(r.pctT)}-${Math.round(r.headB)}, botón ${Math.round(r.pf)})`);
    ok(r.res - r.card < 40 && r.practice === 'none', `${name}: resultados pegados a la partitura (hueco ${Math.round(r.res - r.card)} px) y sin bloque Practicar`);
    ok(r.again === 'none' && r.rnew === 'none', `${name}: no se repiten «Repetir» y «Nuevo ritmo» con el botón de tres partes`);
    ok(r.anal && !r.more, `${name}: análisis de toques plegado en táctil`);
    ok(await overflow(p) <= 0, `${name}: sin desplazamiento horizontal`);
    if (name === '390x844') {
      await p.tap('#aMore summary'); ok(await p.$eval('#aMore', e => e.open) && await vis(p, '#aSd'), 'el detalle se abre al tocar');
      await p.tap('#pfNext'); ok(await until(p, () => document.querySelector('#results').hidden && getComputedStyle(document.querySelector('.practice')).display !== 'none'), '«Listo» devuelve el bloque Practicar');
    }
    ok(p.errs.length === 0, `${name}: sin errores ` + p.errs.join('|')); await p.context().close();
  }
  // sin el botón flotante (ajuste apagado) los botones de los resultados sí se ven
  p = await mob(MOB, { fab: false });
  await playAll(p);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('#rAgain')).display !== 'none' && document.querySelector('#postFab').hidden), 'sin botón flotante: «Repetir práctica» sigue en los resultados');
  await p.context().close();
  // campaña: estrellas y mensaje por encima del botón de tres partes, también en pantallas bajas
  for (const [name, o] of [['390x844', MOB], ['360x640', SM], ['844x390', LAND]]) {
    p = await mob(o, { view: 'campana', levelId: 'L1' });
    await playAll(p); await postReady(p); await settle(p);
    const c = await p.evaluate(() => { const g = s => document.querySelector(s).getBoundingClientRect(); return { camp: !document.querySelector('#rCamp').hidden, pctT: g('#rPct').top, cb: g('#rCamp').bottom, pf: g('#postFab').top, next: getComputedStyle(document.querySelector('#rcNext')).display }; });
    ok(c.camp && c.pctT >= 0 && c.cb <= c.pf, `campaña ${name}: porcentaje y estrellas a la vista (${Math.round(c.pctT)}…${Math.round(c.cb)} < ${Math.round(c.pf)})`);
    ok(c.next === 'none', `campaña ${name}: «Siguiente nivel» solo en el botón de tres partes`);
    await p.context().close();
  }

  // ---------- 36: ficha del nivel compacta y botón flotante más bajo en pantallas bajas ----------
  p = await mob(MOB, { view: 'campana', levelId: 'L4' }, { levels: { L1: { best: 90, stars: 2, tries: 1 }, L2: { best: 80, stars: 1, tries: 1 }, L3: { best: 80, stars: 1, tries: 1 } }, sessions: [] });
  const lb = await rect(p, '#levelBar'), sc4 = await rect(p, '.score-card');
  ok(lb.h < 400, 'campaña en 390 px: ficha del nivel compacta (' + Math.round(lb.h) + ' px)');
  ok(await p.evaluate(() => ['#lvPrev', '#lvNext'].every(s => document.querySelector(s).getBoundingClientRect().height >= 43.5)), 'los botones de nivel siguen midiendo 44 px');
  ok(sc4.t < 760, 'la partitura empieza más arriba (' + Math.round(sc4.t) + ' px)');
  const fh = async (pp) => { await pp.tap('#bPractice'); await waitRunning(pp, 'practice'); await pp.waitForFunction(() => !document.querySelector('#tapFab').hidden); return pp.evaluate(() => ({ fab: document.querySelector('#tapFab').getBoundingClientRect().height, rs: document.querySelector('#fabRestart').getBoundingClientRect().height })); };
  let h = await fh(p);
  ok(h.fab === 96 && h.rs === 96, 'pantalla alta (844): botón flotante de 96 px'); await p.context().close();
  for (const [name, o] of [['360x640', SM], ['844x390', LAND]]) {
    p = await mob(o); h = await fh(p);
    ok(h.fab === 72 && h.rs === 72, `pantalla baja (${name}): botón flotante de 72 px`);
    await tapAndStop(p); await waitResults(p); await postReady(p);
    ok(await p.$eval('#postFab', e => e.getBoundingClientRect().height) === 72, `pantalla baja (${name}): botón de tres partes de 72 px`);
    await p.context().close();
  }

  // ---------- 13: resultado de «Medir latencia» a la vista ----------
  p = await mob(MOB);
  await p.evaluate(() => { startCalib(); S.taps = []; for (let k = 2; k < 16; k++) S.taps.push({ k, err: 30 + (k % 3) * 4 }); finishCalib(); });
  await settle(p);
  const cb = await p.evaluate(() => { const r = document.querySelector('#calib').getBoundingClientRect(); return { t: r.top, b: r.bottom, ih: innerHeight, vis: !document.querySelector('#calib').hidden }; });
  ok(cb.vis && cb.t >= 0 && cb.b <= cb.ih, 'medir latencia: el resultado queda a la vista ' + JSON.stringify({ t: Math.round(cb.t), b: Math.round(cb.b) }));
  ok(await p.$eval('#kVal', e => e.textContent) === '+35 ms', 'corrección sugerida +35 ms');
  await p.context().close();

  // ---------- 34: avisos de Mis ejercicios como toast ----------
  p = await mob(MOB, { view: 'propio' });
  await p.evaluate(() => document.activeElement.blur());
  await p.evaluate(() => scrollTo(0, 99999)); await settle(p);
  await p.evaluate(() => ownMsg('Enlace copiado (123 caracteres).')); await p.waitForTimeout(300);
  const tm = await p.evaluate(() => { const m = document.querySelector('#ownMsg'), r = m.getBoundingClientRect(), d = document.querySelector('#ownDock').getBoundingClientRect(), cs = getComputedStyle(m);
    return { pos: cs.position, live: m.getAttribute('aria-live'), role: m.getAttribute('role'), t: r.top, b: r.bottom, dock: d.top, ih: innerHeight, vis: !m.hidden && r.width > 0, parent: m.parentElement.tagName }; });
  ok(tm.vis && tm.pos === 'fixed' && tm.t >= 0 && tm.b <= tm.dock + 1, 'toast fijo y visible aunque la lista esté lejos, por encima de la paleta ' + JSON.stringify(tm));
  ok(tm.live === 'polite' && tm.role === 'status', 'toast con aria-live (role=status)');
  ok(await until(p, () => document.querySelector('#ownMsg').hidden, null, 9000), 'el toast desaparece solo');
  await p.evaluate(() => ownMsg('Algo falló', true)); await p.waitForTimeout(200);
  ok(await p.evaluate(() => { const m = document.querySelector('#ownMsg'); return !m.hidden && m.classList.contains('bad') && getComputedStyle(m).backgroundColor !== getComputedStyle(document.querySelector('#newToast')).backgroundColor; }), 'los errores se ven distintos');
  await p.tap('#ownMsg');
  ok(await until(p, () => document.querySelector('#ownMsg').hidden), 'tocar el toast lo quita');
  await p.evaluate(() => ownMsg('Otra cosa')); await p.evaluate(() => __t.setView('libre'));
  ok(await p.$eval('#ownMsg', e => e.hidden), 'al cambiar de pestaña el toast se quita');
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|')); await p.context().close();

  // ---------- 37: «Ritmo nuevo · Ver ↑» ----------
  p = await mob(MOB);
  await p.evaluate(() => scrollTo(0, 0)); await settle(p);
  await p.evaluate(() => document.querySelector('#figs .fig[aria-pressed="false"]').click());
  ok(await p.$eval('#newToast', e => e.hidden), 'con la partitura a la vista no hay aviso');
  await p.evaluate(() => document.querySelector('#figs').scrollIntoView({ block: 'center' })); await settle(p);
  const seq0 = await p.evaluate(() => JSON.stringify(__t.score.flat.map(e => e.dur)));
  await p.evaluate(() => document.querySelector('#figs .fig[aria-pressed="false"]').click());
  ok(await until(p, () => !document.querySelector('#newToast').hidden), 'al cambiar opciones con la partitura fuera de vista sale «Ritmo nuevo · Ver ↑»');
  ok((await p.textContent('#newToast')).includes('Ritmo nuevo') && await p.$eval('#newToast', e => e.getBoundingClientRect().height >= 43.5), 'texto y tamaño táctil');
  await p.tap('#newToast');
  await settle(p);
  const nt = await p.evaluate(() => ({ hid: document.querySelector('#newToast').hidden, top: document.querySelector('.score-card').getBoundingClientRect().top }));
  ok(nt.hid && nt.top >= -2 && nt.top < 40, 'al tocarlo lleva a la partitura y se quita (top ' + Math.round(nt.top) + ')');
  await p.evaluate(() => document.querySelector('#sigs .sig:not([aria-pressed="true"])').scrollIntoView({ block: 'center' })); await settle(p);
  await p.evaluate(() => document.querySelector('#sigs .sig:not([aria-pressed="true"])').click());
  ok(await until(p, () => !document.querySelector('#newToast').hidden), 'cambiar de compás también avisa');
  ok(await until(p, () => document.querySelector('#newToast').hidden, null, 8000), 'se quita solo');
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|')); await p.context().close();
  // escritorio: la partitura siempre a la vista, sin aviso
  p = await page(b); await open(p, URL);
  await p.click('#figs .fig[aria-pressed="false"]');
  ok(await p.$eval('#newToast', e => e.hidden), 'escritorio: sin aviso'); await p.context().close();

});

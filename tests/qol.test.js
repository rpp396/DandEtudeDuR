// Teclado, accesibilidad, bienvenida, compás más flojo, paneles plegables, restablecer, avisos y móvil
const { suite } = require('./lib');

suite('Teclado, accesibilidad y ajustes', async ({ b, URL, ok, MOB, page, open, until, wf, vis, waitRunning, waitStopped, waitResults, tapAndStop }) => {
  let p = await page(b, { welcome: true });
  await open(p, URL);
  const focusIs = (q, id) => until(q, id => document.activeElement && document.activeElement.id === id, id);
  ok(await p.isVisible('#welcome'), 'bienvenida visible al primer uso');
  ok(await p.$eval('#tab-campana', e => e.tabIndex) === -1 && await p.$eval('#tab-libre', e => e.tabIndex) === 0, 'tabindex itinerante en pestañas');
  ok(await p.$eval('details.fold', e => e.open), 'paneles abiertos en pantalla ancha');

  // P empieza, Esc termina
  await p.keyboard.press('p'); await waitRunning(p, 'practice');
  ok(await p.evaluate(() => __t.S.running && __t.S.mode === 'practice'), 'P empieza la práctica');
  await tapAndStop(p); await waitResults(p);
  ok(await p.isVisible('#results'), 'Esc termina y muestra resultados');
  ok(await focusIs(p, 'results'), 'foco en los resultados');
  ok(await until(p, () => document.querySelector('#srLive').textContent.startsWith('Resultado:')), 'anuncio aria-live del resultado: ' + (await p.textContent('#srLive')).slice(0, 80));
  ok(!(await p.isVisible('#welcome')) && await p.evaluate(() => __t.set.seen), 'bienvenida cerrada tras la primera práctica');
  ok(await p.isVisible('#rWeak'), 'compás más flojo: ' + await p.textContent('#rWeakText'));

  // practicar el compás suelto
  await p.click('#rWeakBtn'); await waitRunning(p, 'practice');
  ok(await p.evaluate(() => __t.S.mode === 'practice' && __t.score.bars === 1 && __t.score.part === 1), 'practica solo el compás 1');
  ok(await p.isVisible('#bFull') && (await p.textContent('#notice')).includes('solo el compás 1'), 'botón «Ritmo completo» y aviso');
  await tapAndStop(p); await waitResults(p);
  ok(!(await p.isVisible('#rWeak')), 'sin compás flojo en un solo compás');
  ok(await p.evaluate(() => __t.prog.sessions.at(-1).part === true && __t.prog.sessions.at(-1).bars === 1), 'sesión guardada con part');
  await p.click('#bFull');
  ok(await until(p, () => __t.score.bars === 4 && !__t.score.part) && !(await p.isVisible('#bFull')), 'vuelve al ritmo completo');

  // R reproduce, Esc detiene
  await p.click('body', { position: { x: 5, y: 5 } });
  await p.keyboard.press('r'); await waitRunning(p, 'play');
  ok(await p.evaluate(() => __t.S.running && __t.S.mode === 'play'), 'R reproduce');
  await p.keyboard.press('Escape'); await waitStopped(p);
  ok(await p.evaluate(() => !__t.S.running), 'Esc detiene la reproducción');

  // Espacio sobre la partitura en reposo empieza
  await p.focus('#pad'); await p.keyboard.press('Space');
  ok(await until(p, () => __t.S.mode === 'practice' && __t.S.running), 'Espacio sobre la partitura empieza la práctica');
  await tapAndStop(p); await waitResults(p);

  // pestañas con flechas
  await p.focus('#tab-libre'); await p.keyboard.press('ArrowRight');
  ok(await until(p, () => document.querySelector('#tab-campana').getAttribute('aria-selected') === 'true' && document.activeElement.id === 'tab-campana'), 'flecha derecha → Campaña');
  ok(await p.isVisible('#tLock') && await p.$eval('#bpm', e => e.disabled), 'tempo fijado por el nivel');
  await p.keyboard.press('End');
  await p.waitForSelector('#progView', { state: 'visible' });
  ok(await p.isVisible('#progView'), 'End → Mi progreso');
  ok((await p.textContent('#pTable')).includes('un compás'), 'historial marca «un compás»');
  await p.keyboard.press('n');
  ok(p.errs.length === 0, 'N en progreso no rompe nada');
  await p.click('#pClear'); ok(await focusIs(p, 'pClearNo'), 'foco en Cancelar al pedir confirmación');
  await p.click('#pClearNo'); ok(await focusIs(p, 'pClear'), 'foco de vuelta en Borrar historial');
  await p.keyboard.press('Home'); // el foco está en pClear, no en las pestañas: no hace nada
  await p.click('#tab-libre');
  await p.waitForSelector('#progView', { state: 'hidden' });

  // paneles plegables recordados
  await p.click('details[data-fold=metro] summary');
  ok(await until(p, () => __t.set.folds.metro === false), 'se recuerda el panel cerrado');
  await p.reload(); await p.waitForFunction(() => window.__t && document.readyState === 'complete');
  ok(!(await p.$eval('details[data-fold=metro]', e => e.open)) && await p.$eval('details[data-fold=repro]', e => e.open), 'tras recargar sigue cerrado');
  ok(!(await p.isVisible('#welcome')), 'la bienvenida no vuelve');

  // restablecer
  await p.click('#barsUp'); await p.evaluate(() => { __t.set.offset = 35; });
  await p.click('#resetSet'); ok(await focusIs(p, 'resetNo'), 'foco en Cancelar al restablecer');
  await p.click('#resetYes');
  ok(await until(p, () => __t.set.bars === 4 && __t.set.offset === 35 && __t.set.seen && __t.score.bars === 4), 'restablece opciones y conserva latencia');
  ok(await p.$eval('details[data-fold=metro]', e => e.open), 'paneles vuelven a su estado inicial');
  ok(p.errs.length === 0, 'sin errores de consola: ' + p.errs.join(' | '));
  await p.context().close();

  // fallo de almacenamiento
  p = await page(b);
  await p.addInitScript(() => { Storage.prototype.setItem = function () { throw new Error('QuotaExceeded'); }; });
  await open(p, URL);
  await p.click('#barsUp');
  ok(await until(p, () => !document.querySelector('#appWarn').hidden), 'aviso si no se puede guardar: ' + (await p.textContent('#appWarn')).slice(0, 50));
  await p.context().close();

  // sin audio
  p = await page(b);
  await p.addInitScript(() => { delete window.AudioContext; delete window.webkitAudioContext; });
  await open(p, URL);
  await p.click('#bPlay');
  ok(await until(p, () => !document.querySelector('#appWarn').hidden && document.querySelector('#appWarn').textContent.includes('audio')) && p.errs.length === 0, 'aviso sin audio y sin errores: ' + p.errs.join('|'));
  await p.context().close();

  // móvil
  p = await page(b, MOB);
  await open(p, URL);
  ok(await p.$eval('#bpmUp', e => e.getBoundingClientRect().width) === 44, 'botones .step de 44 px en táctil');
  ok(!(await p.$eval('details.fold', e => e.open)), 'paneles plegados en móvil');
  ok(!(await p.$eval('#vibrateRow', e => e.hidden)), 'opción de vibrar visible en táctil');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'sin desplazamiento horizontal');
  await p.evaluate(() => { __t.setView('campana'); });
  await p.waitForSelector('#tLock', { state: 'visible' });
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'campaña sin desplazamiento horizontal');
  ok(p.errs.length === 0, 'móvil sin errores: ' + p.errs.join(' | '));
});

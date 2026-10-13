// «Mis ejercicios»: notación, editor, práctica, exportar/importar, enlaces, persistencia y móvil
const fs = require('fs');
const path = require('path');
const { suite } = require('./lib');

suite('Mis ejercicios', async ({ b, URL, ok, tmp, MOB, page, open, until, wf, scheduleTaps, waitRunning, waitResults }) => {
  const p = await page(b, { permissions: ['clipboard-read', 'clipboard-write'] });
  await open(p, URL);
  const nota = q => q.evaluate(() => __t.own.cur.notation);
  const notaIs = (q, s) => until(q, s => __t.own.cur && __t.own.cur.notation === s, s);
  const msgHas = (q, s) => until(q, s => document.querySelector('#ownMsg').textContent.includes(s), s);

  // 1) notación: ida y vuelta, partición con ligaduras y errores
  const n = await p.evaluate(() => {
    const A = __t.ownApi, ex = { sig: '3/4', grp: null }, ex44 = { sig: '4/4', grp: null }, ex78 = { sig: '7/8', grp: '2+2+3' };
    const rt = (t, e) => A.serialize(A.parseNotation(t, e), e);
    const err = (t, e) => { try { A.parseNotation(t, e); return null; } catch (x) { return x.message; } };
    return {
      rt1: rt('q e~ e q | h. | rq q. e', ex),
      cross2: rt('h e q q', ex),   // la 1.ª q empieza en la posición 30 → e~ | e
      rest: rt('h rh', ex),        // silencio que cruza → rq | rq
      trip: rt('t t q q', ex44),
      bars: rt('q q q q | h h', ex44),
      e1: err('q q q | q q', ex44), e2: err('w.', ex44), e3: err('rh.', ex44), e4: err('x', ex44), e5: err('rq~', ex44),
      e6: err('t', ex78), e7: err('e t', ex44), tieRest: rt('h~ rq q', ex44), tieTrip: rt('h~ t q', ex44)
    };
  });
  ok(n.rt1 === 'q e~ e q | h. | rq q. e', 'ida y vuelta de la notación');
  ok(n.cross2 === 'h e e~ | e q', 'una nota que cruza la barra se parte con ligadura');
  ok(n.rest === 'h rq | rq', 'un silencio que cruza la barra se parte en silencios');
  ok(n.tieRest === 'h rq q' && n.tieTrip === 'h t q', 'una ligadura hacia un silencio o un tresillo se quita');
  ok(n.trip === 't t q q' && n.bars === 'q q q q | h h', 'tresillos y barras');
  ok(n.e1 && n.e1.includes('compás 1') && n.e2 && n.e3 && n.e4 && n.e5 && n.e6 && n.e7, 'errores con mensaje: ' + [n.e1, n.e2, n.e3, n.e6, n.e7].join(' / '));

  // 2) editor con el teclado y la paleta
  await p.click('#tab-propio');
  await p.waitForSelector('#secOwn', { state: 'visible' });
  ok(await p.isVisible('#secOwn') && !(await p.isVisible('#secSig')) && !(await p.isVisible('#bNew')), 'pestaña «Mis ejercicios»: panel propio, sin «Nuevo ritmo»');
  await p.click('#ownNew');
  await p.waitForFunction(() => document.activeElement && document.activeElement.id === 'ownName');
  await p.keyboard.type('Mi primer ejercicio'); await p.keyboard.press('Tab');
  await p.evaluate(() => document.activeElement.blur());
  for (const k of ['4', '4', '8', '8', '4']) await p.keyboard.press(k);
  ok(await notaIs(p, 'q q e e q') && !(await p.$eval('#bPractice', e => e.disabled)), 'teclas 4 4 8 8 4 → q q e e q (compás completo: se puede practicar)');
  await p.keyboard.press('s'); await p.keyboard.press('4');
  ok(await notaIs(p, 'q q e e q | rq') && await p.$eval('#bPractice', e => e.disabled) && (await p.textContent('#ownStatus')).includes('faltan'), 'S + 4 = silencio de negra; compás a medias: «Practicar» deshabilitado y aviso');
  await p.keyboard.press('.'); await p.keyboard.press('2');
  ok(await notaIs(p, 'q q e e q | rq h.'), 'puntillo con «.»');
  await p.keyboard.press('4');
  await p.click('#score .ev[data-i="1"]');
  ok(await until(p, () => __t.own.cursor === 2 && document.querySelector('#score .ev[data-i="1"]').classList.contains('sel')), 'clic en una figura la selecciona');
  await p.keyboard.press('8');
  ok(await notaIs(p, 'q q e e e e~ | e rq e~ h~ | e q'), 'insertar en medio reparte los compases con ligaduras según el pulso (' + await nota(p) + ')');
  await p.keyboard.press('Control+z');
  ok(await notaIs(p, 'q q e e q | rq h. | q'), 'Ctrl+Z deshace');
  await p.keyboard.press('Control+y');
  ok(await notaIs(p, 'q q e e e e~ | e rq e~ h~ | e q'), 'Ctrl+Y rehace');
  await p.keyboard.press('Control+z');
  await p.evaluate(() => { __t.own.cursor = __t.own.toks.length; });
  await p.keyboard.press('Backspace');
  ok(await notaIs(p, 'q q e e q | rq h.'), 'Retroceso borra la última figura');
  // ligadura y tresillo desde la paleta
  await p.click('#ownMods [data-mod="tie"]'); await p.click('#ownPal [data-k="h"]'); await p.click('#ownPal [data-k="q"]');
  await p.click('#ownPal [data-k="t"]');
  ok(await notaIs(p, 'q q e e q | rq h. | h~ q t'), 'ligadura y tresillo con la paleta (' + await nota(p) + ')');
  ok(await p.evaluate(() => { const f = __t.score.flat; return f.some(e => e.tie) && f.filter(e => e.tuplet).length === 3; }), 'la partitura dibuja la ligadura y el tresillo');
  // cambio de compás con tresillos: se rechaza
  await p.selectOption('#ownSig', '6/8');
  ok(await msgHas(p, 'tresillos') && await p.evaluate(() => __t.own.cur.sig) === '4/4', 'pasar a 6/8 con tresillos se rechaza con aviso');
  // texto
  await p.fill('#ownText', 'q q h | w'); await p.click('#ownTextApply');
  ok(await notaIs(p, 'q q h | w'), '«Aplicar texto»');
  await p.fill('#ownText', 'q q q | w'); await p.click('#ownTextApply');
  ok(await msgHas(p, 'compás 1'), 'texto con un compás mal sumado: aviso concreto');
  // tempo propio
  await p.fill('#bpm', '92'); await p.press('#bpm', 'Enter');
  ok(await until(p, () => __t.own.cur.bpm === 92 && __t.set.bpm !== 92), 'el tempo se guarda en el ejercicio');

  // 3) practicar el ejercicio y registro en «Mi progreso»
  await p.evaluate(() => document.activeElement.blur());
  await p.fill('#ownName', '<img src=x onerror="window.__xss=1">'); await p.press('#ownName', 'Tab');
  await p.click('#bPractice');
  await waitRunning(p, 'practice');
  await scheduleTaps(p, [-8, 12, -15, 6], null);
  await waitResults(p);
  await wf(p, () => __t.prog.sessions.length > 0);
  const ses = await p.evaluate(() => __t.prog.sessions.at(-1));
  ok(ses.mode === 'propio' && ses.ex === await p.evaluate(() => __t.own.cur.id) && ses.pct >= 90, `práctica guardada como «propio» (${ses.pct}%)`);
  await p.click('#tab-progreso'); await p.click('#pFilter [data-f="propio"]');
  await wf(p, () => document.querySelector('#pTable').textContent.includes('<img src=x'));
  ok((await p.textContent('#pTable')).includes('<img src=x') && !(await p.evaluate(() => window.__xss)), 'el nombre se muestra como texto, sin ejecutar HTML');
  await p.click('#tab-propio');
  ok(await until(p, () => document.querySelector('#ownList').textContent.includes('mejor')), 'la lista muestra el mejor resultado');

  // 4) exportar e importar
  await p.fill('#ownName', 'Síncopa «1»'); await p.press('#ownName', 'Tab');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#ownDl')]);
  const jsonPath = path.join(tmp(), 'ej.json'); await dl.saveAs(jsonPath);
  const js = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  ok(dl.suggestedFilename() === 'sincopa-1.json' && js.formato === 'solfeo-ritmico-ejercicios' && js.ejercicios[0].notacion === 'q q h | w', 'descarga .json (' + dl.suggestedFilename() + ')');
  await p.click('#ownCopyText');
  await wf(p, () => navigator.clipboard.readText().then(t => t.includes('Síncopa')));
  const txt = await p.evaluate(() => navigator.clipboard.readText());
  ok(txt === 'Síncopa «1»\n4/4 · 92 ppm\nq q h | w', 'copiar texto: ' + JSON.stringify(txt));
  await p.click('#ownCopyLink');
  await wf(p, () => navigator.clipboard.readText().then(t => /#ej=/.test(t)));
  const link = await p.evaluate(() => navigator.clipboard.readText());
  ok(/#ej=[A-Za-z0-9_-]+$/.test(link), `copiar enlace (${link.length} caracteres): …${link.slice(-40)}`);
  const count0 = await p.evaluate(() => __t.own.list.length);
  await p.click('#ownImpBtn'); await p.fill('#ownImpText', txt); await p.click('#ownImpGo');
  ok(await until(p, c => __t.own.list.length === c + 1 && __t.own.cur.name === 'Síncopa «1» (2)', count0), 'importar texto pegado (nombre repetido → «(2)»)');
  await p.click('#ownImpBtn'); await p.setInputFiles('#ownImpFile', jsonPath);
  ok(await until(p, c => __t.own.list.length === c + 2, count0), 'importar archivo .json');
  await p.click('#ownImpBtn'); await p.fill('#ownImpText', '{"formato":"otra-cosa"}'); await p.click('#ownImpGo');
  ok(await msgHas(p, 'no es una exportación'), 'archivo ajeno: aviso');
  await p.fill('#ownImpText', '{"formato":"solfeo-ritmico-ejercicios","version":1,"ejercicios":[{"nombre":"Malo","compas":"4/4","tempo":80,"notacion":"q q q | q"}]}'); await p.click('#ownImpGo');
  ok(await msgHas(p, 'Ejercicio 1') && await p.evaluate(() => __t.own.list.length) === count0 + 2, 'ejercicio con error: aviso y no se importa nada');
  await p.click('#ownImpCancel');

  // 5) abrir el enlace en otra pestaña (otro usuario)
  const p2 = await page(b);
  await open(p2, URL, '#' + link.split('#')[1]);
  ok(await until(p2, () => location.hash === '' && __t.own.cur && __t.own.cur.notation === 'q q h | w' && __t.own.cur.bpm === 92) && await p2.isVisible('#secOwn'), 'el enlace abre el ejercicio y lo guarda');
  ok(await msgHas(p2, 'recibido por enlace'), 'aviso «recibido por enlace»');
  await p2.reload(); await p2.waitForFunction(() => window.__t && document.readyState === 'complete');
  ok(await p2.evaluate(() => __t.own.list.length) === 1, 'al recargar no se duplica ' + JSON.stringify(await p2.evaluate(() => __t.own.list.map(x => [x.name, x.notation]))));
  await p2.goto(URL + '#ej=AAAA');
  await p2.waitForFunction(() => window.__t && document.readyState === 'complete');
  ok(await msgHas(p2, 'no es válido'), 'enlace dañado: aviso');
  ok(p2.errs.length === 0, 'segunda pestaña sin errores ' + p2.errs.join('|')); await p2.context().close();

  // 6) longitud de enlace
  await p.fill('#ownText', Array.from({ length: 60 }, () => Array(16).fill('s').join(' ')).join(' | ')); await p.click('#ownTextApply'); await p.click('#ownCopyLink');
  ok(await msgHas(p, 'demasiado largo para un enlace'), 'ejercicio muy largo: el enlace se rechaza y propone .json o texto');

  // 7) «Editar» desde Práctica libre
  await p.click('#tab-libre');
  await p.evaluate(() => { Object.assign(__t.set, { sig: '4/4', figs: ['h', 'q', 'e', 's', 't'], rests: ['q', 'e'], ties: true, sync: true, bars: 4 }); for (let i = 0; i < 50; i++) { __t.generate(); if (__t.score.flat.some(e => e.tie) && __t.score.flat.some(e => e.tuplet)) break; } });
  const orig = await p.evaluate(() => __t.score.flat.map(e => [e.dur, e.rest, !!e.tie, e.tuplet]));
  await p.click('#bEditThis');
  await wf(p, () => document.querySelector('#tab-propio').getAttribute('aria-selected') === 'true');
  const copy = await p.evaluate(() => __t.score.flat.map(e => [e.dur, e.rest, !!e.tie, e.tuplet]));
  ok(JSON.stringify(orig) === JSON.stringify(copy), '«Editar» copia el ritmo tal cual a Mis ejercicios');

  // 8) borrar, duplicar y persistencia
  const c1 = await p.evaluate(() => __t.own.list.length);
  await p.click('#ownDup');
  ok(await until(p, c => __t.own.list.length === c + 1 && __t.own.cur.name.endsWith('(copia)'), c1), 'duplicar');
  await p.click('#ownDel'); await p.click('#ownDelYes');
  ok(await until(p, c => __t.own.list.length === c, c1), 'borrar con confirmación');
  await p.reload();
  await p.waitForFunction(() => window.__t && document.readyState === 'complete');
  ok(await until(p, c => __t.own.list.length === c, c1) && await until(p, () => !document.querySelector('#secOwn').hidden), 'tras recargar: lista y pestaña se conservan');
  ok(p.errs.length === 0, 'sin errores de consola ' + p.errs.join('|'));
  await p.context().close();

  // 9) móvil
  const m = await page(b, MOB);
  await open(m, URL);
  await m.click('#tab-propio'); await m.click('#ownNew');
  for (const k of ['q', 'q', 'e', 'e', 'q']) await m.tap(`#ownPal [data-k="${k}"]`);
  ok(await notaIs(m, 'q q e e q'), 'móvil: la paleta funciona con toques');
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= 390), 'móvil: sin desplazamiento horizontal');
  ok(await m.evaluate(() => { const t = document.querySelector('.tabs'); return t.scrollWidth <= t.clientWidth + 1; }), 'móvil: las 4 pestañas caben');
  ok(m.errs.length === 0, 'móvil sin errores ' + m.errs.join('|'));
});

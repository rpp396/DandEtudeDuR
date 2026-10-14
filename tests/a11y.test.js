// Accesibilidad (WCAG 2.2 AA): foco conservado y no tapado, nombres accesibles, «Reiniciar» con teclado, landmarks, atajos y contraste
const fs = require('fs');
const path = require('path');
const { suite, REPO } = require('./lib');

/* ---------- Contraste calculado desde styles.css ---------- */
const css = fs.readFileSync(path.join(REPO, 'styles.css'), 'utf8');
const vars = b => { const o = {}; b.replace(/--([\w-]+):\s*([^;]+);/g, (m, k, v) => { o[k] = v.trim(); }); return o; };
const LIGHT = vars(css.match(/:root\{([^}]*)\}/)[1]);
const DARK = { ...LIGHT, ...vars(css.match(/:root:not\(\[data-theme="light"\]\)\{([^}]*)\}/)[1]) };
const rgba = s => { let m;
  if ((m = /^#([0-9a-f]{6})$/i.exec(s))) return [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16)).concat(1);
  if ((m = /^rgba?\(([^)]+)\)/.exec(s))) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
  throw new Error('color no reconocido: ' + s); };
const over = (f, b) => [0, 1, 2].map(i => f[i] * f[3] + b[i] * (1 - f[3])).concat(1);
const lum = c => c.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
// [descripción, color del texto o componente, fondo (nombre o [nombre, 'sobre fondo'] para un color translúcido), mínimo]
const PAIRS = [
  ['texto ink/paper', 'ink', 'paper', 4.5], ['texto muted/bg', 'muted', 'bg', 4.5], ['texto muted/panel', 'muted', 'panel', 4.5], ['texto accent/paper', 'accent', 'paper', 4.5],
  ['botón primario accent-ink/accent', 'accent-ink', 'accent', 4.5],
  ['.notice y avisos de silencios (near/paper)', 'near', 'paper', 4.5], ['.notice (near/panel)', 'near', 'panel', 4.5],
  ['«borrador» en la lista (near sobre accent-soft/panel)', 'near', ['accent-soft', 'panel'], 4.5],
  ['.own-msg (good/panel)', 'good', 'panel', 4.5], ['.own-msg (good/paper)', 'good', 'paper', 4.5],
  ['.own-msg.bad (bad/panel)', 'bad', 'panel', 4.5], ['bad/paper', 'bad', 'paper', 4.5],
  ['borde de campos (ui/paper)', 'ui', 'paper', 3], ['borde de campos (ui/panel)', 'ui', 'panel', 3],
  ['interruptor apagado (ui/panel)', 'ui', 'panel', 3], ['bolita del interruptor sobre la pista (paper/ui)', 'paper', 'ui', 3],
  ['estrella sin ganar (ui/paper)', 'ui', 'paper', 3], ['estrella ganada (star/paper)', 'star', 'paper', 3], ['estrella ganada (star/panel)', 'star', 'panel', 3],
  ['pentagrama (staff/paper)', 'staff', 'paper', 3], ['luz del metrónomo apagada (ui/panel)', 'ui', 'panel', 3],
  ['marcador exacto (good/paper)', 'good', 'paper', 3], ['marcador bien (ok/paper)', 'ok', 'paper', 3], ['marcador cerca (near/paper)', 'near', 'paper', 3], ['marcador fallo (bad/paper)', 'bad', 'paper', 3],
];

suite('Accesibilidad', async ({ b, URL, ok, MOB, page, open, until, wf, vis, waitRunning, waitResults, scheduleTaps }) => {
  /* ----- Contraste (claro y oscuro) ----- */
  for (const [nombre, T] of [['claro', LIGHT], ['oscuro', DARK]]) {
    const col = n => rgba(T[n]);
    const bad = [];
    for (const [d, f, bg, min] of PAIRS) {
      const back = Array.isArray(bg) ? over(col(bg[0]), col(bg[1])) : col(bg);
      const fore = col(f), r = ratio(fore[3] < 1 ? over(fore, back) : fore, back);
      if (r < min) bad.push(`${d} ${r.toFixed(2)} < ${min}`);
    }
    ok(!bad.length, `contraste ${nombre}: ${PAIRS.length} pares (texto ≥ 4,5 y componentes ≥ 3)` + (bad.length ? ' — falla: ' + bad.join('; ') : ''));
  }

  /* ----- Estructura: main, salto, encabezados, nombres ----- */
  let p = await page(b); await open(p, URL);
  ok(await p.$$eval('main', m => m.length === 1 && !m[0].hasAttribute('role')), 'hay un único <main> real (sin role que lo anule)');
  ok(await p.$eval('#main', m => m.contains(document.querySelector('[role=tablist]')) && m.contains(document.querySelector('#stageView')) && m.contains(document.querySelector('#progView'))), 'el <main> contiene las pestañas y los paneles');
  ok(await p.$$eval('[role=tabpanel]', a => a.length === 2 && a.every(x => x.getAttribute('aria-labelledby'))), 'los paneles de pestaña siguen etiquetados');
  await p.keyboard.press('Tab');
  ok(await p.evaluate(() => document.activeElement.id === 'skip' && /Saltar a la partitura/.test(document.activeElement.textContent)), 'el primer Tab llega al enlace «Saltar a la partitura»');
  ok(await p.$eval('#skip', e => e.getBoundingClientRect().top >= 0), 'el enlace de salto se ve al enfocarlo');
  await p.keyboard.press('Enter');
  ok(await until(p, () => document.activeElement.id === 'pad'), 'Intro en el enlace lleva el foco a la partitura');

  // partitura: nombre y descripción
  const pad = await p.$eval('#pad', e => ({ role: e.getAttribute('role'), label: e.getAttribute('aria-label'), desc: e.getAttribute('aria-describedby') }));
  ok(pad.role === 'group' && /Partitura/.test(pad.label) && /padMain/.test(pad.desc), '#pad es un grupo con nombre y su estado (#padMain/#padSub) accesible, no un botón que lo oculta ' + JSON.stringify(pad));
  ok(await p.$eval('#score', e => !e.hasAttribute('aria-label') && !e.hasAttribute('role')), '#score no lleva aria-label (div sin rol)');
  const syss = await p.$$eval('#score svg.sys', a => a.map(s => s.getAttribute('aria-label')));
  ok(syss.length > 0 && syss.every(t => t && t.length > 10), 'cada sistema (svg role=img) tiene aria-label: ' + syss.length);
  ok(/Ritmo en 4\/4/.test(syss[0]) && /Compás 1: /.test(syss[0]), 'describe el compás y el primer compás: «' + syss[0].slice(0, 90) + '…»');
  // una partitura conocida: negra, dos corcheas, negra, negra | redonda-silencio
  await p.evaluate(() => { document.querySelector('#tab-propio').click(); });
  await p.click('#ownNew');
  await p.fill('#ownText', 'q e e q q | rq rq rh'); await p.click('#ownTextApply');
  const txt = await p.$$eval('#score svg.sys', a => a.map(s => s.getAttribute('aria-label')).join(' '));
  ok(/Compás 1: negra, dos corcheas, negra, negra\./.test(txt), 'texto del compás 1: «negra, dos corcheas, negra, negra» ← ' + txt.slice(0, 160));
  ok(/Compás 2: silencio de negra, silencio de negra, silencio de blanca\./.test(txt), 'texto del compás 2: ' + (txt.match(/Compás 2:[^.]*\./) || [''])[0]);
  await p.click('#tab-libre');

  // iconos decorativos y estrellas
  ok(await p.$$eval('button > svg:not([aria-hidden])', a => a.length === 0), 'los iconos SVG de los botones son decorativos (aria-hidden)');

  /* ----- Foco conservado al repintar ----- */
  const sameFocus = async (sel, tecla = 'Enter') => {
    await p.focus(sel);
    const before = await p.evaluate(() => { const a = document.activeElement; return a.outerHTML.slice(0, 60); });
    await p.keyboard.press(tecla);
    await p.waitForTimeout(150);
    return p.evaluate(([sel, before]) => ({ same: document.activeElement.matches(sel), tag: document.activeElement.tagName + '#' + document.activeElement.id }), [sel, before]);
  };
  for (const [nombre, sel] of [['compás', '#sigs [data-sig="3/4"]'], ['figura del panel', '#figs [data-k="s"]'], ['silencio del panel', '#restFigs [data-r="w"]'], ['otro compás', '#sigs [data-sig="6/8"]']]) {
    const r = await sameFocus(sel);
    ok(r.same, `Intro en ${nombre} (${sel}): el foco sigue en el mismo control ${r.tag}`);
  }
  await p.focus('#sigs [data-sig="5/8"]'); await p.keyboard.press('Enter');
  { const r = await sameFocus('#grpSeg [data-g="2+3"]'); ok(r.same, 'agrupación 5/8: el foco sigue en la opción elegida ' + r.tag); }
  await p.focus('#sigs [data-sig="4/4"]'); await p.keyboard.press('Enter');

  await p.click('#tab-campana');
  { const r = await sameFocus('#campMap .lv[data-lv="0"]'); ok(r.same, 'nivel del mapa: el foco sigue en el nivel ' + r.tag); }
  const lv = await p.$$eval('#campMap .lv', a => a.slice(0, 3).map(x => ({ label: x.getAttribute('aria-label'), dis: x.getAttribute('aria-disabled'), real: x.disabled })));
  ok(/^Nivel 1: .+, 0 de 3 estrellas, sin superar$/.test(lv[0].label), 'nivel 1 con nombre completo: «' + lv[0].label + '»');
  ok(/^Nivel 3: .+, bloqueado$/.test(lv[2].label) && lv[2].dis === 'true' && !lv[2].real, 'nivel bloqueado: «' + lv[2].label + '», aria-disabled y enfocable');
  await p.focus('#campMap .lv[data-lv="2"]');
  ok(await p.evaluate(() => document.activeElement.dataset.lv === '2'), 'un nivel bloqueado se puede enfocar con el teclado');
  ok(await p.$eval('#lvStars', e => e.getAttribute('role') === 'img' && /de 3 estrellas/.test(e.getAttribute('aria-label'))), '#lvStars: role=img y «n de 3 estrellas»');
  ok(await p.$eval('#campMap .lv small', e => e.getAttribute('aria-hidden') === 'true'), 'las estrellas visuales del mapa están ocultas al lector (el nombre las dice)');
  await p.evaluate(() => { __t.prog.levels.L1 = { best: 85, stars: 2, tries: 1 }; __t.selectLevel(0); });
  ok(await p.$eval('#campMap .lv[data-lv="0"]', e => /2 de 3 estrellas, superado/.test(e.getAttribute('aria-label'))) && await p.$eval('#lvStars', e => /2 de 3/.test(e.getAttribute('aria-label')) && /★★☆/.test(e.textContent)),
    'con 2 estrellas: «2 de 3 estrellas, superado» y la estrella vacía es ☆ (forma distinta, no solo color)');
  // lvPrev se apaga al llegar al primer nivel: el foco no cae en <body>
  await p.focus('#lvNext'); await p.keyboard.press('Enter'); await p.focus('#lvPrev'); await p.keyboard.press('Enter');
  ok(await p.evaluate(() => document.activeElement !== document.body), 'al apagarse «Nivel anterior» el foco pasa a otro control (no a <body>)');
  await p.click('#tab-libre');

  /* ----- Mis ejercicios: paleta, lista, Duplicar y borrar ----- */
  await p.click('#tab-propio'); await p.click('#ownNew');
  { const r = await sameFocus('#ownPal [data-k="q"]'); ok(r.same, 'paleta: tras añadir una figura con Intro el foco sigue en esa figura ' + r.tag); }
  ok(await p.evaluate(() => __t.own.cur.notation.includes('q')), 'la figura se añadió');
  { const r = await sameFocus('#ownPal [data-k="e"]', 'Space'); ok(r.same, 'paleta con Espacio: el foco se conserva ' + r.tag); }
  await p.click('#ownNew');
  await p.focus('#ownList .own-item'); await p.keyboard.press('Enter');
  ok(await p.evaluate(() => document.activeElement.classList.contains('own-item')), 'lista de ejercicios: el foco sigue en un elemento de la lista');
  await p.focus('#ownDup'); await p.keyboard.press('Enter');
  ok(await until(p, () => document.activeElement.id === 'ownDup' || document.activeElement.classList.contains('own-item')), 'Duplicar: el foco no se pierde: ' + await p.evaluate(() => document.activeElement.tagName + '#' + document.activeElement.id));
  const n0 = await p.evaluate(() => __t.own.list.length);
  await p.focus('#ownDel'); await p.keyboard.press('Enter');
  const conf = await p.evaluate(() => { const box = document.querySelector('#ownDelBox'), a = document.activeElement; return { id: a.id, role: box.getAttribute('role'), lab: box.getAttribute('aria-labelledby'), desc: a.getAttribute('aria-describedby'), q: document.getElementById(box.getAttribute('aria-labelledby'))?.textContent }; });
  ok(conf.id === 'ownDelNo' && conf.role === 'group' && conf.desc === conf.lab && /¿Borrar/.test(conf.q), 'confirmar borrado: el foco va a «Cancelar», que se describe con la pregunta ' + JSON.stringify(conf));
  await p.focus('#ownDelYes'); await p.keyboard.press('Enter');
  await p.waitForTimeout(150);
  ok(await p.evaluate(n => __t.own.list.length === n - 1, n0), 'se borró el ejercicio');
  ok(await p.evaluate(() => document.activeElement !== document.body && !!document.activeElement.closest('#ownList,#secOwn')), 'tras «Sí, borrar» el foco va a la lista de ejercicios: ' + await p.evaluate(() => document.activeElement.tagName + '.' + document.activeElement.className));
  ok(!(await p.$eval('#ownDelBox', e => e.hasAttribute('role'))), 'la confirmación se cierra (sin role de grupo)');
  // otras confirmaciones
  await p.click('#tab-libre'); await p.click('#sigs [data-sig="4/4"]');
  await p.focus('#resetSet'); await p.keyboard.press('Enter');
  ok(await p.evaluate(() => document.activeElement.id === 'resetNo' && document.querySelector('#resetBox').getAttribute('role') === 'group' && document.activeElement.getAttribute('aria-describedby') === document.querySelector('#resetBox').getAttribute('aria-labelledby')), 'Restablecer: pregunta asociada al grupo y a «Cancelar»');
  await p.keyboard.press('Enter');
  ok(await p.evaluate(() => document.activeElement.id === 'resetSet'), 'Cancelar devuelve el foco a «Restablecer ajustes»');
  await p.click('#tab-progreso'); await p.focus('#pClear'); await p.keyboard.press('Enter');
  ok(await p.evaluate(() => document.activeElement.id === 'pClearNo' && document.querySelector('#pClearBox').getAttribute('role') === 'group'), 'Borrar historial: pregunta asociada al grupo');
  await p.keyboard.press('Enter'); await p.click('#tab-libre');

  /* ----- Deslizadores con aria-valuetext ----- */
  const vt = await p.evaluate(() => ['rhythmVol', 'metroVol', 'tapVol', 'offset', 'bpmRange'].map(id => document.getElementById(id).getAttribute('aria-valuetext')));
  ok(vt.every(Boolean) && /%$/.test(vt[0]) && /ms$/.test(vt[3]) && /ppm$/.test(vt[4]), 'deslizadores con aria-valuetext con unidad: ' + vt.join(' | '));
  await p.fill('#offset', '15'); await p.dispatchEvent('#offset', 'input');
  ok(await p.$eval('#offset', e => e.getAttribute('aria-valuetext') === '+15 ms'), 'el aria-valuetext se actualiza al mover el deslizador');

  /* ----- Atajos de una tecla (2.1.4) ----- */
  await p.evaluate(() => document.activeElement.blur()); await p.mouse.click(5, 5);
  await p.keyboard.press('r');
  ok(await until(p, () => __t.S.running && __t.S.mode === 'play'), 'con el ajuste activo y sin foco en un control, R reproduce');
  await p.keyboard.press('Escape'); await wf(p, () => !__t.S.running);
  await p.focus('#bpmDown'); await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab');   // foco llegado con el teclado
  await p.keyboard.press('r'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => !__t.S.running), 'con el foco (por teclado) en un botón, R no actúa');
  await p.click('#keys', { force: true }).catch(() => {}); // el interruptor está oculto bajo su etiqueta
  await p.evaluate(() => { const c = document.getElementById('keys'); if (c.checked) c.click(); });
  ok(await p.evaluate(() => __t.set.keys === false && document.body.classList.contains('no-keys')), 'el ajuste «Atajos de teclado» se puede apagar');
  await p.evaluate(() => document.activeElement.blur()); await p.mouse.click(5, 5);
  await p.keyboard.press('p'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => !__t.S.running), 'con los atajos apagados, P no practica');
  await p.keyboard.press('Space'); await p.waitForTimeout(100);
  await p.reload(); await p.waitForFunction(() => window.__t);
  ok(await p.evaluate(() => __t.set.keys === false && document.getElementById('keys').checked === false), 'el ajuste se guarda');
  await p.evaluate(() => { const c = document.getElementById('keys'); c.click(); });
  await p.close();

  /* ----- Movimiento reducido ----- */
  p = await page(b); await p.emulateMedia({ reducedMotion: 'reduce' }); await open(p, URL);
  ok(await p.evaluate(() => smooth() === 'auto'), 'con prefers-reduced-motion los desplazamientos pasan a instantáneos');
  await p.close();
  p = await page(b); await open(p, URL);
  ok(await p.evaluate(() => smooth() === 'smooth'), 'sin preferencia, siguen suaves');
  await p.close();

  /* ----- Alto contraste forzado ----- */
  p = await page(b); await p.emulateMedia({ forcedColors: 'active' }); await open(p, URL);
  const fc = await p.evaluate(() => { const t = document.querySelector('.track'), cs = getComputedStyle(t); const tab = getComputedStyle(document.querySelector('.tab[aria-selected=true]'));
    return { bw: cs.borderTopWidth, tab: tab.textDecorationLine }; });
  ok(fc.bw === '2px', 'forced-colors: los interruptores tienen borde visible ' + fc.bw);
  ok(/underline/.test(fc.tab), 'forced-colors: la pestaña activa se distingue por subrayado ' + fc.tab);
  await p.close();

  /* ----- Resultados: Exacto / Bien / Cerca con formas distintas ----- */
  p = await page(b); await open(p, URL);
  await p.evaluate(() => { __t.set.bars = 2; __t.set.countIn = '1'; });
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  await scheduleTaps(p, [0, 65, 125]);
  await waitResults(p);
  const shapes = await p.evaluate(() => {
    const q = c => [...document.querySelectorAll('#score .mk.j-' + c)].map(e => e.tagName + ':' + getComputedStyle(e).fill + ':' + getComputedStyle(e).stroke);
    return { exact: q('exact'), good: q('good'), near: q('near') };
  });
  ok(shapes.exact.length && shapes.exact.every(s => /^circle:rgb/.test(s) && !/none/.test(s.split(':')[1])), 'exacto = círculo lleno ' + shapes.exact.length);
  ok(shapes.good.length && shapes.good.every(s => /^circle:none:/.test(s)), 'bien = anillo (sin relleno) ' + shapes.good.length);
  ok(shapes.near.length === 0 || shapes.near.every(s => /^path:/.test(s)), 'cerca = rombo (path) ' + shapes.near.length);
  ok(await p.$$eval('.counts .sw-dot', a => a.every(s => s.getAttribute('aria-hidden') === 'true')), 'los puntos de color de los contadores son decorativos (el texto dice la categoría)');
  ok(await p.$eval('#rHead', e => e.tagName === 'H2'), 'los resultados llevan h2');
  await p.close();

  /* ----- Móvil: «Reiniciar» con teclado y foco no tapado ----- */
  p = await page(b, MOB); await open(p, URL);
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  await p.waitForSelector('#fabRestart', { state: 'visible' });
  ok(await p.evaluate(() => document.getElementById('fabRestart').getAttribute('aria-describedby') === 'restartHelp' && /Intro o Espacio/.test(document.getElementById('restartHelp').textContent)), '«Reiniciar»: su ayuda dice que con teclado basta Intro o Espacio');
  ok(await p.evaluate(() => !document.getElementById('tapFab').hasAttribute('aria-label') && document.getElementById('tapFab').textContent.length > 0), '#tapFab: nombre accesible = su texto visible (sin aria-label distinto)');
  await p.evaluate(() => { window.__taps = 0; const o = window.tap; window.tap = (...a) => { window.__taps++; return o(...a); }; });   // cuenta los toques que llegan a la práctica
  const t0 = await p.evaluate(() => __t.S.passStart);
  await p.focus('#fabRestart'); await p.keyboard.press('Enter');
  ok(await until(p, t => __t.S.running && __t.S.mode === 'practice' && __t.S.passStart !== t, t0), 'Intro en «Reiniciar» reinicia la práctica al instante');
  const t1 = await p.evaluate(() => __t.S.passStart);
  ok(await p.evaluate(() => window.__taps === 0), 'y no cuenta como toque');
  await p.focus('#fabRestart'); await p.keyboard.press('Space');
  ok(await until(p, t => __t.S.passStart !== t, t1), 'Espacio en «Reiniciar» también reinicia');
  ok(await p.evaluate(() => window.__taps === 0), 'Espacio en «Reiniciar» no cuenta como toque');
  await p.keyboard.press('Escape'); await wf(p, () => !__t.S.running);

  // foco no tapado por la paleta fija ni por el botón flotante (2.4.11)
  await p.click('#tab-propio');
  await p.evaluate(() => { document.activeElement.blur(); scrollTo(0, 0); });
  const tapado = [];
  let vistos = 0;
  await p.evaluate(() => document.querySelector('#tab-propio').focus());
  for (let i = 0; i < 70; i++) {
    await p.keyboard.press('Tab');
    const r = await p.evaluate(() => {
      const a = document.activeElement; if (!a || a === document.body) return null;
      const pin = ['#ownDock', '#tapFab', '#postFab'].map(s => document.querySelector(s)).find(x => x && !x.hidden && getComputedStyle(x).visibility !== 'hidden');
      if (!pin || a.closest('#ownDock,#tapFab,#postFab,#fabRestart')) return { skip: true };
      const e = a.getBoundingClientRect(), t = pin.getBoundingClientRect();
      if (!e.width || !e.height) return { skip: true };
      return { tapado: e.bottom > t.top + 1 && e.top < t.bottom && e.bottom > t.top, id: a.id || a.tagName, bottom: Math.round(e.bottom), top: Math.round(t.top) };
    });
    if (r && !r.skip) { vistos++; if (r.tapado) tapado.push(JSON.stringify(r)); }
  }
  ok(vistos > 10 && !tapado.length, `Mis ejercicios a 390 px: ningún control enfocado queda bajo la paleta fija (${vistos} comprobados)` + (tapado.length ? ' — tapados: ' + tapado.slice(0, 4).join(' ') : ''));
  ok(await p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom) > 0), 'html tiene scroll-padding-bottom con los elementos fijos a la vista');
  await p.close();
});

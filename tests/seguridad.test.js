// Seguridad y robustez de datos: lo guardado (localStorage / db de claude.ai) y lo importado no es de fiar.
// Datos maliciosos o corruptos no ejecutan nada ni rompen el arranque; la CSP está activa; la app no pide nada fuera de su carpeta.
const fs = require('fs');
const path = require('path');
const { suite, REPO } = require('./lib');

const PWN = '<img src=x onerror="window.__pwn=1">';
const b64u = s => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const KEY = 'solfeo-ritmico-v1', PKEY = 'solfeo-ritmico-progreso-v1', OKEY = 'solfeo-ritmico-ejercicios-v1';

suite('Seguridad y robustez de datos', async ({ b, URL, ok, tmp, page, open, until, wf, waitResults }) => {
  // Página con localStorage sembrado (cadenas tal cual, aunque sean JSON roto) antes de que corra ningún script
  const seeded = async (store, opts) => {
    const p = await page(b, opts);
    await p.context().addInitScript(o => { if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); for (const k in o) localStorage.setItem(k, o[k]); } }, store);
    return p;
  };
  // El DOM no contiene nada inyectado: ni <img src=x>, ni atributos on…, ni se ejecutó el payload
  const clean = p => p.evaluate(() => ({ pwn: window.__pwn, imgs: document.querySelectorAll('img').length,
    on: [...document.querySelectorAll('*')].filter(e => [...e.attributes].some(a => /^on/i.test(a.name))).length,
    polluted: ({}).polluted, scores: document.querySelectorAll('#score svg').length }));
  const sess = (o = {}) => ({ id: 'abcd' + Math.random().toString(36).slice(2, 6), t: Date.now() - 1000, mode: 'libre', lvl: null, lid: null, sig: '4/4', grp: null, bars: 4, bpm: 80, pct: 77, n: 8, exact: 4, good: 2, near: 1, miss: 1, extra: 0, mean: 12, play: 'bateria', pen: true, ...o });

  // 0) la página declara su CSP y el referrer, y no depende de Google
  const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8'), css = fs.readFileSync(path.join(REPO, 'styles.css'), 'utf8');
  const csp = (/http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html) || [])[1] || '';
  ok(/script-src 'self'(;|$)/.test(csp) && !/unsafe-eval|unsafe-inline/.test(csp) && /object-src 'none'/.test(csp) && /base-uri 'none'/.test(csp) && /form-action 'none'/.test(csp) && /connect-src 'self'/.test(csp), 'index.html: CSP estricta (script-src \'self\', sin unsafe-*)');
  ok(/<meta name="referrer" content="no-referrer">/.test(html), 'index.html: referrer no-referrer');
  ok(!/googleapis|gstatic|https?:\/\//.test(html.replace(/xmlns="[^"]+"/g, '')) && !/googleapis|gstatic/.test(css), 'sin enlaces a Google ni otros recursos externos en index.html ni styles.css');
  ok(!/\sstyle="/.test(html) && !/<script>/.test(html), 'index.html: sin style="" ni scripts en línea');
  ok(['AtkinsonHyperlegible', 'JetBrainsMono', 'YoungSerif'].every(f => fs.existsSync(path.join(REPO, 'fonts', `OFL-${f}.txt`))), 'fonts/: licencias OFL incluidas');

  // 1) CSP efectiva y fuentes locales
  {
    const p = await page(b); await open(p, URL);
    const fam = await p.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')); });
    ok(['Atkinson Hyperlegible', 'JetBrains Mono', 'Young Serif'].every(f => fam.includes(f)), 'las tres fuentes locales se cargan: ' + [...new Set(fam)].join(', '));
    ok(p.ext.length === 0, 'sin peticiones fuera de 127.0.0.1 al arrancar: ' + p.ext.join(' '));
    await p.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<img src="x" onerror="window.__pwn2=1">'); const s = document.createElement('script'); s.textContent = 'window.__pwn3=1'; document.body.appendChild(s); document.body.insertAdjacentHTML('beforeend', '<i style="color:red" id="stl"></i>'); fetch('https://example.com/x').catch(() => {}); });
    await p.waitForTimeout(300);
    const v = await p.csp(), c = await p.evaluate(() => [window.__pwn2, window.__pwn3]);
    ok(c[0] === undefined && c[1] === undefined, 'la CSP bloquea un onerror y un script en línea inyectados');
    ok(v.some(x => x.startsWith('script-src-attr')) && v.some(x => x.startsWith('script-src-elem')) && v.some(x => x.startsWith('style-src-attr')) && v.some(x => x.startsWith('connect-src')), 'violaciones registradas (script-src-attr/elem, style-src-attr, connect-src): ' + v.map(x => x.split(' ')[0]).join(', '));
    p.errs.length = 0;
  }

  // 2) ajustes maliciosos o fuera de rango
  {
    const bad = { seen: true, sv: 3, sig: 'constructor', bars: 10000000, bpm: 1e9, offset: 'NaN', sub: '9.5367431640625e-7', countIn: 'x', rhythmVol: 'abc', metroVol: -5, tapVol: {},
      timbre: PWN, figs: [PWN, 'q', 'q', 'zz'], rests: ['zz', 'q'], grp: { constructor: 'x', '7/8': PWN, '5/8': '2+3' }, folds: { repro: PWN, prac: true }, view: PWN, levelId: PWN, ownId: PWN, level: 'x',
      sound: 'yes', penalize: 0 };
    const p = await seeded({ [KEY]: JSON.stringify(bad).replace(/^\{/, '{"__proto__":{"polluted":1},') });
    await open(p, URL);
    const r = await p.evaluate(() => { const s = __t.set; return { sig: s.sig, bars: s.bars, bpm: s.bpm, offset: s.offset, sub: s.sub, countIn: s.countIn, rv: s.rhythmVol, mv: s.metroVol, tv: s.tapVol, timbre: s.timbre,
      figs: s.figs.join(), rests: s.rests.join(), grp: JSON.stringify(s.grp), folds: JSON.stringify(s.folds), view: s.view, levelId: s.levelId, ownId: s.ownId, sound: s.sound, pen: s.penalize, own: Object.keys(s).includes('polluted') }; });
    ok(r.sig === '4/4' && r.bars === 16 && r.bpm === 240 && r.offset === 0 && r.sub === '0' && r.countIn === '1', 'ajustes: compás propio, bars/bpm acotados, offset/sub/countIn por defecto ' + JSON.stringify([r.sig, r.bars, r.bpm, r.offset, r.sub, r.countIn]));
    ok(r.rv === 0.6 && r.mv === 0 && r.tv === 0.6 && r.timbre === 'tono' && r.sound === false && r.pen === true, 'ajustes: volúmenes finitos en 0-1, timbre de lista cerrada, booleanos solo booleanos');
    ok(r.figs === 'q' && r.rests === 'q' && r.grp === '{"5/8":"2+3"}' && r.folds === '{"prac":true}' && r.view === 'libre' && r.levelId === '' && r.ownId === '', 'ajustes: figuras, silencios, agrupaciones, pliegues e ids solo de listas cerradas ' + JSON.stringify([r.figs, r.rests, r.grp, r.folds]));
    ok(!r.own, 'ajustes: __proto__ del JSON no se copia');
    const c = await clean(p);
    ok(c.scores > 0 && c.pwn === undefined && c.imgs === 0 && c.on === 0 && c.polluted === undefined, 'ajustes maliciosos: la app arranca, pinta la partitura y no ejecuta nada');
    await p.click('#bPlay'); await p.waitForFunction(() => __t.S.running); await p.click('#bStop'); await p.waitForFunction(() => !__t.S.running);
    ok(p.errs.length === 0 && (await p.csp()).length === 0, 'ajustes maliciosos: Reproducir y Detener sin errores ni violaciones de CSP ' + p.errs.join(' | '));
  }

  // 3) progreso malicioso: sesiones, niveles y ejercicios
  {
    const good = sess({ id: 'good0001', pct: 91 });
    const evil = sess({ id: 'evil0001', sig: '4/4', grp: PWN, bars: PWN, bpm: PWN, pct: 55, n: PWN, exact: PWN, miss: PWN, mean: PWN, extra: PWN, play: PWN, mode: 'propio', ex: PWN, exn: PWN, lid: PWN });
    const prog = { levels: { L1: { best: PWN, stars: PWN, tries: PWN }, L2: { best: 1e9, stars: -3, tries: 'x' }, L3: { best: 80.6, stars: 2, tries: 4 }, constructor: { best: 5, stars: 3 }, L999: { best: 1, stars: 1 } },
      sessions: [null, 3, 'x', [], {}, { id: 'a', sig: 'constructor' }, sess({ id: 'proto01', sig: '__proto__' }), sess({ id: 'tostr01', sig: 'toString' }), sess({ id: 'bad00001', t: 'x' }), sess({ id: 'bad00002', pct: Infinity }), sess({ id: 'bad00003', mode: 'campana', lid: 'L999', lvl: 999 }),
        sess({ id: '<b>', }), good, evil, sess({ id: 'camp0001', mode: 'campana', lid: 'L3', lvl: 2, pct: 85, sig: '4/4' }), sess({ id: 'old00001', mode: 'campana', lvl: 0, pct: 60 }), sess({ id: 'odd00001', sig: '7/8', grp: '2+3+2', pct: 50 }), sess({ id: 'big00001', bars: 1e9, bpm: 5, n: 1e12, pct: 500, extra: -4 })] };
    const exs = { v: 1, exercises: [{ id: 'ex000001', name: PWN, sig: '4/4', bpm: 80, notation: 'q q q q' }, { id: 'ex000002', name: 'Roto', sig: 'toString', bpm: 80, notation: 'q' }, { id: PWN, name: 'Id raro', sig: 'constructor', bpm: 80, notation: 'q' }, null, 5, { id: 'ex000003', name: 'Bien', sig: '3/4', bpm: 'x', notation: 'q q q', grp: PWN }] };
    const p = await seeded({ [KEY]: JSON.stringify({ seen: true, sv: 3 }), [PKEY]: JSON.stringify(prog).replace('"constructor":{"best":5', '"__proto__":{"polluted":1,"best":5'), [OKEY]: JSON.stringify(exs) });
    await open(p, URL);
    const info = await p.evaluate(() => ({ ids: __t.prog.sessions.map(s => s.id), lv: JSON.stringify(__t.prog.levels), own: __t.own.list.map(x => x.name + '|' + x.sig + '|' + x.id) }));
    ok(info.ids.join() === 'good0001,evil0001,camp0001,old00001,odd00001,big00001', 'sesiones: se descartan las que no son objetos o tienen compás/nivel/fecha/precisión inválidos (' + info.ids.join() + ')');
    ok(info.lv === '{"L1":{"best":0,"stars":0,"tries":0},"L2":{"best":100,"stars":0,"tries":0},"L3":{"best":81,"stars":2,"tries":4}}', 'niveles: solo ids de LEVELS, números acotados ' + info.lv);
    ok(info.own.length === 2 && info.own.every(s => !s.includes('toString') && !s.includes('constructor')), 'ejercicios: se descartan los de compás heredado (' + info.own.length + ')');
    const c1 = await clean(p);
    ok(c1.scores > 0 && c1.pwn === undefined && c1.imgs === 0 && c1.on === 0, 'arranque con datos maliciosos: sin ejecución ni elementos inyectados');
    await p.click('#tab-progreso');
    await p.waitForSelector('#pTable table');
    const pr = await p.evaluate(() => ({ rows: document.querySelectorAll('#pTable tbody tr').length, tiles: document.querySelector('#pTiles').textContent, w: [...document.querySelectorAll('.pbar i')].map(i => i.style.width) }));
    ok(pr.rows === info.ids.length && pr.w.every(w => /^\d+%$/.test(w)), 'Mi progreso se pinta con las sesiones válidas (' + pr.rows + ' filas; anchos ' + pr.w.join(' ') + ')');
    await p.evaluate(() => document.querySelector('.ch-hit').dispatchEvent(new PointerEvent('pointerenter', { bubbles: true })));
    const c2 = await clean(p);
    ok(c2.pwn === undefined && c2.imgs === 0 && c2.on === 0, 'Mi progreso (historial, tiles, gráfica y tooltip) sin código inyectado');
    await p.click('#tab-campana'); await p.waitForSelector('#campMap .lv');
    ok((await p.$$('#campMap .lv')).length === 29, 'campaña: se pinta con 29 niveles');
    await p.click('#tab-propio'); await p.waitForSelector('#ownList .own-item');
    const c3 = await clean(p);
    ok(c3.pwn === undefined && c3.imgs === 0 && c3.on === 0 && (await p.$$('#ownList .own-item')).length === 2, 'Mis ejercicios se pinta; el nombre con HTML sale como texto');
    ok(p.errs.length === 0 && (await p.csp()).length === 0, 'sin errores de consola ni violaciones de CSP: ' + p.errs.join(' | '));

    // Segunda barrera: aunque un dato malo llegara a prog sin pasar por cleanSession, el pintado lo escapa (se desactiva la CSP mentalmente: se comprueba el DOM)
    await p.evaluate(([pwn]) => { const T = __t; T.prog.sessions.push({ id: 'raw00001', t: Date.now(), mode: 'libre', sig: pwn, grp: pwn, bars: pwn, bpm: pwn, pct: '1%;" onmouseover="window.__pwn=1" x="', n: pwn, exact: pwn, miss: pwn, mean: 5, exn: pwn });
      T.prog.sessions.push({ ...T.prog.sessions[T.prog.sessions.length - 1], id: 'raw00002' }); T.prog.levels.L1 = { best: pwn, stars: pwn }; T.setView('libre'); T.setView('progreso'); }, [PWN]);
    await p.evaluate(() => document.querySelector('.ch-hit:last-of-type').dispatchEvent(new PointerEvent('pointerenter', { bubbles: true })));
    const c4 = await clean(p);
    ok(c4.imgs === 0 && c4.on === 0 && c4.pwn === undefined, 'escape en el pintado: historial, mejor resultado y tooltip aguantan datos sin validar');
    await p.evaluate(() => { __t.setView('campana'); });
    ok((await clean(p)).imgs === 0, 'escape en el pintado: ficha del nivel y totales de la campaña');
    ok((await p.csp()).length === 0, 'escape en el pintado: no hizo falta la CSP (sin violaciones)');
  }

  // 4) JSON roto y tamaños absurdos
  {
    const p = await seeded({ [KEY]: '{"seen":true,"sig":', [PKEY]: '{"sessions":[{', [OKEY]: 'no es json' });
    await open(p, URL);
    const c = await clean(p);
    ok(c.scores > 0 && p.errs.length === 0, 'JSON corrupto en las tres claves: la app arranca con valores por defecto ' + p.errs.join(' | '));
    await p.click('#tab-progreso'); await p.waitForSelector('#pTable .empty');
    ok(true, 'Mi progreso vacío tras JSON corrupto');
    const q = await seeded({ [KEY]: 'null', [PKEY]: '[1,2]', [OKEY]: '{"exercises":"x"}' });
    await open(q, URL);
    ok((await clean(q)).scores > 0 && q.errs.length === 0, 'null / arrays / tipos equivocados: arranca');
    const many = Array.from({ length: 12000 }, (_, i) => sess({ id: 'm' + i.toString(36).padStart(5, '0'), t: 1e12 + i }));
    const r = await seeded({ [KEY]: JSON.stringify({ seen: true, sv: 3 }), [PKEY]: JSON.stringify({ levels: {}, sessions: many }), [OKEY]: JSON.stringify({ v: 1, exercises: Array.from({ length: 300 }, (_, i) => ({ id: 'e' + i.toString(36).padStart(5, '0'), name: 'E' + i, sig: '4/4', bpm: 80, notation: 'q q q q' })) }) });
    const t0 = Date.now(); await open(r, URL);
    const n = await r.evaluate(() => [__t.prog.sessions.length, __t.own.list.length]);
    ok(n[0] === 400 && n[1] === 200 && Date.now() - t0 < 8000, `12 000 sesiones y 300 ejercicios guardados: se recortan a ${n[0]} y ${n[1]} (${Date.now() - t0} ms)`);
  }

  // 5) importaciones raras y enlaces #ej= maliciosos
  {
    const p = await page(b); await open(p, URL);
    await p.click('#tab-propio'); await p.waitForSelector('#secOwn', { state: 'visible' });
    const n0 = await p.evaluate(() => __t.own.list.length);
    const imp = async txt => { await p.click('#ownImpBtn'); await p.fill('#ownImpText', txt); await p.click('#ownImpGo'); const m = await p.evaluate(() => document.querySelector('#ownMsg').textContent); if (await p.isVisible('#ownImpCancel')) await p.click('#ownImpCancel'); return m; };
    const J = e => JSON.stringify({ formato: 'solfeo-ritmico-ejercicios', version: 1, ejercicios: e });
    const cases = { constructor: J([{ nombre: 'X', compas: 'constructor', tempo: 80, notacion: 'q' }]), proto: J([{ nombre: 'X', compas: '__proto__', tempo: 80, notacion: 'q' }]), tostr: J([{ nombre: 'X', compas: 'toString', tempo: 80, notacion: 'q' }]),
      nulo: J([null]), tipos: J([{ nombre: {}, compas: [], tempo: {}, notacion: 5 }]), agr: J([{ nombre: 'X', compas: '7/8', agrupacion: 'constructor', tempo: 80, notacion: 'q' }]), grande: J(Array.from({ length: 501 }, () => ({ nombre: 'X', compas: '4/4', tempo: 80, notacion: 'q' }))),
      html: J([{ nombre: PWN, compas: '4/4', tempo: 80, notacion: 'q q q q' }]) };
    const msgs = {}; for (const k of ['constructor', 'proto', 'tostr', 'nulo', 'tipos', 'agr', 'grande']) msgs[k] = await imp(cases[k]);
    const n1 = await p.evaluate(() => __t.own.list.length);
    ok(n1 === n0 && Object.values(msgs).every(m => m.length > 5) && p.errs.length === 0 && /Compás desconocido/.test(msgs.constructor), 'importar .json con compás «constructor», «__proto__», nulos, tipos raros o 501 ejercicios: mensaje claro, no guarda nada, sin TypeError ' + JSON.stringify(msgs).slice(0, 300));
    await imp(cases.html);
    const c = await clean(p);
    ok(c.imgs === 0 && c.pwn === undefined && c.on === 0 && await p.evaluate(() => __t.own.cur.name === '<img src=x onerror="window.__pwn=1">'), 'importar un nombre con HTML: se guarda como texto y se pinta escapado');
    // enlaces
    const mk = (name, sig, bpm, nota) => '#ej=' + b64u(['1', name, sig, bpm, nota].join('\n'));
    const q = await page(b); await open(q, URL, mk(PWN, '4/4 · 90 ppm', '90', 'q q h'));
    await until(q, () => __t.own.cur && __t.own.cur.notation === 'q q h');
    const c2 = await clean(q);
    ok(c2.imgs === 0 && c2.pwn === undefined && c2.on === 0 && (await q.$eval('#ownMsg', e => e.textContent)).includes('guardado'), 'enlace con nombre HTML: se guarda escapado y avisa que se ha guardado');
    for (const [k, h] of Object.entries({ constructor: mk('X', 'constructor · 80 ppm', '80', 'q'), proto: mk('X', '__proto__', '80', 'q'), grp: mk('X', '7/8 (9+9) · 80', '80', 'q'), basura: '#ej=' + b64u('esto no es un ejercicio'), trunc: '#ej=AAAA', largo: mk('X', '4/4', '80', 'q '.repeat(3000)) })) {
      const w = await page(b); await open(w, URL, h);
      await until(w, () => document.querySelector('#ownMsg') && !document.querySelector('#ownMsg').hidden);
      const r = await w.evaluate(() => ({ m: document.querySelector('#ownMsg').textContent, bad: document.querySelector('#ownMsg').classList.contains('bad'), n: __t.own.list.filter(x => x.name === 'X').length, ok: document.querySelectorAll('#score svg').length > 0 }));
      ok(r.bad && r.n === 0 && r.ok && w.errs.length === 0, `enlace «${k}»: no guarda nada, avisa (${r.m.slice(0, 60)}) y la app sigue`);
    }
    // tope de ejercicios guardados
    const full = Array.from({ length: 200 }, (_, i) => ({ id: 'e' + i.toString(36).padStart(5, '0'), name: 'Lleno ' + i, sig: '4/4', bpm: 80, notation: 'q q q q' }));
    const f = await seeded({ [KEY]: JSON.stringify({ seen: true, sv: 3 }), [OKEY]: JSON.stringify({ v: 1, exercises: full }) });
    await open(f, URL, mk('Nuevo', '3/4 · 80 ppm', '80', 'q q q'));
    await until(f, () => document.querySelector('#ownMsg') && !document.querySelector('#ownMsg').hidden);
    const fm = await f.evaluate(() => [document.querySelector('#ownMsg').textContent, __t.own.list.length, JSON.parse(localStorage.getItem('solfeo-ritmico-ejercicios-v1')).exercises.length]);
    ok(fm[1] === 200 && fm[2] === 200 && /biblioteca está llena/.test(fm[0]), 'biblioteca llena (200): el enlace no se guarda y avisa: ' + fm[0].slice(0, 70));
    await f.click('#ownNew');
    ok(await f.evaluate(() => __t.own.list.length) === 200 && /llena/.test(await f.$eval('#ownMsg', e => e.textContent)), 'biblioteca llena: «Nuevo ejercicio» avisa y no añade');
    await f.click('#ownImpBtn'); await f.fill('#ownImpText', 'Uno\n4/4 · 80 ppm\nq q q q'); await f.click('#ownImpGo');
    ok(await f.evaluate(() => __t.own.list.length) === 200 && /No cabe/.test(await f.$eval('#ownMsg', e => e.textContent)), 'biblioteca llena: importar avisa y no añade');
  }

  // 6) db de claude.ai manipulado: mergeProg valida lo que llega del db
  {
    const p = await seeded({ [PKEY]: JSON.stringify({ levels: {}, sessions: [sess({ id: 'loc00001', t: 5 })] }) });
    await p.addInitScript(([pwn]) => { const bad = { levels: { L1: { best: pwn, stars: pwn, tries: 3 }, constructor: { best: 9 } }, sessions: [null, { id: 'rem00001', t: Date.now(), mode: 'libre', sig: pwn, pct: 50 }, { id: 'rem00002', t: Date.now(), mode: 'libre', sig: '4/4', pct: 50, grp: pwn, bars: pwn, bpm: 99 }] };
      window.claude = { use: async k => k === 'user' ? { id: async () => 'u1' } : { doc: () => ({ get: async () => ({ exists: true, data: () => bad }), set: async v => { window.__remote = JSON.stringify(v); } }) } }; }, [PWN]);
    await open(p, URL);
    await until(p, () => !!window.__remote, null, 6000);
    const r = await p.evaluate(() => ({ ids: __t.prog.sessions.map(s => s.id), lv: JSON.stringify(__t.prog.levels), remote: window.__remote }));
    ok(r.ids.join() === 'loc00001,rem00002' && r.lv === '{"L1":{"best":0,"stars":0,"tries":3}}' && r.remote && !r.remote.includes('<img') && r.remote.includes('rem00002'), 'db manipulado: se descarta lo inválido y no se reenvía al db ' + r.ids.join() + ' ' + r.lv);
    await p.click('#tab-progreso'); await p.waitForSelector('#pTable table');
    const c = await clean(p);
    ok(c.imgs === 0 && c.pwn === undefined && c.on === 0 && p.errs.length === 0, 'db manipulado: Mi progreso sin código inyectado');
  }

  // 7) la app entera sin violaciones de CSP ni peticiones externas: pestañas, práctica, medición, exportar
  {
    const p = await seeded({ [KEY]: JSON.stringify({ seen: true, sv: 3, bars: 1, bpm: 240, countIn: '1' }) });
    await open(p, URL);
    for (const t of ['campana', 'propio', 'progreso', 'libre']) { await p.click('#tab-' + t); await p.waitForTimeout(150); }
    await p.click('#tab-campana'); await p.click('#campMap .lv >> nth=0'); await p.click('#tab-libre');
    await p.keyboard.press('r'); await p.waitForFunction(() => __t.S.running && __t.S.mode === 'play'); await p.keyboard.press('Escape'); await p.waitForFunction(() => !__t.S.running);
    await p.click('#bPractice'); await waitResults(p);
    ok(await p.isVisible('#results'), 'práctica completa con resultados');
    await p.click('#bCalib'); await p.waitForFunction(() => __t.S.running && __t.S.mode === 'calib'); await p.waitForTimeout(700); await p.keyboard.press('Escape'); await p.waitForFunction(() => !__t.S.running);
    await p.click('#bEditThis'); await p.waitForSelector('#secEdit', { state: 'visible' });
    await p.click('#ownNew'); await p.keyboard.press('4'); await p.keyboard.press('4'); await p.keyboard.press('4'); await p.keyboard.press('4');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#ownDl')]);
    const f = path.join(tmp(), 'seg.json'); await dl.saveAs(f);
    ok(JSON.parse(fs.readFileSync(f, 'utf8')).ejercicios.length === 1, 'la descarga .json (blob) funciona con la CSP');
    await p.click('#ownExpAll').catch(() => {});
    await p.click('#ownCopyText'); await p.click('#ownCopyLink');
    await p.click('#ownImpBtn'); await p.click('#ownImpCancel');
    await p.click('#tab-progreso'); await p.click('#pFilter button >> nth=1');
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
    const v = await p.csp();
    ok(v.length === 0, 'recorrido completo sin violaciones de CSP ' + v.join(' | '));
    ok(p.ext.length === 0, 'recorrido completo sin peticiones externas ' + p.ext.join(' '));
    ok(p.errs.length === 0, 'recorrido completo sin errores de consola ' + p.errs.join(' | '));
  }

  // 8) con file://: abrir index.html directamente (sin servidor) debe seguir funcionando con la CSP
  {
    const p = await page(b);
    await p.goto('file://' + path.join(REPO, 'index.html'));
    await p.waitForFunction(() => document.readyState === 'complete' && document.querySelectorAll('#score svg').length > 0);
    await p.evaluate(() => document.fonts.ready);
    await p.click('#tab-campana'); await p.click('#tab-propio'); await p.click('#tab-progreso'); await p.click('#tab-libre');
    await p.keyboard.press('n');
    const fam = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').length);
    ok((await p.csp()).length === 0 && p.errs.length === 0, 'file://: la app arranca y navega sin violaciones de CSP ni errores ' + (await p.csp()).join(' | ') + p.errs.join(' | '));
    ok(fam >= 3 && p.ext.filter(u => !u.startsWith('file://')).length === 0, `file://: fuentes locales cargadas (${fam}) y sin peticiones externas`);
  }
});

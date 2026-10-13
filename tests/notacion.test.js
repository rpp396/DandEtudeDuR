// Notación: escritura según el pulso en la generación, dibujo (centrado, barras sobre silencios, 2/2 por blancas)
// y el editor de «Mis ejercicios» (partir figuras según su posición, silencio de compás entero, aviso y reescritura)
const { suite } = require('./lib');

const N = 250; // ritmos de 4 compases por compás y configuración

suite('Notación según el pulso', async ({ b, URL, ok, page, open, until }) => {
  const p = await page(b); await open(p, URL);

  // 1) generación: miles de compases con todas las figuras y silencios, con y sin síncopas y ligaduras
  const gen = await p.evaluate(N => {
    const T = __t, P = T.pulseApi, out = [];
    T.setView('libre');
    const cases = [];
    for (const sig of Object.keys(T.SIGS)) {
      const grps = { '5/8': ['3+2', '2+3'], '7/8': ['2+2+3', '2+3+2', '3+2+2'], '8/8': ['3+3+2', '3+2+3', '2+3+3'] }[sig] || [null];
      for (const g of grps) for (const opt of [0, 1]) cases.push({ sig, g, opt });
    }
    for (const c of cases) {
      Object.assign(T.set, { sig: c.sig, bars: 4, grp: c.g ? { [c.sig]: c.g } : {}, figs: ['w', 'h', 'hd', 'q', 'qd', 'e', 'ed', 's', 't', 'lb', 'du'],
        rests: ['w', 'h', 'q', 'qd', 'e', 's'], sync: !!c.opt, ties: !!c.opt });
      const r = { key: c.sig + (c.g ? ' (' + c.g + ')' : '') + (c.opt ? ' +sínc/lig' : ''), bars: 0, bad: [], h36: 0, rqrq: 0, rh34: 0, mrAlone: 0, mrBad: 0, noNote: 0, used: {} };
      for (let k = 0; k < N; k++) {
        T.generate();
        const sc = T.score, L = sc.L;
        T.figsUsed(sc.measures).forEach(x => r.used[x] = 1);
        sc.measures.forEach(evs => {
          r.bars++;
          if (!evs.some(e => !e.rest) && !(evs.length === 1 && evs[0].mr)) r.noNote++;
          evs.forEach((e, i) => {
            if (e.mr) { if (evs.length === 1 && e.dur === L) r.mrAlone++; else r.mrBad++; return; }
            if (e.tuplet) return;
            if (!P.fitsPulse(e.start, e.dur, sc.sig, e.rest, false) && r.bad.length < 5) r.bad.push(evs.map(x => (x.rest ? 'r' : '') + x.dur + '@' + x.start).join(' '));
            if (!e.rest && e.dur === 36 && ((L === 48 && e.start === 12) || (L === 72 && sc.sig.kind === 'compound' && e.start === 18))) r.h36++;
            const nx = evs[i + 1];
            if ((L === 48 && sc.sig.kind === 'simple') && e.rest && e.dur === 12 && nx && nx.rest && nx.dur === 12 && e.start % 24 === 0 && e.cell !== nx.cell) r.rqrq++;
            if (c.sig === '3/4' && e.rest && e.dur === 24 && e.start === 12) r.rh34++;
          });
        });
      }
      out.push(r);
    }
    return out;
  }, N);
  let bars = 0;
  for (const r of gen) {
    bars += r.bars;
    ok(!r.bad.length && !r.h36 && !r.rqrq && !r.rh34 && !r.mrBad && !r.noNote,
      `${r.key}: ${r.bars} compases escritos según el pulso` + (r.bad.length ? ' · mal: ' + r.bad.join(' / ') : '') +
      (r.h36 ? ` · ${r.h36} blancas con puntillo tapando la mitad` : '') + (r.rqrq ? ` · ${r.rqrq} pares rq rq` : '') + (r.rh34 ? ` · ${r.rh34} rh en 2-3 de 3/4` : '') +
      (r.mrBad ? ` · ${r.mrBad} silencios de compás mal` : '') + (r.noNote ? ` · ${r.noNote} compases sin notas` : ''));
  }
  ok(bars > 30000, `${bars} compases generados en total`);
  const by = k => gen.filter(r => r.key.startsWith(k));
  ok(['3/4', '2/4', '6/8', '7/8', '3/2', '12/8'].every(k => by(k).some(r => r.mrAlone > 0)), 'el silencio de compás entero sale en 3/4, 2/4, 6/8, 7/8, 3/2 y 12/8');
  ok(by('2/4').every(r => r.used.lb) && by('4/4').every(r => r.used.lb), 'el ritmo lombardo sale cuando se elige');
  const comp = r => /^(3|6|9|12)\/8/.test(r.key);
  ok(gen.filter(comp).every(r => r.used.du) && !gen.some(r => !comp(r) && r.used.du), 'el dosillo sale en los compuestos y solo en ellos');
  ok(!gen.some(r => r.used.t && !['2/4', '3/4', '4/4', '5/4', '2/2', '3/2'].some(k => r.key.startsWith(k))), 'el tresillo solo en los simples');

  // celdas nuevas de compuesto, rq rq → rh en 4/4 y el lombardo solo si se elige
  const cells = await p.evaluate(() => {
    const T = __t, seen = { qss: 0, ssq: 0, ere: 0, lbNo: 0, rh44: 0, rqrq: 0, rqrqNoH: 0 };
    const pat = (evs, a) => evs.some((e, i) => a.every((x, j) => evs[i + j] && evs[i + j].dur === x[0] && !!evs[i + j].rest === !!x[1] && evs[i + j].cell === e.cell));
    Object.assign(T.set, { sig: '6/8', bars: 4, grp: {}, figs: ['qd', 'q', 'e', 's'], rests: ['e'], sync: false, ties: false });
    for (let k = 0; k < 300; k++) { T.generate(); T.score.measures.forEach(evs => { if (pat(evs, [[12], [3], [3]])) seen.qss++; if (pat(evs, [[3], [3], [12]])) seen.ssq++; if (pat(evs, [[6], [6, 1], [6]])) seen.ere++; }); }
    Object.assign(T.set, { sig: '4/4', figs: ['q', 'e', 'ed', 's'], rests: ['q', 'h'] });
    for (let k = 0; k < 300; k++) { T.generate(); T.score.measures.forEach(evs => { if (evs.some(e => e.fig === 'lb')) seen.lbNo++; if (evs.some(e => e.rest && e.dur === 24)) seen.rh44++; }); }
    Object.assign(T.set, { figs: ['q', 'h'], rests: ['q'] });
    for (let k = 0; k < 300; k++) { T.generate(); T.score.measures.forEach(evs => evs.forEach((e, i) => { const nx = evs[i + 1]; if (e.rest && e.dur === 12 && nx && nx.rest && nx.dur === 12 && e.start % 24 === 0) seen.rqrqNoH++; })); }
    return seen;
  });
  ok(cells.qss && cells.ssq && cells.ere, `6/8: salen q s s (${cells.qss}), s s q (${cells.ssq}) y e re e (${cells.ere})`);
  ok(cells.lbNo === 0, 'el ritmo lombardo no sale si no se elige (aunque estén la semicorchea y la corchea con puntillo)');
  ok(cells.rh44 > 0 && cells.rqrqNoH === 0, `4/4: dos silencios de negra en la misma mitad no salen nunca (${cells.rqrqNoH}); con silencio de blanca elegido, salen como uno de blanca (${cells.rh44} compases)`);

  // 2) editor: partir según la posición
  const ed = await p.evaluate(() => {
    const A = __t.ownApi, P = __t.pulseApi, ex = (sig, grp) => ({ sig, grp: grp || null });
    const rt = (t, e) => { try { return A.serialize(A.parseNotation(t, e), e); } catch (x) { return 'ERROR ' + x.message; } };
    const toks = (t, e) => A.parseNotation(t, e);
    const iss = (t, e) => P.pulseIssues(toks(t, e), e).length;
    const fix = (t, e) => A.serialize(P.pulseRewrite(toks(t, e), e).toks, e);
    return {
      a: rt('e w e e e q q', ex('4/4')), b: rt('q w q q q', ex('4/4')), c: rt('e e e w', ex('4/4')), d: rt('q rw q q q', ex('4/4')),
      e: rt('e w', ex('2/4')), f: rt('e h. e e', ex('6/8')), g: rt('rw q. q.', ex('6/8')), h: rt('q. e h.', ex('6/8')),
      i: rt('q q q. w', ex('7/8', '2+2+3')), j: rt('rw q q q', ex('3/4')), k: rt('q rw', ex('3/4')), l: rt('rh | q q', ex('2/4')),
      m: rt('rw | h h h', ex('3/2')), n: rt('rw h', ex('3/2')), o: rt('rw | q q q', ex('3/4')), p: rt('w | rw', ex('4/4')),
      q: rt('h. | rw | e e e e e e', ex('3/4')), r: rt('e w', ex('6/8')),
      i1: iss('e q q q e', ex('4/4')), i2: iss('q h. ', ex('4/4')), i3: iss('e q e q q', ex('4/4')), i4: iss('q h q', ex('4/4')),
      i5: iss('e e q e e', ex('6/8')), i6: iss('e. e. q.', ex('6/8')), i7: iss('h e', ex('5/8', '3+2')), i8: iss('q. e q q', ex('4/4')),
      i9: iss('s e. q', ex('2/4')), i10: iss('e rq e', ex('2/4')), i11: iss('q rh', ex('3/4')), i12: iss('h. q', ex('2/2')),
      f1: fix('e q q q e', ex('4/4')), f2: fix('q h.', ex('4/4')), f3: fix('e e q e e', ex('6/8')), f4: fix('e rq e', ex('2/4')), f5: fix('q rh', ex('3/4')),
      mrDur: toks('rw', ex('6/8'))[0].dur
    };
  });
  const eq = (k, want, what) => ok(ed[k] === want, `${what}: ${ed[k]}` + (ed[k] === want ? '' : ` (esperado ${want})`));
  eq('a', 'e e~ q~ h~ | e e e e q q', '4/4 «e w…» parte por tiempos');
  eq('b', 'q q~ h~ | q q q q', '4/4 «q w…» no pone la blanca con puntillo en el 2.º tiempo');
  eq('c', 'e e e e~ h~ | q.', '4/4 «e e e w»');
  eq('d', 'q rq rh | rq q q q', '4/4 «q rw…»: silencio de blanca en el 3.º tiempo');
  eq('e', 'e e~ q~ | h~ | e', '2/4 «e w»');
  eq('f', 'e q~ q.~ | e e e', '6/8 «e h. e e»');
  eq('g', 'rw | q. q.', '6/8 «rw»: silencio de compás entero');
  eq('h', 'q. e q~ | q.~ e', '6/8 «q. e h.»');
  eq('i', 'q q q. | q~ q~ q.~ | e', '7/8 (2+2+3): una figura por grupo al partir');
  eq('j', 'rw | q q q', '3/4 «rw q q q»');
  eq('k', 'q rq rq | rq', '3/4 «q rw»: a mitad de compás se reparte (dura un compás)');
  eq('l', 'rw | q q', '2/4 un silencio que llena el compás es el de compás entero');
  eq('m', 'rw | h h h', '3/2 «rw» llena el compás');
  eq('n', 'rh rh h', '3/2 notación antigua «rw h» (rw = 4 negras) se respeta');
  eq('o', 'rw | q q q', 'ida y vuelta de «rw» en 3/4');
  eq('p', 'w | rw', '4/4 sin cambios con «rw»');
  eq('q', 'h. | rw | e e e e e e', '3/4 con compases marcados y «rw»');
  eq('r', 'e q~ q.~ | q.', '6/8 «e w»');
  ok(ed.mrDur === 36, 'en 6/8 el silencio de compás entero dura 36 ticks');
  ok(ed.i1 === 1 && ed.i2 === 1 && ed.i5 === 1 && ed.i7 === 1 && ed.i10 === 1 && ed.i11 === 1, `aviso de figuras que ocultan el pulso (${[ed.i1, ed.i2, ed.i5, ed.i7, ed.i10, ed.i11]})`);
  ok(!ed.i3 && !ed.i4 && !ed.i6 && !ed.i8 && !ed.i9 && !ed.i12, `sin aviso en síncopas, dosillo, negra con puntillo, lombardo y h. q en 2/2 (${[ed.i3, ed.i4, ed.i6, ed.i8, ed.i9, ed.i12]})`);
  eq('f1', 'e q e~ e q e', 'reescribir 4/4 «e q q q e»');
  eq('f2', 'q q~ h', 'reescribir 4/4 «q h.»');
  eq('f3', 'e e e~ e e e', 'reescribir 6/8 «e e q e e»');
  eq('f4', 'e re re e', 'reescribir 2/4 «e rq e»');
  eq('f5', 'q rq rq', 'reescribir 3/4 «q rh»');

  // 3) dibujo
  const mk = async (sig, notation, grp) => p.evaluate(([sig, notation, grp]) => {
    const T = __t; T.setView('propio');
    const x = T.own.cur; x.sig = sig; x.grp = grp || null; x.notation = notation; T.ownApi.ownOpen(x);
    const svg = document.querySelector('#score svg.sys'), bars = [...svg.querySelectorAll('line.bar')].map(l => +l.getAttribute('x1'));
    const evs = [...document.querySelectorAll('#score .ev')].map(g => ({ i: +g.dataset.i, rest: g.classList.contains('rest'), off: g.classList.contains('offp'), flags: g.querySelectorAll('path:not(.tie)').length }));
    const beams = [...document.querySelectorAll('#score .beam')].map(g => { const r = g.querySelector('rect'); return { x: +r.getAttribute('x'), w: +r.getAttribute('width'), n: g.querySelectorAll('rect').length, t: g.textContent }; });
    return { bars, evs, beams, xs: T.score.flat.map(e => e.x), notation: T.own.cur.notation, warn: !document.querySelector('#pulseWarn').hidden };
  }, [sig, notation, grp]);
  await p.click('#tab-propio'); await p.waitForSelector('#secEdit', { state: 'visible' });
  let d = await mk('3/4', 'h. | rw | q q q');
  const mx0 = d.bars[0], mw1 = d.bars[1] - d.bars[0];
  ok(d.xs[0] < 80 + 30, `una nota sola en el compás va a la izquierda (x=${Math.round(d.xs[0])})`);
  ok(Math.abs(d.xs[1] - (mx0 + mw1 / 2)) < 12, `el silencio de compás entero va centrado (x=${Math.round(d.xs[1])}, centro ${Math.round(mx0 + mw1 / 2)})`);
  d = await mk('4/4', 'e rs s q h');
  ok(d.beams.length === 1 && d.beams[0].w > d.xs[2] - d.xs[0] - 2 && d.beams[0].n === 2, `4/4 «e rs s»: la barra pasa sobre el silencio, con media barra en la semicorchea (${JSON.stringify(d.beams)})`);
  d = await mk('6/8', 'e rs s e q.');
  ok(d.beams.length === 1 && d.beams[0].w > d.xs[3] - d.xs[0] - 2, '6/8 «e rs s e»: un solo grupo de barras');
  d = await mk('6/8', 're e e rq e');
  ok(d.beams.length === 1 && d.beams[0].x > d.xs[0] + 5, '6/8 «re e e»: el silencio del principio queda fuera de la barra');
  d = await mk('2/2', 'e e e e h | e e q e e e e');
  ok(d.beams.length === 3 && d.beams[0].w > d.xs[3] - d.xs[0] - 2, `2/2: cuatro corcheas en el pulso de blanca bajo una barra (${d.beams.length} grupos)`);
  d = await mk('4/4', 'e e e e h');
  ok(d.beams.length === 2, '4/4: las corcheas siguen agrupadas por negra');
  d = await mk('4/4', 'e q q q e');
  ok(d.warn && d.evs.filter(e => e.off).length === 1, 'aviso y figura marcada en «e q q q e»');
  await p.click('#ownFix');
  ok(await until(p, () => __t.own.cur.notation === 'e q e~ e q e' && document.querySelector('#pulseWarn').hidden), '«Reescribir según el pulso» la reescribe y quita el aviso');
  // silencio de redonda con la paleta en 3/4
  await mk('3/4', 'q q q');
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press('s'); await p.keyboard.press('1');
  ok(await until(p, () => __t.own.cur.notation === 'q q q | rw'), 'silencio + redonda en 3/4 añade el silencio de compás entero');

  // dosillo y lombardo en el dibujo; «Editar» copia el ritmo con ellos
  const dl = await p.evaluate(() => {
    const T = __t; T.setView('libre');
    Object.assign(T.set, { sig: '6/8', bars: 4, grp: {}, figs: ['qd', 'du'], rests: ['w', 'e'], sync: false, ties: false });
    let n2 = 0; for (let k = 0; k < 40 && !n2; k++) { T.generate(); n2 = [...document.querySelectorAll('#score .beam .tup')].filter(t => t.textContent === '2').length; }
    const dots = T.score.flat.filter(e => e.duplet).length;
    T.pulseApi.editThis();
    const nota = T.own.cur.notation, issues = T.own.issues.length;
    T.setView('libre');
    Object.assign(T.set, { sig: '2/4', figs: ['q', 'lb'], rests: [] });
    let lb = 0; for (let k = 0; k < 40 && !lb; k++) { T.generate(); lb = T.score.flat.filter(e => e.fig === 'lb').length; }
    return { n2, dots, nota, issues, lb, beams: document.querySelectorAll('#score .beam').length };
  });
  ok(dl.n2 > 0 && dl.dots > 0, `el dosillo se dibuja como dos corcheas con «2» (${dl.n2})`);
  ok(/e\. e\./.test(dl.nota) && dl.issues === 0, `«Editar» copia el dosillo como dos corcheas con puntillo, sin avisos (${dl.nota})`);
  ok(dl.lb > 0 && dl.beams > 0, 'el ritmo lombardo sale con su barra');

  // 4) panel: avisos de silencios
  const notes = await p.evaluate(() => {
    const T = __t, txt = () => { const n = document.querySelector('#notice'); return n.hidden ? '' : n.textContent; };
    Object.assign(T.set, { sig: '3/4', figs: ['q', 'h'], rests: ['w', 'q'] }); T.generate(); const a = txt();
    Object.assign(T.set, { sig: '6/8', figs: ['qd', 'q', 'e'], rests: ['w', 'qd'] }); T.generate(); const b2 = txt();
    Object.assign(T.set, { sig: '4/4', figs: ['q', 'e'], rests: ['qd', 'q'] }); T.generate(); const c = txt();
    Object.assign(T.set, { sig: '6/8', figs: ['qd', 'q', 'e'], rests: ['h'] }); T.generate(); const d = txt();
    return { a, b: b2, c, d };
  });
  ok(!notes.a && !notes.b, 'sin aviso falso del silencio de redonda en 3/4 ni en 6/8');
  ok(notes.c.includes('silencio de negra y silencio de corchea'), 'el silencio de negra con puntillo en 4/4 explica cómo se escribe: ' + notes.c);
  ok(notes.d.includes('no se usa el silencio de blanca'), '6/8 con silencio de blanca: ' + notes.d);

  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|'));
});

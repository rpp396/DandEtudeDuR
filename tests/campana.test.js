// Campaña: orden y capítulos, datos de cada nivel, tempos y textos coherentes, rasgos de cada nivel nuevo,
// término de tempo según el pulso (6/8, 7/8, 3/8), ficha del nivel con la figura de los ppm y desbloqueo tras reordenar
const { suite } = require('./lib');

const N = 60; // ritmos por nivel para los rasgos

suite('Campaña: niveles, tempos y terminología', async ({ b, URL, ok, page, open, until }) => {
  let p = await page(b); await open(p, URL);

  // ---- Datos de los niveles (CHAPTERS, LEVELS… son const globales: se leen desde la página)
  const D = await p.evaluate(() => ({
    chapters: CHAPTERS, levels: __t.LEVELS.map(l => ({ ...l, kind: SIGS[l.sig].kind, click: SIGS[l.sig].click, groups: sigOf(l).groups, odd: ODD_GROUPS[l.sig] || null,
      mark: tempoMark(l.bpm, SIGS[l.sig]), pulse: Math.round(pulseBpm(l.bpm, SIGS[l.sig])) })),
    figs: FIGS.map(f => f.k), rests: RESTS.map(r => r.k),
  }));
  const L = D.levels, idx = id => L.findIndex(l => l.id === id), chOf = name => D.chapters.indexOf(name);
  const ids = L.map(l => l.id);
  ok(L.length === 39 && D.chapters.length === 7, `39 niveles en 7 capítulos (${L.length} en ${D.chapters.length})`);
  ok(new Set(ids).size === ids.length && Array.from({ length: 39 }, (_, i) => 'L' + (i + 1)).every(id => ids.includes(id)), 'ids únicos, de L1 a L39');
  ok(L.every((l, i) => i === 0 || l.ch >= L[i - 1].ch) && D.chapters.every((_, ci) => L.some(l => l.ch === ci)), 'los capítulos van en orden y ninguno queda vacío');
  ok(ids.slice(0, 5).join() === 'L1,L2,L3,L4,L5', 'empieza como antes (L1…L5)');
  ok(idx('L22') < idx('L21') && idx('L21') < idx('L32') && idx('L32') < idx('L23'), 'ligaduras antes que síncopas: L22, L21, L32, L23');
  ok(chOf('Ligaduras y síncopas') >= 0 && chOf('Ligaduras y síncopas') < chOf('Compases compuestos') && chOf('Compases compuestos') < chOf('Compases de amalgama') && chOf('Compases de amalgama') < chOf('Desafíos'),
    'capítulos: ligaduras y síncopas → compuestos → amalgama → desafíos ' + D.chapters.join(' | '));
  const inCh = name => L.filter(l => l.ch === chOf(name));
  ok(inCh('Ligaduras y síncopas').every(l => l.kind === 'simple' && (l.ties || l.sync)), 'el capítulo de ligaduras y síncopas es todo en compás simple y con ligaduras o síncopas');
  ok(inCh('Compases compuestos').every(l => l.kind === 'compound'), 'el capítulo de compuestos es todo compuesto: ' + inCh('Compases compuestos').map(l => l.sig).join(' '));
  ok(inCh('Compases de amalgama').every(l => l.kind === 'odd'), 'el capítulo de amalgama es todo de amalgama');
  ok(['2/2', '3/2', '3/8', '9/8'].every(s => L.some(l => l.sig === s)), 'hay niveles de 2/2, 3/2, 3/8 y 9/8');
  ok(L.find(l => l.id === 'L30').sig === '2/2' && L[idx('L30') - 1].id === 'L9', 'L30 (compás partido) va tras L9');
  ok(L[idx('L35') - 1].id === 'L12' && L[idx('L31') - 1].id === 'L14', 'L35 (lombardo) tras L12 y L31 (silencios en 6/8) tras L14');

  for (const l of L) {
    const bad = [];
    if (!l.figs.length || !l.figs.every(k => D.figs.includes(k))) bad.push('figuras');
    if (!l.rests.every(k => D.rests.includes(k))) bad.push('silencios');
    if (l.figs.includes('t') && l.kind !== 'simple') bad.push('tresillo fuera de simple');
    if (l.figs.includes('du') && l.kind !== 'compound') bad.push('dosillo fuera de compuesto');
    if (l.odd ? !l.odd.includes(l.grp) : l.grp) bad.push('agrupación');
    if (!(l.bpm >= 30 && l.bpm <= 240) || !(l.goal >= 70 && l.goal <= 80) || !(l.bars >= 1 && l.bars <= 8)) bad.push('tempo, objetivo o compases');
    if (!l.title || !l.desc || l.desc.length > 200) bad.push('textos');
    ok(!bad.length, `${l.id} ${l.sig} ${l.bpm}: datos válidos ${bad.join(', ')}`);
  }

  // ---- Tempos: golpes por segundo de la figura más rápida (tresillo 4 ticks, semicorchea y lombardo 3, dosillo 9…)
  const minDur = l => Math.min(...l.figs.map(k => ({ w: 48, hd: 36, h: 24, qd: 18, q: 12, ed: 9, e: 6, t: 4, s: 3, lb: 3, du: 9 }[k])));
  const rate = l => l.bpm * l.click / 60 / minDur(l);
  let top = 0; const jumps = [];
  L.forEach(l => { const r = rate(l); if (l.ch !== chOf('Desafíos') && (r > 4.5 || r > top + 1.01)) jumps.push(`${l.id} ${r.toFixed(2)}/s (máx. previo ${top.toFixed(2)})`); top = Math.max(top, r); });
  ok(!jumps.length, 'fuera de los desafíos, como mucho 4,5 golpes/s y sin saltos de más de 1 golpe/s sobre lo ya visto ' + jumps.join('; '));
  ok(['L18', 'L29'].every(id => { const l = L[idx(id)]; return l.bpm >= 120 && l.bpm <= 126; }), 'L18 y L29 (5/8 con semicorcheas) a 120–126 ppm de corchea');
  const l15 = L[idx('L15')];
  ok(!l15.rests.includes('qd') && !l15.rests.includes('q') && L[idx('L31')].rests.includes('qd') && idx('L31') < idx('L15'), 'L15 ya no mete a la vez semicorcheas y tres silencios nuevos: los silencios van antes, en L31');

  // ---- Textos: ningún término italiano que no corresponda al tempo (según el pulso) ni términos descartados
  const TERMS = ['Grave', 'Lento', 'Largo', 'Larghetto', 'Adagio', 'Andante', 'Andantino', 'Moderato', 'Allegretto', 'Allegro', 'Vivace', 'Presto', 'Prestissimo'];
  for (const l of L) {
    const txt = l.title + ' ' + l.desc, said = TERMS.filter(t => new RegExp('\\b' + t + '\\b').test(txt));
    if (said.length) ok(said.every(t => t === l.mark), `${l.id}: dice «${said.join(', ')}» y su tempo (${l.pulse} ppm de pulso) es ${l.mark}`);
    const odd = l.kind === 'odd' && /cada corchea/.test(l.desc) && !/luces/.test(l.desc);
    ok(!/irregular|1-e-y-a|compasillo partido|Allegro/i.test(txt) && !odd, `${l.id}: sin «irregular», «1-e-y-a» ni «el metrónomo marca cada corchea» en amalgama`);
  }
  ok(['L10', 'L27'].every(id => /1-i-y-a/.test(L[idx(id)].desc)) && /1-y, 2-y/.test(L[idx('L6')].desc), 'silabeo: «1-y» para corcheas y «1-i-y-a» para semicorcheas (la «y» siempre en la mitad del tiempo)');
  ok(L[idx('L20')].mark === 'Andante' && /Andante/.test(L[idx('L20')].desc), 'L20 (Maestría, 100 ppm) dice Andante, no Allegro');
  ok(L.filter(l => l.kind === 'odd').every(l => /amalgama|grupo|Agrupado|pulso/.test(l.desc)) && /amalgama/.test(L[idx('L17')].desc), 'amalgama: L17 dice «compás de amalgama»');

  // ---- Término de tempo según el pulso
  const tm = await p.evaluate(() => ({
    t68: tempoMark(50, SIGS['6/8']), t68b: tempoMark(120, SIGS['6/8']), t78: tempoMark(150, SIGS['7/8']), p78: pulseBpm(150, SIGS['7/8']), t38: tempoMark(132, SIGS['3/8']),
    t44: tempoMark(100, SIGS['4/4']), t22: tempoMark(60, SIGS['2/2']), t58: tempoMark(150, SIGS['5/8']), t88: tempoMark(240, SIGS['8/8']), raw: tempoMark(150),
    titles: [SIG_TITLES['2/2'], SIG_TITLES['4/4']],
  }));
  ok(tm.t68 === 'Largo' && tm.t68b === 'Allegro', `6/8: el término sale de la negra con puntillo (♩.=50 → ${tm.t68}, ♩.=120 → ${tm.t68b})`);
  ok(tm.t78 !== 'Allegro' && Math.round(tm.p78) === 64 && tm.t78 === 'Larghetto', `7/8 a ♪=150: pulso ≈ ${Math.round(tm.p78)} → ${tm.t78} (no Allegro)`);
  ok(tm.t58 === 'Larghetto' && tm.t88 === 'Andante', `5/8 a ♪=150 (pulso 60) → ${tm.t58}; 8/8 a ♪=240 (pulso 90) → ${tm.t88}`);
  ok(tm.t38 === 'Largo' && tm.t44 === 'Andante' && tm.t22 === 'Larghetto' && tm.raw === 'Allegro', `3/8 a ♪=132 → ${tm.t38}; 4/4 a 100 → ${tm.t44}; 2/2 a 𝅗𝅥=60 → ${tm.t22}`);
  ok(tm.titles[0] === 'Compás partido (alla breve)' && tm.titles[1] === 'Compasillo', '«Compás partido» para 2/2 ' + tm.titles.join(' / '));

  // ---- En el control de tempo (práctica libre): término, figura del clic y etiqueta
  const ctl = async (sig, bpm) => p.evaluate(([sig, bpm]) => {
    document.querySelector(`#sigs [data-sig="${sig}"]`).click();
    const i = document.querySelector('#bpm'); i.value = bpm; i.dispatchEvent(new Event('change', { bubbles: true })); i.dispatchEvent(new Event('input', { bubbles: true }));
    return { mark: document.querySelector('#tMark').textContent, title: document.querySelector('#tMark').title, aria: i.getAttribute('aria-label'), glyph: document.querySelector('#tGlyph').title, bpm: __t.set.bpm };
  }, [sig, bpm]);
  let c = await ctl('7/8', 150);
  ok(c.bpm === 150 && c.mark === 'Larghetto' && /64/.test(c.title) && c.aria === 'Pulsos por minuto de corchea' && c.glyph === 'Corchea', '7/8 a 150: «Larghetto», con el pulso en el título y los ppm de corchea ' + JSON.stringify(c));
  c = await ctl('6/8', 50);
  ok(c.mark === 'Largo' && c.title === '' && c.aria === 'Pulsos por minuto de negra con puntillo', '6/8 a 50: «Largo», ppm de negra con puntillo ' + JSON.stringify(c));
  c = await ctl('4/4', 120);
  ok(c.mark === 'Allegro' && c.aria === 'Pulsos por minuto de negra', '4/4 a 120: «Allegro» ' + JSON.stringify(c));
  c = await ctl('3/8', 132);
  ok(c.mark === 'Largo' && /negra con puntillo/.test(c.title), '3/8 a 132: el término sale de la negra con puntillo ' + JSON.stringify(c));
  // cambiar de compás sin tocar el tempo también lo recalcula (3/8 a 132: Largo; 4/4 a 132: Allegro)
  await p.evaluate(() => document.querySelector('#sigs [data-sig="4/4"]').click());
  ok(await p.textContent('#tMark') === 'Allegro' && await p.getAttribute('#tMark', 'title') === '', 'al pasar de 3/8 a 4/4 con 132 el término se recalcula: ' + await p.textContent('#tMark'));

  // ---- Rasgos de los niveles nuevos (más allá de las figuras, que comprueba cover.test.js) y tiempo de generate()
  const R = await p.evaluate(N => {
    const T = __t, out = {};
    const cells = sc => { const r = []; sc.measures.forEach(evs => { const by = {}; evs.forEach(e => (by[e.cell] = by[e.cell] || []).push(e)); Object.values(by).forEach(c => r.push(c.map(e => (e.rest ? 'r' : '') + e.dur).join(' '))); }); return r; };
    const feat = { L21: c => c.includes('6 12 6'), L32: c => c.includes('12 24 12'), L36: c => c.includes('12 3 3') || c.includes('3 3 12'), L15: c => c.includes('9 3 6'),
      L39: (c, sc) => sc.measures.some(m => m.length === 1 && m[0].mr), L37: (c, sc) => sc.flat.some(e => e.duplet), L35: (c, sc) => sc.flat.some(e => e.fig === 'lb') };
    T.LEVELS.forEach((l, i) => {
      T.setLevelForTest(i);
      const t0 = performance.now(); let hit = 0;
      for (let k = 0; k < N; k++) { T.generate(); const f = feat[l.id]; if (f && f(cells(T.score), T.score)) hit++; }
      out[l.id] = { ms: (performance.now() - t0) / N, hit, has: !!feat[l.id] };
    });
    return out;
  }, N);
  // las celdas de síncopa y q s s no son figuras que generate() tenga que cubrir: salen al azar (≈ 65–80 %); el resto, siempre
  const loose = {};   // las celdas que enseña cada nivel (síncopa, negra-blanca-negra, q s s) se declaran en need y generate() las garantiza
  for (const [id, r] of Object.entries(R)) if (r.has) ok(r.hit >= N * (loose[id] || 1), `${id}: su rasgo propio sale en ${r.hit}/${N} ritmos`);
  const slow = Object.entries(R).filter(([, r]) => r.ms > 40).map(([id, r]) => id + ' ' + r.ms.toFixed(1) + ' ms');
  ok(!slow.length, 'generate() tarda menos de 40 ms de media en todos los niveles ' + slow.join(', ') + ' (máx. ' + Math.max(...Object.values(R).map(r => r.ms)).toFixed(1) + ' ms)');

  // ---- Ficha del nivel: figura de los ppm y término
  await p.evaluate(() => __t.setView('campana'));
  const meta = async id => p.evaluate(id => { __t.prog.levels[id] = { best: 0, stars: 0, tries: 1 }; __t.selectLevel(__t.LEVELS.findIndex(l => l.id === id)); return document.querySelector('#lvMeta').textContent + ' | ' + document.querySelector('#tMark').textContent; }, id);
  let m = await meta('L14');
  ok(/Negra con puntillo = 50 · Largo/.test(m) && /Largo$/.test(m), 'ficha de L14: «Negra con puntillo = 50 · Largo» ' + m);
  m = await meta('L17');
  ok(/Corchea = 150 · Larghetto/.test(m) && /Larghetto$/.test(m), 'ficha de L17: «Corchea = 150 · Larghetto» ' + m);
  m = await meta('L30');
  ok(/Blanca = 50/.test(m), 'ficha de L30: «Blanca = 50» ' + m);
  await until(p, () => /ppm de blanca/.test(document.querySelector('#srLive').textContent));
  ok(/50 ppm de blanca/.test(await p.textContent('#srLive')), 'el anuncio del nivel dice a qué figura van los ppm: ' + await p.textContent('#srLive'));
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|')); await p.context().close();

  // ---- Desbloqueo con el orden nuevo: lo superado o intentado sigue abierto; lo nuevo se abre tras lo superado
  p = await page(b);
  await p.addInitScript(() => { if (!sessionStorage.x) { sessionStorage.x = 1;
    const lv = {}; ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12', 'L27', 'L13', 'L14', 'L15', 'L16'].forEach(id => lv[id] = { best: 85, stars: 1, tries: 2 });
    lv.L21 = { best: 50, stars: 0, tries: 3 };   // antes iba tras L16: estaba abierto e intentado
    localStorage.setItem('solfeo-ritmico-progreso-v1', JSON.stringify({ levels: lv, sessions: [] }));
    localStorage.setItem('solfeo-ritmico-v1', JSON.stringify({ view: 'campana', levelId: 'L21', sv: 3, seen: true })); } });
  await open(p, URL);
  const u = await p.evaluate(() => { const o = {}; __t.LEVELS.forEach((l, i) => o[l.id] = unlocked(i)); return { o, cur: __t.LEVELS[__t.levelIdx].id }; });
  ok(['L14', 'L15', 'L16', 'L13', 'L21'].every(id => u.o[id]), 'superados (L14–L16) e intentado (L21) siguen abiertos aunque ahora vayan tras niveles sin superar');
  ok(u.o.L39 && u.o.L30 && u.o.L35 && u.o.L22 && u.o.L31, 'los niveles nuevos tras uno superado se abren (L39, L30, L35, L31) y L22 tras L13');
  ok(!u.o.L32 && !u.o.L23 && !u.o.L17 && !u.o.L20, 'lo que sigue a niveles sin superar sigue cerrado (L32, L23, L17, L20)');
  ok(u.cur === 'L21', 'se queda en el nivel guardado (L21) ' + u.cur);
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|')); await p.context().close();
});

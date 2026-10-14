// Campaña: cada ritmo generado en un nivel usa todas las figuras y silencios que el nivel declara
const { suite } = require('./lib');

const N = 100; // ritmos por nivel

suite('Cobertura de figuras en los niveles', async ({ b, URL, ok, page, open }) => {
  const p = await page(b); await open(p, URL);
  const res = await p.evaluate(N => {
    const T = __t, out = [];
    for (let i = 0; i < T.LEVELS.length; i++) {
      T.setLevelForTest(i);
      const l = T.LEVELS[i], want = [...l.figs, ...T.restList(l).map(k => 'r' + k)];
      let full = 0, notes = 0; const miss = {};
      for (let k = 0; k < N; k++) {
        T.generate();
        const u = T.figsUsed(T.score.measures), m = want.filter(x => !u.has(x));
        if (!m.length) full++;
        m.forEach(x => miss[x] = (miss[x] || 0) + 1);
        if (T.score.flat.some(e => !e.rest)) notes++;
      }
      out.push({ id: l.id, want: want.join(','), full, notes, miss });
    }
    return out;
  }, N);
  ok(res.length >= 39, `se recorren los ${res.length} niveles de la campaña`);
  for (const r of res) ok(r.full === N && r.notes === N, `${r.id}: ${r.full}/${N} ritmos con todo (${r.want})` + (r.full < N ? ' faltan ' + JSON.stringify(r.miss) : '') + (r.notes < N ? ` · ${N - r.notes} sin ninguna nota` : ''));
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|'));
});

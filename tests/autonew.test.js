// «Mis ejercicios» sin ejercicios guardados: al entrar (o al borrar el último) se crea uno vacío; no al llegar con un enlace
const { suite } = require('./lib');

suite('Ejercicio vacío automático', async ({ b, URL, ok, page, open, until }) => {
  const p = await page(b); await open(p, URL);
  const st = () => p.evaluate(() => ({ n: __t.own.list.length, id: __t.own.cur && __t.own.cur.id, name: __t.own.cur && __t.own.cur.name, notation: __t.own.cur && __t.own.cur.notation, edit: !document.querySelector('#secEdit').hidden }));

  let s = await st();
  ok(s.n === 0 && !s.edit, 'en Práctica libre no se crea nada ' + JSON.stringify(s));
  await p.click('#tab-propio');
  ok(await until(p, () => __t.own.list.length === 1 && __t.own.cur && !document.querySelector('#secEdit').hidden), 'al entrar sin ejercicios se crea y abre uno vacío');
  s = await st();
  ok(s.notation === '' && s.n === 1, 'el ejercicio nuevo está vacío ' + JSON.stringify(s));
  const id0 = s.id;
  await p.click('#tab-libre'); await p.click('#tab-propio');
  s = await st();
  ok(s.n === 1 && s.id === id0 && s.edit, 'al volver no se crea otro');
  await p.click('#ownDel'); await p.click('#ownDelYes');
  ok(await until(p, id => __t.own.list.length === 1 && __t.own.cur && __t.own.cur.id !== id && !document.querySelector('#secEdit').hidden, id0), 'al borrar el único se crea y abre uno vacío nuevo');
  await p.reload(); await p.waitForFunction(() => window.__t && document.readyState === 'complete');
  s = await st();
  ok(s.n === 1 && s.edit, 'tras recargar sigue habiendo uno ' + JSON.stringify(s));

  // enlace con lista vacía: solo queda el ejercicio del enlace
  const link = await p.evaluate(() => __t.ownApi.exLink({ name: 'Del enlace', sig: '3/4', bpm: 90, notation: 'q q q' }));
  const q = await page(b);
  await open(q, URL, link.slice(link.indexOf('#')));
  ok(await until(q, () => __t.own.list.length === 1 && __t.own.list[0].name === 'Del enlace'), 'enlace con lista vacía: solo el ejercicio recibido ' + JSON.stringify(await q.evaluate(() => __t.own.list.map(x => x.name))));
  ok(p.errs.length === 0 && q.errs.length === 0, 'sin errores ' + p.errs.concat(q.errs).join('|'));
});

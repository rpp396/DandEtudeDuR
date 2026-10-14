// Forma de tocar: modo piano por defecto (también para ajustes guardados antiguos, sv 4), selector destacado,
// bienvenida que lo explica y sonido de redoblante en modo batería
const { suite, MOB } = require('./lib');

suite('Modo piano y batería', async ({ b, URL, ok, page, open, until }) => {
  // primera vez, sin ajustes guardados
  const p = await page(b, { welcome: true }); await open(p, URL);
  ok(await p.evaluate(() => __t.set.hold === true), 'sin ajustes guardados, el modo piano viene activado');
  const pressed = () => p.evaluate(() => [...document.querySelectorAll('#modeSeg button')].map(x => x.dataset.hold + ':' + x.getAttribute('aria-pressed')).join(' '));
  ok(await pressed() === '1:true 0:false', 'el selector marca Piano ' + await pressed());
  const wel = await p.textContent('#welcome');
  ok(!(await p.isHidden('#welcome')) && /Piano/.test(wel) && /Batería/.test(wel), 'la bienvenida explica Piano y Batería');
  ok(await p.evaluate(() => document.querySelector('.mode-lbl').textContent.trim()) === 'Forma de tocar' && await p.evaluate(() => document.querySelector('#modeSeg').getAttribute('aria-labelledby')) === 'modeLbl', 'el selector tiene título «Forma de tocar» y nombre accesible');
  const mp = await p.evaluate(() => { const a = document.querySelector('#modeSeg').getBoundingClientRect(), c = document.querySelector('#bPractice').getBoundingClientRect(); return a.bottom <= c.top + 1; });
  ok(mp, 'el selector va encima de «Practicar»');
  await p.click('#modeSeg button[data-hold="0"]');
  ok(await p.evaluate(() => __t.set.hold === false && !document.querySelector('#holdSw').checked && JSON.parse(localStorage.getItem('solfeo-ritmico-v1')).hold === false), 'elegir Batería lo guarda y sincroniza el interruptor del panel');
  ok(await pressed() === '1:false 0:true', 'el selector marca Batería');

  // migración: ajustes antiguos (sv 3) en batería pasan a piano una vez; con sv 4 se respeta la elección
  const q = await page(b);
  await q.addInitScript(() => { if (!sessionStorage.x) { sessionStorage.x = 1; localStorage.setItem('solfeo-ritmico-v1', JSON.stringify({ seen: true, sv: 3, hold: false })); } });
  await open(q, URL);
  ok(await q.evaluate(() => __t.set.hold === true && __t.set.sv === 4), 'ajustes guardados con sv 3: pasan a modo piano (sv 4)');
  await q.click('#modeSeg button[data-hold="0"]');
  await q.reload(); await q.waitForFunction(() => window.__t && document.readyState === 'complete');
  ok(await q.evaluate(() => __t.set.hold === false), 'con sv 4 se respeta haber elegido Batería al recargar');

  // sonido de redoblante: ruido (bordonera) más tono (parche), en el toque de batería y en el «Golpe de redoblante»
  const snd = await q.evaluate(() => {
    ensureAudio(); const c = __t.ctx, n = { buf: 0, osc: 0 };
    const cb = c.createBufferSource.bind(c), co = c.createOscillator.bind(c);
    c.createBufferSource = () => { n.buf++; return cb(); }; c.createOscillator = () => { n.osc++; return co(); };
    __t.set.hold = false; __t.set.tapSound = true; __t.set.tapVol = 0.6;
    tapSoundOn('test'); const tap = { ...n }; n.buf = 0; n.osc = 0;
    __t.set.timbre = 'golpe'; noteSound(master, c.currentTime + 0.05, 0.5, 0.5); const note = { ...n };
    c.createBufferSource = cb; c.createOscillator = co;
    return { tap, note, opt: document.querySelector('#timbre option[value="golpe"]').textContent };
  });
  ok(snd.tap.buf === 1 && snd.tap.osc >= 2, 'el toque en modo batería suena a redoblante (ruido + parche) ' + JSON.stringify(snd.tap));
  ok(snd.note.buf === 1 && snd.note.osc >= 2, '«Golpe de redoblante» en el ritmo usa el mismo sonido ' + JSON.stringify(snd.note));
  ok(snd.opt === 'Golpe de redoblante', 'la opción se llama «Golpe de redoblante»');

  // móvil: los dos botones caben uno al lado del otro y miden al menos 44 px
  const m = await page(b, MOB); await open(m, URL);
  const r = await m.evaluate(() => [...document.querySelectorAll('#modeSeg button')].map(x => { const k = x.getBoundingClientRect(); return { t: Math.round(k.top), h: k.height, w: k.width }; }));
  ok(r.length === 2 && r[0].t === r[1].t && r.every(x => x.h >= 44 && x.w > 120), 'en el móvil, Piano y Batería lado a lado y de al menos 44 px ' + JSON.stringify(r));
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin desplazamiento horizontal');
  ok(p.errs.length === 0 && q.errs.length === 0 && m.errs.length === 0, 'sin errores ' + p.errs.concat(q.errs, m.errs).join('|'));
});

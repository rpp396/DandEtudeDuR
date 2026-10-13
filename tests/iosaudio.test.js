// Audio en iOS/Safari: audioSession, interrupciones del contexto y página oculta
const { suite } = require('./lib');

suite('Audio: sesión, interrupciones y página oculta', async ({ b, URL, ok, page, open, until, waitRunning, waitStopped }) => {
  const hide = (p, h) => p.evaluate(h => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); document.dispatchEvent(new Event('visibilitychange')); }, h);

  let p = await page(b);
  await p.addInitScript(() => { navigator.audioSession = { type: 'auto' }; });
  await open(p, URL);
  ok(await p.evaluate(() => navigator.audioSession.type) === 'auto', 'antes de tocar nada no se cambia la sesión');
  await p.click('#bPlay'); await waitRunning(p, 'play');
  ok(await until(p, () => navigator.audioSession.type === 'playback'), 'al reproducir: audioSession = playback');
  ok(await until(p, () => __t.ctx.state === 'running'), 'el audio está en marcha');
  await p.click('#bStop'); await waitStopped(p);

  // interrupción durante la práctica
  await p.click('#bPractice'); await waitRunning(p, 'practice');
  await p.evaluate(() => __t.ctx.suspend());
  ok(await until(p, () => !__t.S.running) && await p.$eval('#results', e => e.hidden), 'interrupción: la práctica se detiene sin resultados');
  await p.click('#bPractice');
  ok(await until(p, () => __t.ctx.state === 'running' && __t.S.running), 'al volver a practicar el audio se reanuda');

  // salir de la página
  await hide(p, true);
  ok(await p.evaluate(() => !__t.S.running), 'al ocultar la página se corta la práctica');
  await p.evaluate(() => __t.ctx.suspend());
  await p.waitForFunction(() => __t.ctx.state === 'suspended');
  await hide(p, false);
  ok(await until(p, () => __t.ctx.state === 'running'), 'al volver a la página el audio se reanuda');

  // el metrónomo no se corta al ocultar
  await p.click('#bMetro'); await waitRunning(p, 'metro');
  await hide(p, true);
  ok(await p.evaluate(() => __t.S.running && __t.S.mode === 'metro'), '«Solo metrónomo» sigue al ocultar la página');
  ok(p.errs.length === 0, 'sin errores ' + p.errs.join('|')); await p.context().close();

  // sin audioSession (Chrome, Android): sin errores
  p = await page(b); await open(p, URL);
  await p.click('#bPlay'); await waitRunning(p, 'play');
  ok(p.errs.length === 0 && await p.evaluate(() => __t.S.running), 'sin audioSession funciona igual');
});

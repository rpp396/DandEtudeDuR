// Ayudantes comunes de las pruebas de navegador (Playwright + Chromium).
//
// - Construye una copia de index.html, styles.css y js/ en un directorio temporal (fuera del repo) con `window.__t`
//   en un script extra (js/test-hook.js) cargado después de los de la app, para dar acceso a su estado interno.
// - Las fuentes de Google se sirven vacías: las pruebas no dependen de la red.
// - Cada archivo *.test.js define una suite con `suite(nombre, async ctx => {...})`.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const url = require('url');
const { execSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');

function loadPlaywright() {
  const tries = [() => require('playwright'), () => require('playwright-core'),
    () => require(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'))];
  let last;
  for (const t of tries) { try { return t(); } catch (e) { last = e; } }
  throw new Error('No se encuentra Playwright (npm install, o instálalo globalmente): ' + last.message);
}
const { chromium } = loadPlaywright();

// Estado interno expuesto a las pruebas (js/test-hook.js, cargado después de inicio.js)
const HOOK = "window.__t={get own(){return own}, get ownApi(){ return typeof parseNotation==='function' ? {parseNotation,serialize,reflow,importAny,exLink,exText,exJSON,fromLinkCode,ownInsert,ownOpen} : null; }, get fullScore(){return fullScore}, setLevelForTest(i){ levelIdx=i; stageMode='campana'; }, get score(){return score}, generate, figsUsed, restList, get set(){return set}, SIGS, LEVELS, selectLevel, setView, cfg, get levelIdx(){return levelIdx}, get S(){return S}, get ctx(){return ctx}, tapVoices, renderScore, get prog(){return prog}, heardAt, alignTaps, liveSrc, curBpm, start, stop, get K(){return K}};\n";

let tmpDir = null;
function tmp() {
  if (!tmpDir) {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solfeo-test-'));
    process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {} });
  }
  return tmpDir;
}

// Escribe la página de prueba y sus estilos en un directorio temporal y los sirve por HTTP en 127.0.0.1.
// (Con file:// el localStorage de Chromium pierde datos a veces al recargar la página, y las pruebas serían intermitentes.)
async function buildTestPage() {
  let s = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
  // El HOOK va en un script propio justo después del último de js/ (inicio.js): comparte con ellos el ámbito global
  const tag = /<script src="js\/[^"]+"><\/script>/g;
  let last = null, m;
  while ((m = tag.exec(s))) last = m;
  if (!last) throw new Error('index.html: no se encuentran los <script src="js/…">');
  const i = last.index + last[0].length;
  s = s.slice(0, i) + '\n<script src="js/test-hook.js"></script>' + s.slice(i);
  const d = tmp();
  fs.writeFileSync(path.join(d, 'test.html'), s);
  fs.copyFileSync(path.join(REPO, 'styles.css'), path.join(d, 'styles.css'));
  fs.cpSync(path.join(REPO, 'js'), path.join(d, 'js'), { recursive: true });
  fs.writeFileSync(path.join(d, 'js', 'test-hook.js'), HOOK);
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(new url.URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'test.html';
    const f = path.join(d, name);
    // solo archivos de la raíz o de js/, sin «..»
    if (!/^(js\/)?[\w.-]+$/.test(name) || name.includes('..') || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(fs.readFileSync(f));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { URL: `http://127.0.0.1:${server.address().port}/test.html`, server };
}

async function launch() {
  const { URL, server } = await buildTestPage();
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  return { b, URL, server };
}

const MOB = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };

// Página nueva en un contexto aislado. opts.welcome = true deja que salga la tarjeta de bienvenida.
async function page(b, opts = {}) {
  const { welcome, ...o } = opts;
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1, locale: 'es-ES', ...o });
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await ctx.route('https://fonts.gstatic.com/**', r => r.fulfill({ contentType: 'font/woff2', body: '' }));
  if (!welcome) await ctx.addInitScript(() => { if (!localStorage.getItem('solfeo-ritmico-v1')) localStorage.setItem('solfeo-ritmico-v1', JSON.stringify({ seen: true, sv: 2 })); });
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); });
  p.on('crash', () => console.log('FAIL la página de Chromium se cerró de golpe (crash)'));
  p.setDefaultTimeout(15000);
  return p;
}

// Programa toques con la barra espaciadora a la hora de cada nota, con un desvío (ms) por nota; null = no tocar
async function scheduleTaps(p, offs, extraAt) {
  return p.evaluate(([offs, extraAt]) => {
    // horas en el reloj del audio tal como se oye (heardAt descuenta la latencia de salida)
    const T = __t, sc = T.score, spt = T.S.spt, base = T.S.passStart;
    const heads = sc.flat.filter(e => !e.rest && !e.tie);
    const fire = (when, fn) => { const iv = setInterval(() => { if (T.heardAt() >= when) { clearInterval(iv); fn(); } }, 2); };
    const key = t => document.dispatchEvent(new KeyboardEvent(t, { code: 'Space', key: ' ', bubbles: true }));
    heads.forEach((e, k) => { const o = offs[k % offs.length]; if (o == null) return; const at = base + e.abs * spt + o / 1000;
      fire(at, () => key('keydown')); fire(at + Math.min(0.12, e.len * spt * 0.5), () => key('keyup')); });
    if (extraAt != null) { const at = base + extraAt * spt; fire(at, () => key('keydown')); fire(at + 0.05, () => key('keyup')); }
    return { heads: heads.length, passStart: T.S.passStart };
  }, [offs, extraAt]);
}

// Termina la práctica en curso con Esc mostrando resultados: «Detener» sin haber tocado nada (p. ej. en la cuenta previa)
// para sin resultados, así que antes se toca una vez, pasada la cuenta
async function tapAndStop(p) {
  await p.waitForFunction(() => __t.S.running && __t.S.mode === 'practice' && __t.heardAt() > __t.S.tapFrom + 0.02, null, { timeout: 15000 });
  await p.evaluate(() => { const k = t => document.dispatchEvent(new KeyboardEvent(t, { code: 'Space', key: ' ', bubbles: true })); k('keydown'); k('keyup'); });
  await p.keyboard.press('Escape');
}

// Pasa a la pagina de la app y espera a que esté lista (script ejecutado, fuentes, __t disponible)
async function open(p, URL, hash = '') {
  await p.goto(URL + hash);
  await ready(p);
}
async function ready(p) {
  await p.waitForFunction(() => window.__t && document.readyState === 'complete');
  await p.evaluate(() => document.fonts.ready);
}
// Como wf pero devuelve true/false en vez de lanzar (para usar dentro de ok())
const until = async (p, fn, arg, ms) => { try { await p.waitForFunction(fn, arg, { timeout: ms || 4000 }); return true; } catch (e) { return false; } };
const wf = (p, fn, arg, timeout) => p.waitForFunction(fn, arg, { timeout: timeout || 15000 });
const vis = (p, s) => p.$eval(s, e => !e.hidden);

// Espera a que termine una práctica con resultados visibles
const waitResults = p => wf(p, () => !document.querySelector('#results').hidden, null, 40000);
// Espera a que la práctica o el modo indicado estén en marcha
const waitRunning = (p, mode) => wf(p, m => __t.S.running && (!m || __t.S.mode === m), mode);
const waitStopped = p => wf(p, () => !__t.S.running);

// Espera a que el desplazamiento (suave) de la página se detenga: 10 fotogramas seguidos con el mismo scrollY
const settle = p => p.waitForFunction(() => { const y = scrollY; if (window.__sy === y) window.__syN = (window.__syN || 0) + 1; else { window.__sy = y; window.__syN = 0; } return window.__syN >= 10; }, null, { polling: 'raf', timeout: 15000 });

// Espera a que #postFab lleve visible más de 800 ms (ignora los toques de los primeros 700 ms)
const postReady = async p => {
  await p.evaluate(() => { window.__pfSeen = 0; });
  await p.waitForFunction(() => { const pf = document.querySelector('#postFab'); if (pf.hidden) { window.__pfSeen = 0; return false; }
    if (!window.__pfSeen) window.__pfSeen = performance.now(); return performance.now() - window.__pfSeen > 800; }, null, { timeout: 15000 });
};

// Define una suite. ctx: {b, URL, ok, tmp, ...ayudantes}
function suite(name, fn) {
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? 'OK   ' : 'FAIL ') + m); return !!c; };
  (async () => {
    console.log('== ' + name);
    let b, server, closing = false;
    const timer = setTimeout(() => { console.log('FAIL tiempo agotado en la suite (180 s)'); console.log(`# ${name}: ${pass} ok, ${fail + 1} fallos`); process.exit(1); }, 180000);
    try {
      const L = await launch(); b = L.b; server = L.server;
      b.on('disconnected', () => { if (!closing) console.log('FAIL Chromium se cerró inesperadamente (proceso terminado por el sistema?)'); });
      await fn({ b, URL: L.URL, ok, tmp, MOB, page, open, ready, wf, until, settle, postReady, vis, scheduleTaps, tapAndStop, waitResults, waitRunning, waitStopped });
    } catch (e) {
      fail++; console.log('FAIL excepción en la suite: ' + (e && e.stack || e));
    } finally {
      clearTimeout(timer);
      closing = true;
      try { if (b) await b.close(); } catch (e) {}
      try { if (server) server.close(); } catch (e) {}
    }
    console.log(`# ${name}: ${pass} ok, ${fail} fallos`);
    process.exit(fail ? 1 : 0);
  })();
}

module.exports = { suite, REPO, MOB, launch, page, open };

# DandEtudeDuR (Solfeo Rítmico)

App web para estudiar lectura rítmica. Genera ritmos aleatorios en partitura, los reproduce con metrónomo y mide la precisión del usuario cuando los toca con la pantalla o el teclado. La interfaz está en español.

La app son dos archivos sin dependencias ni build: `index.html` (HTML + JS) y `styles.css` (todos los estilos, incluidas las variables de color y el modo oscuro). Para probarlo basta con abrirlo en el navegador o servir la carpeta (`python3 -m http.server`). El audio arranca solo después de que el usuario pulse un botón (política de autoplay).

Nació como un Artifact publicado en claude.ai. Allí el progreso se guardaba en la cuenta mediante `window.claude.use("db")` / `use("user")`; fuera de claude.ai esas llamadas no existen y la app usa `localStorage` automáticamente (ver «Guardado del progreso»).

## Mapa del código (secciones `/* ---------- … ---------- */` del `<script>`)

| Sección | Qué hace |
|---|---|
| Datos musicales | `FIGS` (figuras), `SIGS` (compases), plantillas de celdas rítmicas `SIMPLE_BEAT`, `SIMPLE_MULTI`, `COMP_BEAT`, `COMP_MULTI`. Ajustes por defecto `DEFAULTS` y su persistencia (`solfeo-ritmico-v1`). |
| Generación | `genMeasure` llena cada compás con celdas elegidas al azar (con peso) que cumplan las figuras seleccionadas; `generate()` arma `score` y, si `ties` está activo, `addTies` liga notas entre celdas y compases. `cfg()` devuelve la configuración activa (práctica libre = `set`, campaña = nivel actual). |
| Dibujo de notación | Partitura en SVG a mano: pentagrama de 5 líneas, clave de percusión, cabezas, plicas, corchetes, barras (incluye barras secundarias y medias barras de semicorchea), tresillos, silencios, puntillos y ligaduras (`tieSVG`; se parten al cambiar de sistema). Reparte los compases en sistemas según el ancho y dibuja bajo cada nota los marcadores de desvío y las barras de duración. |
| Panel | Controles de compás, figuras, tempo (con término italiano) y luces de pulso. |
| Audio | Web Audio: `click()` del metrónomo (acento / pulso / débil / subdivisión), `noteSound()` (tono sostenido o golpe de percusión) y `tapSoundOn/Off` (sonido opcional del toque del usuario). |
| Transporte | Planificador: programa por adelantado toda la pasada (o compás a compás en «Solo metrónomo»), cuenta previa, bucle y cursor sincronizado con `requestAnimationFrame`. Detener desconecta un bus de ganancia por sesión. |
| Práctica | `tap(src)` / `release(src)` emparejan cada toque con la nota más cercana dentro de su ventana; puntuación y resultados en `showResults`. |
| Medición de latencia | 4 clics de cuenta + 16 clics a 90 ppm; descarta los dos primeros toques, filtra por la mediana (±80 ms), promedia y redondea a 5 ms para sugerir la corrección. |
| Campaña | `CHAPTERS`, `LEVELS` (26 niveles en 6 capítulos), estrellas, desbloqueo, mapa de niveles y ficha del nivel. |
| Guardado del progreso | `prog = {levels, sessions}`; se guarda en `localStorage` (`solfeo-ritmico-progreso-v1`) y, si está disponible, en el `db` de claude.ai (`data/users/<id>/progress`). `mergeProg` une ambas fuentes. |
| Vista de progreso | Resumen, gráfica SVG de precisión con media móvil de 5, historial de las últimas 30 prácticas, borrar historial. |
| Eventos / Inicio | Conexión de controles, teclado (Espacio / cualquier tecla para tocar, N = nuevo ritmo), `pointerdown/up` en la zona de toque. |

**Seguimiento de la partitura:** al reproducir o practicar, cuando la nota actual pasa a otro sistema, `followScore` desplaza la página si ese sistema o el siguiente no se ven enteros (los deja arriba).

**Zona de toque:** es la propia partitura. `#pad` envuelve `#score`, la cuenta previa (`#padCount`, superpuesta) y la línea de estado (`#padMain` / `#padSub`). Los toques de puntero solo cuentan mientras hay práctica o medición de latencia; en reposo la partitura no captura el puntero, para que se pueda desplazar la página. Al empezar, `showPad()` enfoca la partitura y la desplaza a la vista si hace falta.

**Capturas del README:** están en `docs/capturas/`, hechas con Playwright (Chromium) a 1200 px (y 390 px ×2 la de móvil), con datos de ejemplo y marcadores numerados añadidos al DOM solo para la captura. Si cambia la interfaz, conviene rehacerlas.

## Convenciones y decisiones

- **Tiempo en ticks:** 1 negra = 12 ticks (semicorchea 3, corchea de tresillo 4, corchea 6, corchea con puntillo 9, negra con puntillo 18, blanca 24, blanca con puntillo 36, redonda 48).
- **Compases:** cada uno define `groups` (agrupación de pulsos para generar y agrupar barras), `click` (unidad del metrónomo en ticks) y `kind` (`simple`, `compound`, `odd`). En 2/2 y 3/2 marca la blanca; en 6/8, 9/8 y 12/8, negra con puntillo; en 3/8, 5/8, 7/8 y 8/8 marca corcheas y acentúa el inicio de cada grupo. Los tresillos solo aparecen en compases `simple`.
- **Amalgama:** `ODD_GROUPS` lista las agrupaciones de 5/8 (3+2, 2+3), 7/8 (2+2+3, 2+3+2, 3+2+2) y 8/8 (3+3+2, 3+2+3, 2+3+3). `sigOf(C)` devuelve el compás con la agrupación elegida (`set.grp[sig]` en práctica libre, `l.grp` en campaña; si falta, la primera) y es lo que usa `generate()`; `score.sig` ya lleva los grupos aplicados, así que metrónomo, luces y barras los siguen solos.
- **Silencios de semicorchea:** celdas con `[3,1]` en `SIMPLE_BEAT` y `COMP_BEAT` (solo con `rests` y la semicorchea elegida); `restSVG` dibuja el silencio de dos ganchos.
- **Ligaduras y síncopas (`ties`):** cada figura escrita es un evento; `e.tie` marca la que continúa a la anterior (no se toca ni suena), `e.head` apunta a la nota que se toca y `e.len` es lo que suena (la cabeza suma toda la cadena). Reproducción y práctica usan `len` y saltan las ligadas. Solo se liga la última nota de una celda con la primera de la siguiente (máx. 2 notas, nunca tresillos). Las celdas con `sync:true` (corchea-negra-corchea, negra-blanca-negra) solo salen con `ties`.
- **Evaluación de golpes:** exacto ±40 ms, bien ±90 ms, cerca dentro de la ventana de la nota (mitad de la distancia a la nota vecina, entre 50 y 180 ms). Puntos: 100 / 80 / 50 / 0.
- **Golpes de más:** restan 40 puntos cada uno si `set.penalize` está activo (activado por defecto); si no, solo se cuentan.
- **Modo piano (`set.hold`):** además del ataque se evalúa cuándo se suelta respecto al final de la figura. Justa ±max(70 ms, 15 % de la duración), aceptable ±max(140 ms, 30 %), si no «antes» o «tarde». Puntos: 100 / 70 / 30. Cada nota vale 60 % ataque + 40 % duración.
- **Latencia:** la hora esperada de cada nota suma `ctx.outputLatency` (o `baseLatency`) y la corrección del usuario (`set.offset`, en ms, positiva si el usuario llega tarde).
- **Toque audible (`set.tapSound`, `set.tapVol`):** en modo piano suena un tono mientras se mantiene; en batería, un golpe corto. No suena durante la medición de latencia.
- **Campaña:** cada nivel tiene un `id` fijo (`L1`…); `prog.levels` y `set.levelId` usan ese id, así que se pueden insertar niveles en cualquier posición con un id nuevo. Un nivel ya superado sigue abierto aunque se inserte antes uno sin superar. 1 estrella = objetivo del nivel (70–80 %), 2 = objetivo + 12 (máx. 90 %), 3 = 95 %. Un nivel se desbloquea al conseguir al menos una estrella en el anterior. El tempo lo fija el nivel.
- **Sesiones guardadas:** `{id, t, mode, lvl, lid, sig, grp, bars, bpm, pct, n, exact, good, near, miss, extra, mean, play, pen}`; se guardan como máximo 400. Las sesiones antiguas no tienen `lid`: su `lvl` equivale al id `L(lvl+1)` (`sessLevel`).

## Diseño

- Colores como variables CSS en `:root` con variante oscura (`prefers-color-scheme` y `[data-theme]`). Acento azul cobalto, colores de estado para exacto/bien/cerca/fallo y dorado para estrellas.
- Tipografías de Google Fonts: Young Serif (títulos y cifras de compás), Atkinson Hyperlegible (texto), JetBrains Mono (números).
- Debe funcionar en móvil (~400 px) sin desplazamiento horizontal de la página.

## Ideas pendientes

- Separar el JS en scripts clásicos (`audio.js`, `notation.js`, `scoring.js`…) si crece más de ~2500 líneas. Evitar módulos ES: rompen la apertura directa con `file://`.
- Más compases (6/4, 10/8…) y niveles; síncopas dentro del compás compuesto.
- Exportar el historial (CSV).

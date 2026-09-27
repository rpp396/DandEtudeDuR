# DandEtudeDuR (Solfeo Rítmico)

App web para estudiar lectura rítmica. Genera ritmos aleatorios en partitura, los reproduce con metrónomo y mide la precisión del usuario cuando los toca con la pantalla o el teclado. La interfaz está en español.

Todo vive en un solo archivo, `index.html` (HTML + CSS + JS sin dependencias ni build). Para probarlo basta con abrirlo en el navegador o servir la carpeta (`python3 -m http.server`). El audio arranca solo después de que el usuario pulse un botón (política de autoplay).

Nació como un Artifact publicado en claude.ai. Allí el progreso se guardaba en la cuenta mediante `window.claude.use("db")` / `use("user")`; fuera de claude.ai esas llamadas no existen y la app usa `localStorage` automáticamente (ver «Guardado del progreso»).

## Mapa del código (secciones `/* ---------- … ---------- */` del `<script>`)

| Sección | Qué hace |
|---|---|
| Datos musicales | `FIGS` (figuras), `SIGS` (compases), plantillas de celdas rítmicas `SIMPLE_BEAT`, `SIMPLE_MULTI`, `COMP_BEAT`, `COMP_MULTI`. Ajustes por defecto `DEFAULTS` y su persistencia (`solfeo-ritmico-v1`). |
| Generación | `genMeasure` llena cada compás con celdas elegidas al azar (con peso) que cumplan las figuras seleccionadas; `generate()` arma `score`. `cfg()` devuelve la configuración activa (práctica libre = `set`, campaña = nivel actual). |
| Dibujo de notación | Partitura en SVG a mano: pentagrama de 5 líneas, clave de percusión, cabezas, plicas, corchetes, barras (incluye barras secundarias y medias barras de semicorchea), tresillos, silencios, puntillos. Reparte los compases en sistemas según el ancho y dibuja bajo cada nota los marcadores de desvío y las barras de duración. |
| Panel | Controles de compás, figuras, tempo (con término italiano) y luces de pulso. |
| Audio | Web Audio: `click()` del metrónomo (acento / pulso / débil / subdivisión) y `noteSound()` (tono sostenido o golpe de percusión). |
| Transporte | Planificador: programa por adelantado toda la pasada (o compás a compás en «Solo metrónomo»), cuenta previa, bucle y cursor sincronizado con `requestAnimationFrame`. Detener desconecta un bus de ganancia por sesión. |
| Práctica | `tap(src)` / `release(src)` emparejan cada toque con la nota más cercana dentro de su ventana; puntuación y resultados en `showResults`. |
| Medición de latencia | 4 clics de cuenta + 16 clics a 90 ppm; descarta los dos primeros toques, filtra por la mediana (±80 ms), promedia y redondea a 5 ms para sugerir la corrección. |
| Campaña | `CHAPTERS`, `LEVELS` (20 niveles en 5 capítulos), estrellas, desbloqueo, mapa de niveles y ficha del nivel. |
| Guardado del progreso | `prog = {levels, sessions}`; se guarda en `localStorage` (`solfeo-ritmico-progreso-v1`) y, si está disponible, en el `db` de claude.ai (`data/users/<id>/progress`). `mergeProg` une ambas fuentes. |
| Vista de progreso | Resumen, gráfica SVG de precisión con media móvil de 5, historial de las últimas 30 prácticas, borrar historial. |
| Eventos / Inicio | Conexión de controles, teclado (Espacio / cualquier tecla para tocar, N = nuevo ritmo), `pointerdown/up` en la zona de toque. |

## Convenciones y decisiones

- **Tiempo en ticks:** 1 negra = 12 ticks (semicorchea 3, corchea de tresillo 4, corchea 6, corchea con puntillo 9, negra con puntillo 18, blanca 24, blanca con puntillo 36, redonda 48).
- **Compases:** cada uno define `groups` (agrupación de pulsos para generar y agrupar barras), `click` (unidad del metrónomo en ticks) y `kind` (`simple`, `compound`, `odd`). En 6/8, 9/8 y 12/8 el metrónomo marca negra con puntillo; en 3/8, 5/8 y 7/8 marca corcheas y acentúa el inicio de cada grupo (5/8 = 3+2, 7/8 = 2+2+3). Los tresillos solo aparecen en compases `simple`.
- **Evaluación de golpes:** exacto ±40 ms, bien ±90 ms, cerca dentro de la ventana de la nota (mitad de la distancia a la nota vecina, entre 50 y 180 ms). Puntos: 100 / 80 / 50 / 0.
- **Golpes de más:** restan 40 puntos cada uno si `set.penalize` está activo (activado por defecto); si no, solo se cuentan.
- **Modo piano (`set.hold`):** además del ataque se evalúa cuándo se suelta respecto al final de la figura. Justa ±max(70 ms, 15 % de la duración), aceptable ±max(140 ms, 30 %), si no «antes» o «tarde». Puntos: 100 / 70 / 30. Cada nota vale 60 % ataque + 40 % duración.
- **Latencia:** la hora esperada de cada nota suma `ctx.outputLatency` (o `baseLatency`) y la corrección del usuario (`set.offset`, en ms, positiva si el usuario llega tarde).
- **Campaña:** 1 estrella = objetivo del nivel (70–80 %), 2 = objetivo + 12 (máx. 90 %), 3 = 95 %. Un nivel se desbloquea al conseguir al menos una estrella en el anterior. El tempo lo fija el nivel.
- **Sesiones guardadas:** `{id, t, mode, lvl, sig, bars, bpm, pct, n, exact, good, near, miss, extra, mean, play, pen}`; se guardan como máximo 400.

## Diseño

- Colores como variables CSS en `:root` con variante oscura (`prefers-color-scheme` y `[data-theme]`). Acento azul cobalto, colores de estado para exacto/bien/cerca/fallo y dorado para estrellas.
- Tipografías de Google Fonts: Young Serif (títulos y cifras de compás), Atkinson Hyperlegible (texto), JetBrains Mono (números).
- Debe funcionar en móvil (~400 px) sin desplazamiento horizontal de la página.

## Ideas pendientes

- Separar el archivo en módulos (`audio.js`, `notation.js`, `scoring.js`…) si crece más.
- Ligaduras y síncopas entre tiempos; más compases y niveles.
- Opción de que el toque del usuario suene (útil en modo piano).
- Exportar el historial (CSV).

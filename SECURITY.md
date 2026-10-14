# Seguridad y privacidad

Solfeo Rítmico es una app web estática (HTML, CSS y JavaScript sin servidor ni dependencias) publicada en GitHub Pages.

## Qué datos guarda la app

Todo se guarda **solo en el navegador de quien la usa**, en `localStorage`. No hay cuentas, servidor propio, analítica ni cookies, y la app no envía nada a ningún sitio.

| Clave de `localStorage` | Contenido |
|---|---|
| `solfeo-ritmico-v1` | Ajustes (compás, figuras, tempo, volúmenes, corrección de latencia…). |
| `solfeo-ritmico-progreso-v1` | Progreso de la campaña y últimas 400 prácticas (fecha, compás, precisión…). |
| `solfeo-ritmico-ejercicios-v1` | Ejercicios propios (nombre, compás, tempo y notación), hasta 200. |

Para borrarlo todo basta con borrar los datos del sitio en el navegador (o usar «Borrar historial» y «Restablecer ajustes» dentro de la app).

Al abrir la app como Artifact de claude.ai, el progreso se guarda además en la cuenta de Claude de quien la usa, mediante el almacenamiento que ofrece claude.ai (`window.claude`), no mediante ningún servicio de este proyecto.

Compartir un ejercicio con un enlace (`#ej=…`) mete el ejercicio en la parte del enlace posterior a «#», que el navegador no envía al servidor. Quien abre el enlace lo guarda en su propio navegador; no se comparte nada más.

La tipografía va incluida en el repositorio (`fonts/`, licencia SIL OFL): al abrir la página no se contacta con Google ni con ningún tercero, y el `Referer` no se envía (`no-referrer`).

## Medidas de la app

- **Los datos guardados no se consideran de fiar.** Al leer `localStorage` (y el almacenamiento de claude.ai) se valida todo: tipos, rangos, claves de listas cerradas y compases existentes. Lo corrupto se descarta o vuelve al valor por defecto, y la app arranca igualmente. Los ejercicios y enlaces importados se validan igual, con límites de tamaño (1 MB por archivo, 4000 caracteres de notación, 64 compases, 500 ejercicios por archivo, 200 guardados).
- **Todo dato que se pinta se escapa** (`esc()` o `textContent`).
- **Content-Security-Policy** (por `<meta>`): solo se ejecutan los scripts de la propia página (`script-src 'self'`), sin código en línea ni `eval`, sin estilos en línea, sin conexiones a otros orígenes (`connect-src 'self'`), sin `<base>`, formularios ni objetos. Es una segunda línea de defensa: aunque un dato llegara sin escapar, el navegador no ejecutaría un manejador en línea.
- Pruebas automáticas (`tests/seguridad.test.js`) con datos maliciosos y corruptos, importaciones y enlaces hostiles, y comprobación de que no hay violaciones de la política ni peticiones externas.

## Limitaciones

- **GitHub Pages no permite cabeceras HTTP propias.** Por eso la política va en un `<meta>`, que no admite `frame-ancestors` (la página se podría incrustar en un `<iframe>` ajeno), ni `report-uri`, ni `sandbox`; tampoco se pueden fijar `X-Content-Type-Options` ni `Permissions-Policy`.
- **Origen compartido.** En `usuario.github.io` todos los proyectos de la misma cuenta comparten el mismo origen y, por tanto, el mismo `localStorage`. Un script malicioso de otro proyecto alojado bajo el mismo dominio podría leer o modificar los datos de esta app (que son solo ajustes, progreso y ejercicios). La validación al leer sirve para que esa manipulación no ejecute código ni rompa la app. Un dominio propio para la app aislaría los datos.
- **Sin cifrado ni copia de seguridad.** Los datos viven solo en ese navegador: si se borran los datos del sitio o se cambia de dispositivo, se pierden (los ejercicios se pueden exportar a `.json`).

## Ajustes recomendados del repositorio (GitHub)

Estos ajustes no se pueden guardar en el código; los activa quien administra el repositorio, en *Settings*:

1. **Pages → Enforce HTTPS** activado.
2. **Branches → protección de `main`**: exigir pull request y que pasen las pruebas (`.github/workflows/tests.yml`) antes de fusionar; sin *force push*.
3. **Code security → Secret scanning** (y *Push protection*) activados.
4. **Code security → Dependabot alerts / security updates** activados: la única dependencia es `playwright`, solo para las pruebas (`package.json`); la app no tiene ninguna en producción.
5. *Private vulnerability reporting* activado, para poder recibir avisos en privado (ver abajo).
6. Autenticación en dos pasos en la cuenta propietaria.

## Cómo avisar de un problema

Si encuentras una vulnerabilidad o un fallo que ponga en riesgo los datos de alguien, **no abras un issue público**. Usa *Security → Report a vulnerability* en la página del repositorio (aviso privado de GitHub). Indica los pasos para reproducirlo, el navegador y, si puedes, una prueba mínima. Para fallos sin riesgo (ortografía, un compás mal agrupado…), un issue normal basta.

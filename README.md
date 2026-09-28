# DandEtudeDuR

App web para estudiar lectura rítmica, en honor a *Étude du Rythme* de Georges Dandelot.

Genera ritmos en partitura según el compás y las figuras que elijas, los reproduce con un metrónomo configurable y mide tu precisión cuando los tocas sobre la partitura (con el dedo o el ratón) o con el teclado.

## Qué incluye

- **Práctica libre:** compases 2/4, 3/4, 4/4, 5/4, 2/2, 3/2, 3/8, 6/8, 9/8, 12/8, 5/8, 7/8 y 8/8 (en los de amalgama eliges la agrupación, por ejemplo 2+2+3, 2+3+2 o 3+2+2); de 1 a 16 compases; redonda, blanca, negra, corchea y semicorchea (con y sin puntillo), tresillos, silencios (también de semicorchea), y síncopas y ligaduras opcionales.
- **Metrónomo:** tempo de 30 a 240 ppm con indicación italiana, acento, subdivisión, cuenta previa y marcado de tempo con toques.
- **Práctica con evaluación:** en modo batería se mide el ataque de cada nota; en modo piano también cuánto la mantienes. Los golpes de más se pueden penalizar o solo contar, y puedes oír tus propios toques.
- **Medición de latencia:** calcula la corrección para tu equipo, por ejemplo con auriculares Bluetooth.
- **Campaña:** 26 niveles en 6 capítulos, del pulso en negras a las síncopas y los compases irregulares, con estrellas y desbloqueo progresivo.
- **Mi progreso:** historial de prácticas, gráfica de precisión y comparación con las prácticas anteriores.

## Uso

Abre `index.html` en el navegador (junto a `styles.css`, en la misma carpeta). No necesita instalación ni compilación. El progreso se guarda en el navegador.

## Cómo funciona

### 1. Prepara el ritmo

![Pantalla principal con las partes numeradas](docs/capturas/1-pantalla-principal.png)

1. **Modo:** *Práctica libre* (tú eliges todo), *Campaña* (niveles guiados) o *Mi progreso*.
2. **Compás:** elige el compás (en 5/8, 7/8 y 8/8 aparece además la agrupación de las corcheas) y, debajo, cuántos compases quieres y qué figuras pueden salir. Más abajo en el panel están los silencios, las síncopas y ligaduras, y las opciones del metrónomo.
3. **Tempo:** con − / +, escribiendo el número o marcándolo con toques.
4. **Escuchar:** *Reproducir* toca el ritmo con el metrónomo para que lo oigas antes de practicarlo. *Nuevo ritmo* (o la tecla <kbd>N</kbd>) genera otro.
5. **Partitura:** además de leerla, es donde tocas.
6. **Practicar:** empieza la cuenta previa y la evaluación.
7. **Batería / Piano:** en *Batería* solo cuenta cuándo tocas cada nota; en *Piano* también cuánto la mantienes pulsada.

### 2. Toca sobre la partitura

![Práctica en curso: la partitura se enmarca en azul y las notas tocadas se colorean](docs/capturas/2-practicando.png)

Al pulsar *Practicar*, la partitura se enmarca en azul y suena la cuenta previa (el número aparece sobre la partitura). Después, **toca sobre la partitura en cada nota**: con el dedo, con el ratón o con la barra espaciadora (en realidad sirve cualquier tecla).

1. **Pulso:** las luces siguen al metrónomo.
2. **Nota actual:** el cursor marca la nota que suena; las que ya tocaste se colorean según tu precisión.
3. **Aciertos en directo:** cuántas notas llevas.

Si el ritmo ocupa varias líneas, la página se desplaza sola para que siempre veas la línea que suena y la siguiente.

En los silencios y en las notas ligadas no se toca: la ligadura alarga la nota anterior. Fuera de la práctica, la partitura se comporta como una imagen normal (puedes desplazar la página sin que cuente como toque).

### 3. Revisa el resultado

![Resultados con el desvío de cada nota y el recuento](docs/capturas/3-resultados.png)

1. **Tu desvío:** el punto bajo cada nota indica si tocaste antes (a la izquierda de la rayita) o tarde (a la derecha). Verde = exacto (±40 ms), azul verdoso = bien (±90 ms), naranja = cerca.
2. **Nota sin tocar:** una ✕ roja.
3. **Precisión:** la nota global, con un consejo (si tiendes a adelantarte o atrasarte).
4. **Recuento:** exactas, bien, cerca, sin tocar y golpes de más. En modo piano aparece además una barra bajo cada nota que compara cuánto la mantuviste con lo que debía durar.

Si siempre te marca «tarde» aunque vayas a tiempo (pasa con auriculares Bluetooth), usa **Medir latencia**: tocas con 16 clics y la app calcula la corrección.

### 4. Campaña

![Campaña: ficha del nivel y mapa de niveles con estrellas](docs/capturas/4-campana.png)

1. **Nivel actual:** qué se practica, compás, tempo fijo y la precisión necesaria para 1, 2 y 3 estrellas.
2. **Mapa de niveles:** 26 niveles en 6 capítulos. Cada nivel se desbloquea al conseguir al menos una estrella en el anterior.

### 5. Mi progreso

![Mi progreso: resumen, gráfica de precisión e historial](docs/capturas/5-progreso.png)

Resumen de tus prácticas, gráfica de precisión con la media de las últimas cinco e historial detallado.

### En el móvil

<img src="docs/capturas/6-movil.png" alt="La app en un móvil durante la práctica" width="300">

En pantallas pequeñas el panel de opciones pasa debajo. Al pulsar *Practicar*, la página se desplaza para que la partitura quede entera a la vista.

Para el detalle técnico, consulta [`CLAUDE.md`](CLAUDE.md).

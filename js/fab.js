// Solfeo Rítmico · Botón flotante, paleta fija del móvil y zona de toque.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

/* ---------- Botón flotante y zona de toque ---------- */
// Botón flotante: solo en pantallas táctiles (móvil, tableta) y si el ajuste está activo
const touchMQ = matchMedia('(any-pointer: coarse)');
const fabWanted = () => !!set.fab && touchMQ.matches;
// En reposo el botón dice «Practicar» (solo si la partitura está a la vista); durante la práctica o la medición, «Toca aquí»
// Con los resultados a la vista pasa a ser el botón de tres partes (#postFab)
let padInView=false, postSince=0;
// Paleta de «Mis ejercicios» fija abajo en pantallas estrechas (panel bajo la partitura) con un ejercicio abierto.
// Se oculta (sin volver a su sitio en el panel, para que la página no salte) al practicar o reproducir, con resultados
// o la medición a la vista y mientras se escribe en un campo, para no quedar encima del teclado
const narrowMQ = matchMedia('(max-width: 920px)');
let fieldFocus=false;
const dockWanted = () => narrowMQ.matches && stageMode==='propio' && !!own.cur && !$('#stageView').hidden;
const dockShown = () => dockWanted() && !S.running && !fieldFocus && $('#results').hidden && $('#calib').hidden;
function updateFab(){
  const f=$('#tapFab'), fm=$('#fabMain'), pf=$('#postFab'), live=S.running && (S.mode==='practice'||S.mode==='calib');
  const post=fabWanted() && !S.running && !$('#results').hidden && !$('#stageView').hidden;
  const dock=dockShown();
  document.body.classList.toggle('dock-on',dockWanted()); document.body.classList.toggle('dock-away',!dock);
  if(dock) document.body.style.setProperty('--dockH',$('#ownDock').offsetHeight+'px');
  const on=fabWanted() && !post && (live || (!S.running && padInView && !dock));
  if(post){ if(pf.hidden){ pf.hidden=false; postSince=performance.now(); } syncPostFab(); } else pf.hidden=true;
  f.hidden=!on; document.body.classList.toggle('fab-on',on||post); f.classList.toggle('idle',on && !live);
  f.classList.toggle('split',on && live); $('#fabRestart').hidden=!(on && live);
  if(!(on && live)) restartCancel();
  if(on && !live){ fm.textContent='Practicar'; fm.classList.remove('count'); }
  else if(on && fm.textContent==='Practicar') fm.textContent='Toca aquí';
  // espacio inferior que tapan los elementos fijos: el foco de teclado y los desplazamientos de la página lo respetan (scroll-padding-bottom)
  document.documentElement.style.setProperty('--pinB', (pinnedEl() ? fabReserve() : 0)+'px');
}
// En la campaña el tick lleva al siguiente nivel (apagado si no se superó); en práctica libre dice «Listo»
function syncPostFab(){
  const camp=stageMode==='campana', b=$('#pfNext');
  $('#pfNextLbl').textContent=camp?'Siguiente':'Listo';
  $('#pfNewLbl').textContent=stageMode==='propio'?'Editar':'Nuevo ritmo';
  b.disabled = camp && $('#rcNext').hidden;
  b.setAttribute('aria-label', camp ? 'Siguiente nivel' : 'Listo: cerrar los resultados');
}
// Cierra los resultados y limpia las marcas de la partitura
function closeResults(){ $('#results').hidden=true; judg=[]; extras=0; extraTks=[]; renderScore(); updateFab(); $('#pad').focus({preventScroll:true}); }
// Elemento fijo que tapa la parte baja de la pantalla: botón flotante, botón de tres partes o paleta (si se ve)
const pinnedEl = () => [$('#tapFab'),$('#postFab')].find(x=>!x.hidden) || (dockShown() && $('#ownDock')) || null;
// Alto de la parte inferior de la pantalla que tapa (para el seguimiento de la partitura)
function fabReserve(){
  const f=pinnedEl();
  return f ? innerHeight-f.getBoundingClientRect().top+12 : 8;
}
// Foco de teclado tapado por el botón flotante o la paleta fija (WCAG 2.4.11): se desplaza lo justo para que quede por encima
// (scroll-padding-bottom = --pinB hace que 'nearest' deje ese margen)
function revealFocus(el){
  const p=pinnedEl(); if(!p || !el.getBoundingClientRect || el.closest('#tapFab,#fabRestart,#postFab,#ownDock')) return;
  if(el.getBoundingClientRect().bottom > p.getBoundingClientRect().top-4) el.scrollIntoView({block:'nearest', behavior:'auto'});
}
function showPad(){
  updateFab();
  const p=$('#pad'), r=p.getBoundingClientRect();
  p.focus({preventScroll:true});
  const room=innerHeight-fabReserve();
  if(r.top<0 || r.bottom>room) p.scrollIntoView({block:r.height>room?'start':'center',behavior:smooth()});
}
function padIdle(){
  $('#pad').classList.remove('live');
  if(stageMode==='propio'){
    $('#padMain').textContent='Toca una figura para seleccionarla: lo nuevo se añade detrás de ella';
    $('#padSub').textContent='Con teclado: 1, 2, 4, 8 y 6 añaden redonda, blanca, negra, corchea y semicorchea; T tresillo; «.» puntillo, S silencio, L ligadura; Retroceso borra; las flechas mueven la selección. P practica y R reproduce.';
    return;
  }
  $('#padMain').textContent='Toca la partitura (o «Practicar») para empezar, y luego toca sobre ella en cada nota';
  $('#padSub').textContent='Con teclado: P empieza y, tras la cuenta, tocas con la barra espaciadora o cualquier tecla menos Esc, que detiene. Fuera de la práctica, P, R y N son atajos (practicar, reproducir, nuevo ritmo).';
}

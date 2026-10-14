// Solfeo Rítmico · Botón flotante, paleta fija del móvil y zona de toque.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

/* ---------- Botón flotante y zona de toque ---------- */
// Botón flotante: solo en pantallas táctiles (móvil, tableta) y si el ajuste está activo
const touchMQ = matchMedia('(any-pointer: coarse)');
const fabWanted = () => !!set.fab && touchMQ.matches;
// En reposo el botón dice «Practicar» (solo si la partitura está a la vista y el botón «Practicar» del transporte no); durante la
// práctica o la medición, «Toca aquí»; mientras suena «Reproducir» o «Solo metrónomo», «Detener».
// Con los resultados a la vista pasa a ser el botón de tres partes (#postFab)
let padInView=false, btnInView=false, postSince=0;
// Paleta de «Mis ejercicios» fija abajo en pantallas estrechas (panel bajo la partitura) con un ejercicio abierto.
// Se oculta (sin volver a su sitio en el panel, para que la página no salte) al practicar o reproducir, con resultados
// o la medición a la vista y mientras se escribe en un campo, para no quedar encima del teclado
const narrowMQ = matchMedia('(max-width: 920px)');
let fieldFocus=false;
const dockWanted = () => narrowMQ.matches && stageMode==='propio' && !!own.cur && !$('#stageView').hidden;
const dockShown = () => dockWanted() && !S.running && !fieldFocus && $('#results').hidden && $('#calib').hidden;
function updateFab(){
  const f=$('#tapFab'), fm=$('#fabMain'), pf=$('#postFab'), live=S.running && (S.mode==='practice'||S.mode==='calib');
  const play=S.running && (S.mode==='play'||S.mode==='metro');   // «Detener» abajo: el de la tarjeta de transporte queda fuera de pantalla
  const res=!$('#results').hidden && !$('#stageView').hidden;
  const post=fabWanted() && !S.running && res;
  const dock=dockShown();
  document.body.classList.toggle('dock-on',dockWanted()); document.body.classList.toggle('dock-away',!dock);
  // res-on: con resultados se oculta el bloque Practicar/Medir latencia (táctil) para que queden pegados a la partitura; post-on: no se repiten sus botones
  document.body.classList.toggle('res-on',res); document.body.classList.toggle('post-on',post);
  if(dock) document.body.style.setProperty('--dockH',$('#ownDock').offsetHeight+'px');
  const on=fabWanted() && !post && (live || play || (!S.running && padInView && !btnInView && !dock));
  if(post){ if(pf.hidden){ pf.hidden=false; postSince=performance.now(); } syncPostFab(); } else pf.hidden=true;
  f.hidden=!on; document.body.classList.toggle('fab-on',on||post); f.classList.toggle('idle',on && !live);
  f.classList.toggle('stopb',on && play);
  f.classList.toggle('split',on && live); $('#fabRestart').hidden=!(on && live);
  if(!(on && live)) restartCancel();
  if(on && play){ fm.textContent='Detener'; fm.classList.remove('count'); }
  else if(on && !live){ fm.textContent='Practicar'; fm.classList.remove('count'); }
  else if(on && (fm.textContent==='Practicar'||fm.textContent==='Detener')) fm.textContent='Toca aquí';
  // espacio inferior que tapan los elementos fijos: el foco de teclado y los desplazamientos de la página lo respetan (scroll-padding-bottom)
  document.documentElement.style.setProperty('--pinB', (pinnedEl() ? fabReserve() : 0)+'px');
}
// En la campaña el tick lleva al siguiente nivel (apagado si no se superó); en práctica libre dice «Listo»
function syncPostFab(){
  const camp=stageMode==='campana', b=$('#pfNext');
  $('#pfNextLbl').textContent=camp?'Siguiente':'Listo';
  // en Mis ejercicios el botón central es «Editar» (lápiz): cierra los resultados y vuelve a la partitura con la paleta
  const own=stageMode==='propio';
  $('#pfNewLbl').textContent=own?'Editar':'Nuevo ritmo';
  $('#pfNew .ic-new').toggleAttribute('hidden',own); $('#pfNew .ic-edit').toggleAttribute('hidden',!own);   // (los SVG no tienen la propiedad hidden)
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
// Desplaza la página lo justo para que el bloque de topEl a botEl se vea por encima de lo que tapa lo fijo (botón flotante o paleta);
// si no cabe entero, deja su principio arriba
function revealBlock(topEl, botEl){
  const room=innerHeight-fabReserve(), t=topEl.getBoundingClientRect().top, b=botEl.getBoundingClientRect().bottom;
  if(t>=8 && b<=room) return;
  const dy = b>room ? Math.min(b-room+10, t-8) : t-8;
  if(dy) scrollTo({top:scrollY+dy, behavior:smooth()});
}
// Aviso breve «Ritmo nuevo · Ver ↑»: al cambiar opciones que regeneran el ritmo cuando la partitura no se ve (el panel va debajo en
// pantallas estrechas). Se quita solo, al tocarlo, o al volver a verse la partitura
let newToastT=0;
const padSeen=()=>{ const r=$('#pad').getBoundingClientRect(); return r.bottom>60 && r.top<innerHeight-fabReserve()-60; };
function hideNewToast(){ clearTimeout(newToastT); newToastT=0; $('#newToast').hidden=true; }
function rhythmToast(){
  if(padSeen()){ hideNewToast(); return; }
  const t=$('#newToast'); if(t.hidden) say('Ritmo nuevo. El botón «Ver» lleva a la partitura.');
  t.hidden=false; clearTimeout(newToastT); newToastT=setTimeout(hideNewToast,6000);
}
$('#newToast').addEventListener('click',()=>{ hideNewToast(); $('.score-card').scrollIntoView({block:'start',behavior:smooth()}); $('#pad').focus({preventScroll:true}); });
addEventListener('scroll',()=>{ if(newToastT && padSeen()) hideNewToast(); },{passive:true});
function showPad(){
  updateFab();
  const p=$('#pad'), r=p.getBoundingClientRect();
  p.focus({preventScroll:true});
  const room=innerHeight-fabReserve();
  if(r.top<0 || r.bottom>room) p.scrollIntoView({block:r.height>room?'start':'center',behavior:smooth()});
}
function padIdle(){
  $('#pad').classList.remove('live');
  const kb=kbOn();   // sin puntero fino (móvil, tableta sin ratón) no se habla de teclas
  if(stageMode==='propio'){
    $('#padMain').textContent='Toca una figura para seleccionarla: lo nuevo se añade detrás de ella';
    $('#padSub').textContent = kb ? 'Con teclado: 1, 2, 4, 8 y 6 añaden redonda, blanca, negra, corchea y semicorchea; T tresillo; «.» puntillo, S silencio, L ligadura; Retroceso borra; las flechas mueven la selección. P practica y R reproduce.'
      : `Añade las figuras con la paleta ${dockWanted()?'de abajo':'del panel'}.`;
    return;
  }
  if(kb){
    $('#padMain').textContent='Toca la partitura (o «Practicar») para empezar, y luego toca sobre ella en cada nota';
    $('#padSub').textContent='Con teclado: P empieza y, tras la cuenta, tocas con la barra espaciadora o cualquier tecla menos Esc, que detiene. Fuera de la práctica, P, R y N son atajos (practicar, reproducir, nuevo ritmo).';
  } else {
    $('#padMain').textContent='Pulsa «Practicar» y toca en cada nota';
    $('#padSub').textContent = fabWanted() ? 'Durante la práctica, toca el botón grande de abajo en cada nota.' : 'Durante la práctica, toca la partitura en cada nota.';
  }
}

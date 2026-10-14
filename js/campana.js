// Solfeo Rítmico · Campaña: capítulos, niveles, estrellas y mapa.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

/* ---------- Campaña ---------- */
const CHAPTERS = ['El pulso','Corcheas','Semicorcheas y tresillos','Ligaduras y síncopas','Compases compuestos','Compases de amalgama','Desafíos'];
// El orden de la campaña es el de LEVELS (los id no lo siguen: son fijos, ver abajo). bpm = ppm de la unidad del metrónomo
// (en 2/2 y 3/2 la blanca, en 6/8, 9/8 y 12/8 la negra con puntillo, en 3/8 y amalgama la corchea).
const LEVELS = [
  {id:'L1',ch:0,title:'Negras en el pulso',desc:'Una nota por tiempo. Toca justo con cada clic del metrónomo.',sig:'4/4',bars:2,figs:['q'],rests:[],bpm:60,goal:70},
  {id:'L2',ch:0,title:'Negras y blancas',desc:'La blanca dura dos tiempos: tócala una vez y deja pasar el segundo tiempo sin tocar.',sig:'4/4',bars:2,figs:['q','h'],rests:[],bpm:60,goal:70},
  {id:'L3',ch:0,title:'La redonda',desc:'Cuatro tiempos en una sola nota. Sigue contando mientras suena.',sig:'4/4',bars:4,figs:['q','h','w'],rests:[],bpm:66,goal:70},
  {id:'L4',ch:0,title:'Primeros silencios',desc:'En los silencios no se toca, pero el pulso sigue: cuéntalo por dentro.',sig:'4/4',bars:4,figs:['q','h'],rests:['q','h'],bpm:66,goal:70},
  {id:'L5',ch:0,title:'Tres tiempos',desc:'El compás de 3/4 y la blanca con puntillo, que ocupa el compás entero.',sig:'3/4',bars:4,figs:['q','h','hd'],rests:['q','h'],bpm:72,goal:72},
  {id:'L39',ch:0,title:'Un compás de silencio',desc:'El silencio de redonda vale un compás entero en cualquier compás: aquí, tres tiempos sin tocar. Sigue contando para entrar a tiempo en el siguiente.',sig:'3/4',bars:4,figs:['q','h','hd'],rests:['w','q'],bpm:72,goal:72},
  {id:'L6',ch:1,title:'Dos por tiempo',desc:'Dos corcheas llenan un tiempo. Cuenta «1-y, 2-y»: el número en el clic y la «y» entre clic y clic.',sig:'2/4',bars:4,figs:['q','e'],rests:[],bpm:66,goal:72},
  {id:'L7',ch:1,title:'Corcheas y silencios',desc:'Un silencio de corchea deja la nota en la segunda mitad del tiempo.',sig:'4/4',bars:4,figs:['q','h','e'],rests:['q','e'],bpm:70,goal:72},
  {id:'L8',ch:1,title:'Negra con puntillo',desc:'Tiempo y medio, casi siempre seguida de una corchea.',sig:'4/4',bars:4,figs:['q','qd','e','h'],rests:[],bpm:72,goal:72},
  {id:'L9',ch:1,title:'Corcheas en 3/4',desc:'Todo lo anterior, ahora en compás de tres.',sig:'3/4',bars:4,figs:['q','qd','e','h','hd'],rests:['q','e'],bpm:80,goal:75},
  {id:'L30',ch:1,title:'El compás partido',desc:'El 2/2: dos pulsos de blanca por compás. Cada clic vale dos negras: siente la negra por dentro.',sig:'2/2',bars:4,figs:['w','h','q','e'],rests:['h','q'],bpm:50,goal:74},
  {id:'L26',ch:1,title:'Tres blancas',desc:'El 3/2: tres pulsos de blanca. Como en el compás partido, cada clic vale dos negras.',sig:'3/2',bars:4,figs:['h','q','e'],rests:['h','q'],bpm:54,goal:75},
  {id:'L10',ch:2,title:'Cuatro por tiempo',desc:'Cuatro semicorcheas por tiempo. Cuenta «1-i-y-a»: el número en el clic y la «y» en la mitad del tiempo, como con las corcheas.',sig:'2/4',bars:4,figs:['q','e','s'],rests:[],bpm:60,goal:72},
  {id:'L11',ch:2,title:'Mezclas de semicorcheas',desc:'Corchea y dos semicorcheas, dos semicorcheas y corchea, y semicorchea-corchea-semicorchea, con silencios de negra y de corchea.',sig:'4/4',bars:4,figs:['q','e','s'],rests:['q','e'],bpm:66,goal:74},
  {id:'L12',ch:2,title:'Corchea con puntillo',desc:'El ritmo largo-corto: corchea con puntillo y semicorchea.',sig:'4/4',bars:4,figs:['q','e','ed','s'],rests:[],bpm:66,goal:74},
  {id:'L35',ch:2,title:'Al revés: el ritmo lombardo',desc:'Corto-largo: la semicorchea cae en el tiempo y la corchea con puntillo la sigue. Alterna con el largo-corto sin confundirlos.',sig:'2/4',bars:4,figs:['q','e','ed','s','lb'],rests:[],bpm:60,goal:74},
  {id:'L27',ch:2,title:'Silencio de semicorchea',desc:'Un silencio de semicorchea retrasa la nota un cuarto de tiempo. Cuenta «1-i-y-a» por dentro y entra justo en su sitio.',sig:'2/4',bars:4,figs:['q','e','s'],rests:['e','s'],bpm:60,goal:72},
  {id:'L13',ch:2,title:'Tresillos',desc:'Tres corcheas iguales en un tiempo. No las conviertas en dos más una.',sig:'4/4',bars:4,figs:['q','e','t'],rests:[],bpm:66,goal:74},
  {id:'L22',ch:3,title:'Ligaduras de prolongación',desc:'La ligadura une dos notas: toca solo la primera y cuenta las dos. La segunda no se toca.',sig:'4/4',bars:4,figs:['q','h','e'],rests:[],ties:true,bpm:66,goal:72},
  {id:'L21',ch:3,title:'La síncopa',desc:'Corchea, negra, corchea: la negra empieza entre dos tiempos, como dos corcheas ligadas. Tócala en la «y» y deja que el pulso pase por debajo.',sig:'2/4',bars:4,figs:['q','e'],rests:[],sync:true,bpm:60,goal:70,need:['sinc']},
  {id:'L32',ch:3,title:'Negra, blanca, negra',desc:'La síncopa en grande: la blanca empieza en el 2.º tiempo y sigue sonando en el 3.º. Tócala una vez y deja pasar dos tiempos.',sig:'4/4',bars:4,figs:['q','h','e'],rests:['q'],sync:true,bpm:66,goal:72,need:['qhq']},
  {id:'L23',ch:3,title:'Síncopas de semicorchea',desc:'Semicorchea, corchea, semicorchea y notas ligadas sobre el tiempo.',sig:'2/4',bars:4,figs:['q','e','s'],rests:['e','s'],sync:true,ties:true,bpm:60,goal:72},
  {id:'L14',ch:4,title:'El 6/8',desc:'Dos pulsos de negra con puntillo, cada uno dividido en tres corcheas.',sig:'6/8',bars:4,figs:['qd','q','e'],rests:[],bpm:50,goal:72},
  {id:'L31',ch:4,title:'Silencios en 6/8',desc:'Silencios dentro del pulso de negra con puntillo. El silencio de negra va al empezar el pulso; el de negra con puntillo lo ocupa entero.',sig:'6/8',bars:4,figs:['qd','q','e'],rests:['qd','q','e'],bpm:50,goal:72},
  {id:'L15',ch:4,title:'Semicorcheas en 6/8',desc:'Dos semicorcheas ocupan lo que una corchea. Y el ritmo de siciliana: corchea con puntillo, semicorchea y corchea.',sig:'6/8',bars:4,figs:['qd','e','ed','s'],rests:['e'],bpm:44,goal:74},
  {id:'L36',ch:4,title:'Negra y dos semicorcheas',desc:'La negra ocupa dos corcheas del pulso y las dos semicorcheas, la tercera, antes o después de la negra.',sig:'6/8',bars:4,figs:['qd','q','e','s'],rests:['e'],bpm:44,goal:74,need:['qss']},
  {id:'L16',ch:4,title:'El 12/8',desc:'Cuatro pulsos de negra con puntillo. La blanca con puntillo dura dos pulsos.',sig:'12/8',bars:2,figs:['qd','q','e','hd'],rests:['qd','e'],bpm:56,goal:75},
  {id:'L33',ch:4,title:'El 9/8',desc:'Tres pulsos de negra con puntillo por compás. Cuenta las tres corcheas de cada pulso sin perder dónde empieza el compás.',sig:'9/8',bars:4,figs:['qd','q','e','s'],rests:['qd','e'],bpm:44,goal:75},
  {id:'L24',ch:4,title:'Ligaduras en 6/8',desc:'Notas ligadas entre los dos pulsos de negra con puntillo y sobre la barra de compás.',sig:'6/8',bars:4,figs:['qd','q','e'],rests:[],ties:true,bpm:50,goal:74},
  {id:'L34',ch:4,title:'El 3/8',desc:'Un solo pulso por compás, dividido en tres corcheas. El metrónomo marca cada corchea: cuenta «1-2-3» en cada compás y siente el pulso en el «1».',sig:'3/8',bars:8,figs:['qd','q','e','s'],rests:['e'],bpm:132,goal:74},
  {id:'L37',ch:4,title:'El dosillo',desc:'Dos notas iguales en un pulso ternario: el dosillo parte la negra con puntillo en dos mitades, ni corcheas ni negra y corchea.',sig:'6/8',bars:4,figs:['qd','q','e','du'],rests:['e'],bpm:50,goal:74},
  {id:'L17',ch:5,title:'Siete octavos',desc:'Compás de amalgama agrupado 2+2+3. El metrónomo marca el inicio de cada grupo; las luces siguen cada corchea.',sig:'7/8',grp:'2+2+3',bars:4,figs:['q','e'],rests:[],bpm:150,goal:74},
  {id:'L28',ch:5,title:'Siete octavos: 3+2+2',desc:'El mismo compás con el grupo largo al principio: el primer pulso dura una corchea más que los otros dos.',sig:'7/8',grp:'3+2+2',bars:4,figs:['q','qd','e'],rests:['e'],bpm:150,goal:75},
  {id:'L18',ch:5,title:'Cinco octavos',desc:'El 5/8 agrupado 3+2: un pulso largo y uno corto, ahora con semicorcheas.',sig:'5/8',grp:'3+2',bars:4,figs:['q','e','s'],rests:['e'],bpm:126,goal:75},
  {id:'L29',ch:5,title:'Cinco octavos: 2+3',desc:'Los grupos al revés: primero el corto. Siente dónde cae cada pulso.',sig:'5/8',grp:'2+3',bars:4,figs:['q','qd','e','s'],rests:['e','s'],bpm:126,goal:75},
  {id:'L25',ch:5,title:'Ocho octavos',desc:'Agrupado 3+3+2: dos grupos largos y uno corto. El metrónomo marca el inicio de cada grupo, así que sus clics no están a la misma distancia.',sig:'8/8',grp:'3+3+2',bars:4,figs:['q','qd','e'],rests:['q','e'],bpm:150,goal:75},
  {id:'L38',ch:6,title:'Tresillos en 3/4',desc:'Alterna tresillos con corcheas y semicorcheas sin que se contagien: tres, dos o cuatro notas iguales en cada tiempo.',sig:'3/4',bars:4,figs:['q','e','t','s'],rests:['q','e'],bpm:72,goal:75},
  {id:'L19',ch:6,title:'Todo junto',desc:'Ocho compases con casi todas las figuras.',sig:'4/4',bars:8,figs:['h','q','qd','e','ed','s','t'],rests:['h','q','e','s'],bpm:76,goal:76},
  {id:'L20',ch:6,title:'Maestría',desc:'Todas las figuras del compás simple en ocho compases, a tempo de Andante.',sig:'4/4',bars:8,figs:['w','h','hd','q','qd','e','ed','s','t','lb'],rests:['w','h','q','e','s'],bpm:100,goal:80},
];
// Los id son fijos: el avance (prog.levels) se guarda por id, así que se pueden insertar niveles (con id nuevo) y reordenar sin moverlo.
LEVELS.forEach(l=>{ l.s2=Math.min(l.goal+12,90); l.s3=95; });
const lvById = id => LEVELS.findIndex(l=>l.id===id);
let stageMode = ['campana','propio'].includes(set.view) ? set.view : 'libre';
let levelIdx = Math.max(0, lvById(set.levelId || 'L'+((set.level|0)+1)));
function cfg(){ return stageMode==='campana' ? LEVELS[levelIdx] : stageMode==='propio' ? ownCfg() : set; }
function curBpm(){ return Math.min(bpmMax(cfg().sig), stageMode==='campana' ? LEVELS[levelIdx].bpm : stageMode==='propio' && own.cur ? own.cur.bpm : set.bpm); }
function starsFor(l,pct){ return pct>=l.s3?3:pct>=l.s2?2:pct>=l.goal?1:0; }
// siempre números (aunque prog traiga basura): se suman y se pintan
function lvState(i){ const v=prog.levels[LEVELS[i].id]||{}; return {best:+v.best||0, stars:+v.stars||0, tries:+v.tries||0}; }
// abierto: el primero, el que sigue a uno superado y el que ya se superó o se intentó (aunque al reordenar quede tras uno sin superar)
function unlocked(i){ const s=lvState(i); return i===0 || lvState(i-1).stars>0 || s.stars>0 || s.tries>0; }
// Estrellas ganadas llenas (★) y las que faltan vacías (☆): se distinguen por la forma, no solo por el color; el nombre accesible va en quien las contiene
function starStr(n){ return [0,1,2].map(i=>i<n?'<span class="on">★</span>':'<span>☆</span>').join(''); }
const starsTxt = n => `${n} de 3 estrellas`;
const STAR_SR = '<span aria-hidden="true">★</span><span class="sr-only"> estrellas</span>';
function showTempo(){
  const b=curBpm(), camp=stageMode==='campana'; tempoLimits();
  $('#bpm').value=b; $('#bpmRange').value=b; $('#bpmOut').textContent=b+' ppm'; $('#bpmRange').setAttribute('aria-valuetext',b+' ppm'); showTempoMark(b);
  ['#bpm','#bpmUp','#bpmDown','#bpmRange','#tapTempo'].forEach(id=>{ $(id).disabled=camp; });
  $('#tLock').hidden=!camp; $('#tLockHint').hidden=!camp;
}
function renderLevelBar(){
  const l=LEVELS[levelIdx], st=lvState(levelIdx);
  $('#lvEyebrow').textContent=`Capítulo ${l.ch+1} · ${CHAPTERS[l.ch]} — Nivel ${levelIdx+1} de ${LEVELS.length}`;
  $('#lvTitle').textContent=l.title;
  $('#lvDesc').textContent=l.desc;
  // el tempo con su figura («Negra con puntillo = 50») y el término según el pulso
  $('#lvMeta').innerHTML=`<span>${l.sig}${l.grp?' ('+l.grp+')':''}</span><span>${l.bars} compases</span><span>${tempoLabel(l.bpm,SIGS[l.sig])} · ${tempoMark(l.bpm,SIGS[l.sig])}</span><span>Objetivo ${l.goal}%</span><span><span aria-hidden="true">★★</span><span class="sr-only">Dos estrellas: </span>${l.s2}%</span><span><span aria-hidden="true">★★★</span><span class="sr-only">Tres estrellas: </span>${l.s3}%</span>${st.best?`<span>Mejor: ${esc(st.best)}%</span>`:''}`;
  $('#lvStars').innerHTML=starStr(st.stars); $('#lvStars').setAttribute('aria-label',starsTxt(st.stars));
  const a=document.activeElement;
  $('#lvPrev').disabled=levelIdx===0;
  $('#lvNext').disabled=levelIdx>=LEVELS.length-1 || !unlocked(levelIdx+1);
  // si el botón que tenía el foco se apaga (primer o último nivel abierto), el foco pasa al otro
  if(a && a.disabled && (a.id==='lvPrev'||a.id==='lvNext')) $(a.id==='lvPrev'?'#lvNext':'#lvPrev').focus({preventScroll:true});
}
function renderCampMap(){
  let passed=0, stars=0;
  LEVELS.forEach((l,i)=>{ const s=lvState(i); if(s.stars) passed++; stars+=s.stars; });
  $('#campTotal').innerHTML=`<b>${esc(passed)}</b> de ${LEVELS.length} niveles superados · <b>${esc(stars)}</b> de ${LEVELS.length*3} ${STAR_SR}`;
  const lock='<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="5.5" width="8" height="5.5" rx="1" fill="currentColor"/><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
  // nombre accesible completo («Nivel 3: título, 2 de 3 estrellas, superado»); los bloqueados siguen enfocables (aria-disabled) para poder descubrirlos con el teclado
  keepFocus($('#campMap'),()=>{ $('#campMap').innerHTML=CHAPTERS.map((c,ci)=>{
    const btns=LEVELS.map((l,i)=>({l,i})).filter(x=>x.l.ch===ci).map(({l,i})=>{
      const s=lvState(i), un=unlocked(i), nm=`Nivel ${i+1}: ${l.title}, ${un ? starsTxt(s.stars)+', '+(s.stars?'superado':'sin superar') : 'bloqueado'}`;
      return `<button type="button" class="lv${s.stars?' done':''}" data-lv="${i}" ${un?'':'aria-disabled="true"'} aria-current="${i===levelIdx}" aria-label="${esc(nm)}" title="${esc(nm)}">${i+1}<small class="stars" aria-hidden="true">${un?starStr(s.stars):lock}</small></button>`;
    }).join('');
    return `<div class="chap"><h3>${ci+1}. ${c}</h3><div class="lv-grid">${btns}</div></div>`;
  }).join(''); });
}
function firstOpenLevel(){ for(let i=0;i<LEVELS.length;i++){ if(!lvState(i).stars) return i; } return LEVELS.length-1; }
function selectLevel(i){
  if(i<0||i>=LEVELS.length||!unlocked(i)) return;
  stop(); levelIdx=i; set.level=i; set.levelId=LEVELS[i].id; save();
  renderLevelBar(); renderCampMap(); showTempo(); generate();
  const l=LEVELS[i];
  say(`Nivel ${i+1}: ${l.title}. ${l.bpm} ppm de ${unitName(SIGS[l.sig])}, objetivo ${l.goal}%.`);
  requestAnimationFrame(centerScore);
}
// Centra la partitura en la parte visible (descontando el botón flotante en móvil) si no se ve entera
function centerScore(){
  const r=$('.score-card').getBoundingClientRect();
  // el botón flotante en reposo aparece al quedar la partitura a la vista: se reserva su sitio aunque aún esté oculto
  const reserve = fabWanted() ? Math.max(fabReserve(), 100) : 8, room=innerHeight-reserve;
  if(r.top>=8 && r.bottom<=room) return;
  const top = r.height<room-16 ? r.top-(room-r.height)/2 : r.top-8;
  scrollTo({top:scrollY+top, behavior:smooth()});
}
function applyStageMode(){
  const camp=stageMode==='campana', mine=stageMode==='propio';
  $('#secSig').hidden=camp||mine; $('#secFigs').hidden=camp||mine; $('#secCamp').hidden=!camp; $('#levelBar').hidden=!camp;
  $('#secOwn').hidden=!mine; if(!mine) $('#secEdit').hidden=true;
  $('#bNew').hidden=mine; $('#bEditThis').hidden=mine; $('#rNew').hidden=mine;
  // sin ningún ejercicio guardado se abre directamente uno nuevo (salvo si se llega con un enlace #ej=, que ya lo trae)
  if(mine && !own.list.length && !ownLinking) ownNewEx();
  if(mine){ renderOwnList(); renderOwnMeter(); renderPalette(); }
  if(!S.running) padIdle();
  $('#bNewLbl').textContent=camp?'Otro ritmo del nivel':'Nuevo ritmo';
  if(camp){ if(!unlocked(levelIdx)) levelIdx=firstOpenLevel(); renderLevelBar(); renderCampMap(); }
  showTempo(); syncRamp(); generate();
}
function setView(v){
  stop();
  document.querySelectorAll('.tab').forEach(t=>{ const on=t.dataset.view===v; t.setAttribute('aria-selected',String(on)); t.tabIndex=on?0:-1; });
  if(v!=='progreso') $('#stageView').setAttribute('aria-labelledby','tab-'+v);
  $('#stageView').hidden = v==='progreso'; $('#progView').hidden = v!=='progreso';
  updateFab();
  if(v==='progreso'){ renderProgress(); return; }
  set.view=v; save();
  if(v!==stageMode || !score){ stageMode=v; applyStageMode(); }
  updateTransport(); // stop() lo calculó con la pestaña anterior (p. ej. «Practicar» deshabilitado por un ejercicio a medias)
}

// Solfeo Rítmico · Campaña: capítulos, niveles, estrellas y mapa.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

/* ---------- Campaña ---------- */
const CHAPTERS = ['El pulso','Corcheas','Semicorcheas y tresillos','Compases compuestos','Síncopas y ligaduras','Desafíos'];
const LEVELS = [
  {id:'L1',ch:0,title:'Negras en el pulso',desc:'Una nota por tiempo. Toca justo con cada clic del metrónomo.',sig:'4/4',bars:2,figs:['q'],rests:[],bpm:60,goal:70},
  {id:'L2',ch:0,title:'Negras y blancas',desc:'La blanca dura dos tiempos: tócala una vez y deja pasar el segundo tiempo sin tocar.',sig:'4/4',bars:2,figs:['q','h'],rests:[],bpm:60,goal:70},
  {id:'L3',ch:0,title:'La redonda',desc:'Cuatro tiempos en una sola nota. Sigue contando mientras suena.',sig:'4/4',bars:4,figs:['q','h','w'],rests:[],bpm:66,goal:70},
  {id:'L4',ch:0,title:'Primeros silencios',desc:'En los silencios no se toca, pero el pulso sigue: cuéntalo por dentro.',sig:'4/4',bars:4,figs:['q','h'],rests:['q','h'],bpm:66,goal:70},
  {id:'L5',ch:0,title:'Tres tiempos',desc:'El compás de 3/4 y la blanca con puntillo, que ocupa el compás entero.',sig:'3/4',bars:4,figs:['q','h','hd'],rests:['q','h'],bpm:72,goal:72},
  {id:'L6',ch:1,title:'Dos por tiempo',desc:'Dos corcheas llenan un tiempo. Piensa «un-y, dos-y».',sig:'2/4',bars:4,figs:['q','e'],rests:[],bpm:66,goal:72},
  {id:'L7',ch:1,title:'Corcheas y silencios',desc:'Un silencio de corchea deja la nota en la segunda mitad del tiempo.',sig:'4/4',bars:4,figs:['q','h','e'],rests:['q','e'],bpm:70,goal:72},
  {id:'L8',ch:1,title:'Negra con puntillo',desc:'Tiempo y medio, casi siempre seguida de una corchea.',sig:'4/4',bars:4,figs:['q','qd','e','h'],rests:[],bpm:72,goal:72},
  {id:'L9',ch:1,title:'Corcheas en 3/4',desc:'Todo lo anterior, ahora en compás de tres.',sig:'3/4',bars:4,figs:['q','qd','e','h','hd'],rests:['q','e'],bpm:80,goal:75},
  {id:'L10',ch:2,title:'Cuatro por tiempo',desc:'Cuatro semicorcheas por tiempo: «1-e-y-a».',sig:'2/4',bars:4,figs:['q','e','s'],rests:[],bpm:60,goal:72},
  {id:'L11',ch:2,title:'Mezclas de semicorcheas',desc:'Corchea y dos semicorcheas, y al revés.',sig:'4/4',bars:4,figs:['q','e','s'],rests:['q','e'],bpm:66,goal:74},
  {id:'L12',ch:2,title:'Corchea con puntillo',desc:'El ritmo largo-corto: corchea con puntillo y semicorchea.',sig:'4/4',bars:4,figs:['q','e','ed','s'],rests:[],bpm:66,goal:74},
  {id:'L27',ch:2,title:'Silencio de semicorchea',desc:'Un silencio de semicorchea retrasa la nota un cuarto de tiempo. Cuenta «1-e-y-a» por dentro y entra justo en su sitio.',sig:'2/4',bars:4,figs:['q','e','s'],rests:['e','s'],bpm:60,goal:72},
  {id:'L13',ch:2,title:'Tresillos',desc:'Tres corcheas iguales en un tiempo. No las conviertas en dos más una.',sig:'4/4',bars:4,figs:['q','e','t'],rests:[],bpm:66,goal:74},
  {id:'L14',ch:3,title:'El 6/8',desc:'Dos pulsos de negra con puntillo, cada uno dividido en tres corcheas.',sig:'6/8',bars:4,figs:['qd','q','e'],rests:[],bpm:50,goal:72},
  {id:'L15',ch:3,title:'6/8 con silencios',desc:'Silencios y semicorcheas dentro del compás compuesto.',sig:'6/8',bars:4,figs:['qd','q','e','s'],rests:['qd','q','e'],bpm:52,goal:74},
  {id:'L16',ch:3,title:'El 12/8',desc:'Cuatro pulsos ternarios, con blanca con puntillo.',sig:'12/8',bars:2,figs:['qd','q','e','hd'],rests:['qd','e'],bpm:56,goal:75},
  {id:'L21',ch:4,title:'La síncopa',desc:'Corchea, negra, corchea: la negra empieza entre dos tiempos. Tócala en el «y» y deja que el pulso pase por debajo.',sig:'2/4',bars:4,figs:['q','e'],rests:[],sync:true,bpm:60,goal:70},
  {id:'L22',ch:4,title:'Ligaduras de prolongación',desc:'La ligadura une dos notas: toca solo la primera y cuenta las dos. La segunda no se toca.',sig:'4/4',bars:4,figs:['q','h','e'],rests:[],ties:true,bpm:66,goal:72},
  {id:'L23',ch:4,title:'Síncopas de semicorchea',desc:'Semicorchea, corchea, semicorchea y notas ligadas sobre el tiempo.',sig:'2/4',bars:4,figs:['q','e','s'],rests:['e','s'],sync:true,ties:true,bpm:60,goal:72},
  {id:'L24',ch:4,title:'Ligaduras en 6/8',desc:'Notas ligadas entre los dos pulsos de negra con puntillo y sobre la barra de compás.',sig:'6/8',bars:4,figs:['qd','q','e'],rests:[],ties:true,bpm:50,goal:74},
  {id:'L17',ch:5,title:'Siete octavos',desc:'Compás irregular agrupado 2+2+3. El metrónomo marca cada corchea.',sig:'7/8',grp:'2+2+3',bars:4,figs:['q','e'],rests:[],bpm:150,goal:74},
  {id:'L28',ch:5,title:'Siete octavos: 3+2+2',desc:'El mismo compás con el grupo largo al principio. El metrónomo acentúa el inicio de cada grupo.',sig:'7/8',grp:'3+2+2',bars:4,figs:['q','qd','e'],rests:['e'],bpm:150,goal:75},
  {id:'L18',ch:5,title:'Cinco octavos',desc:'Agrupado 3+2, ahora con semicorcheas.',sig:'5/8',grp:'3+2',bars:4,figs:['q','e','s'],rests:['e'],bpm:150,goal:75},
  {id:'L29',ch:5,title:'Cinco octavos: 2+3',desc:'Los grupos al revés: primero el corto. Siente dónde cae cada acento.',sig:'5/8',grp:'2+3',bars:4,figs:['q','qd','e','s'],rests:['e','s'],bpm:150,goal:75},
  {id:'L25',ch:5,title:'Ocho octavos',desc:'Agrupado 3+3+2: dos grupos largos y uno corto. El metrónomo marca cada corchea.',sig:'8/8',grp:'3+3+2',bars:4,figs:['q','qd','e'],rests:['q','e'],bpm:150,goal:75},
  {id:'L26',ch:5,title:'Tres blancas',desc:'El 3/2: el pulso es la blanca. Cada clic vale dos negras.',sig:'3/2',bars:4,figs:['h','q','e'],rests:['h','q'],bpm:60,goal:75},
  {id:'L19',ch:5,title:'Todo junto',desc:'Ocho compases con casi todas las figuras.',sig:'4/4',bars:8,figs:['h','q','qd','e','ed','s','t'],rests:['h','q','e','s'],bpm:76,goal:76},
  {id:'L20',ch:5,title:'Maestría',desc:'Todas las figuras a tempo de Allegro.',sig:'4/4',bars:8,figs:['w','h','hd','q','qd','e','ed','s','t'],rests:['w','h','q','e','s'],bpm:100,goal:80},
];
// Los id son fijos: el avance (prog.levels) se guarda por id y los niveles nuevos no deben moverlo.
LEVELS.forEach(l=>{ l.s2=Math.min(l.goal+12,90); l.s3=95; });
const lvById = id => LEVELS.findIndex(l=>l.id===id);
let stageMode = ['campana','propio'].includes(set.view) ? set.view : 'libre';
let levelIdx = Math.max(0, lvById(set.levelId || 'L'+((set.level|0)+1)));
function cfg(){ return stageMode==='campana' ? LEVELS[levelIdx] : stageMode==='propio' ? ownCfg() : set; }
function curBpm(){ return stageMode==='campana' ? LEVELS[levelIdx].bpm : stageMode==='propio' && own.cur ? own.cur.bpm : set.bpm; }
function starsFor(l,pct){ return pct>=l.s3?3:pct>=l.s2?2:pct>=l.goal?1:0; }
// siempre números (aunque prog traiga basura): se suman y se pintan
function lvState(i){ const v=prog.levels[LEVELS[i].id]||{}; return {best:+v.best||0, stars:+v.stars||0, tries:+v.tries||0}; }
function unlocked(i){ return i===0 || lvState(i-1).stars>0 || lvState(i).stars>0; }
// Estrellas ganadas llenas (★) y las que faltan vacías (☆): se distinguen por la forma, no solo por el color; el nombre accesible va en quien las contiene
function starStr(n){ return [0,1,2].map(i=>i<n?'<span class="on">★</span>':'<span>☆</span>').join(''); }
const starsTxt = n => `${n} de 3 estrellas`;
const STAR_SR = '<span aria-hidden="true">★</span><span class="sr-only"> estrellas</span>';
function showTempo(){
  const b=curBpm(), camp=stageMode==='campana';
  $('#bpm').value=b; $('#bpmRange').value=b; $('#bpmOut').textContent=b+' ppm'; $('#bpmRange').setAttribute('aria-valuetext',b+' ppm'); $('#tMark').textContent=tempoMark(b);
  ['#bpm','#bpmUp','#bpmDown','#bpmRange','#tapTempo'].forEach(id=>{ $(id).disabled=camp; });
  $('#tLock').hidden=!camp; $('#tLockHint').hidden=!camp;
}
function renderLevelBar(){
  const l=LEVELS[levelIdx], st=lvState(levelIdx);
  $('#lvEyebrow').textContent=`Capítulo ${l.ch+1} · ${CHAPTERS[l.ch]} — Nivel ${levelIdx+1} de ${LEVELS.length}`;
  $('#lvTitle').textContent=l.title;
  $('#lvDesc').textContent=l.desc;
  const unit={12:'♩',24:'𝅗𝅥',18:'♩.',6:'♪'}[SIGS[l.sig].click];
  $('#lvMeta').innerHTML=`<span>${l.sig}${l.grp?' ('+l.grp+')':''}</span><span>${l.bars} compases</span><span>${l.bpm} ppm</span><span>Objetivo ${l.goal}%</span><span><span aria-hidden="true">★★</span><span class="sr-only">Dos estrellas: </span>${l.s2}%</span><span><span aria-hidden="true">★★★</span><span class="sr-only">Tres estrellas: </span>${l.s3}%</span>${st.best?`<span>Mejor: ${esc(st.best)}%</span>`:''}`;
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
  say(`Nivel ${i+1}: ${LEVELS[i].title}. ${LEVELS[i].bpm} ppm, objetivo ${LEVELS[i].goal}%.`);
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
  showTempo(); generate();
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
}

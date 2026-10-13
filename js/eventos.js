// Solfeo Rítmico · Eventos: controles del panel, transporte, teclado, zona de toque, plegables y «Restablecer ajustes».
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

/* ---------- Eventos ---------- */
function rhythmChanged(){ save(); if(S.running && S.mode!=='metro') stop(); generate(); if(S.running && S.mode==='metro') renderLights(); }
$('#sigs').addEventListener('click',e=>{
  const b=e.target.closest('.sig'); if(!b) return;
  set.sig=b.dataset.sig; renderSigs(); renderGrp(); setBpm(set.bpm,false); rhythmChanged();
});
$('#grpSeg').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  set.grp={...set.grp,[set.sig]:b.dataset.g}; renderGrp(); rhythmChanged();
});
$('#figs').addEventListener('click',e=>{
  const b=e.target.closest('.fig'); if(!b) return;
  const k=b.dataset.k, i=set.figs.indexOf(k);
  if(i>=0){ if(set.figs.length===1) return; set.figs.splice(i,1); } else set.figs.push(k);
  b.setAttribute('aria-pressed',String(set.figs.includes(k)));
  rhythmChanged();
});
$('#barsDown').addEventListener('click',()=>{ if(set.bars>1){ set.bars--; $('#bars').textContent=set.bars; rhythmChanged(); } });
$('#barsUp').addEventListener('click',()=>{ if(set.bars<16){ set.bars++; $('#bars').textContent=set.bars; rhythmChanged(); } });
['sync','ties'].forEach(id=>$('#'+id).addEventListener('change',e=>{ set[id]=e.target.checked; rhythmChanged(); }));
$('#restFigs').addEventListener('click',e=>{
  const b=e.target.closest('.fig'); if(!b) return;
  const k=b.dataset.r, i=set.rests.indexOf(k);
  if(i>=0) set.rests.splice(i,1); else set.rests.push(k);
  b.setAttribute('aria-pressed',String(set.rests.includes(k)));
  rhythmChanged();
});
['sound','loop','metro','accent','countSub'].forEach(id=>$('#'+id).addEventListener('change',e=>{ set[id]=e.target.checked; save(); if(S.running && S.mode!=='metro') stop(); }));
$('#cursor').addEventListener('change',e=>{ set.cursor=e.target.checked; save(); if(!set.cursor && S.nowI>=0 && evEls[S.nowI]) evEls[S.nowI].classList.remove('now'); });
['timbre','sub','countIn'].forEach(id=>$('#'+id).addEventListener('change',e=>{ set[id]=e.target.value; save(); syncSub(); syncCount(); if(S.running && S.mode!=='metro') stop(); }));
$('#tapSound').addEventListener('change',e=>{ set.tapSound=e.target.checked; save(); syncTapVol(); });
['rhythmVol','metroVol','tapVol'].forEach(id=>$('#'+id).addEventListener('input',e=>{ set[id]=+e.target.value; updOutputs(); save(); liveVol(); }));
$('#offset').addEventListener('input',e=>{ set.offset=+e.target.value; updOutputs(); save(); });
$('#bpm').addEventListener('change',e=>setBpm(e.target.value));
$('#bpmRange').addEventListener('input',e=>setBpm(e.target.value));
$('#bpmDown').addEventListener('click',()=>setBpm(set.bpm-1));
$('#bpmUp').addEventListener('click',()=>setBpm(set.bpm+1));
let taps=[];
$('#tapTempo').addEventListener('click',()=>{
  const t=performance.now();
  if(taps.length && t-taps[taps.length-1]>2000) taps=[];
  taps.push(t); if(taps.length>5) taps.shift();
  if(taps.length>=2){ const iv=(taps[taps.length-1]-taps[0])/(taps.length-1); setBpm(60000/iv); }
});
$('#bPlay').addEventListener('click',()=>start('play'));
$('#bPractice').addEventListener('click',()=>start('practice'));
$('#bStop').addEventListener('click',()=>{ if(S.running && S.mode==='practice') finish(true); else stop(); });
$('#bMetro').addEventListener('click',()=>{ if(S.running && S.mode==='metro') stop(); else start('metro'); });
$('#bNew').addEventListener('click',()=>{ if(S.running && S.mode!=='metro') stop(); generate(); });
$('#rNew').addEventListener('click',()=>{ generate(); });
$('#rAgain').addEventListener('click',()=>start('practice'));
$('#bCalib').addEventListener('click',()=>{ if(S.running && S.mode==='calib') stop(); else startCalib(); });
$('#kAgain').addEventListener('click',()=>startCalib());
$('#kApply').addEventListener('click',()=>{
  if(K.suggest==null) return;
  set.offset=K.suggest; $('#offset').value=set.offset; updOutputs(); save();
  $('#kApply').disabled=true; $('#kApply').textContent='Corrección aplicada';
});
// La partitura es la zona de toque, pero solo durante la práctica o la medición: en reposo se puede desplazar y seleccionar con normalidad
function bindTapZone(el,pre){
  // En reposo, un clic (no un arrastre para desplazar la página) empieza la práctica. Se ignora el clic que
  // cierra un toque empezado durante la práctica, para no volver a empezar al soltar después del final.
  let downWhileRunning=false;
  el.addEventListener('click',e=>{
    if(!S.running && !downWhileRunning){
      if(el.id==='pad' && stageMode==='propio' && !judg.length){ const g=e.target.closest('.ev'); if(g){ own.cursor=own.evTok[+g.dataset.i]+1; markSel(); renderOwnStatus(); $('#ownDelTok').disabled=false; } }
      else start('practice');
    }
    downWhileRunning=false;
  });
  el.addEventListener('pointerdown',e=>{
    downWhileRunning=S.running;
    if(!S.running || (S.mode!=='practice' && S.mode!=='calib')) return;
    if(e.button>0) return;
    e.preventDefault(); try{ el.setPointerCapture(e.pointerId); }catch(_){} tap(pre+e.pointerId,e.timeStamp);
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>el.addEventListener(t,e=>release(pre+e.pointerId,e.timeStamp)));
  el.addEventListener('contextmenu',e=>{ if(S.running) e.preventDefault(); });
}
bindTapZone($('#pad'),'p'); bindTapZone($('#tapFab'),'f');
// «Reiniciar» del botón flotante: hay que mantenerlo pulsado medio segundo (la animación dura lo mismo)
let restartTimer=0;
function restartCancel(){ clearTimeout(restartTimer); restartTimer=0; $('#fabRestart').classList.remove('arming'); }
$('#fabRestart').addEventListener('pointerdown',e=>{
  e.preventDefault(); if(!S.running || e.button>0) return;
  try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(_){}
  restartCancel(); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('arming');
  restartTimer=setTimeout(()=>{
    restartTimer=0; const m=S.running && S.mode;
    if(m==='practice'){ start('practice'); say('Práctica reiniciada'); }
    else if(m==='calib'){ startCalib(); say('Medición reiniciada'); }
    restartCancel();
  },500);
});
['pointerup','pointercancel','lostpointercapture'].forEach(t=>$('#fabRestart').addEventListener(t,restartCancel));
$('#fabRestart').addEventListener('contextmenu',e=>e.preventDefault());
// Botón de tres partes tras la práctica. Se ignoran los toques del primer instante: puede ser el dedo que seguía tocando al terminar
const postOk=()=>performance.now()-postSince>700;
$('#pfAgain').addEventListener('click',()=>{ if(postOk()) start('practice'); });
$('#pfNew').addEventListener('click',()=>{ if(postOk()) generate(); });
$('#pfNext').addEventListener('click',()=>{
  if(!postOk()) return;
  if(stageMode!=='campana') closeResults();
  else if(!$('#rcNext').hidden) selectLevel(levelIdx+1);
});
$('#fab').addEventListener('change',e=>{ set.fab=e.target.checked; save(); updateFab(); });
const isField=el=>el && (el.tagName==='INPUT'||el.tagName==='SELECT'||el.tagName==='TEXTAREA');
document.addEventListener('keydown',e=>{
  if(ownKeys(e)) return;
  if(e.metaKey||e.ctrlKey||e.altKey||e.repeat) return;
  if(e.key==='Escape' && S.running){ e.preventDefault(); if(S.mode==='practice') finish(true); else stop(); return; }
  const practicing=S.running && (S.mode==='practice'||S.mode==='calib');
  if(practicing && (e.code==='Space'||e.code==='Enter'||(e.key.length===1 && !isField(e.target)))){
    if(isField(e.target) && e.code!=='Space') return;
    e.preventDefault(); tap('k'+e.code,e.timeStamp); return;
  }
  if(isField(e.target)) return;
  if((e.code==='Space'||e.code==='Enter') && e.target===$('#pad')){ e.preventDefault(); if(S.running) tap('k'+e.code,e.timeStamp); else start('practice'); return; }
  if($('#stageView').hidden) return;
  const k=e.key.toLowerCase();
  if(k==='n'){ if(stageMode==='propio') return; if(S.running && S.mode!=='metro') stop(); generate(); }
  else if(k==='p'){ e.preventDefault(); start('practice'); }
  else if(k==='r'){ e.preventDefault(); start('play'); }
});
document.addEventListener('keyup',e=>{ if(S.running && (S.mode==='practice'||S.mode==='calib') && e.code==='Space') e.preventDefault(); release('k'+e.code,e.timeStamp); });
window.addEventListener('blur',()=>{ if(S.running && S.hold) [...S.holds.keys()].forEach(k=>release(k)); [...tapVoices.keys()].forEach(tapSoundOff); });
function syncHold(){
  $('#holdSw').checked=!!set.hold;
  document.querySelectorAll('#modeSeg button').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.hold==='1')===!!set.hold)));
}
function setHold(v){ set.hold=!!v; save(); syncHold(); if(S.running && S.mode==='practice') stop(); }
$('#modeSeg').addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) setHold(b.dataset.hold==='1'); });
$('#holdSw').addEventListener('change',e=>setHold(e.target.checked));
$('#penalize').addEventListener('change',e=>{ set.penalize=e.target.checked; save(); });
$('#vibrate').addEventListener('change',e=>{ set.vibrate=e.target.checked; save(); });
$('#bFull').addEventListener('click',()=>{ backToFull(); say('Ritmo completo'); });
$('#rWeakBtn').addEventListener('click',()=>{ if(weakM<0) return; measureExcerpt(weakM); start('practice'); });
// Bienvenida: se muestra hasta que se cierra o se termina la primera práctica
function dismissWelcome(){ set.seen=true; save(); $('#welcome').hidden=true; }
$('#welOk').addEventListener('click',()=>{ dismissWelcome(); $('#bPlay').focus(); });
$('#welCalib').addEventListener('click',()=>{ dismissWelcome(); startCalib(); });
// Paneles plegables: abiertos por defecto en pantallas anchas; se recuerda solo lo que cambia el usuario
const wideMQ=matchMedia('(min-width: 921px)');
const foldDefault=d=>{ const k=d.dataset.fold; return k in set.folds ? !!set.folds[k] : wideMQ.matches; };
function syncFolds(){ document.querySelectorAll('.fold').forEach(d=>{ d.open=foldDefault(d); }); }
document.querySelectorAll('.fold').forEach(d=>d.addEventListener('toggle',()=>{
  if(d.open===foldDefault(d)) return;
  set.folds={...set.folds,[d.dataset.fold]:d.open}; save();
}));
// Restablecer ajustes: conserva el progreso, la corrección de latencia y la vista
const RESET_BTN='<button class="btn" id="resetSet" type="button">Restablecer ajustes</button>';
$('#resetBox').addEventListener('click',e=>{
  const box=$('#resetBox'), id=e.target.closest('button')?.id;
  if(id==='resetSet'){ box.innerHTML='<span>¿Volver a las opciones iniciales? Se conservan tu progreso y la corrección de latencia.</span><button class="btn warn" id="resetYes" type="button">Restablecer</button><button class="btn" id="resetNo" type="button">Cancelar</button>'; $('#resetNo').focus(); }
  else if(id==='resetYes'){
    stop();
    const keep={offset:set.offset, view:set.view, level:set.level, levelId:set.levelId, seen:set.seen};
    set={...freshSettings(), ...keep}; save();
    renderSigs(); renderGrp(); renderFigs(); renderRests(); syncControls(); syncFolds(); updateFab();
    if(stageMode==='campana') showTempo(); else generate();
    box.innerHTML=RESET_BTN; $('#resetSet').focus(); say('Ajustes restablecidos');
  }
  else if(id==='resetNo'){ box.innerHTML=RESET_BTN; $('#resetSet').focus(); }
});

let rz=0;
new ResizeObserver(()=>{ cancelAnimationFrame(rz); rz=requestAnimationFrame(()=>{ if(score) renderScore(); }); }).observe($('#score'));

// Solfeo Rítmico · Inicio: pestañas, campaña, progreso, editor de Mis ejercicios y arranque de la app (debe cargarse el último).
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

/* ---------- Inicio ---------- */
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>setView(t.dataset.view)));
$('.tabs').addEventListener('keydown',e=>{
  const tabs=[...document.querySelectorAll('.tab')], i=tabs.indexOf(e.target), n=tabs.length; if(i<0) return;
  const j = e.key==='ArrowRight' ? (i+1)%n : e.key==='ArrowLeft' ? (i-1+n)%n : e.key==='Home' ? 0 : e.key==='End' ? n-1 : -1;
  if(j<0) return;
  e.preventDefault(); tabs[j].focus(); setView(tabs[j].dataset.view);
});
$('#campMap').addEventListener('click',e=>{ const b=e.target.closest('.lv'); if(b && !b.disabled) selectLevel(+b.dataset.lv); });
$('#lvPrev').addEventListener('click',()=>selectLevel(levelIdx-1));
$('#lvNext').addEventListener('click',()=>selectLevel(levelIdx+1));
$('#rcNext').addEventListener('click',()=>selectLevel(levelIdx+1));
$('#rSave').addEventListener('click',()=>{ if(!pendingRec) return; saveSession(pendingRec); $('#rSave').hidden=true; $('#rSaved').hidden=false; $('#rSaved').textContent='Guardado en «Mi progreso».'; });
$('#autosave').addEventListener('change',e=>{ set.autosave=e.target.checked; save(); });
$('#pFilter').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; pFilter=b.dataset.f; renderProgress(); });
$('#pClearBox').addEventListener('click',e=>{
  const box=$('#pClearBox'), id=e.target.closest('button')?.id;
  if(id==='pClear'){ box.innerHTML='<span>¿Borrar todas las prácticas y el avance de la campaña?</span><button class="btn warn" id="pClearYes" type="button">Sí, borrar todo</button><button class="btn" id="pClearNo" type="button">Cancelar</button>'; $('#pClearNo').focus(); }
  else if(id==='pClearYes'){ prog=emptyProg(); commitProg(); box.innerHTML='<button class="btn warn" id="pClear" type="button">Borrar historial</button>'; renderProgress(); $('#pClear').focus(); say('Historial borrado'); }
  else if(id==='pClearNo'){ box.innerHTML='<button class="btn warn" id="pClear" type="button">Borrar historial</button>'; $('#pClear').focus(); }
});
// Editor de «Mis ejercicios»
function ownKeys(e){
  if(stageMode!=='propio' || S.running || !own.cur || $('#stageView').hidden || isField(e.target)) return false;
  const k=e.key.toLowerCase();
  if(e.ctrlKey||e.metaKey){
    if(k==='z'){ e.preventDefault(); e.shiftKey ? ownUndoRedo(own.redo,own.undo) : ownUndoRedo(own.undo,own.redo); return true; }
    if(k==='y'){ e.preventDefault(); ownUndoRedo(own.redo,own.undo); return true; }
    return false;
  }
  if(e.altKey) return false;
  const fig={'1':'w','2':'h','4':'q','8':'e','6':'s','t':'t'}[k];
  if(fig && !e.repeat){ e.preventDefault(); ownInsert(fig); return true; }
  const mod={'.':'dot','s':'rest','l':'tie'}[k];
  if(mod && !e.repeat){ e.preventDefault(); own.mods[mod]=!own.mods[mod]; renderPalette(); return true; }
  if(k==='backspace'||k==='delete'){ e.preventDefault(); ownDelete(); return true; }
  if(k==='arrowleft'||k==='arrowright'){ if(e.target.closest && e.target.closest('.tabs')) return false; e.preventDefault(); ownMove(k==='arrowleft'?-1:1); return true; }
  return false;
}
$('#ownSig').innerHTML=Object.keys(SIGS).map(k=>`<option value="${k}">${k}</option>`).join('');
// Con la paleta fija abajo, la figura resaltada debe quedar a la vista por encima de ella
function ownReveal(){
  if(!dockShown()) return;
  const el=document.querySelector('#score .ev.sel') || [...document.querySelectorAll('#score .ev')].pop(); if(!el) return;
  const r=el.getBoundingClientRect(), room=innerHeight-fabReserve();
  if(r.bottom+40>room) scrollTo({top:scrollY+r.bottom+40-room, behavior:'smooth'});
  else if(r.top<40) scrollTo({top:scrollY+r.top-40, behavior:'smooth'});
}
$('#ownPal').addEventListener('click',e=>{ const b=e.target.closest('.pal-b'); if(b && !b.disabled){ ownInsert(b.dataset.k); ownReveal(); } });
$('#ownMods').addEventListener('click',e=>{ const b=e.target.closest('button[data-mod]'); if(!b) return; own.mods[b.dataset.mod]=!own.mods[b.dataset.mod]; renderPalette(); });
$('#ownUndo').addEventListener('click',()=>{ ownUndoRedo(own.undo,own.redo); ownReveal(); });
$('#ownRedo').addEventListener('click',()=>{ ownUndoRedo(own.redo,own.undo); ownReveal(); });
$('#ownDelTok').addEventListener('click',()=>{ ownDelete(); ownReveal(); });
$('#ownPractice').addEventListener('click',()=>start('practice'));
// Mientras se escribe en un campo (nombre, notación…) la paleta fija se quita, para no tapar ni quedar sobre el teclado
const isTyping = el => !!el && el.matches && el.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]),textarea,select');
document.addEventListener('focusin',e=>{ const f=isTyping(e.target); if(f!==fieldFocus){ fieldFocus=f; updateFab(); } });
document.addEventListener('focusout',()=>{ setTimeout(()=>{ const f=isTyping(document.activeElement); if(f!==fieldFocus){ fieldFocus=f; updateFab(); } }); });
narrowMQ.addEventListener('change',updateFab);
$('#ownName').addEventListener('input',e=>{ if(!own.cur) return; own.cur.name=cleanName(e.target.value); saveOwn(); renderOwnList(); renderSummary(); });
$('#ownName').addEventListener('change',e=>{ if(own.cur){ uniqueName(own.cur); e.target.value=own.cur.name; saveOwn(); renderOwnList(); renderSummary(); } });
function ownChangeMeter(sig, grp){
  const x=own.cur; if(!x) return;
  const nx={...x, sig, grp};
  let r; try{ r=reflow(own.toks, nx); }catch(err){ if(!(err instanceof OwnError)) throw err; ownMsg(err.message,true); renderOwnMeter(); return; }
  own.undo.push(ownSnap()); own.redo=[];
  x.sig=sig; x.grp=grp; own.toks=r.toks; own.cursor=r.map[Math.min(own.cursor,own.toks.length)]??r.toks.length;
  ownMsg(''); renderOwnMeter(); renderPalette(); stop(); ownCommit(); renderTempoGlyph();
}
$('#ownSig').addEventListener('change',e=>{ const sg=e.target.value, o=ODD_GROUPS[sg]; ownChangeMeter(sg, o?o[0]:null); });
$('#ownGrp').addEventListener('change',e=>ownChangeMeter(own.cur.sig, e.target.value));
$('#ownTextApply').addEventListener('click',()=>{
  if(!own.cur) return;
  let t; try{ t=parseNotation($('#ownText').value, own.cur); }catch(err){ if(!(err instanceof OwnError)) throw err; ownMsg(err.message,true); return; }
  own.undo.push(ownSnap()); own.redo=[]; own.toks=t; own.cursor=t.length; ownMsg('Notación aplicada.'); ownCommit();
});
$('#ownFix').addEventListener('click',()=>{
  if(!own.cur || !own.issues.length) return;
  const r=pulseRewrite(own.toks, own.cur);
  if(ownApply(r.toks, r.map[own.cursor])){ ownMsg('Reescrito según el pulso.'); say('Reescrito según el pulso'); }
});
$('#ownList').addEventListener('click',e=>{ const b=e.target.closest('.own-item'); if(!b) return; const x=own.list.find(y=>y.id===b.dataset.id); if(x){ ownMsg(''); ownOpen(x); } });
// Crea un ejercicio vacío (con el compás y el tempo del abierto o de Práctica libre) y lo abre
function ownNewEx(){
  let n=own.list.length+1; while(own.list.some(y=>y.name===`Ejercicio ${n}`)) n++;
  const base=own.cur||{sig:set.sig, grp:sigOf(set).grp, bpm:set.bpm};
  ownAdd(cleanEx({name:`Ejercicio ${n}`, sig:base.sig, grp:base.grp, bpm:base.bpm, notation:''}));
}
$('#ownNew').addEventListener('click',()=>{
  ownNewEx(); ownMsg('');
  // en pantallas táctiles no se enfoca el nombre (abriría el teclado y quitaría la paleta fija): se lleva la vista a la partitura
  if(touchMQ.matches) $('.score-card').scrollIntoView({block:'start', behavior:'smooth'});
  else { $('#ownName').focus(); $('#ownName').select(); }
});
$('#ownImpBtn').addEventListener('click',()=>{ const b=$('#ownImport'); b.hidden=!b.hidden; $('#ownImpBtn').setAttribute('aria-expanded',String(!b.hidden)); if(!b.hidden) $('#ownImpText').focus(); });
$('#ownImpCancel').addEventListener('click',()=>{ $('#ownImport').hidden=true; $('#ownImpBtn').setAttribute('aria-expanded','false'); $('#ownImpText').value=''; $('#ownImpFile').value=''; });
$('#ownImpGo').addEventListener('click',()=>{ if(ownImport($('#ownImpText').value)){ $('#ownImpCancel').click(); } });
$('#ownImpFile').addEventListener('change',async e=>{
  const f=e.target.files[0]; if(!f) return;
  if(f.size>1e6){ ownMsg('El archivo es demasiado grande (máximo 1 MB).',true); e.target.value=''; return; }
  if(ownImport(await f.text())) $('#ownImpCancel').click(); else e.target.value='';
});
$('#ownExpAll').addEventListener('click',()=>{ if(!own.list.length){ ownMsg('No hay ejercicios que exportar.',true); return; } download('mis-ejercicios.json', exJSON(own.list)); ownMsg(`Descargado mis-ejercicios.json con ${own.list.length} ${own.list.length===1?'ejercicio':'ejercicios'}.`); });
$('#ownDl').addEventListener('click',()=>{ if(!own.cur) return; const f=slug(own.cur.name)+'.json'; download(f, exJSON([own.cur])); ownMsg(`Descargado ${f}.`); });
$('#ownCopyText').addEventListener('click',async()=>{ if(!own.cur) return; const t=exText(own.cur); showOut(t); ownMsg(await copyText(t) ? 'Texto copiado: pégalo donde quieras compartirlo.' : 'No se pudo copiar: selecciona el texto de abajo y cópialo.', false); });
$('#ownCopyLink').addEventListener('click',async()=>{
  if(!own.cur) return;
  const u=exLink(own.cur);
  if(u.length>LINK_MAX){ $('#ownOut').hidden=true; ownMsg(`Este ejercicio es demasiado largo para un enlace (${u.length} caracteres; el máximo seguro es ${LINK_MAX}). Compártelo como archivo .json o como texto.`, true); return; }
  showOut(u); ownMsg(await copyText(u) ? `Enlace copiado (${u.length} caracteres).` : 'No se pudo copiar: selecciona el enlace de abajo y cópialo.', false);
});
$('#ownDelBox').addEventListener('click',e=>{
  const id=e.target.closest('button')?.id, x=own.cur; if(!x) return;
  if(id==='ownDup'){ const c=cleanEx({...x, id:'', name:x.name+' (copia)', created:0, updated:0}); ownAdd(c); ownMsg(`Creada la copia «${c.name}».`); }
  else if(id==='ownDel'){ $('#ownDelBox').innerHTML=`<span>¿Borrar «${esc(x.name)}»? Tus prácticas guardadas se conservan.</span><button class="btn warn" id="ownDelYes" type="button">Sí, borrar</button><button class="btn" id="ownDelNo" type="button">Cancelar</button>`; $('#ownDelNo').focus(); }
  else if(id==='ownDelYes'){ own.list=own.list.filter(y=>y!==x); saveOwn(); renderOwnDelBox(); if(own.list.length) ownOpen(own.list[0]); else ownNewEx(); ownMsg(`Borrado «${x.name}».`); say(`Borrado ${x.name}`); }
  else if(id==='ownDelNo'){ renderOwnDelBox(); $('#ownDel').focus(); }
});
$('#bEditThis').addEventListener('click',editThis);
$('#pfNew').addEventListener('click',()=>{ if(postOk() && stageMode==='propio') document.querySelector('#secOwn').scrollIntoView({block:'start',behavior:'smooth'}); });
addEventListener('hashchange',ownFromHash);

// Botón flotante «Practicar» en reposo: solo si la partitura está a la vista. Se observa aquí, con todos los scripts ya cargados,
// porque updateFab usa estado de varios de ellos
new IntersectionObserver(es=>{ padInView=es[es.length-1].isIntersecting; updateFab(); }).observe($('#pad'));
new ResizeObserver(()=>{ if(!$('#progView').hidden) renderChart(prog.sessions.filter(r=>pFilter==='todo'||r.mode===pFilter)); }).observe($('#progView'));

renderSigs(); renderGrp(); renderFigs(); renderRests(); syncControls(); syncFolds(); padIdle();
const ownLast=own.list.find(x=>x.id===set.ownId)||own.list[0]; if(ownLast) ownOpen(ownLast);
setView(stageMode);
ownFromHash();
if(!set.seen && !prog.sessions.length) $('#welcome').hidden=false;
initStore();

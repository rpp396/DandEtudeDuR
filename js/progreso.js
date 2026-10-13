// Solfeo Rítmico · Guardado del progreso y vista «Mi progreso».
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

/* ---------- Guardado del progreso ---------- */
const PKEY='solfeo-ritmico-progreso-v1', MAX_SESS=400;
let prog = loadProgLocal();
const store = {ref:null, where:'local', writing:false, pending:false};
function emptyProg(){ return {levels:{}, sessions:[]}; }
// Lo guardado (localStorage o db de claude.ai) no es de fiar: se copian solo campos conocidos, con su tipo y rango (ver «Validación» en datos.js).
// Sesión → copia validada, o null si no sirve (no es un objeto, le falta lo esencial o el compás/nivel no existen)
function cleanSession(r){
  if(!isObj(r)) return null;
  const id=strIn(r.id,/^[A-Za-z0-9_-]{1,40}$/,''), t=numIn(r.t,0,8.64e15,NaN), pct=numIn(r.pct,0,100,NaN,true), mode=oneOf(r.mode,['libre','campana','propio'],'');
  const sig=typeof r.sig==='string' && has(SIGS,r.sig) ? r.sig : '';
  if(!id || !isFinite(t) || !isFinite(pct) || !mode || !sig) return null;
  let lid=null, lvl=null;
  if(mode==='campana'){
    lid = typeof r.lid==='string' && lvById(r.lid)>=0 ? r.lid : null; lvl = Number.isInteger(r.lvl) && r.lvl>=0 && r.lvl<LEVELS.length ? r.lvl : null;
    if(lid==null && (lvl==null || lvById('L'+(lvl+1))<0)) return null;   // las sesiones antiguas no tienen lid: su lvl es L(lvl+1)
  }
  const c=(v,hi)=>numIn(v,0,hi,0,true), exn=typeof r.exn==='string' && r.exn.trim() ? cleanName(r.exn) : null;
  return {id, t, mode, lvl, lid, sig, grp: has(ODD_GROUPS,sig) && ODD_GROUPS[sig].includes(r.grp) ? r.grp : null,
    bars:numIn(r.bars,1,64,1,true), bpm:numIn(r.bpm,30,240,80,true), pct, n:c(r.n,9999), exact:c(r.exact,9999), good:c(r.good,9999), near:c(r.near,9999), miss:c(r.miss,9999), extra:c(r.extra,9999),
    mean: r.mean==null ? null : numIn(r.mean,-5000,5000,null,true), play:r.play==='piano'?'piano':'bateria', pen:r.pen===true,
    ...(r.part===true?{part:true}:{}), ...(mode==='propio' ? {ex:strIn(r.ex,/^[a-z0-9]{4,24}$/,''), ...(exn?{exn}:{})} : {})};
}
// Avance por nivel: solo los id de LEVELS (nunca las claves del dato), con best 0-100, stars 0-3 y tries >= 0
function cleanLevels(l){
  const out={}; if(!isObj(l)) return out;
  LEVELS.forEach(lv=>{ const v=has(l,lv.id) ? l[lv.id] : null; if(isObj(v)) out[lv.id]={best:numIn(v.best,0,100,0,true), stars:numIn(v.stars,0,3,0,true), tries:numIn(v.tries,0,99999,0,true)}; });
  return out;
}
// Progreso completo validado; sin sesiones repetidas ni más de MAX_SESS (se mira solo el final de la lista para acotar el trabajo)
function cleanProg(p){
  const out=emptyProg(); if(!isObj(p)) return out;
  out.levels=cleanLevels(p.levels);
  const seen=new Set();
  (Array.isArray(p.sessions) ? p.sessions.slice(-MAX_SESS*5) : []).forEach(x=>{ const r=cleanSession(x); if(r && !seen.has(r.id)){ seen.add(r.id); out.sessions.push(r); } });
  out.sessions=out.sessions.slice(-MAX_SESS);
  return out;
}
function loadProgLocal(){ try{ return cleanProg(JSON.parse(localStorage.getItem(PKEY)||'null')); }catch(e){} return emptyProg(); }
function mergeProg(a,b){
  const out=emptyProg(); const byId=new Map();
  [a,b].forEach(p=>{ if(!p) return; p=cleanProg(p);
    p.sessions.forEach(x=>{ if(!byId.has(x.id)) byId.set(x.id,x); });
    Object.entries(p.levels).forEach(([k,v])=>{ const o=out.levels[k]||{best:0,stars:0,tries:0};
      out.levels[k]={best:Math.max(o.best,v.best),stars:Math.max(o.stars,v.stars),tries:Math.max(o.tries,v.tries)}; });
  });
  out.sessions=[...byId.values()].sort((x,y)=>x.t-y.t).slice(-MAX_SESS);
  return out;
}
async function pushRemote(){
  if(!store.ref) return;
  if(store.writing){ store.pending=true; return; }
  store.writing=true;
  try{ await store.ref.set({levels:prog.levels, sessions:prog.sessions, v:1}); }
  catch(e){
    const code=e&&e.code;
    if(code==='unavailable'){ store.pending=true; await new Promise(r=>setTimeout(r,800+Math.random()*800)); }
    else { store.ref=null; store.where='local'; renderStoreStatus(); }
  }
  finally{ store.writing=false; if(store.pending && store.ref){ store.pending=false; pushRemote(); } }
}
function commitProg(){
  try{ localStorage.setItem(PKEY, JSON.stringify(prog)); }catch(e){ appWarn('store'); }
  pushRemote();
}
async function initStore(){
  renderStoreStatus();
  try{
    if(!(window.claude && typeof window.claude.use==='function')) return;
    const [db,user]=await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if(!db||!user) return;
    const uid=await user.id(); if(!uid) return;
    const ref=db.doc('data/users/'+uid+'/progress');
    const snap=await ref.get();
    const remote=snap.exists?snap.data():null;
    const merged=mergeProg(prog,remote);
    const changed = !remote || JSON.stringify(mergeProg(remote,null))!==JSON.stringify(merged);
    prog=merged;
    try{ localStorage.setItem(PKEY, JSON.stringify(prog)); }catch(e){}
    store.ref=ref; store.where='cuenta';
    if(changed && (prog.sessions.length || Object.keys(prog.levels).length)) await pushRemote();
    refreshProgUI();
  }catch(e){ store.ref=null; store.where='local'; }
  renderStoreStatus();
}
function renderStoreStatus(){
  $('#pStore').textContent = store.where==='cuenta'
    ? 'Tu progreso se guarda en tu cuenta de Claude: lo verás igual desde cualquier dispositivo en el que abras esta app.'
    : 'Tu progreso se guarda en este navegador. Si borras los datos del navegador o cambias de dispositivo, no estará disponible.';
}
function refreshProgUI(){
  if(stageMode==='campana'){ renderLevelBar(); renderCampMap(); }
  if(!$('#progView').hidden) renderProgress();
}
let pendingRec=null;
function afterPractice(r){
  pendingRec=r;
  const rc=$('#rCamp'), save=$('#rSave'), saved=$('#rSaved');
  if(r.mode==='campana' && !r.part){
    const l=LEVELS[r.lvl], prev=lvState(r.lvl), st=starsFor(l,r.pct);
    const wasLocked = r.lvl<LEVELS.length-1 && !unlocked(r.lvl+1);
    prog.levels[l.id]={best:Math.max(prev.best,r.pct),stars:Math.max(prev.stars,st),tries:(prev.tries||0)+1};
    rc.hidden=false;
    $('#rcStars').innerHTML=starStr(st);
    const next=$('#rcNext');
    if(st>0){
      const nowOpen = r.lvl<LEVELS.length-1;
      $('#rcText').textContent = (r.lvl===LEVELS.length-1 ? '¡Completaste el último nivel de la campaña!' : wasLocked ? '¡Nivel superado! Se desbloqueó el siguiente nivel.' : '¡Nivel superado!')
        + (st<3 ? ` Para ${st===1?'dos':'tres'} estrellas necesitas ${st===1?l.s2:l.s3}%.` : ' Conseguiste las tres estrellas.');
      next.hidden=!nowOpen;
    } else {
      $('#rcText').textContent=`Te faltan ${l.goal-r.pct} puntos para superar el nivel (objetivo ${l.goal}%). Pulsa «Reproducir» para escuchar el ritmo antes de volver a intentarlo.`;
      next.hidden=true;
    }
    renderLevelBar(); renderCampMap();
  } else { rc.hidden=true; $('#rcNext').hidden=true; }
  $('#rAgain').classList.toggle('primary', $('#rcNext').hidden);
  if(set.autosave){ saveSession(r); save.hidden=true; saved.hidden=false; saved.textContent='Guardado en «Mi progreso».'; }
  else { if(r.mode==='campana' && !r.part) commitProg(); save.hidden=false; save.disabled=false; save.textContent='Guardar resultado'; saved.hidden=true; }
}
function saveSession(r){
  if(prog.sessions.some(x=>x.id===r.id)) return;
  prog.sessions.push(r); if(prog.sessions.length>MAX_SESS) prog.sessions=prog.sessions.slice(-MAX_SESS);
  commitProg();
  if(r.mode==='propio') renderOwnList();
}

/* ---------- Vista de progreso ---------- */
let pFilter='todo';
const fmtDate=t=>new Date(t).toLocaleDateString('es',{day:'numeric',month:'short'});
const fmtTime=t=>new Date(t).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
// Las sesiones antiguas solo guardan el índice (lvl); antes de añadir niveles el índice i era el id L(i+1)
function sessLevel(r){ return r.mode==='campana' ? lvById(r.lid || 'L'+(r.lvl+1)) : -1; }
function exName(r){ const i=sessLevel(r); return esc((r.mode==='propio' ? `«${r.exn||'Ejercicio propio'}»` : i>=0 ? `Nivel ${i+1} · ${LEVELS[i].title}` : 'Práctica libre') + (r.part?' · un compás':'') + (r.play==='piano'?' · piano':'')); }
const avg=a=>a.length?sum(a)/a.length:0;
function renderProgress(){
  const all=prog.sessions, list=all.filter(r=>pFilter==='todo'||r.mode===pFilter);
  document.querySelectorAll('#pFilter button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.f===pFilter)));
  // tiles
  const last10=list.slice(-10).map(r=>r.pct), prev10=list.slice(-20,-10).map(r=>r.pct);
  let trend='Completa más prácticas para comparar.';
  if(prev10.length>=3){ const d=Math.round(avg(last10)-avg(prev10)); trend = d===0 ? 'Igual que en las 10 anteriores' : `<span class="${d>0?'up':'down'}">${d>0?'▲':'▼'} ${Math.abs(d)} puntos</span> frente a las ${prev10.length} anteriores`; }
  const best=list.reduce((b,r)=>!b||r.pct>b.pct?r:b,null);
  let passed=0, stars=0; LEVELS.forEach((l,i)=>{ const s=lvState(i); if(s.stars) passed++; stars+=s.stars; });
  const lastR=list[list.length-1];
  $('#pTiles').innerHTML=`
    <div class="tile"><div class="lbl">Prácticas guardadas</div><div class="big">${list.length}</div><div class="sub">${lastR?'Última: '+fmtDate(lastR.t)+', '+fmtTime(lastR.t):'Aún no hay ninguna'}</div></div>
    <div class="tile"><div class="lbl">Precisión reciente</div><div class="big">${list.length?Math.round(avg(last10))+'%':'—'}</div><div class="sub">${list.length?'Media de las últimas '+last10.length+'. ':''}${list.length?trend:''}</div></div>
    <div class="tile"><div class="lbl">Mejor resultado</div><div class="big">${best?esc(best.pct)+'%':'—'}</div><div class="sub">${best?exName(best)+' · '+fmtDate(best.t):'—'}</div></div>
    <div class="tile"><div class="lbl">Campaña</div><div class="big">${esc(passed)}<span class="of"> / ${LEVELS.length}</span></div><div class="sub">niveles superados · ${esc(stars)} de ${LEVELS.length*3} ★</div></div>`;
  renderChart(list);
  // tabla
  $('#pCount').textContent = list.length>30 ? `Últimas 30 de ${list.length}` : '';
  if(!list.length){ $('#pTable').innerHTML='<p class="empty">Cuando termines una práctica aparecerá aquí.</p>'; }
  else {
    const rows=list.slice(-30).reverse().map(r=>{
      const dev = r.mean==null ? '—' : Math.abs(r.mean)<5 ? 'a tiempo' : `${Math.abs(r.mean)} ms ${r.mean>0?'tarde':'antes'}`;
      return `<tr><td>${fmtDate(r.t)} <span class="hint">${fmtTime(r.t)}</span></td><td>${exName(r)}</td><td>${esc(r.sig)}${r.grp?' ('+esc(r.grp)+')':''} · ${esc(r.bars)} c.</td><td class="num">${esc(r.bpm)}</td><td class="num">${esc(r.pct)}%<span class="pbar"><i data-w="${esc(r.pct)}"></i></span></td><td class="num">${esc(r.exact)}/${esc(r.n)}</td><td class="num">${esc(r.miss)}</td><td>${esc(dev)}</td></tr>`;
    }).join('');
    $('#pTable').innerHTML=`<table><thead><tr><th>Fecha</th><th>Ejercicio</th><th>Compás</th><th class="num">Tempo</th><th class="num">Precisión</th><th class="num">Exactas</th><th class="num">Sin tocar</th><th>Desvío medio</th></tr></thead><tbody>${rows}</tbody></table>`;
    $('#pTable').querySelectorAll('.pbar i').forEach(i=>{ i.style.width=Math.max(0,Math.min(100,+i.dataset.w||0))+'%'; });   // el ancho va por CSSOM (la CSP no admite style="")
  }
  renderStoreStatus();
}
function renderChart(list){
  const host=$('#pChart');
  const data=list.slice(-60);
  if(data.length<2){ host.innerHTML=`<p class="empty">${data.length?'Con una práctica más verás la evolución.':'Aún no hay prácticas guardadas. Termina una práctica para empezar a ver tu progreso.'}</p>`; return; }
  const W=Math.max(300,host.clientWidth), H=230, pl=40, pr=14, pt=14, pb=28;
  const iw=W-pl-pr, ih=H-pt-pb;
  const X=i=>pl+(data.length===1?iw/2:i*iw/(data.length-1)), Y=v=>pt+ih*(1-v/100);
  let g=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Precisión de las últimas ${data.length} prácticas">`;
  [0,25,50,75,100].forEach(v=>{ g+=`<line class="ch-grid" x1="${pl}" y1="${Y(v)}" x2="${W-pr}" y2="${Y(v)}"/><text class="ch-axis" x="${pl-8}" y="${Y(v)+3}" text-anchor="end">${v}%</text>`; });
  const ticks=[0,Math.floor((data.length-1)/2),data.length-1].filter((v,i,a)=>a.indexOf(v)===i);
  ticks.forEach(i=>{ g+=`<text class="ch-axis" x="${X(i)}" y="${H-8}" text-anchor="${i===0?'start':i===data.length-1?'end':'middle'}">${fmtDate(data[i].t)}</text>`; });
  const ma=data.map((r,i)=>avg(data.slice(Math.max(0,i-4),i+1).map(x=>x.pct)));
  g+=`<path class="ch-avg" d="${ma.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join('')}"/>`;
  data.forEach((r,i)=>{ g+=`<circle class="ch-dot${i===data.length-1?' hi':''}" cx="${X(i)}" cy="${Y(r.pct)}" r="${i===data.length-1?5:4}"/>`; });
  const hw=Math.max(8,iw/(data.length-1)/2);
  data.forEach((r,i)=>{ g+=`<rect class="ch-hit" data-i="${i}" x="${X(i)-hw}" y="${pt}" width="${hw*2}" height="${ih}"/>`; });
  g+='</svg><div class="tip" id="pTip" hidden></div>';
  g+=`<div class="legend"><span><i class="lg-dot"></i>Cada práctica</span><span><i class="lg-line"></i>Media de las últimas 5</span></div>`;
  host.innerHTML=g;
  const tip=$('#pTip');
  host.querySelectorAll('.ch-hit').forEach(h=>{
    const show=()=>{ const i=+h.dataset.i, r=data[i];
      tip.innerHTML=`<b>${esc(r.pct)}%</b> · ${fmtDate(r.t)} ${fmtTime(r.t)}<br>${exName(r)} · ${esc(r.sig)} · ${esc(r.bpm)} ppm`;
      tip.style.left=Math.min(Math.max(X(i),90),W-90)+'px'; tip.style.top=Y(r.pct)+'px'; tip.hidden=false; };
    h.addEventListener('pointerenter',show); h.addEventListener('pointerdown',show);
    h.addEventListener('pointerleave',()=>{ tip.hidden=true; });
  });
}

// Solfeo Rítmico · Mis ejercicios: tokens, notación, editor, biblioteca, exportar e importar.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

/* ---------- Mis ejercicios ---------- */
// Ejercicios que escribe el usuario: una lista de figuras («tokens») que se reparte en compases.
// Token: {dur (ticks), rest, tie (ligada a la siguiente)} o {trip:true} (tresillo de corcheas, ocupa 12 ticks).
// Se guardan como texto (notación): w h q e s, «.» puntillo, «r» silencio, «~» ligadura, «t» tresillo, «|» compás.
// «rw» es el silencio de compás entero ({dur:48, rest, mr:true} al leerlo; tras repartir dura lo que el compás).
const OKEY='solfeo-ritmico-ejercicios-v1', OWN_MAX_BARS=64, OWN_MAX_TEXT=4000, LINK_MAX=2000, OWN_MAX=200;   // OWN_MAX: ejercicios guardados como máximo (cada uno ocupa hasta ~4 KB en localStorage)
const NOTE_DURS=[48,36,24,18,12,9,6,3], REST_DURS=[48,24,18,12,6,3], REST_PIECES=[24,18,12,6,3];
const D2L={48:'w',36:'h.',24:'h',18:'q.',12:'q',9:'e.',6:'e',3:'s'}, L2D={w:48,h:24,q:12,e:6,s:3};
const TOKNAME={48:'redonda',36:'blanca con puntillo',24:'blanca',18:'negra con puntillo',12:'negra',9:'corchea con puntillo',6:'corchea',3:'semicorchea'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
class OwnError extends Error{}
const ownErr=m=>{ throw new OwnError(m); };
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const tokTicks=t=>t.trip?12:t.dur;

function cleanName(n){ const s=String(n??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,60); return s||'Ejercicio sin nombre'; }
// Normaliza un ejercicio guardado o importado: solo campos conocidos, con su tipo y rango (la notación se valida al leerla)
function cleanEx(x){
  if(!x || typeof x!=='object') ownErr('El ejercicio no tiene un formato válido.');
  const sig=String(x.sig??''); if(!has(SIGS,sig)) ownErr(`Compás desconocido: «${sig.slice(0,10)}».`);
  const opts=ODD_GROUPS[sig];
  if(opts && x.grp!=null && !opts.includes(x.grp)) ownErr(`La agrupación «${String(x.grp).slice(0,10)}» no existe en ${sig}.`);
  let bpm=Math.round(+x.bpm); if(!isFinite(bpm)) bpm=80;
  const notation=String(x.notation??''); if(notation.length>OWN_MAX_TEXT) ownErr('La notación es demasiado larga.');
  return {id: typeof x.id==='string' && /^[a-z0-9]{4,24}$/.test(x.id) ? x.id : newId(), name:cleanName(x.name), sig,
    grp: opts ? (x.grp||opts[0]) : null, bpm:Math.max(30,Math.min(240,bpm)), notation, created:numIn(x.created,1,8.64e15,Date.now()), updated:numIn(x.updated,1,8.64e15,Date.now())};
}
function loadOwn(){
  try{ const o=JSON.parse(localStorage.getItem(OKEY)||'null'); if(o && Array.isArray(o.exercises)) return o.exercises.slice(0,OWN_MAX).map(x=>{ try{ return cleanEx(x); }catch(e){ return null; } }).filter(Boolean); }catch(e){}
  return [];
}
function saveOwn(){ try{ localStorage.setItem(OKEY, JSON.stringify({v:1, exercises:own.list})); }catch(e){ appWarn('store'); } }
let own={list:loadOwn(), cur:null, toks:[], cursor:0, undo:[], redo:[], mods:{dot:false,rest:false,tie:false}, evTok:[], rem:48, complete:false, issues:[]};

// Duración legible: en negras en los compases simples, en corcheas en los demás
function fmtTicks(t,sig){
  const u=sig.kind==='simple'?12:6, n=Math.floor(t/u), f=t%u, fr={0:'',3:u===12?'¼':'½',6:'½',9:'¾'}[f];
  return `${n||!fr?n:''}${fr} ${u===12?(t>u?'negras':'negra'):(t>u?'corcheas':'corchea')}`;
}
const remVerb=(t,sig)=>t>(sig.kind==='simple'?12:6)?'faltan':'falta';

/* --- Escritura según el pulso --- */
// Pulsos del compás: sus grupos (en 2/2 y 3/2, la blanca) y la mitad que tiene que verse en 4/4, 2/2 y 12/8
function pulseGrid(sig){
  const L=sum(sig.groups), g=sig.click===24 ? Array(L/24).fill(24) : sig.groups, starts=[]; let a=0;
  g.forEach(x=>{ starts.push(a); a+=x; });
  return {L, g, starts, half:(sig.kind==='simple' && L===48) || (sig.kind==='compound' && L===72) ? L/2 : 0};
}
// ¿Se puede escribir una figura de v ticks que empieza en p sin ocultar el pulso? strict = la escritura que se usa al
// partir figuras; sin strict se aceptan también las síncopas que escribe la app (corchea-negra-corchea, negra-blanca-negra
// en 4/4 y 2/2), el dosillo escrito con dos corcheas con puntillo y, en amalgama, una figura que ocupa varios grupos enteros.
function fitsPulse(p, v, sig, rest, strict){
  const G=pulseGrid(sig), L=G.L, end=p+v;
  if(end>L) return false;
  if(p===0 && v===L && (rest || !strict || sig.kind!=='odd')) return true;   // compás entero
  let k=0; G.starts.forEach((s0,i)=>{ if(p>=s0) k=i; });
  const gs=G.starts[k], gl=G.g[k], ge=gs+gl, rel=p-gs;
  if(rest){
    if(v===48) return false;                 // el silencio de redonda solo como silencio de compás entero
    if(v===18 && gl!==18) return false;      // el de negra con puntillo, solo en pulso compuesto (en simple, rq re)
    if(end<=ge) return rel%v===0;            // dentro del pulso y en su sitio (rq al empezar el pulso, re en corchea…)
    return v===24 && gl===12 && p%24===0;    // el de blanca, en los tiempos 1 y 3 (en 3/4, solo en el 1)
  }
  if(!strict && v===24 && p===12 && L===48 && sig.kind==='simple') return true;   // negra-blanca-negra
  if(G.half && p>0 && p<G.half && end>G.half) return false;                     // tapa la mitad del compás
  if(rel===0){
    if(end<=ge) return true;
    if(G.starts.includes(end) || end===L) return !(strict && sig.kind==='odd');    // pulsos enteros
    return sig.kind!=='odd' && v===gl*1.5 && G.g[k+1]===gl;                       // negra con puntillo en el tiempo
  }
  if(end<=ge){
    // en compuesto, lo que empieza a mitad de corchea no pasa de la corchea siguiente
    if(gl===18 && rel%6 && end>gs+Math.ceil(rel/6)*6) return !strict && v===9 && rel===9;
    return true;
  }
  return !strict && sig.kind==='simple' && gl===12 && rel===6 && v===12;   // corchea-negra-corchea
}
// Parte len ticks desde la posición p (sin pasar de la barra) en figuras que dejan ver el pulso: en cada paso, la más
// larga que cumpla fitsPulse. Un silencio que llena el compás es el de compás entero ({mr:true}).
function decompAt(p, len, sig, rest){
  const L=sum(sig.groups), r=[];
  while(len>0){
    if(rest && p===0 && len>=L){ r.push({dur:L, mr:true}); len-=L; continue; }
    const v=(rest?REST_PIECES:NOTE_DURS).find(v=>v<=len && fitsPulse(p,v,sig,rest,true)) || 3;
    r.push({dur:v}); len-=v; p=(p+v)%L;
  }
  return r;
}
// Índices de los tokens (ya repartidos) que ocultan el pulso o la mitad del compás
function pulseIssues(toks, ex){
  const sig=sigOf(ex), L=sum(sig.groups), bad=[]; let pos=0;
  toks.forEach((t,i)=>{ if(!t.trip && !t.mr && !fitsPulse(pos,t.dur,sig,t.rest,false)) bad.push(i); pos=(pos+tokTicks(t))%L; });
  return bad;
}
// «Reescribir según el pulso»: parte esos tokens en figuras ligadas (o silencios) que dejan ver el pulso
function pulseRewrite(toks, ex){
  const sig=sigOf(ex), L=sum(sig.groups), out=[], map=[]; let pos=0;
  toks.forEach((t,ti)=>{
    map[ti]=out.length;
    const d=tokTicks(t);
    if(t.trip || t.mr || fitsPulse(pos,d,sig,t.rest,false)) out.push(t);
    else { const ps=decompAt(pos,d,sig,t.rest); ps.forEach((q,i)=>out.push(q.mr ? {dur:L,rest:true,mr:true,tie:false} : {dur:q.dur, rest:!!t.rest, tie:!t.rest && (i<ps.length-1 || !!t.tie)})); }
    pos=(pos+d)%L;
  });
  map[toks.length]=out.length;
  return {toks:out, map};
}

// Reparte los tokens en compases. Lo que cabe en el compás se deja como está; la figura que cruza la barra se parte en
// figuras ligadas (el silencio, en silencios) según su posición (decompAt). «rw» (mr) dura un compás: al empezar el compás
// es el silencio de compás entero; a mitad de compás, se reparte. Un silencio que llena el compás pasa a ser el de compás entero.
// Devuelve los tokens resultantes y, para cada token de entrada, dónde empieza en la salida (para colocar el cursor).
function reflow(toks, ex){
  const sig=sigOf(ex), L=sum(sig.groups), out=[], map=[]; let pos=0;
  toks.forEach((t,ti)=>{
    map[ti]=out.length;
    if(t.trip){
      if(sig.kind!=='simple') ownErr('Los tresillos solo se usan en compases simples (2/4, 3/4, 4/4, 5/4, 2/2 y 3/2).');
      if(pos%12) ownErr('Un tresillo tiene que empezar en un tiempo.');
      out.push({trip:true}); pos=(pos+12)%L; return;
    }
    const rest=!!t.rest; let d=rest && t.mr ? L : t.dur;
    if(pos+d<=L && !(rest && (d===L || d===48))){ out.push({dur:d, rest, tie:!rest && !!t.tie}); pos=(pos+d)%L; return; }
    const pieces=[];
    while(d>0){ const take=Math.min(d,L-pos); pieces.push(...decompAt(pos,take,sig,rest)); d-=take; pos=(pos+take)%L; }
    pieces.forEach((q,i)=>out.push(q.mr ? {dur:L, rest:true, mr:true, tie:false} : {dur:q.dur, rest, tie:!rest && (i<pieces.length-1 || !!t.tie)}));
  });
  map[toks.length]=out.length;
  // una ligadura solo une dos notas: si lo siguiente es un silencio o un tresillo, se quita
  out.forEach((t,i)=>{ const nx=out[i+1]; if(t.tie && nx && (nx.trip || nx.rest)) t.tie=false; });
  if(Math.ceil(sum(out.map(tokTicks))/L)>OWN_MAX_BARS) ownErr(`Un ejercicio puede tener como máximo ${OWN_MAX_BARS} compases.`);
  return {toks:out, map};
}
// Texto → tokens. Si el texto trae «|», cada compás tiene que sumar justo lo que dura (el último puede quedar a medias).
function parseNotation(text, ex){
  const raw=String(text).trim(); if(!raw) return [];
  if(raw.length>OWN_MAX_TEXT) ownErr('La notación es demasiado larga.');
  const sig=sigOf(ex), L=sum(sig.groups), segs=raw.split('|'), toks=[], lens=[], lens48=[];
  segs.forEach((seg,si)=>{
    let len=0, len48=0;
    seg.trim().split(/\s+/).filter(Boolean).forEach(w=>{
      if(toks.length>=1024) ownErr('El ejercicio tiene demasiadas figuras.');
      const t=w.toLowerCase();
      if(t==='t'){ toks.push({trip:true}); len+=12; len48+=12; return; }
      const m=/^(r?)([whqes])(\.?)(~?)$/.exec(t);
      if(!m) ownErr(`No entiendo «${w.slice(0,12)}» (compás ${si+1}).`);
      const rest=!!m[1], d=L2D[m[2]]*(m[3]?1.5:1);
      if(!(rest?REST_DURS:NOTE_DURS).includes(d)) ownErr(rest ? `«${w}» no existe: el único silencio con puntillo es rq. (negra con puntillo).` : `«${w}» no existe: solo la blanca, la negra y la corchea llevan puntillo.`);
      if(rest && m[4]) ownErr(`«${w}»: un silencio no se liga.`);
      // «rw»: silencio de compás entero (dura un compás)
      if(rest && d===48){ toks.push({dur:48, rest, tie:false, mr:true}); len+=L; len48+=48; return; }
      toks.push({dur:d, rest, tie:!!m[4]}); len+=d; len48+=d;
    });
    lens.push(len); lens48.push(len48);
  });
  // Antes «rw» duraba siempre 4 negras: en los compases de más de 4 negras, si así cuadran los compases (y como compás
  // entero no), se lee como antes (luego se reescribe con silencios que dejan ver el pulso)
  const fits=a=>a.every((len,i)=>i===a.length-1 ? len<=L : len===L);
  const legacy = L>48 && !fits(lens) && fits(lens48);
  if(legacy) toks.forEach(t=>{ delete t.mr; });
  if(segs.length>1) (legacy?lens48:lens).forEach((len,i)=>{
    const last=i===lens.length-1;
    if(last ? len>L : len!==L) ownErr(`El compás ${i+1} dura ${fmtTicks(len,sig)} y en ${ex.sig} debe durar ${fmtTicks(L,sig)}.`);
  });
  return reflow(toks, ex).toks;
}
function tokStr(t){ return t.trip ? 't' : t.mr ? 'rw' : (t.rest?'r':'')+D2L[t.dur]+(t.tie?'~':''); }
function serialize(toks, ex){
  const L=sum(sigOf(ex).groups); let pos=0, s='';
  toks.forEach((t,i)=>{ if(i) s+= pos===0 ? ' | ' : ' '; s+=tokStr(t); pos=(pos+tokTicks(t))%L; });
  return s;
}
function ownInfo(x){ try{ const t=parseNotation(x.notation,x), L=sum(sigOf(x).groups), tot=sum(t.map(tokTicks)); return {bars:Math.ceil(tot/L), complete: t.length>0 && tot%L===0}; }catch(e){ return {bars:0, complete:false}; } }

// Partitura a partir de los tokens: misma estructura que los ritmos generados (las barras se agrupan por tiempos)
function ownScore(){
  const ex=own.cur||{sig:'4/4',grp:null}, sig=sigOf(ex), L=sum(sig.groups), starts=[]; let a=0; sig.groups.forEach(g=>{ starts.push(a); a+=g; });
  const cellAt=p=>{ let c=0; starts.forEach((s0,i)=>{ if(p>=s0) c=i; }); return c; };
  const measures=[[]], flat=[], evTok=[]; let pos=0, prevTie=false, tc=100;
  own.toks.forEach((t,ti)=>{
    if(pos===L){ measures.push([]); pos=0; }
    const m=measures.length-1, push=e=>{ e.m=m; e.abs=m*L+e.start; e.i=flat.length; flat.push(e); measures[m].push(e); evTok.push(ti); };
    if(t.trip){ const c=tc++; for(let k=0;k<3;k++){ push({dur:4,rest:false,tuplet:true,cell:c,start:pos}); pos+=4; } prevTie=false; return; }
    push({dur:t.dur, rest:t.rest, mr:!!t.mr, tuplet:false, cell:cellAt(pos), start:pos, tie:prevTie && !t.rest});
    prevTie=t.tie && !t.rest; pos+=t.dur;
  });
  chainTies(flat);
  return {score:{key:ex.sig, grp:sig.grp, bars:measures.length, sig, L, measures, flat, fb:false, own:true}, evTok, rem:L-pos, complete:own.toks.length>0 && pos===L};
}
function ownCfg(){
  const ex=own.cur||{sig:'4/4',grp:null}, figs=new Set(), rests=new Set(); let ties=false;
  own.toks.forEach(t=>{ if(t.trip) figs.add('t'); else (t.rest?rests:figs).add(t.mr?'w':DUR2K[t.dur]); if(t.tie) ties=true; });
  return {sig:ex.sig, grp:ex.grp, bars:Math.max(1,score&&score.own?score.bars:1), figs:[...figs], rests:[...rests], sync:false, ties};
}
function buildOwn(){
  const r=ownScore(); score=r.score; own.evTok=r.evTok; own.rem=r.rem; own.complete=r.complete;
  own.issues = own.cur ? pulseIssues(own.toks, own.cur) : [];
  fullScore=null; judg=[]; extras=0; extraTks=[]; $('#results').hidden=true;
  renderScore(); renderSummary(); renderLights(); renderTempoGlyph(); renderOwnEditor(); updateTransport();
}
// Resalta la figura tras la que se insertará la siguiente
function markSel(){
  if(stageMode!=='propio' || S.running || judg.length) return;
  const ti=own.cursor-1, bad=new Set(own.issues);
  own.evTok.forEach((t,i)=>{ if(evEls[i]){ evEls[i].classList.toggle('sel', t===ti); evEls[i].classList.toggle('offp', bad.has(t)); } });
}
function ownMsg(t,bad){ const m=$('#ownMsg'); m.textContent=t||''; m.hidden=!t; m.classList.toggle('bad',!!bad); }
function ownSnap(){ return {toks:own.toks, cursor:own.cursor, sig:own.cur.sig, grp:own.cur.grp}; }
function ownCommit(){
  own.cur.notation=serialize(own.toks, own.cur); own.cur.updated=Date.now(); saveOwn();
  if(S.running) stop();
  buildOwn(); renderOwnList();
}
// Aplica una lista nueva de tokens (sin repartir) y coloca el cursor antes del token de entrada «at»
function ownApply(toks, at){
  if(!own.cur) return false;
  let r; try{ r=reflow(toks, own.cur); }catch(e){ if(e instanceof OwnError){ ownMsg(e.message,true); say(e.message); return false; } throw e; }
  own.undo.push(ownSnap()); if(own.undo.length>100) own.undo.shift(); own.redo=[];
  own.toks=r.toks; own.cursor=r.map[Math.min(at,toks.length)]; ownMsg(''); ownCommit(); return true;
}
function ownInsert(k){
  if(!own.cur) return;
  let tok;
  if(k==='t') tok={trip:true};
  else {
    const rest=own.mods.rest, d=L2D[k]*(own.mods.dot?1.5:1);
    if(!(rest?REST_DURS:NOTE_DURS).includes(d)){ ownMsg(rest&&own.mods.dot ? 'El único silencio con puntillo es el de negra.' : 'Solo la blanca, la negra y la corchea llevan puntillo.', true); return; }
    tok={dur:d, rest, tie:!rest && own.mods.tie};
    if(rest && d===48) tok.mr=true;   // silencio de compás entero
  }
  const c=own.cursor;
  if(ownApply([...own.toks.slice(0,c), tok, ...own.toks.slice(c)], c+1)){
    own.mods={dot:false,rest:false,tie:false}; renderPalette();
    say(tok.trip ? 'Tresillo añadido' : `${tok.rest?'Silencio de ':''}${TOKNAME[tok.dur]}${tok.tie?' ligada':''} añadida`);
  }
}
function ownDelete(){
  if(!own.cur || own.cursor<1) return;
  const c=own.cursor-1;
  ownApply([...own.toks.slice(0,c), ...own.toks.slice(c+1)], c);
}
function ownMove(d){ own.cursor=Math.max(0,Math.min(own.toks.length, own.cursor+d)); markSel(); renderOwnStatus(); }
function ownUndoRedo(from, to){
  if(!own.cur || !from.length) return;
  to.push(ownSnap()); const s=from.pop();
  own.toks=s.toks; own.cursor=s.cursor; own.cur.sig=s.sig; own.cur.grp=s.grp; ownMsg(''); ownCommit(); renderOwnMeter();
}
function ownOpen(x){
  own.cur=x||null; own.undo=[]; own.redo=[]; own.mods={dot:false,rest:false,tie:false};
  try{ own.toks = x ? parseNotation(x.notation, x) : []; }catch(e){ own.toks=[]; ownMsg('No se pudo leer la notación guardada de este ejercicio: '+e.message, true); }
  own.cursor=own.toks.length;
  set.ownId = x ? x.id : ''; save();
  renderOwnMeter(); renderPalette(); renderOwnList();
  if(stageMode==='propio' && score){ stop(); showTempo(); buildOwn(); }
}
function uniqueName(x){ let n=x.name, i=2; while(own.list.some(y=>y!==x && y.name===n)) n=`${x.name} (${i++})`; x.name=n.slice(0,60); }
// null si la biblioteca está llena (OWN_MAX): quien llama no sigue y el aviso ya está en pantalla
function ownAdd(x, open=true){
  if(own.list.length>=OWN_MAX){ const m=`Tu biblioteca está llena (máximo ${OWN_MAX} ejercicios): borra alguno para añadir otro.`; ownMsg(m,true); say(m); return null; }
  uniqueName(x); own.list.unshift(x); saveOwn(); if(open) ownOpen(x); else renderOwnList(); return x; }

/* --- Editor: pintado --- */
function renderOwnMeter(){
  const x=own.cur; if(!x) return;
  $('#ownSig').value=x.sig;
  const opts=ODD_GROUPS[x.sig]; $('#ownGrpF').hidden=!opts;
  $('#ownGrp').innerHTML = opts ? opts.map(g=>`<option value="${g}"${g===x.grp?' selected':''}>${g}</option>`).join('') : '';
  if(document.activeElement!==$('#ownName')) $('#ownName').value=x.name;
}
function renderPalette(){
  const m=own.mods, simple=own.cur ? sigOf(own.cur).kind==='simple' : true;
  const keys={w:'1',h:'2',q:'4',e:'8',s:'6',t:'T'};
  $('#ownPal').innerHTML=['w','h','q','e','s','t'].map(k=>{
    let ok=true, icon, name;
    if(k==='t'){ ok=simple && !m.rest && !m.dot; icon=miniFig('t'); name='Tresillo de corcheas'; }
    else {
      const d=L2D[k]*(m.dot?1.5:1); ok=(m.rest?REST_DURS:NOTE_DURS).includes(d);
      const fk = m.dot ? {h:'hd',q:'qd',e:'ed'}[k] : k;
      icon = !ok ? miniFig(k) : m.rest ? miniRest(fk) : miniFig(fk);
      name = (m.rest?'Silencio de ':'')+(TOKNAME[d]||TOKNAME[L2D[k]]);
    }
    return `<button type="button" class="pal-b" data-k="${k}" ${ok?'':'disabled'} aria-label="${name} (tecla ${keys[k]})" title="${name} · tecla ${keys[k]}">${icon}<kbd>${keys[k]}</kbd></button>`;
  }).join('');
  document.querySelectorAll('#ownMods button').forEach(b=>b.setAttribute('aria-pressed',String(!!m[b.dataset.mod])));
}
function renderOwnStatus(){
  const st=$('#ownStatus'); if(!own.cur){ st.textContent=''; return; }
  const sig=sigOf(own.cur), bars=score&&score.own?score.bars:1;
  let t;
  if(!own.toks.length) t='Añade figuras con la paleta o el teclado, o escribe la notación y pulsa «Aplicar texto».';
  else if(!own.complete) t=`Compás ${bars}: ${remVerb(own.rem,sig)} ${fmtTicks(own.rem,sig)}. Complétalo para poder practicar.`;
  else t=`${bars} ${bars===1?'compás completo':'compases completos'}: listo para practicar.`;
  if(own.toks.length) t += own.cursor===0 ? ' Lo nuevo se añade al principio.' : own.cursor<own.toks.length ? ' Lo nuevo se añade tras la figura resaltada.' : '';
  st.textContent=t;
  $('#ownPractice').disabled=!own.complete;
  updateFab();   // el alto de la paleta fija puede cambiar con el texto
}
function renderOwnEditor(){
  $('#secEdit').hidden=!own.cur;
  if(!own.cur){ updateFab(); return; }
  renderOwnStatus();
  if(document.activeElement!==$('#ownText')) $('#ownText').value=own.cur.notation;
  $('#ownUndo').disabled=!own.undo.length; $('#ownRedo').disabled=!own.redo.length; $('#ownDelTok').disabled=own.cursor<1;
  if(!$('#ownDelBox').querySelector('#ownDelYes')) renderOwnDelBox();
}
function renderOwnDelBox(){ $('#ownDelBox').innerHTML='<button class="btn" id="ownDup" type="button">Duplicar</button><button class="btn warn" id="ownDel" type="button">Borrar ejercicio</button>'; }
function renderOwnList(){
  const box=$('#ownList');
  if(!own.list.length){ box.innerHTML='<p class="hint">Aún no tienes ejercicios. Crea uno con «Nuevo ejercicio», impórtalo, o pulsa «Editar» sobre un ritmo de Práctica libre o de la campaña.</p>'; return; }
  const best={}; prog.sessions.forEach(r=>{ if(r.mode==='propio' && r.ex && !r.part) best[r.ex]=Math.max(best[r.ex]??0, r.pct); });
  box.innerHTML=own.list.map(x=>{ const inf=ownInfo(x);
    return `<button type="button" class="own-item" data-id="${esc(x.id)}" aria-current="${!!own.cur && own.cur.id===x.id}"><span class="own-n">${esc(x.name)}</span><span class="own-m">${x.sig}${x.grp?' ('+x.grp+')':''} · ${inf.bars} ${inf.bars===1?'compás':'compases'} · ${x.bpm} ppm${inf.complete?'':' · <i>borrador</i>'}${best[x.id]!=null?` · mejor ${best[x.id]}%`:''}</span></button>`;
  }).join('');
}

/* --- Exportar e importar --- */
const sigLine=x=>`${x.sig}${x.grp?' ('+x.grp+')':''}`;
function exJSON(list){ return JSON.stringify({formato:'solfeo-ritmico-ejercicios', version:1, ejercicios:list.map(x=>({nombre:x.name, compas:x.sig, ...(x.grp?{agrupacion:x.grp}:{}), tempo:x.bpm, notacion:x.notation}))}, null, 2); }
function exText(x){ return `${x.name}\n${sigLine(x)} · ${x.bpm} ppm\n${x.notation}`; }
// Enlace: el ejercicio va tras «#ej=» (no se envía al servidor) en base64url, que solo usa letras, números, «-» y «_»,
// caracteres que ningún navegador ni servicio de mensajería corta al reconocer el enlace
function b64url(s){ let b=''; new TextEncoder().encode(s).forEach(c=>b+=String.fromCharCode(c)); return btoa(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64url(c){ const b=atob(c.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((c.length+3)%4)); return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(b,ch=>ch.charCodeAt(0))); }
function exLink(x){ return location.href.split('#')[0]+'#ej='+b64url(['1',x.name,sigLine(x),String(x.bpm),x.notation].join('\n')); }
function parseSigLine(line){
  const m=/^\s*(\d{1,2}\/\d{1,2})\s*(?:\(\s*([0-9+]+)\s*\))?\s*(?:[·,;-]\s*)?(\d{2,3})?/.exec(line||'');
  if(!m) ownErr('Falta el compás y el tempo, por ejemplo «4/4 · 80 ppm».');
  return {sig:m[1], grp:m[2]||null, bpm:m[3]?+m[3]:80};
}
function fromFields(name, sig, grp, bpm, notation){
  const x=cleanEx({name, sig, grp, bpm, notation:String(notation??'')});
  x.notation=serialize(parseNotation(x.notation, x), x);
  return x;
}
function fromLinkCode(code){
  let txt; try{ txt=unb64url(code); }catch(e){ ownErr('El enlace está incompleto o dañado.'); }
  const l=txt.split('\n'); if(l[0]!=='1' || l.length<5) ownErr('El enlace no es de un ejercicio de esta app.');
  const sl=parseSigLine(l[2]);
  return fromFields(l[1], sl.sig, sl.grp, +l[3], l.slice(4).join(' '));
}
function importAny(text){
  const s=String(text).trim(); if(!s) ownErr('No hay nada que importar.');
  const hm=/#ej=([A-Za-z0-9_-]+)/.exec(s); if(hm) return [fromLinkCode(hm[1])];
  if(s[0]==='{'){
    let o; try{ o=JSON.parse(s); }catch(e){ ownErr('El archivo no es un JSON válido.'); }
    if(!o || o.formato!=='solfeo-ritmico-ejercicios' || !Array.isArray(o.ejercicios)) ownErr('Este archivo no es una exportación de «Mis ejercicios».');
    if(o.ejercicios.length>500) ownErr('El archivo tiene demasiados ejercicios (máximo 500).');
    return o.ejercicios.map((e,i)=>{ try{ e=e||{}; return fromFields(e.nombre, e.compas, e.agrupacion, e.tempo, e.notacion); }
      catch(err){ if(err instanceof OwnError) ownErr(`Ejercicio ${i+1}: ${err.message}`); throw err; } });
  }
  const lines=s.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(lines.length<3) ownErr('Pega el ejercicio completo: el nombre, el compás y el tempo, y la notación (tres líneas).');
  const sl=parseSigLine(lines[1]);
  return [fromFields(lines[0], sl.sig, sl.grp, sl.bpm, lines.slice(2).join(' '))];
}
function ownImport(text){
  let xs; try{ xs=importAny(text); }catch(e){ ownMsg(e instanceof OwnError ? e.message : 'No se pudo leer el archivo: no tiene el formato de «Mis ejercicios».', true); return false; }   // cualquier otro error (p. ej. TypeError) tampoco guarda nada
  if(own.list.length+xs.length>OWN_MAX){ ownMsg(`No cabe: tienes ${own.list.length} ejercicios, importas ${xs.length} y el máximo es ${OWN_MAX}. Borra alguno o importa menos.`, true); return false; }
  xs.slice().reverse().forEach(x=>ownAdd(x,false));
  ownOpen(xs[0]);
  ownMsg(xs.length===1 ? `Importado «${xs[0].name}».` : `Importados ${xs.length} ejercicios.`);
  return true;
}
let ownLinking=false;
function ownFromHash(){
  const m=/^#ej=([A-Za-z0-9_-]+)$/.exec(location.hash); if(!m) return false;
  ownLinking=true; try{ return ownLinkIn(m); } finally{ ownLinking=false; }
}
// Un enlace #ej= guarda el ejercicio al abrirlo (con el aviso en pantalla); la biblioteca tiene tope (OWN_MAX) y el enlace se valida entero (fromLinkCode)
function ownLinkIn(m){
  try{ history.replaceState(null,'',location.href.split('#')[0]); }catch(e){}
  let x;
  try{ x=fromLinkCode(m[1]); }
  catch(e){
    setView('propio'); ownMsg('El enlace del ejercicio no es válido: '+(e instanceof OwnError ? e.message : 'formato desconocido.'), true);
    if(!own.list.length) ownNewEx();
    return true;
  }
  const dup=own.list.find(y=>y.sig===x.sig && y.grp===x.grp && y.notation===x.notation && (y.name===x.name || y.name.startsWith(x.name+' (')));
  setView('propio');
  if(dup){ ownOpen(dup); ownMsg(`Ya tenías «${dup.name}» en Mis ejercicios.`); }
  else if(ownAdd(x)) ownMsg(`Ejercicio «${x.name}» recibido por enlace y guardado en Mis ejercicios (puedes borrarlo cuando quieras).`);
  return true;
}
async function copyText(t){
  try{ await navigator.clipboard.writeText(t); return true; }
  catch(e){ const ta=document.createElement('textarea'); ta.value=t; ta.style.cssText='position:fixed;opacity:0;top:0'; document.body.appendChild(ta); ta.select(); let ok=false; try{ ok=document.execCommand('copy'); }catch(_){} ta.remove(); return ok; }
}
function showOut(t){ const o=$('#ownOut'); o.value=t; o.hidden=false; }
function download(name, text){
  const u=URL.createObjectURL(new Blob([text],{type:'application/json'})), a=document.createElement('a');
  a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),1000);
}
const slug=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase().slice(0,40)||'ejercicio';
// «Editar» en Práctica libre y en la campaña: copia el ritmo a Mis ejercicios
function scoreToToks(sc){
  const toks=[];
  for(let i=0;i<sc.flat.length;i++){
    const e=sc.flat[i];
    if(e.tuplet){ toks.push({trip:true}); i+=2; continue; }
    if(e.tie && toks.length && !toks[toks.length-1].trip) toks[toks.length-1].tie=true;
    toks.push(e.mr ? {dur:e.dur, rest:true, mr:true, tie:false} : {dur:e.dur, rest:e.rest, tie:false});
  }
  return toks;
}
function editThis(){
  const sc=fullScore||score; if(!sc) return;
  stop();
  const d=new Date(), x=cleanEx({name:`Ritmo del ${d.toLocaleDateString('es',{day:'numeric',month:'short'})} ${d.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}`, sig:sc.key, grp:sc.grp, bpm:curBpm()});
  x.notation=serialize(scoreToToks(sc), x);
  if(!ownAdd(x,false)) return;
  ownOpen(x);
  setView('propio');
  ownMsg('Ritmo copiado a Mis ejercicios: ya puedes cambiarlo.');
}

// Solfeo Rítmico · Práctica: toques, evaluación y resultados.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

/* ---------- Práctica ---------- */
const tapZones=()=>[$('#pad'),$('#tapFab')];
function flashPad(cls){
  tapZones().forEach(p=>{ p.classList.remove('hit','miss'); void p.offsetWidth; p.classList.add(cls); });
}
function setHeld(on){ tapZones().forEach(p=>p.classList.toggle('held',on)); }
function tap(src){
  if(set.vibrate && S.running && (S.mode==='practice'||S.mode==='calib') && src && src[0]!=='k' && navigator.vibrate) navigator.vibrate(12);
  if(S.running && S.mode==='calib'){ calibTap(); return; }
  tapSoundOn(src||'x');
  if(S.running && S.mode==='practice' && S.hold){ S.holds.set(src||'x',{note:null,t:ctx.currentTime}); setHeld(true); }
  if(!S.running || S.mode!=='practice'){ flashPad('hit'); return; }
  const now=ctx.currentTime;
  if(now < S.passStart+S.lat-0.25) return; // durante la cuenta
  let best=null, bestErr=0;
  for(const n of S.notes){
    if(n.done) continue;
    const err=now-n.t;
    if(Math.abs(err)<=n.win && (!best || Math.abs(err)<Math.abs(bestErr))){ best=n; bestErr=err; }
  }
  if(!best){
    extras++;
    // misma referencia de tiempo que las notas (latencia de salida y corrección del usuario)
    const tk=(now-S.passStart-S.lat-set.offset/1000)/S.spt;
    extraTks.push(Math.max(0,Math.min(score.bars*score.L-0.01,tk)));
    flashPad('miss'); updateLive(); return;
  }
  best.done=true;
  if(S.hold){ const h=S.holds.get(src||'x'); if(h) h.note=best; }
  const ms=bestErr*1000, a=Math.abs(ms);
  const cls=a<=40?'exact':a<=90?'good':'near';
  judg[best.i]={cls,err:ms};
  score.flat.forEach(e=>{ if(e.head===best.i && evEls[e.i]) evEls[e.i].classList.add('j-'+cls); });
  flashPad(cls==='near'?'miss':'hit');
  updateLive();
}
function release(src){
  tapSoundOff(src||'x');
  if(!S.running || S.mode!=='practice' || !S.hold) return;
  const h=S.holds.get(src||'x'); if(!h) return;
  S.holds.delete(src||'x');
  if(!S.holds.size) setHeld(false);
  if(h.note) judgeRelease(h.note, h.t, ctx.currentTime);
}
function judgeRelease(n, tPress, tRel){
  const re=tRel-(n.t+n.dsec);
  const tol1=Math.max(0.07,0.15*n.dsec), tol2=Math.max(0.14,0.3*n.dsec);
  const a=Math.abs(re);
  const cls = a<=tol1?'exact':a<=tol2?'ok':re<0?'short':'long';
  const j=judg[n.i]; if(!j) return;
  j.dur={cls, ratio:Math.max(0,(tRel-tPress)/n.dsec), re:re*1000};
}
function updateLive(){
  const hits=S.notes.filter(n=>n.done).length;
  $('#padSub').textContent=`Notas acertadas: ${hits} de ${S.notes.length}${extras?` · Golpes de más: ${extras}`:''}`;
}
let weakM=-1;
function showResults(notes, holds, endT){
  if(holds) holds.forEach(h=>{ if(h.note) judgeRelease(h.note,h.t,endT); });
  notes.forEach(n=>{ if(!n.done) judg[n.i]={cls:'miss'}; });
  const holdMode = !!holds;
  renderScore();
  const c={exact:0,good:0,near:0,miss:0}; let errs=[];
  notes.forEach(n=>{ const j=judg[n.i]; c[j.cls]++; if(j.cls!=='miss') errs.push(j.err); });
  const N=notes.length;
  const TP={exact:100,good:80,near:50,miss:0}, DP={exact:100,ok:70,short:30,long:30};
  const dc={exact:0,ok:0,short:0,long:0};
  let pts=0;
  const mp=score.measures.map(()=>({pts:0,n:0})); // puntos por compás
  notes.forEach(n=>{ const j=judg[n.i]; let p=TP[j.cls];
    if(holdMode && j.cls!=='miss'){ const d=j.dur; if(d) dc[d.cls]++; p = 0.6*p + 0.4*(d?DP[d.cls]:0); }
    pts+=p; const m=mp[score.flat[n.i].m]; m.pts+=p; m.n++; });
  const penalty = set.penalize ? extras*40 : 0;
  if(set.penalize) extraTks.forEach(tk=>{ mp[Math.min(mp.length-1,Math.floor(tk/score.L))].pts-=40; });
  const pct = N ? Math.max(0,Math.round((pts-penalty)/(N*100)*100)) : 0;
  $('#rPct').textContent=pct+'%';
  $('#rHead').textContent = !N ? 'Este ritmo no tiene notas que tocar' : pct>=90?'Excelente precisión':pct>=75?'Muy bien':pct>=55?'Vas bien, sigue practicando':'Prueba a bajar el tempo';
  let trend='';
  if(errs.length){
    const mean=Math.round(sum(errs)/errs.length);
    trend = Math.abs(mean)<12 ? 'Vas centrado en el pulso.' : mean<0 ? `Tiendes a adelantarte: ${-mean} ms de media.` : `Tiendes a atrasarte: ${mean} ms de media.`;
  } else trend='No se registró ningún golpe a tiempo. Empieza a tocar justo después de la cuenta.';
  if(extras) trend+=` Tocaste ${extras} ${extras===1?'vez':'veces'} donde no había nota (por ejemplo, en un silencio, en la parte sostenida de una figura larga o en una nota ligada)${set.penalize?'':'; no restó puntos porque la penalización está desactivada'}.`;
  if(holdMode){
    const judged=dc.exact+dc.ok+dc.short+dc.long;
    if(judged){ if(dc.short>dc.long && dc.short>=judged*0.3) trend+=' Sueles soltar las notas antes de tiempo: mantenlas hasta el final de la figura.';
      else if(dc.long>dc.short && dc.long>=judged*0.3) trend+=' Sueles mantener las notas de más: suelta al final de cada figura, sobre todo antes de un silencio.';
      else trend+=' Las duraciones van bien.'; }
  }
  $('#durCounts').hidden=!holdMode; $('#durNote').hidden=!holdMode;
  $('#dExact').textContent=dc.exact; $('#dOk').textContent=dc.ok; $('#dShort').textContent=dc.short; $('#dLong').textContent=dc.long;
  $('#rTrend').textContent=trend;
  $('#cExact').textContent=c.exact; $('#cGood').textContent=c.good; $('#cNear').textContent=c.near; $('#cMiss').textContent=c.miss; $('#cExtra').textContent=extras;
  const mean = errs.length ? Math.round(sum(errs)/errs.length) : null;
  afterPractice({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6), t:Date.now(), mode:stageMode,
    lvl: stageMode==='campana'?levelIdx:null, lid: stageMode==='campana'?LEVELS[levelIdx].id:null, sig:score.key, grp:score.grp, bars:score.bars, bpm:curBpm(), pct, n:N,
    exact:c.exact, good:c.good, near:c.near, miss:c.miss, extra:extras, mean, play:holdMode?'piano':'bateria', pen:!!set.penalize, ...(score.part?{part:true}:{}), ...(stageMode==='propio'&&own.cur?{ex:own.cur.id, exn:own.cur.name}:{})});
  // compás más flojo (solo si hay varios y alguno baja del 90 %)
  weakM=-1; let weakPct=101;
  mp.forEach((m,i)=>{ if(!m.n) return; const p=Math.max(0,Math.round(m.pts/m.n)); if(p<weakPct){ weakPct=p; weakM=i; } });
  const showWeak = N && mp.length>1 && weakM>=0 && weakPct<90;
  $('#rWeak').hidden=!showWeak;
  if(showWeak){
    $('#rWeakText').textContent=`El compás ${weakM+1} fue el más flojo (${weakPct}%). Practícalo por separado y luego vuelve al ritmo completo.`;
    $('#rWeakBtn').textContent=`Practicar el compás ${weakM+1}`;
  }
  $('#results').hidden=false;
  updateFab();
  if(!set.seen) dismissWelcome();
  say(`Resultado: ${pct}%. ${$('#rHead').textContent}. ${$('#rCamp').hidden?'':$('#rcText').textContent+' '}${trend}${showWeak?` El compás ${weakM+1} fue el más flojo.`:''}`);
  $('#results').focus({preventScroll:true});
  // que los botones de los resultados queden a la vista (sin tapar la partitura más de lo necesario)
  const ab=$('#resActions').getBoundingClientRect(), room=innerHeight-fabReserve();
  if(ab.bottom>room) scrollTo({top:scrollY+ab.bottom-room+12, behavior:'smooth'});
}

// Solfeo Rítmico · Transporte: planificador, reproducción, cuenta previa y cursor.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

/* ---------- Transporte ---------- */
let S={running:false,nowI:-1};
function barClicks(tb,spt,countIn,force){
  const sig=score.sig, L=score.L, starts=new Set(); let a=0; sig.groups.forEach(g=>{ starts.add(a); a+=g; });
  // Cuenta previa en compases compuestos y de amalgama: suena cada corchea; el pulso (inicio de cada grupo) con su clic
  // y el resto, más suave. El número de la cuenta solo avanza en cada pulso.
  if(countIn && set.countSub && sig.kind!=='simple'){
    let pulse=0, light=0;
    for(let tk=0; tk<L; tk+=6){
      const t=tb+tk*spt, isPulse=starts.has(tk);
      if(isPulse) pulse++;
      click(S.bus,t, tk===0 ? (set.accent?'accent':'beat') : isPulse ? 'beat' : 'weak');
      if(tk%sig.click===0) S.vis.push({t,idx:light++,count:pulse});
    }
    return;
  }
  const audible = countIn || force || set.metro;
  const sb=+set.sub;
  // Amalgama fuera de la cuenta previa: por defecto solo suenan los pulsos (inicio de cada grupo);
  // las demás corcheas, solo si se elige una subdivisión
  const oddPulses = sig.kind==='odd' && !countIn;
  let n=0;
  for(let tk=0; tk<L; tk+=sig.click){
    const lvl = tk===0 ? (set.accent?'accent':'beat') : (sig.kind==='odd' ? (starts.has(tk)?'beat':'weak') : 'beat');
    const t=tb+tk*spt;
    if(audible && (!oddPulses || starts.has(tk) || sb>0)) click(S.bus,t,lvl);
    S.vis.push({t,idx:n,count:countIn?n+1:0});
    n++;
  }
  if(audible && !countIn && sb>0 && sb<sig.click && sig.click%sb===0){
    for(let tk=0; tk<L; tk+=sb) if(tk%sig.click) click(S.bus,tb+tk*spt,'sub');
  }
}
function schedulePass(p){
  const base=S.passStart+p*S.passDur;
  for(let b=0;b<score.bars;b++) barClicks(base+b*score.L*S.spt,S.spt,false,false);
  // «Reproducir» siempre hace sonar el ritmo; en la práctica depende de «Escuchar el ritmo al practicar»
  if(S.mode==='play' || set.sound) score.flat.forEach(e=>{ if(!e.rest && !e.tie) noteSound(S.bus,base+e.abs*S.spt,e.len*S.spt); });
}
function start(mode){
  if(mode==='practice' && stageMode==='propio' && !own.complete){
    const t=own.cur ? 'Completa el último compás del ejercicio para poder practicarlo.' : 'Abre o crea un ejercicio para practicar.';
    ownMsg(t,true); say(t); return;
  }
  stop(); if(!ensureAudio()) return;
  const L=score.L, spt=60/(curBpm()*score.sig.click);
  const bus=ctx.createGain(); bus.connect(master);
  const lat=(ctx.outputLatency||ctx.baseLatency||0);
  const t0=ctx.currentTime+0.15;
  const countBars = mode==='metro'?0:(+set.countIn);
  S={mode,running:true,bus,spt,lat,t0,passStart:t0+countBars*L*spt,passDur:score.bars*L*spt,
     loop:mode==='play'&&set.loop,vis:[],visPtr:0,genPass:0,nextBar:t0,nowI:-1,light:-1,notes:[]};
  judg=[]; extras=0; extraTks=[]; $('#results').hidden=true; if(mode==='practice') $('#calib').hidden=true;
  if(mode!=='metro'){
    for(let b=0;b<countBars;b++) barClicks(t0+b*L*spt,spt,true,true);
    schedulePass(0); S.genPass=1;
    renderScore();
  }
  const pad=$('#pad');
  if(mode==='practice'){
    const ns=score.flat.filter(e=>!e.rest && !e.tie).map(e=>({i:e.i,t:S.passStart+e.abs*spt+lat+set.offset/1000,dsec:e.len*spt,done:false}));
    S.hold=!!set.hold; S.holds=new Map();
    ns.forEach((n,j)=>{ const pg=j>0?n.t-ns[j-1].t:1, ng=j<ns.length-1?ns[j+1].t-n.t:1; n.win=Math.max(0.05,Math.min(0.18,Math.min(pg,ng)/2)); });
    S.notes=ns;
    pad.classList.add('live'); $('#padMain').textContent=set.hold?'Pulsa en cada nota y mantén mientras dure':'Toca en cada nota'; $('#padSub').textContent='Escucha la cuenta y empieza en el primer tiempo.';
    say(`Práctica${set.hold?' en modo piano':''}: escucha la cuenta y toca en cada nota. Esc para terminar.`);
    showPad();
  } else if(document.activeElement && document.activeElement.blur && mode!=='metro') { /* keep focus */ }
  S.timer=setInterval(schedTick,40);
  S.raf=requestAnimationFrame(frame);
  updateTransport();
}
function schedTick(){
  if(!S.running) return;
  if(S.mode==='metro'){
    while(S.nextBar < ctx.currentTime+0.3){
      const spt=60/(curBpm()*score.sig.click);
      barClicks(S.nextBar,spt,false,true);
      S.nextBar+=score.L*spt;
    }
  } else if(S.loop){
    while(S.passStart+S.genPass*S.passDur < ctx.currentTime+0.6){ schedulePass(S.genPass++); }
  }
}
function setNow(i){
  if(i===S.nowI) return;
  if(i>=0) followScore(i);
  if(S.nowI>=0 && evEls[S.nowI]) evEls[S.nowI].classList.remove('now');
  S.nowI=i;
  if(i>=0 && set.cursor && evEls[i]) evEls[i].classList.add('now');
}
// Desplaza la página cuando la nota actual cambia de sistema, para que se vean ese sistema y el siguiente
function followScore(i){
  const el=evEls[i], sys=el && el.closest('svg.sys'); if(!sys || sys===S.sysEl) return;
  S.sysEl=sys;
  const nxt=sys.nextElementSibling, top=sys.getBoundingClientRect().top, bottom=(nxt||sys).getBoundingClientRect().bottom;
  if(top<8 || bottom>innerHeight-fabReserve()) scrollTo({top:scrollY+top-16, behavior:'smooth'});
}
function setLight(i){
  if(i===S.light) return;
  const ls=$('#lights').children;
  if(S.light>=0 && ls[S.light]) ls[S.light].classList.remove('on');
  S.light=i;
  if(i>=0 && ls[i]) ls[i].classList.add('on');
}
function showCount(c){
  const fm=$('#fabMain'), ft=c?String(c):'Toca aquí'; if(fm.textContent!==ft){ fm.textContent=ft; fm.classList.toggle('count',!!c); }
  const el=$('#padCount');
  if(c){ el.textContent=c; el.hidden=false; } else el.hidden=true;
}
function frame(){
  if(!S.running) return;
  const heard=ctx.currentTime-S.lat;
  while(S.visPtr+1<S.vis.length && S.vis[S.visPtr+1].t<=heard) S.visPtr++;
  const v=S.vis[S.visPtr];
  if(v && v.t<=heard) setLight(v.idx);
  if(S.mode==='calib'){ calibFrame(heard); return; }
  if(S.mode!=='metro'){
    if(heard<S.passStart){
      showCount(v && v.t<=heard ? v.count : '');
    } else {
      showCount('');
      const rel=heard-S.passStart;
      if(!S.loop && rel>=S.passDur){
        setNow(-1);
        if(rel>S.passDur+0.35){ finish(); return; }
      } else {
        const p=Math.floor(rel/S.passDur), tk=(rel-p*S.passDur)/S.spt;
        let idx=-1; for(const e of score.flat){ if(tk>=e.abs && tk<e.abs+e.dur){ idx=e.i; break; } }
        setNow(idx);
      }
    }
  }
  S.raf=requestAnimationFrame(frame);
}
function stop(){
  if(S.running){
    clearInterval(S.timer); cancelAnimationFrame(S.raf);
    const bus=S.bus;
    try{ bus.gain.setTargetAtTime(0,ctx.currentTime,0.01); setTimeout(()=>{ try{bus.disconnect();}catch(e){} },300); }catch(e){}
  }
  setNow(-1); setLight(-1); showCount('');
  S.running=false;
  padIdle();
  updateTransport();
}
function finish(){
  const wasPractice=S.mode==='practice';
  const notes=S.notes, holds=S.hold?[...S.holds.values()]:null, endT=ctx?ctx.currentTime:0;
  stop();
  setHeld(false);
  if(wasPractice) showResults(notes, holds, endT);
}
function updateTransport(){
  updateFab();
  const r=S.running, m=S.mode;
  $('#bStop').disabled=!r;
  $('#bPlay').classList.toggle('active',r&&m==='play');
  $('#bPractice').classList.toggle('active',r&&m==='practice');
  // en pantallas táctiles «Practicar» no responde mientras se practica o se mide (un toque desviado la reiniciaría)
  $('#bPractice').disabled = (touchMQ.matches && r && (m==='practice'||m==='calib')) || (stageMode==='propio' && !r && !own.complete);
  $('#bCalib').classList.toggle('active',r&&m==='calib');
  $('#bMetro').setAttribute('aria-pressed',String(r&&m==='metro'));
}

// Solfeo Rítmico · Transporte: planificador, reproducción, cuenta previa y cursor.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

/* ---------- Transporte ---------- */
let S={running:false,nowI:-1};
// Metrónomo que calla (set.gap = «a-b»: suena a compases y calla b) en el compás k del ejercicio (0 = el primero tras la
// cuenta previa; en bucle sigue contando). La cuenta previa siempre suena.
function gapMuted(k){ const [a,b]=String(set.gap).split('-').map(Number); return a>0 && b>0 && k>=0 && k%(a+b)>=a; }
// mute: compás callado (no suena nada, pero las luces siguen, marcadas como calladas)
function barClicks(tb,spt,countIn,force,mute){
  const sig=score.sig, L=score.L, starts=new Set(); let a=0; sig.groups.forEach(g=>{ starts.add(a); a+=g; });
  // Cuenta previa en compases compuestos y de amalgama: suena cada corchea; el pulso (inicio de cada grupo) con su clic
  // y el resto, más suave. El número de la cuenta solo avanza en cada pulso.
  if(countIn && set.countSub && sig.kind!=='simple'){
    let pulse=0, light=0;
    for(let tk=0; tk<L; tk+=6){
      const t=tb+tk*spt, isPulse=starts.has(tk);
      if(isPulse) pulse++;
      click(S.mBus,t, tk===0 ? (set.accent?'accent':'beat') : isPulse ? 'beat' : 'weak', 1);
      if(tk%sig.click===0) S.vis.push({t,idx:light++,count:pulse});
    }
    return;
  }
  const audible = (countIn || force || set.metro) && !mute;
  const sb=subTicks(sig);
  // Amalgama fuera de la cuenta previa: por defecto solo suenan los pulsos (inicio de cada grupo);
  // las demás corcheas, solo si se elige una subdivisión
  const oddPulses = sig.kind==='odd' && !countIn;
  let n=0;
  for(let tk=0; tk<L; tk+=sig.click){
    const lvl = tk===0 ? (set.accent?'accent':'beat') : (sig.kind==='odd' ? (starts.has(tk)?'beat':'weak') : 'beat');
    const t=tb+tk*spt;
    if(audible && (!oddPulses || starts.has(tk) || sb>0)) click(S.mBus,t,lvl,1);
    S.vis.push({t,idx:n,count:countIn?n+1:0,mute:!!mute});
    n++;
  }
  if(audible && !countIn && sb>0 && sb<sig.click && sig.click%sb===0){
    for(let tk=0; tk<L; tk+=sb) if(tk%sig.click) click(S.mBus,tb+tk*spt,'sub',1);
  }
}
const AHEAD=1; // s que se programan por adelantado: el resto, compás a compás (pocos nodos vivos aunque el ritmo sea largo)
// Subdivisión efectiva del metrónomo: los tresillos solo dividen el pulso en compases simples; en compuestos y amalgama
// el pulso ya se divide en corcheas, así que «Tresillos» suena como «Corcheas» (y en el panel está deshabilitado)
const subTicks=sig=>{ const sb=+set.sub; return sb===4 && sig.kind!=='simple' ? 6 : sb; };
// Inicio del compás g, contado desde el primero de la cuenta previa
function barAt(g){
  const c=S.countBars, bl=score.L*S.spt; if(g<c) return S.t0+g*bl;
  const k=g-c; return S.passStart+Math.floor(k/score.bars)*S.passDur+(k%score.bars)*bl;
}
function schedBar(g){
  const t=barAt(g); if(g<S.countBars){ barClicks(t,S.spt,true,true); return; }
  barClicks(t,S.spt,false,false,gapMuted(g-S.countBars));
  // «Reproducir» siempre hace sonar el ritmo; en la práctica depende de «Escuchar el ritmo al practicar»
  if(S.mode==='play' || set.sound){ const b=(g-S.countBars)%score.bars, base=t-b*score.L*S.spt;
    S.byBar[b].forEach(e=>noteSound(S.rBus,base+e.abs*S.spt,e.len*S.spt,1)); }
}
// Volumen en vivo: el metrónomo y el ritmo van por su propio bus (las envolventes, a volumen 1)
function liveVol(){
  if(!S.running || !S.mBus) return; const t=ctx.currentTime;
  S.mBus.gain.setTargetAtTime(set.metroVol,t,0.02); S.rBus.gain.setTargetAtTime(set.rhythmVol,t,0.02);
}
function start(mode){
  if(mode==='practice' && stageMode==='propio' && !own.complete){
    const t=own.cur ? 'Completa el último compás del ejercicio para poder practicarlo.' : 'Abre o crea un ejercicio para practicar.';
    ownMsg(t,true); say(t); return;
  }
  rampCancel(); stop(); if(!ensureAudio()) return;
  const L=score.L, spt=60/(curBpm()*score.sig.click);
  const bus=ctx.createGain(); bus.connect(master);
  const mBus=ctx.createGain(), rBus=ctx.createGain(); mBus.gain.value=set.metroVol; rBus.gain.value=set.rhythmVol; mBus.connect(bus); rBus.connect(bus);
  const t0=ctx.currentTime+0.15;
  // al practicar suena al menos un compás de cuenta: sin ella la primera nota llegaría 150 ms después de pulsar
  const countBars = mode==='metro'?0 : mode==='practice'?Math.max(1,+set.countIn) : +set.countIn;
  const loop=mode==='play'&&set.loop;
  S={mode,running:true,bus,mBus,rBus,spt,t0,countBars,passStart:t0+countBars*L*spt,passDur:score.bars*L*spt,off:set.offset/1000,
     loop,vis:[],visPtr:0,nextG:0,endG:loop?Infinity:countBars+score.bars,nextBar:t0,nowI:-1,light:-1,notes:[],taps:[],
     byBar:score.measures.map(()=>[])};
  score.flat.forEach(e=>{ if(!e.rest && !e.tie) S.byBar[e.m].push(e); });
  judg=[]; extras=0; extraTks=[]; $('#results').hidden=true; if(mode==='practice') $('#calib').hidden=true;
  if(mode!=='metro') renderScore();
  const pad=$('#pad');
  if(mode==='practice'){
    // n.t: hora (en el reloj del audio) en que se oye la nota, más la corrección del usuario; la latencia de salida
    // la descuenta heardAt() en cada toque
    const ns=score.flat.filter(e=>!e.rest && !e.tie).map(e=>({i:e.i,t:S.passStart+e.abs*spt+S.off,dsec:e.len*spt,done:false}));
    S.hold=!!set.hold; S.holds=new Map(); S.recent=[];
    ns.forEach((n,j)=>{ const pg=j>0?n.t-ns[j-1].t:1, ng=j<ns.length-1?ns[j+1].t-n.t:1; n.win=Math.max(0.05,Math.min(0.18,Math.min(pg,ng)/2)); });
    S.notes=ns;
    // antes de esto los toques son de la cuenta previa y no cuentan (con la corrección del usuario y sin pisar la ventana de la primera nota)
    const beat=score.sig.click*spt;
    S.tapFrom=Math.min(ns.length?ns[0].t-ns[0].win:Infinity, S.passStart+S.off-Math.min(0.25,beat/2));
    const rb=rampOn()?` · Bucle de tempo: ${curBpm()} ppm`:'';   // bucle de tempo (estudio.js): a qué tempo va esta pasada
    pad.classList.add('live'); $('#padMain').textContent=(set.hold?'Pulsa en cada nota y mantén mientras dure':'Toca en cada nota')+rb; $('#padSub').textContent='Escucha la cuenta y empieza en el primer tiempo.'+(rb?' Esc termina y para el bucle.':'');
    say(`Práctica${set.hold?' en modo piano':''}${rb?`, bucle de tempo a ${curBpm()} ppm`:''}: escucha la cuenta y toca en cada nota. Esc para terminar.`);
    showPad();
  }
  schedTick();
  S.timer=setInterval(schedTick,40);
  S.raf=requestAnimationFrame(frame);
  updateTransport();
}
function schedTick(){
  if(!S.running) return;
  const now=ctx.currentTime;
  if(S.mode==='metro'){
    // tras una pausa del hilo principal (segundo plano, tarea larga) se salta lo atrasado en vez de hacerlo sonar de golpe
    const bar=score.L*60/(curBpm()*score.sig.click);
    if(S.nextBar<now){ const k=Math.ceil((now-S.nextBar)/bar); S.nextBar+=k*bar; S.mBar=(S.mBar||0)+k; }
    while(S.nextBar < now+0.3){
      const spt=60/(curBpm()*score.sig.click);
      barClicks(S.nextBar,spt,false,true,gapMuted(S.mBar||0)); S.mBar=(S.mBar||0)+1;
      S.nextBar+=score.L*spt;
    }
  } else {
    const bl=score.L*S.spt;
    while(S.nextG<S.endG){
      const t=barAt(S.nextG); if(t>=now+AHEAD) break;
      if(t+bl>now) schedBar(S.nextG); // un compás ya pasado entero se salta; de uno empezado solo suena lo que falta
      S.nextG++;
    }
  }
  if(S.visPtr>256){ S.vis.splice(0,S.visPtr); S.visPtr=0; }
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
  if(top<8 || bottom>innerHeight-fabReserve()) scrollTo({top:scrollY+top-16, behavior:smooth()});
}
function setLight(i){
  if(i===S.light) return;
  const ls=$('#lights').children;
  if(S.light>=0 && ls[S.light]) ls[S.light].classList.remove('on');
  S.light=i;
  if(i>=0 && ls[i]) ls[i].classList.add('on');
}
// Luces huecas mientras el metrónomo calla (set.gap)
function setMuted(on){ if(on===!!S.muted) return; S.muted=on; $('#lights').classList.toggle('muted',on); }
function showCount(c){
  const fm=$('#fabMain'), ft=c?String(c):'Toca aquí'; if(fm.textContent!==ft){ fm.textContent=ft; fm.classList.toggle('count',!!c); }
  const el=$('#padCount');
  if(c){ el.textContent=c; el.hidden=false; } else el.hidden=true;
}
function frame(){
  if(!S.running) return;
  const heard=heardAt();
  while(S.visPtr+1<S.vis.length && S.vis[S.visPtr+1].t<=heard) S.visPtr++;
  const v=S.vis[S.visPtr];
  if(v && v.t<=heard){ setLight(v.idx); setMuted(!!v.mute); }
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
    stopSources();
  }
  setNow(-1); setLight(-1); setMuted(false); showCount('');
  S.running=false;
  padIdle();
  updateTransport();
}
// manual: «Detener» o Esc. Si aún no se ha tocado nada (p. ej. durante la cuenta previa) se para sin resultados ni sesión
function finish(manual){
  const wasPractice=S.mode==='practice';
  const r={notes:S.notes, taps:S.taps, hold:!!S.hold, endT:ctx?heardAt():0, passStart:S.passStart, off:S.off, spt:S.spt};
  stop();
  setHeld(false);
  if(!wasPractice) return;
  if(manual && !r.taps.length){ say('Práctica detenida, sin resultados.'); return; }
  showResults(r, !!manual);
}
function updateTransport(){
  updateFab();
  const r=S.running, m=S.mode;
  $('#bStop').disabled=!r && !rampT;   // con el bucle de tempo en pausa, «Detener» lo para
  $('#bPlay').classList.toggle('active',r&&m==='play');
  $('#bPractice').classList.toggle('active',r&&m==='practice');
  // en pantallas táctiles «Practicar» no responde mientras se practica o se mide (un toque desviado la reiniciaría)
  $('#bPractice').disabled = (touchMQ.matches && r && (m==='practice'||m==='calib')) || (stageMode==='propio' && !r && !own.complete);
  $('#bCalib').classList.toggle('active',r&&m==='calib');
  $('#bMetro').setAttribute('aria-pressed',String(r&&m==='metro'));
}

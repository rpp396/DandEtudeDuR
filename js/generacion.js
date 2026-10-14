// Solfeo Rítmico · Generación de ritmos.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

/* ---------- Generación ---------- */
let score = null, judg = [], extras = 0, extraTks = []; // extraTks: posición (en ticks) de cada golpe de más
const sum = a => a.reduce((s,x)=>s+x,0);
function allowed(c){ const C=cfg(), R=restList(C); if(c.sync && !C.sync) return false; return c.req.every(k=>C.figs.includes(k)) && c.rreq.every(k=>R.includes(k)); }
function weighted(a){ const t=sum(a.map(x=>x.w)); let r=Math.random()*t; for(const x of a){ r-=x.w; if(r<=0) return x; } return a[a.length-1]; }
function genMeasure(sig, L){
  const G = sig.groups, R = restList(cfg()); let last = null;
  // 4/4, 2/2 y 3/2: se piensa por mitades (pulsos de blanca); ahí la blanca y la blanca con puntillo empiezan en tiempo impar
  const pairs = sig.kind==='simple' && (L===48 || sig.click===24);
  const isQR = c => c.ev.length===1 && c.ev[0][0]===12 && !!c.ev[0][1];
  for(let attempt=0; attempt<40; attempt++){
    const evs=[]; let gi=0, pos=0, cid=0, fb=false, prevQR=false;
    while(gi<G.length){
      const len=G[gi], cands=[];
      if(gi===0 && allowed(BAR_REST)) cands.push({c:BAR_REST, span:G.length, w:0.12});
      const beat = len===12 ? SIMPLE_BEAT.filter(c=>sig.kind==='simple'||!c.tuplet) : COMP_BEAT.filter(c=>sig.kind==='compound'||!c.duplet);
      beat.filter(allowed).forEach(c=>{
        // dos silencios de negra en la misma mitad del compás son uno de blanca: si no se puede usar, no se juntan
        if(pairs && gi%2 && prevQR && isQR(c) && !R.includes('h')) return;
        cands.push({c,span:1,w:c.rest?0.45:1});
      });
      if(sig.kind!=='odd'){
        (len===12?SIMPLE_MULTI:COMP_MULTI).filter(allowed).forEach(c=>{
          const clen=sum(c.ev.map(e=>e[0])), span=clen/len;
          if(gi+span>G.length) return;
          if(c.wholeBar && !(gi===0 && L===clen)) return;
          // en 4/4, 2/2 y 3/2 no se tapa la mitad: blancas, negra con puntillo + corchea y blanca con puntillo en tiempo impar
          if(pairs && gi%2 && (clen===24 || clen===36)) return;
          // silencio de blanca solo en tiempo impar (en 3/4, los tiempos 2-3 son dos silencios de negra)
          if(len===12 && c.rest && clen===24 && gi%2) return;
          // 12/8: la blanca con puntillo empieza en el pulso 1 o 3 (no tapa la mitad del compás)
          if(len===18 && L===72 && gi%2) return;
          cands.push({c,span,w:c.rest?0.4:0.9});
        });
      }
      let pick;
      if(!cands.length){ fb=true; pick={c:{ev:[[len,1]]},span:1}; }
      else pick=weighted(cands);
      if(pick.c.mr){ evs.push({dur:L,rest:true,mr:true,cell:cid,start:0}); pos=L; cid++; gi=G.length; continue; }
      if(pairs && gi%2 && prevQR && isQR(pick.c)){ evs[evs.length-1].dur=24; pos+=12; gi++; prevQR=false; continue; }
      prevQR = gi%2===0 && pick.span===1 && isQR(pick.c);
      pick.c.ev.forEach(([d,r])=>{ evs.push({dur:d,rest:!!r,tuplet:!!pick.c.tuplet,duplet:!!pick.c.duplet,fig:pick.c.fig,trait:pick.c.trait,cell:cid,start:pos}); pos+=d; });
      cid++; gi+=pick.span;
    }
    last={evs,fb};
    // un compás sin notas solo vale si es el silencio de compás entero (generate exige alguna nota en el ritmo)
    if(evs.some(e=>!e.rest) || (!fb && evs.length===1 && evs[0].mr)) return last;
  }
  return last;
}
// Figuras escritas en un ritmo: clave de FIGS para las notas y 'r' + clave de RESTS para los silencios
// (las notas de una celda con «fig», como el lombardo o el dosillo, cuentan como esa figura)
function figsUsed(measures){ const k=new Set(); measures.forEach(evs=>evs.forEach(e=>{ k.add(e.fig || (e.rest?'r':'')+(e.mr?'w':DUR2K[e.dur])); if(e.trait) k.add('~'+e.trait); })); return k; }
const hasNote = ms => ms.some(m=>m.evs.some(e=>!e.rest));
function generate(){
  if(stageMode==='propio'){ buildOwn(); return; }
  const C=cfg(), sig=sigOf(C), L=sum(sig.groups);
  const newBars=()=>Array.from({length:C.bars},()=>genMeasure(sig,L));
  let ms=newBars();
  for(let a=0; a<50 && !hasNote(ms); a++) ms=newBars();
  // En la campaña el ritmo debe usar todas las figuras y silencios del nivel: se cambia un compás al azar
  // y el cambio se queda si no pierde ninguna (si alguna no puede salir en ese compás, se queda lo logrado)
  const want = stageMode==='campana' ? [...C.figs, ...restList(C).map(k=>'r'+k), ...(C.need||[]).map(k=>'~'+k)] : [];   // need: celdas que el nivel enseña (rasgos: 'sinc', 'qhq', 'qss')
  const cover = t => { const u=figsUsed(t.map(m=>m.evs)); return want.filter(k=>u.has(k)).length; };
  let n=cover(ms);
  for(let it=0; it<3000 && n<want.length; it++){
    const r=genMeasure(sig,L); if(r.fb) continue;
    const t=ms.slice(); t[Math.floor(Math.random()*t.length)]=r;
    const tn=cover(t);
    if(tn>=n && hasNote(t)){ ms=t; n=tn; }
  }
  const measures=ms.map(m=>m.evs), fb=ms.some(m=>m.fb);
  const flat=[];
  measures.forEach((evs,mi)=>evs.forEach(e=>{ e.m=mi; e.abs=mi*L+e.start; e.i=flat.length; flat.push(e); }));
  if(C.ties) addTies(flat);
  chainTies(flat);
  fullScore=null;
  score={key:C.sig,grp:sig.grp,bars:C.bars,sig,L,measures,flat,fb};
  judg=[]; extras=0; extraTks=[]; $('#results').hidden=true;
  renderScore(); renderSummary(); renderLights(); renderTempoGlyph(); updateFab();
}
// e.len = duración que suena (la nota ligada suma las que le siguen); e.head = nota que se toca
function chainTies(flat){ flat.forEach(e=>{ e.len=e.dur; e.head=e.i; if(e.tie){ const h=flat[flat[e.i-1].head]; e.head=h.i; h.len+=e.dur; } }); }

// Compás suelto: copia un compás del ritmo como partitura de un solo compás (la ligadura que venía del anterior se quita)
let fullScore=null;
function measureExcerpt(mi){
  const src=fullScore||score;
  const evs=src.measures[mi].map((e,i)=>({dur:e.dur,rest:e.rest,tuplet:e.tuplet,duplet:e.duplet,mr:e.mr,fig:e.fig,cell:e.cell,start:e.start,tie:i>0&&!!e.tie,m:0,abs:e.start,i}));
  chainTies(evs);
  fullScore=src;
  score={...src, bars:1, measures:[evs], flat:evs, fb:false, part:mi+1};
  judg=[]; extras=0; extraTks=[]; $('#results').hidden=true;
  renderScore(); renderSummary(); updateFab();
}
function backToFull(){
  if(!fullScore) return;
  stop(); score=fullScore; fullScore=null;
  judg=[]; extras=0; extraTks=[]; $('#results').hidden=true;
  renderScore(); renderSummary(); updateFab();
}

// Liga la última nota de una celda con la primera de la siguiente (también a través de la barra de compás).
// Si la primera nota acaba a contratiempo sale una síncopa; si no, una nota prolongada.
function addTies(flat){
  for(let i=1;i<flat.length;i++){
    const a=flat[i-1], b=flat[i];
    if(a.rest || b.rest || a.tuplet || b.tuplet || a.duplet || b.duplet || a.tie) continue;
    if(a.m===b.m && a.cell===b.cell) continue;
    const offbeat = i>1 && flat[i-2].m===a.m && flat[i-2].cell===a.cell;
    if(Math.random() < (offbeat?0.35:0.15)) b.tie=true;
  }
}

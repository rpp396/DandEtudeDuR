// Solfeo Rítmico · Panel de controles.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

/* ---------- Panel ---------- */
function renderSigs(){
  keepFocus($('#sigs'),()=>{ $('#sigs').innerHTML=Object.keys(SIGS).map(k=>{ const [n,d]=k.split('/'); return `<button type="button" class="sig" data-sig="${k}" aria-pressed="${k===set.sig}" title="${SIG_TITLES[k]||'Compás '+k}" aria-label="Compás ${k}"><span>${n}</span><span>${d}</span></button>`; }).join(''); });
}
function miniRest(k){
  const d={w:48,h:24,q:12,qd:18,e:6,s:3}[k];
  const line = d===48 ? `<line x1="-8" y1="12" x2="8" y2="12" stroke="currentColor" stroke-width="1"/>` : d===24 ? `<line x1="-8" y1="22" x2="8" y2="22" stroke="currentColor" stroke-width="1"/>` : '';
  return `<svg class="mini" viewBox="-11 -8 ${d===18?30:22} 58" aria-hidden="true">${line}${restSVG(0,2,d)}</svg>`;
}
function renderRests(){
  keepFocus($('#restFigs'),()=>{ $('#restFigs').innerHTML=RESTS.map(r=>`<button type="button" class="fig" data-r="${r.k}" aria-pressed="${set.rests.includes(r.k)}">${miniRest(r.k)}<span class="fn">${r.name}</span><span class="fv">${r.val}</span></button>`).join(''); });
}
function renderGrp(){
  const opts=ODD_GROUPS[set.sig]; $('#grpRow').hidden=!opts; if(!opts) return;
  const cur=sigOf(set).grp;
  keepFocus($('#grpSeg'),()=>{ $('#grpSeg').innerHTML=opts.map(g=>`<button type="button" data-g="${g}" aria-pressed="${g===cur}">${g}</button>`).join(''); });
}
function renderFigs(){
  keepFocus($('#figs'),()=>{ $('#figs').innerHTML=FIGS.map(f=>`<button type="button" class="fig" data-k="${f.k}" aria-pressed="${set.figs.includes(f.k)}">${miniFig(f.k)}<span class="fn">${f.name}</span><span class="fv">${f.val}</span></button>`).join(''); });
}
function renderSummary(){
  if(stageMode==='propio'){
    const x=own.cur, g=score.grp, n=$('#notice');
    $('#summary').innerHTML = x ? `<b>${esc(x.sig)}</b>${g?` <span class="grp">(${esc(g)})</span>`:''} ${esc(score.bars)} ${score.bars===1?'compás':'compases'} · <span class="own-sum"></span>` : 'Ningún ejercicio abierto';
    if(x) $('#summary .own-sum').textContent=x.name;
    $('#bFull').hidden=!fullScore;
    if(score.part){ n.textContent=`Practicando solo el compás ${score.part} del ejercicio. Pulsa «Ritmo completo» para volver al ejercicio entero.`; n.hidden=false; }
    else if(!x){ n.textContent='Crea un ejercicio con «Nuevo ejercicio», impórtalo o elige uno de la lista.'; n.hidden=false; }
    else if(!own.complete){ n.textContent = own.toks.length ? `El último compás está a medias (${remVerb(own.rem,score.sig)} ${fmtTicks(own.rem,score.sig)}): complétalo para poder practicar.` : 'El ejercicio está vacío: añade figuras con la paleta del panel.'; n.hidden=false; }
    else n.hidden=true;
    // figuras que ocultan el pulso: aviso (no impide nada) y botón para reescribirlas con ligaduras
    const nb=x && !score.part ? own.issues.length : 0;
    $('#pulseWarn').hidden=!nb;
    if(nb) $('#pulseWarnTxt').textContent=`${nb===1?'Una figura oculta':nb+' figuras ocultan'} el pulso o la mitad del compás (en otro color). Puedes dejar${nb===1?'la':'las'} así o escribir${nb===1?'la':'las'} con ligaduras.`;
    return;
  }
  $('#pulseWarn').hidden=true;
  const C=cfg();
  const names=FIGS.filter(f=>C.figs.includes(f.k)).map(f=>f.name.toLowerCase());
  const rn=RESTS.filter(r=>restList(C).includes(r.k)).map(r=>r.short);
  const rtxt = !rn.length ? '' : ' · silencios de '+(rn.length>1 ? rn.slice(0,-1).join(', ')+' y '+rn[rn.length-1] : rn[0]);
  const g=sigOf(C).grp;
  $('#summary').innerHTML=`<b>${esc(C.sig)}</b>${g?` <span class="grp">(${esc(g)})</span>`:''} ${esc(C.bars)} ${C.bars===1?'compás':'compases'} · ${names.join(', ')}${rtxt}${C.sync?' · con síncopas':''}${C.ties?' · con ligaduras':''}`;
  const n=$('#notice');
  const sig=SIGS[C.sig];
  const warnT = C.figs.includes('t') && sig.kind!=='simple', warnD = C.figs.includes('du') && sig.kind!=='compound';
  // silencios elegidos que ninguna celda posible de este compás puede usar (el de redonda es el de compás entero: vale en todos)
  const L=sum(sig.groups), cells = sig.kind==='simple' ? [...SIMPLE_BEAT,...SIMPLE_MULTI] : sig.kind==='compound' ? [...COMP_BEAT,...COMP_MULTI] : [...SIMPLE_BEAT.filter(c=>!c.tuplet),...COMP_BEAT.filter(c=>!c.duplet)];
  const fits = (r,withFigs) => r.k==='w' || cells.some(c=>c.rreq.includes(r.k) && (!c.wholeBar || L===48) && (!withFigs || allowed(c)));
  const chosen = RESTS.filter(r=>restList(C).includes(r.k));
  const noFit = chosen.filter(r=>!fits(r,false)), needFigs = chosen.filter(r=>fits(r,false) && !fits(r,true));
  const lst = a => a.map(r=>r.name.toLowerCase()).join(' ni el ');
  // en simple, el silencio de negra con puntillo se escribe como silencio de negra y de corchea
  const nfTxt = noFit.length===1 && noFit[0].k==='qd' && sig.kind==='simple' ? `En ${C.sig} no se usa el silencio de negra con puntillo: en los compases simples se escribe como silencio de negra y silencio de corchea.` : `En ${C.sig} no se usa el ${lst(noFit)}.`;
  $('#bFull').hidden=!fullScore;
  if(score.part){ n.textContent=`Practicando solo el compás ${score.part} del ritmo. Pulsa «Ritmo completo» para volver al ritmo entero.`; n.hidden=false; }
  else if(score.fb){ n.textContent='Algunas partes se completaron con silencios porque las figuras elegidas no encajan en este compás. Prueba a añadir negras o corcheas.'; n.hidden=false; }
  else if(noFit.length || needFigs.length){
    n.textContent = [noFit.length ? nfTxt : '',
      needFigs.length ? `Con las figuras elegidas no puede salir el ${lst(needFigs)}: necesita figuras más cortas a su lado (por ejemplo, semicorcheas para el silencio de semicorchea).` : ''].filter(Boolean).join(' ');
    n.hidden=false;
  }
  else if(warnT){ n.textContent='Los tresillos solo se usan en compases de subdivisión binaria (2/4, 3/4, 4/4, 5/4, 2/2 y 3/2).'; n.hidden=false; }
  else if(warnD){ n.textContent='El dosillo solo se usa en compases compuestos (3/8, 6/8, 9/8 y 12/8).'; n.hidden=false; }
  else n.hidden=true;
}
function renderLights(){
  const sig=score.sig, L=score.L, n=L/sig.click;
  const starts=new Set(); let a=0; sig.groups.forEach(g=>{ starts.add(a); a+=g; });
  let h='';
  for(let i=0;i<n;i++){ const tk=i*sig.click; h+=`<span class="light${i===0?' first':''}${sig.kind==='odd'&&starts.has(tk)?' gs':''}"></span>`; }
  $('#lights').innerHTML=h;
  syncSub();
}
// «Tresillos» solo divide el pulso en compases simples: en compuestos y amalgama la opción se deshabilita y,
// si ya estaba elegida, suenan las corcheas (subTicks) y lo explica #subHint
function syncSub(){
  const simple=!score || score.sig.kind==='simple';
  $('#sub option[value="4"]').disabled=!simple; $('#subHint').hidden=simple || set.sub!=='4';
}
function syncCount(){ $('#countHint').hidden=set.countIn!=='0'; }
// Tempo máximo según la unidad del compás: el equivalente a negra = 240 (6/8, 9/8, 12/8: 160; 2/2 y 3/2: 120),
// para que las semicorcheas no queden más juntas que en 4/4 a 240 (62 ms)
const bpmMax=k=>Math.round(240*12/Math.max(12,SIGS[k].click));
function tempoLimits(){ const mx=bpmMax(cfg().sig); $('#bpm').max=mx; $('#bpmRange').max=mx; return mx; }
function renderTempoGlyph(){
  const k={12:'q',24:'h',18:'qd',6:'e'}[SIGS[cfg().sig].click];
  $('#tGlyph').innerHTML=miniFig(k);
}
function tempoMark(b){
  if(b<40) return 'Grave'; if(b<60) return 'Largo'; if(b<66) return 'Larghetto'; if(b<76) return 'Adagio';
  if(b<108) return 'Andante'; if(b<120) return 'Moderato'; if(b<168) return 'Allegro'; if(b<200) return 'Presto'; return 'Prestissimo';
}
function setBpm(v, fromUser=true){
  if(stageMode==='campana'){ showTempo(); return; }
  v=Math.round(+v); if(!isFinite(v)) v=curBpm(); v=Math.max(30,Math.min(tempoLimits(),v));
  if(stageMode==='propio'){ if(own.cur){ own.cur.bpm=v; saveOwn(); renderOwnList(); } } else set.bpm=v; $('#bpm').value=v; $('#bpmRange').value=v; $('#bpmOut').textContent=v+' ppm'; $('#bpmRange').setAttribute('aria-valuetext',v+' ppm'); $('#tMark').textContent=tempoMark(v);
  if(fromUser){ save(); if(S.running && S.mode!=='metro') stop(); }
}
function syncControls(){
  ['sync','ties','sound','cursor','loop','metro','accent','tapSound','fab','vibrate','countSub','keys'].forEach(id=>{ $('#'+id).checked=!!set[id]; });
  $('#vibrateRow').hidden=!('vibrate' in navigator && touchMQ.matches);
  $('#timbre').value=set.timbre; $('#sub').value=set.sub; $('#countIn').value=set.countIn; syncSub(); syncCount();
  $('#rhythmVol').value=set.rhythmVol; $('#metroVol').value=set.metroVol; $('#tapVol').value=set.tapVol; syncTapVol(); $('#offset').value=set.offset;
  $('#bars').textContent=set.bars;
  $('#autosave').checked=!!set.autosave; $('#penalize').checked=!!set.penalize;
  syncHold(); applyKeys();
  updOutputs(); if(stageMode==='libre') setBpm(set.bpm,false); else showTempo();
}
function syncTapVol(){ $('#tapVolField').hidden=!set.tapSound; }
function updOutputs(){
  // el texto de cada valor también va a aria-valuetext del deslizador (si no, el lector dice «0.6» o «15» sin unidad)
  const vt=(id,out,txt)=>{ $('#'+out).textContent=txt; $('#'+id).setAttribute('aria-valuetext',txt); };
  vt('rhythmVol','rhythmVolOut',Math.round(set.rhythmVol*100)+'%');
  vt('metroVol','metroVolOut',Math.round(set.metroVol*100)+'%');
  vt('tapVol','tapVolOut',Math.round(set.tapVol*100)+'%');
  vt('offset','offsetOut',(set.offset>0?'+':'')+set.offset+' ms');
  $('#offsetNow').textContent=(set.offset>0?'+':'')+set.offset+' ms';
}

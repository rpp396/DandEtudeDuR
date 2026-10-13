// Solfeo Rítmico · Panel de controles.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

/* ---------- Panel ---------- */
function renderSigs(){
  $('#sigs').innerHTML=Object.keys(SIGS).map(k=>{ const [n,d]=k.split('/'); return `<button type="button" class="sig" data-sig="${k}" aria-pressed="${k===set.sig}" title="${SIG_TITLES[k]||'Compás '+k}" aria-label="Compás ${k}"><span>${n}</span><span>${d}</span></button>`; }).join('');
}
function miniRest(k){
  const d={w:48,h:24,q:12,qd:18,e:6,s:3}[k];
  const line = d===48 ? `<line x1="-8" y1="12" x2="8" y2="12" stroke="currentColor" stroke-width="1"/>` : d===24 ? `<line x1="-8" y1="22" x2="8" y2="22" stroke="currentColor" stroke-width="1"/>` : '';
  return `<svg class="mini" viewBox="-11 -8 ${d===18?30:22} 58" aria-hidden="true">${line}${restSVG(0,2,d)}</svg>`;
}
function renderRests(){
  $('#restFigs').innerHTML=RESTS.map(r=>`<button type="button" class="fig" data-r="${r.k}" aria-pressed="${set.rests.includes(r.k)}">${miniRest(r.k)}<span class="fn">${r.name}</span><span class="fv">${r.val}</span></button>`).join('');
}
function renderGrp(){
  const opts=ODD_GROUPS[set.sig]; $('#grpRow').hidden=!opts; if(!opts) return;
  const cur=sigOf(set).grp;
  $('#grpSeg').innerHTML=opts.map(g=>`<button type="button" data-g="${g}" aria-pressed="${g===cur}">${g}</button>`).join('');
}
function renderFigs(){
  $('#figs').innerHTML=FIGS.map(f=>`<button type="button" class="fig" data-k="${f.k}" aria-pressed="${set.figs.includes(f.k)}">${miniFig(f.k)}<span class="fn">${f.name}</span><span class="fv">${f.val}</span></button>`).join('');
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
    return;
  }
  const C=cfg();
  const names=FIGS.filter(f=>C.figs.includes(f.k)).map(f=>f.name.toLowerCase());
  const rn=RESTS.filter(r=>restList(C).includes(r.k)).map(r=>r.short);
  const rtxt = !rn.length ? '' : ' · silencios de '+(rn.length>1 ? rn.slice(0,-1).join(', ')+' y '+rn[rn.length-1] : rn[0]);
  const g=sigOf(C).grp;
  $('#summary').innerHTML=`<b>${esc(C.sig)}</b>${g?` <span class="grp">(${esc(g)})</span>`:''} ${esc(C.bars)} ${C.bars===1?'compás':'compases'} · ${names.join(', ')}${rtxt}${C.sync?' · con síncopas':''}${C.ties?' · con ligaduras':''}`;
  const n=$('#notice');
  const sig=SIGS[C.sig];
  const warnT = C.figs.includes('t') && sig.kind!=='simple';
  // silencios elegidos que ninguna celda posible de este compás puede usar
  const L=sum(sig.groups), cells = sig.kind==='simple' ? [...SIMPLE_BEAT,...SIMPLE_MULTI] : sig.kind==='compound' ? [...COMP_BEAT,...COMP_MULTI] : [...SIMPLE_BEAT.filter(c=>!c.tuplet),...COMP_BEAT];
  const fits = (r,withFigs) => cells.some(c=>c.rreq.includes(r.k) && (!c.wholeBar || L===48) && (!withFigs || allowed(c)));
  const chosen = RESTS.filter(r=>restList(C).includes(r.k));
  const noFit = chosen.filter(r=>!fits(r,false)), needFigs = chosen.filter(r=>fits(r,false) && !fits(r,true));
  const lst = a => a.map(r=>r.name.toLowerCase()).join(' ni el ');
  $('#bFull').hidden=!fullScore;
  if(score.part){ n.textContent=`Practicando solo el compás ${score.part} del ritmo. Pulsa «Ritmo completo» para volver al ritmo entero.`; n.hidden=false; }
  else if(score.fb){ n.textContent='Algunas partes se completaron con silencios porque las figuras elegidas no encajan en este compás. Prueba a añadir negras o corcheas.'; n.hidden=false; }
  else if(noFit.length || needFigs.length){
    n.textContent = [noFit.length ? `En ${C.sig} no cabe el ${lst(noFit)}.` : '',
      needFigs.length ? `Con las figuras elegidas no puede salir el ${lst(needFigs)}: necesita figuras más cortas a su lado (por ejemplo, semicorcheas para el silencio de semicorchea).` : ''].filter(Boolean).join(' ');
    n.hidden=false;
  }
  else if(warnT){ n.textContent='Los tresillos solo se usan en compases de subdivisión binaria (2/4, 3/4, 4/4, 5/4, 2/2).'; n.hidden=false; }
  else n.hidden=true;
}
function renderLights(){
  const sig=score.sig, L=score.L, n=L/sig.click;
  const starts=new Set(); let a=0; sig.groups.forEach(g=>{ starts.add(a); a+=g; });
  let h='';
  for(let i=0;i<n;i++){ const tk=i*sig.click; h+=`<span class="light${i===0?' first':''}${sig.kind==='odd'&&starts.has(tk)?' gs':''}"></span>`; }
  $('#lights').innerHTML=h;
}
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
  v=Math.round(+v); if(!isFinite(v)) v=curBpm(); v=Math.max(30,Math.min(240,v));
  if(stageMode==='propio'){ if(own.cur){ own.cur.bpm=v; saveOwn(); renderOwnList(); } } else set.bpm=v; $('#bpm').value=v; $('#bpmRange').value=v; $('#bpmOut').textContent=v+' ppm'; $('#tMark').textContent=tempoMark(v);
  if(fromUser){ save(); if(S.running && S.mode!=='metro') stop(); }
}
function syncControls(){
  ['sync','ties','sound','cursor','loop','metro','accent','tapSound','fab','vibrate','countSub'].forEach(id=>{ $('#'+id).checked=!!set[id]; });
  $('#vibrateRow').hidden=!('vibrate' in navigator && touchMQ.matches);
  $('#timbre').value=set.timbre; $('#sub').value=set.sub; $('#countIn').value=set.countIn;
  $('#rhythmVol').value=set.rhythmVol; $('#metroVol').value=set.metroVol; $('#tapVol').value=set.tapVol; syncTapVol(); $('#offset').value=set.offset;
  $('#bars').textContent=set.bars;
  $('#autosave').checked=!!set.autosave; $('#penalize').checked=!!set.penalize;
  syncHold();
  updOutputs(); if(stageMode==='libre') setBpm(set.bpm,false); else showTempo();
}
function syncTapVol(){ $('#tapVolField').hidden=!set.tapSound; }
function updOutputs(){
  $('#rhythmVolOut').textContent=Math.round(set.rhythmVol*100)+'%';
  $('#metroVolOut').textContent=Math.round(set.metroVol*100)+'%';
  $('#tapVolOut').textContent=Math.round(set.tapVol*100)+'%';
  $('#offsetOut').textContent=(set.offset>0?'+':'')+set.offset+' ms';
  $('#offsetNow').textContent=(set.offset>0?'+':'')+set.offset+' ms';
}

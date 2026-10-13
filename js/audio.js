// Solfeo Rítmico · Audio (Web Audio).
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

/* ---------- Audio ---------- */
let ctx=null, master=null, noiseBuf=null;
function ensureAudio(){
  if(!ctx){
    // iOS (Safari 17+): sin esto Web Audio enmudece con el interruptor de silencio del iPhone
    try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(e){}
    const AC=window.AudioContext||window.webkitAudioContext;
    try{ ctx=new AC({latencyHint:'interactive'}); }catch(e){ ctx=null; appWarn('audio'); return false; }
    master=ctx.createGain(); master.gain.value=0.9; master.connect(ctx.destination);
    noiseBuf=ctx.createBuffer(1, Math.floor(ctx.sampleRate*0.1), ctx.sampleRate);
    const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    // una llamada, Siri o bloquear la pantalla detienen el reloj del audio: la práctica o la medición en curso ya no valen
    ctx.addEventListener('statechange',()=>{ if(ctx.state!=='running') stopTimed(); });
  }
  // iOS deja el contexto en 'interrupted' (no solo 'suspended') tras una interrupción
  if(ctx.state!=='running') ctx.resume().catch(()=>{});
  return true;
}
function stopTimed(){ if(S.running && (S.mode==='practice'||S.mode==='calib')) stop(); }
// Al salir de la página se corta la práctica o la medición; al volver, el audio se reanuda
document.addEventListener('visibilitychange',()=>{ if(document.hidden) stopTimed(); else if(ctx && ctx.state!=='running') ctx.resume().catch(()=>{}); });
addEventListener('pageshow',()=>{ if(ctx && ctx.state!=='running') ctx.resume().catch(()=>{}); });
const CLICK_F={accent:1760,beat:1250,weak:1040,sub:880}, CLICK_V={accent:1,beat:0.7,weak:0.45,sub:0.28};
function click(bus,t,level,vol){
  const v=CLICK_V[level]*(vol==null?set.metroVol:vol); if(v<=0.001) return;
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.type='triangle'; o.frequency.setValueAtTime(CLICK_F[level],t);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v*0.9,t+0.002); g.gain.exponentialRampToValueAtTime(0.0001,t+0.055);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t+0.07);
}
function noteSound(bus,t,dsec){
  const v=set.rhythmVol; if(v<=0.001) return;
  if(set.timbre==='tono'){
    const o=ctx.createOscillator(), o2=ctx.createOscillator(), g=ctx.createGain(), g2=ctx.createGain();
    o.type='triangle'; o.frequency.value=440; o2.type='sine'; o2.frequency.value=880; g2.gain.value=0.25;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(bus);
    const end=t+Math.max(0.06,dsec*0.86), mid=Math.min(end,t+0.1);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.5*v,t+0.006);
    g.gain.linearRampToValueAtTime(0.32*v,mid); g.gain.setValueAtTime(0.32*v,end); g.gain.linearRampToValueAtTime(0,end+0.035);
    o.start(t); o2.start(t); o.stop(end+0.05); o2.stop(end+0.05);
  } else {
    const n=ctx.createBufferSource(); n.buffer=noiseBuf;
    const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2300; bp.Q.value=2.5;
    const g=ctx.createGain(); g.gain.setValueAtTime(1.3*v,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.06);
    n.connect(bp); bp.connect(g); g.connect(bus); n.start(t); n.stop(t+0.08);
    const o=ctx.createOscillator(), g2=ctx.createGain(); o.frequency.setValueAtTime(620,t); o.frequency.exponentialRampToValueAtTime(300,t+0.08);
    g2.gain.setValueAtTime(0.6*v,t); g2.gain.exponentialRampToValueAtTime(0.0001,t+0.1);
    o.connect(g2); g2.connect(bus); o.start(t); o.stop(t+0.12);
  }
}

// Sonido del toque del usuario: un tono sostenido hasta soltar en modo piano, un golpe corto en modo batería.
// Va a master (no al bus de la sesión) para que siga sonando mientras se mantiene aunque la práctica termine.
const tapVoices=new Map();
function tapSoundOn(src){
  if(!set.tapSound || !ensureAudio()) return;
  tapSoundOff(src);
  const v=set.tapVol; if(v<=0.001) return;
  const t=ctx.currentTime, g=ctx.createGain(); g.connect(master);
  const o=ctx.createOscillator(); o.connect(g);
  if(set.hold){
    const o2=ctx.createOscillator(), g2=ctx.createGain();
    o.type='triangle'; o.frequency.value=523.25; o2.type='sine'; o2.frequency.value=1046.5; g2.gain.value=0.2;
    o2.connect(g2); g2.connect(g);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.45*v,t+0.006); g.gain.linearRampToValueAtTime(0.3*v,t+0.1);
    o.start(t); o2.start(t);
    tapVoices.set(src,{g,oscs:[o,o2]});
  } else {
    o.type='sine'; o.frequency.setValueAtTime(1180,t); o.frequency.exponentialRampToValueAtTime(700,t+0.05);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.8*v,t+0.002); g.gain.exponentialRampToValueAtTime(0.0001,t+0.09);
    o.start(t); o.stop(t+0.1);
  }
}
function tapSoundOff(src){
  const vc=tapVoices.get(src); if(!vc) return;
  tapVoices.delete(src);
  const t=ctx.currentTime;
  vc.g.gain.cancelScheduledValues(t); vc.g.gain.setValueAtTime(vc.g.gain.value,t); vc.g.gain.linearRampToValueAtTime(0,t+0.03);
  vc.oscs.forEach(o=>o.stop(t+0.05));
}

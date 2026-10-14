// Solfeo Rítmico · Datos musicales (figuras, compases, celdas rítmicas, silencios), ajustes y su guardado, avisos y anuncios para lectores de pantalla.
// Script clásico (no módulo): comparte el ámbito global con los demás de js/; el orden de carga está en index.html.

const $ = s => document.querySelector(s);
const KEY = 'solfeo-ritmico-v1';

/* ---------- Datos musicales (1 negra = 12 ticks) ---------- */
const FIGS = [
  {k:'w',  name:'Redonda', val:'4'},
  {k:'h',  name:'Blanca', val:'2'},
  {k:'hd', name:'Blanca con puntillo', val:'3'},
  {k:'q',  name:'Negra', val:'1'},
  {k:'qd', name:'Negra con puntillo', val:'1½'},
  {k:'e',  name:'Corchea', val:'½'},
  {k:'ed', name:'Corchea con puntillo', val:'¾'},
  {k:'s',  name:'Semicorchea', val:'¼'},
  {k:'t',  name:'Tresillo de corcheas', val:'3 en 1'},
  {k:'lb', name:'Ritmo lombardo', val:'¼ + ¾'},
  {k:'du', name:'Dosillo de corcheas', val:'2 en 1½'},
];
const SIGS = {
  '2/4':{groups:[12,12],click:12,kind:'simple'},
  '3/4':{groups:[12,12,12],click:12,kind:'simple'},
  '4/4':{groups:[12,12,12,12],click:12,kind:'simple'},
  '5/4':{groups:[12,12,12,12,12],click:12,kind:'simple'},
  '2/2':{groups:[12,12,12,12],click:24,kind:'simple'},
  '3/2':{groups:[12,12,12,12,12,12],click:24,kind:'simple'},
  '3/8':{groups:[18],click:6,kind:'compound'},
  '6/8':{groups:[18,18],click:18,kind:'compound'},
  '9/8':{groups:[18,18,18],click:18,kind:'compound'},
  '12/8':{groups:[18,18,18,18],click:18,kind:'compound'},
  '5/8':{groups:[18,12],click:6,kind:'odd'},
  '7/8':{groups:[12,12,18],click:6,kind:'odd'},
  '8/8':{groups:[18,18,12],click:6,kind:'odd'},
};
const SIG_TITLES = {'4/4':'Compasillo','2/2':'Compás partido (alla breve)','3/2':'Tres tiempos de blanca','5/8':'Amalgama: 3+2 o 2+3','7/8':'Amalgama: 2+2+3, 2+3+2 o 3+2+2','8/8':'Amalgama: 3+3+2, 3+2+3 o 2+3+3'};
// Agrupaciones posibles de los compases de amalgama (la primera es la de SIGS). 2 = dos corcheas (12 ticks), 3 = tres (18).
const ODD_GROUPS = {'5/8':['3+2','2+3'], '7/8':['2+2+3','2+3+2','3+2+2'], '8/8':['3+3+2','3+2+3','2+3+3']};
// Compás efectivo: en amalgama aplica la agrupación elegida (set.grp[sig] en práctica libre, l.grp en campaña)
function sigOf(C){
  const base=SIGS[C.sig], opts=ODD_GROUPS[C.sig];
  if(!opts) return {...base, grp:null};
  const want = typeof C.grp==='string' ? C.grp : (C.grp||{})[C.sig];
  const g = opts.includes(want) ? want : opts[0];
  return {...base, groups:g.split('+').map(n=>n==='2'?12:18), grp:g};
}
const SIMPLE_BEAT = [
  {ev:[[12]]},
  {ev:[[6],[6]]},
  {ev:[[3],[3],[3],[3]]},
  {ev:[[6],[3],[3]]},
  {ev:[[3],[3],[6]]},
  {ev:[[3],[6],[3]]},
  {ev:[[9],[3]]},
  {ev:[[4],[4],[4]], tuplet:true},
  {ev:[[12,1]]},
  {ev:[[6,1],[6]]},
  {ev:[[6],[6,1]]},
  {ev:[[3,1],[3],[3],[3]]},
  {ev:[[3],[3],[3,1],[3]]},
  {ev:[[6,1],[3],[3]]},
  {ev:[[3,1],[3],[6]]},
  {ev:[[6],[3,1],[3]]},
  {ev:[[3,1],[9]]},
  {ev:[[3],[9]], fig:'lb'},   // ritmo lombardo (semicorchea y corchea con puntillo): solo si se elige «lb»
];
const SIMPLE_MULTI = [
  {ev:[[24]]},
  {ev:[[36]]},
  {ev:[[48]], wholeBar:true},
  {ev:[[18],[6]]},
  {sync:true, ev:[[6],[12],[6]]},
  {sync:true, ev:[[12],[24],[12]], wholeBar:true},
  {ev:[[24,1]]},
];
const COMP_BEAT = [
  {ev:[[18]]},
  {ev:[[6],[6],[6]]},
  {ev:[[12],[6]]},
  {ev:[[6],[12]]},
  {ev:[[3],[3],[6],[6]]},
  {ev:[[6],[3],[3],[6]]},
  {ev:[[6],[6],[3],[3]]},
  {ev:[[3],[3],[3],[3],[3],[3]]},
  {ev:[[9],[3],[6]]},
  {ev:[[18,1]]},
  {ev:[[6,1],[6],[6]]},
  {ev:[[6],[6],[6,1]]},
  {ev:[[12],[6,1]]},
  {ev:[[12,1],[6]]},
  {ev:[[3,1],[3],[3],[3],[3],[3]]},
  {ev:[[3,1],[3],[6],[6]]},
  {ev:[[6],[3,1],[3],[6]]},
  {ev:[[6],[6],[3,1],[3]]},
  {ev:[[12],[3],[3]]},
  {ev:[[3],[3],[12]]},
  {ev:[[6],[6,1],[6]]},
  {ev:[[9],[9]], duplet:true, fig:'du'},   // dosillo: dos corcheas en el pulso de negra con puntillo (solo compuestos)
];
const COMP_MULTI = [ {ev:[[36]]} ];
// Figuras que usa cada celda, derivadas de sus eventos: req = notas, rreq = silencios.
// Una celda con «fig» (lombardo, dosillo) pide esa figura de FIGS en lugar de las de sus notas.
const DUR2K = {48:'w',36:'hd',24:'h',18:'qd',12:'q',9:'ed',6:'e',4:'t',3:'s'};
[SIMPLE_BEAT,SIMPLE_MULTI,COMP_BEAT,COMP_MULTI].flat().forEach(c=>{
  const keys=r=>[...new Set(c.ev.filter(e=>!!e[1]===r).map(e=>DUR2K[e[0]]))];
  c.req=c.fig?[c.fig]:keys(false); c.rreq=keys(true); c.rest=c.rreq.length>0;
});
// Silencio de compás entero: el de redonda, en cualquier compás (dura lo que el compás; evento con mr:true)
const BAR_REST = {ev:[], req:[], rreq:['w'], rest:true, mr:true};
// Silencios que se pueden elegir (cada uno por separado, como las figuras)
const RESTS = [
  {k:'w', name:'Silencio de redonda', short:'redonda', val:'compás'},   // compás entero, en cualquier compás
  {k:'h', name:'Silencio de blanca', short:'blanca', val:'2'},
  {k:'q', name:'Silencio de negra', short:'negra', val:'1'},
  {k:'qd', name:'Silencio de negra con puntillo', short:'negra con puntillo', val:'1½'},
  {k:'e', name:'Silencio de corchea', short:'corchea', val:'½'},
  {k:'s', name:'Silencio de semicorchea', short:'semicorchea', val:'¼'},
];
const REST_KEYS = RESTS.map(r=>r.k);
// Silencios activos: lista (práctica libre y niveles); acepta el booleano antiguo (= silencios de las figuras elegidas)
function restList(C){ return Array.isArray(C.rests) ? C.rests : (C.rests ? C.figs.filter(k=>REST_KEYS.includes(k)) : []); }

const DEFAULTS = {sig:'4/4', bars:4, figs:['h','q','e'], rests:['h','q','e'], sound:false, cursor:true, loop:false,
  timbre:'tono', rhythmVol:0.6, bpm:80, metro:true, accent:true, sub:'0', countIn:'1', metroVol:0.7, offset:0,
  autosave:true, view:'libre', level:0, levelId:'', penalize:true, hold:false, sync:false, ties:false, tapSound:true, tapVol:0.6, grp:{}, fab:true, vibrate:true, seen:false, folds:{}, countSub:true, keys:true, sv:3};
/* ---------- Validación de lo guardado ---------- */
// Todo lo que se lee de localStorage o del db de claude.ai (ajustes, sesiones, niveles, ejercicios) se trata como no fiable:
// se copian solo campos conocidos, con su tipo y rango, y las claves salen de listas cerradas (nunca de propiedades heredadas).
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);     // Object.hasOwn sin depender del navegador: «constructor» y «__proto__» no cuentan
const isObj=x=>!!x && typeof x==='object' && !Array.isArray(x);
// Número finito dentro de [lo,hi] (acepta cadenas numéricas); si no, el valor por defecto d
function numIn(v,lo,hi,d,int){ if(typeof v==='string' && v.trim()!=='') v=+v; if(typeof v!=='number' || !isFinite(v)) return d; v=Math.min(hi,Math.max(lo,v)); return int?Math.round(v):v; }
const oneOf=(v,list,d)=>list.includes(v)?v:d;
const strIn=(v,re,d)=>typeof v==='string' && re.test(v) ? v : d;
function cleanSettings(o){
  const D=DEFAULTS, s=freshSettings(); if(!isObj(o)) return s;
  s.sig = typeof o.sig==='string' && has(SIGS,o.sig) ? o.sig : D.sig;
  s.bars = numIn(o.bars,1,16,D.bars,true);
  s.bpm = numIn(o.bpm,30,240,D.bpm,true);
  s.offset = numIn(o.offset,-500,500,D.offset,true);
  ['rhythmVol','metroVol','tapVol'].forEach(k=>{ s[k]=numIn(o[k],0,1,D[k]); });
  s.timbre = oneOf(o.timbre,['tono','golpe'],D.timbre);
  s.sub = oneOf(String(o.sub),['0','6','3','4'],D.sub);
  s.countIn = oneOf(String(o.countIn),['0','1','2'],D.countIn);
  ['sound','cursor','loop','metro','accent','autosave','penalize','hold','sync','ties','tapSound','fab','vibrate','seen','countSub','keys'].forEach(k=>{ s[k]=typeof o[k]==='boolean' ? o[k] : D[k]; });
  const keys=(a,ok)=>Array.isArray(a) ? [...new Set(a.filter(k=>typeof k==='string' && ok.includes(k)))] : [];
  const figs=keys(o.figs,FIGS.map(f=>f.k)); s.figs = figs.length ? figs : [...D.figs];
  // silencios: lista de claves (o el booleano antiguo = silencios de las figuras elegidas)
  s.rests = o.rests===undefined ? [...D.rests] : keys(Array.isArray(o.rests) ? o.rests : o.rests ? s.figs : [], REST_KEYS);
  s.view = oneOf(o.view,['libre','campana','propio'],D.view);
  s.level = numIn(o.level,0,999,0,true);
  s.levelId = strIn(o.levelId,/^L\d{1,3}$/,'');
  s.ownId = strIn(o.ownId,/^[a-z0-9]{4,24}$/,'');
  if(isObj(o.grp)) Object.keys(o.grp).forEach(k=>{ if(has(ODD_GROUPS,k) && ODD_GROUPS[k].includes(o.grp[k])) s.grp[k]=o.grp[k]; });
  if(isObj(o.folds)) ['repro','metro','prac'].forEach(k=>{ if(typeof o.folds[k]==='boolean') s.folds[k]=o.folds[k]; });
  s.sv = numIn(o.sv,0,99,0,true);
  return s;
}
function load(){
  try{ const raw = localStorage.getItem(KEY); if(raw){ const o = JSON.parse(raw), s = cleanSettings(o);
    // antes sync y ties eran una sola opción
    if(!isObj(o) || o.sync===undefined) s.sync=!!s.ties;
    // sv 2: «Escuchar el ritmo» pasa a aplicarse solo a la práctica (apagado) y «Oír mis toques» viene activado
    if(s.sv<2){ s.sound=false; s.tapSound=true; s.sv=2; }
    // sv 3: en la cuenta previa de compases compuestos y de amalgama suenan pulso y subdivisión
    if(s.sv<3){ s.countSub=true; s.sv=3; }
    return s; } }catch(e){}
  return freshSettings();
}
let set = load();
function freshSettings(){ return {...DEFAULTS, figs:[...DEFAULTS.figs], rests:[...DEFAULTS.rests], grp:{}, folds:{}}; }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(set)); }catch(e){ appWarn('store'); } }
// Avisos persistentes arriba de la página (no se puede guardar, no hay audio)
const WARNS={store:'Este navegador no deja guardar datos (modo privado o almacenamiento lleno): tus ajustes y tu progreso se perderán al cerrar la página.',
  audio:'Tu navegador no permite reproducir audio, así que no se puede escuchar el ritmo ni practicar. Prueba con otro navegador actualizado.'};
const warnOn=new Set();
function appWarn(k){ if(warnOn.has(k)) return; warnOn.add(k); const w=$('#appWarn'); w.textContent=[...warnOn].map(x=>WARNS[x]).join(' '); w.hidden=false; }
// Anuncio para lectores de pantalla (se vacía antes para que se repita aunque el texto sea el mismo)
function say(t){ const el=$('#srLive'); el.textContent=''; setTimeout(()=>{ el.textContent=t; },60); }
// Con «reducir movimiento» los desplazamientos suaves pasan a instantáneos (behavior:smooth() en scrollTo / scrollIntoView)
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const smooth = () => reduceMQ.matches ? 'auto' : 'smooth';
// Repintar con innerHTML sin perder el foco de teclado: recuerda qué control de box lo tenía (por su data-… o su id) y, tras fn(),
// enfoca el equivalente (si ya no se puede, el primer botón activo)
const FOCUS_KEYS = ['data-sig','data-g','data-lv','data-id','data-k','data-r','id'];
function keepFocus(box, fn){
  const a=document.activeElement; let sel=null;
  if(a && a!==box && box.contains(a)){ const at=FOCUS_KEYS.find(k=>a.hasAttribute(k)); if(at) sel=`[${at}="${CSS.escape(a.getAttribute(at))}"]`; }
  fn();
  if(!sel) return;
  const n=box.querySelector(sel+':not(:disabled)') || box.querySelector('button:not(:disabled)');
  if(n && n!==document.activeElement) n.focus({preventScroll:true});
}
// Confirmación en línea: la pregunta (HTML ya escapado) y «Sí»/«Cancelar» dentro de box, que pasa a ser un grupo con la pregunta como
// nombre (y descripción de «Cancelar»). El foco va a «Cancelar». yes/no = [id, texto]. endConfirm la cierra y deja el contenido html.
let confirmN=0;
function askConfirm(box, q, yes, no){
  const id='cq'+(++confirmN);
  box.innerHTML=`<span id="${id}">${q}</span><button class="btn warn" id="${yes[0]}" type="button">${yes[1]}</button><button class="btn" id="${no[0]}" type="button" aria-describedby="${id}">${no[1]}</button>`;
  box.setAttribute('role','group'); box.setAttribute('aria-labelledby',id);
  $('#'+no[0]).focus();
}
function endConfirm(box, html){ box.removeAttribute('role'); box.removeAttribute('aria-labelledby'); box.innerHTML=html; }

import * as THREE from 'three';
import { createARNameCards } from './ar-name-cards.js';
import { createAnnotations } from './annotations.js';
import { createGearTelemetry } from './gear-telemetry.js';
import { advanceGearMechanism, applyGearMechanism } from '../education/gear-motion.js';

/** Independent transforms/state, shared immutable model geometry and materials. */
export function createARContent(app, models, camera, originals) {
  const entries = originals.map(item => {
    const anchor = new THREE.Group(), mesh = item.mesh.clone(true), tag = item.tag.clone();
    anchor.position.copy(item.anchor.position); anchor.add(mesh,tag); models.add(anchor);
    const entry = {...item,anchor,mesh,tag,mechanism:null};
    if (item.mechanism) {
      const source = [], copy = []; item.mesh.traverse(node=>source.push(node)); mesh.traverse(node=>copy.push(node));
      const pairs = new Map(source.map((node,i)=>[node,copy[i]]));
      entry.mechanism = {...item.mechanism, state:structuredClone(item.mechanism.state),
        motion:{...item.mechanism.motion}, parts:item.mechanism.parts.map(part=>({...part,pivot:pairs.get(part.pivot)}))};
    }
    return entry;
  });
  const state = {entries,chosen:entries.find((_,i)=>originals[i]===app.state.chosen)||entries.find(e=>e.mechanism)||entries[0],hudHidden:true};
  const overlay = document.getElementById('surface-overlay');
  const engine = {camera,canvas:{getBoundingClientRect:()=>overlay.getBoundingClientRect()}};
  const context = {state,engine,hud:{isBlocking:()=>false,dockedPanel:()=>null}};
  const obstacles = () => ['surface-card','surface-controls'].map(cls=>document.querySelector('.'+cls).getBoundingClientRect());
  const top = () => obstacles()[0].bottom + 8;
  let overlayNames=true;
  const annotations = createAnnotations(context,{connectors:()=>!overlayNames,labelWidth:width=>width<=600?280:320,obstacles,safeBounds:canvas=>({left:canvas.left+10,right:canvas.right-10,top:top(),bottom:obstacles()[1].top-8})});
  const telemetry = createGearTelemetry(context,{layer:document.getElementById('surface-telemetry'),svg:document.getElementById('surface-telemetry-lines'),toggleButton:null,connectorWidth:1.4,viewport:()=>overlay.getBoundingClientRect(),obstacles,top});
  const names=createARNameCards(entries,camera,overlay);
  const mechanisms = entries.filter(e=>e.mechanism).map(e=>e.mechanism);
  const connected = m=>!m.state.separation && m.state.isolated===null;
  return {
    entries,
    get hasMechanism(){return mechanisms.length>0;},
    get running(){return mechanisms.some(m=>m.state.running&&connected(m));},
    toggleRunning() {
      const run = !this.running;
      for (const m of mechanisms) {
        if(run) { m.state.separation=0; m.state.isolated=null; }
        m.state.running=run; applyGearMechanism(m);
      }
    },
    update(seconds, visible, domOverlay = true) {
      overlayNames=domOverlay; state.hudHidden=!visible;
      if(visible) for(const m of mechanisms) advanceGearMechanism(m,seconds);
      models.updateWorldMatrix(true,true);
      annotations.updateAll(); telemetry.updateFrame(); names.update(visible,domOverlay);
    },
    dispose() { names.dispose(); for(const entry of entries) annotations.remove(entry); telemetry.dispose(); }
  };
}

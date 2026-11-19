import { XR_UNAVAILABLE, xrFailure, spatialPolicyAllowed } from './xr-availability.js';

/** AR is optional: loading or checking it must never block the 3D lab. */
export function createSpatialEntry(app) {
  let controller = null, loading = null, checkRun = 0;
  const find = id => document.getElementById(id);
  // A cached older HTML document may still name the footer entry quick-camera.
  const quick = find('quick-ar') || find('quick-camera');
  if (quick) { quick.id='quick-ar'; quick.title='Entrar en AR'; quick.setAttribute('aria-label','Entrar en AR'); }
  function message(text) {
    for(const id of ['surface-message','surface-live']) if(find(id)) find(id).textContent=text;
  }
  function busy(value) {
    quick?.setAttribute('aria-busy',String(value));
    if(find('surface-check'))find('surface-check').disabled=value;
    if(!controller&&find('surface-start'))find('surface-start').disabled=true;
  }
  function open() { if(find('surfaces'))app.hud.open('surfaces',quick); }
  function bind() {
    if(quick)quick.onclick=()=>{open();support();};
    if(find('surface-check'))find('surface-check').onclick=support;
    if(find('surface-start'))find('surface-start').onclick=start;
  }
  async function support() {
    if(controller)return controller.support();
    const run=++checkRun;
    busy(true);
    message('Comprobando compatibilidad con AR espacial…');
    try {
      if(!isSecureContext || !navigator.xr?.isSessionSupported) {
        message(!isSecureContext?'Abre la dirección HTTPS del sitio para comprobar AR. Puedes seguir usando el laboratorio 3D.':XR_UNAVAILABLE);
        return;
      }
      if(!spatialPolicyAllowed(document)){message(xrFailure({name:'SecurityError'}));return;}
      const available=await navigator.xr.isSessionSupported('immersive-ar');
      if(run!==checkRun)return;
      if(!available){message(XR_UNAVAILABLE);return;}
      if(!loading) loading=import('./spatial-ar.js').then(({createSpatialAR})=>createSpatialAR(app));
      const loaded=await loading;
      if(!controller)controller=loaded;
      await controller.support();
    } catch(error) {
      if(run!==checkRun)return;
      loading=null;bind();
      console.warn('No se pudo preparar el módulo AR. La vista 3D sigue disponible:',error);
      message('No se pudo cargar el modo AR. Puedes seguir en 3D; recarga la página para volver a intentarlo.');
    } finally { if(run===checkRun)busy(false); }
  }
  function start() {
    if(controller)return controller.start();
    open();return support();
  }
  bind();busy(false);
  return {
    support,start,end:()=>controller?.end(),
    get active(){return controller?.active||false;},
    get pending(){return controller?.pending||false;},
    get placed(){return controller?.placed||false;}
  };
}

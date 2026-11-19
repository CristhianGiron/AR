import * as THREE from 'three';

/** Screen-space AR names, independent of camera distance and model scale. */
export function createARNameCards(entries,camera,overlay) {
  const NS='http://www.w3.org/2000/svg', layer=document.createElement('div'),svg=document.createElementNS(NS,'svg');
  layer.id='surface-names';layer.append(svg);overlay.append(layer);
  const point=new THREE.Vector3();
  const records=entries.map(entry=>{
    const card=document.createElement('div');card.className='surface-name-card';card.textContent=entry.name;card.hidden=true;
    const path=document.createElementNS(NS,'path');path.style.display='none';svg.append(path);layer.append(card);
    return {entry,card,path};
  });
  return {
    update(visible,domOverlay) {
      layer.hidden=!visible || !domOverlay;
      svg.setAttribute('viewBox','0 0 '+overlay.clientWidth+' '+overlay.clientHeight);
      for(const {entry,card,path} of records){
        const box=entry.tag.userData.screenBounds;
        const show=visible&&domOverlay&&entry.tag.visible&&box;
        card.hidden=!show;path.style.display=show?'':'none';
        if(!show)continue;
        card.style.left=box.left+'px';card.style.top=box.top+'px';card.style.width=box.width+'px';card.style.height=box.height+'px';
        entry.mesh.localToWorld(entry.localBounds.getCenter(point));point.project(camera);
        const x=(point.x+1)*overlay.clientWidth/2,y=(1-point.y)*overlay.clientHeight/2;
        const endX=Math.max(box.left,Math.min(box.right,x)),endY=Math.max(box.top,Math.min(box.bottom,y));
        path.setAttribute('d','M'+x+','+y+' L'+endX+','+endY);
        // Other cards already measured the same projected bounds; only the renderer changes.
        entry.tag.visible=false;
      }
    },
    dispose(){layer.remove();}
  };
}

import * as THREE from 'three';
import { rigidAnchorPose } from './anchor-tracking.js';

/** Render only native detected polygons; placement remains governed by hit test + anchors. */
export function createARPlaneMap(scene) {
  const group=new THREE.Group();group.name='Mapa de planos AR';group.visible=false;scene.add(group);
  const records=new Map(), material=new THREE.LineBasicMaterial({color:0x69e8f4,transparent:true,opacity:.35,depthWrite:false});
  function remove(plane){const record=records.get(plane);record.mesh.geometry.dispose();record.mesh.removeFromParent();records.delete(plane);}
  function geometry(polygon) {
    if(!polygon || polygon.length<3 || polygon.length>256)return null;
    const points=Array.from(polygon);
    if(!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z)))return null;
    const contour=points.map(p=>new THREE.Vector2(p.x,p.z));
    const faces=THREE.ShapeUtils.triangulateShape(contour,[]);
    const vertices=[];
    // Subdivide native triangles to show a fine surface mesh without crossing polygon boundaries.
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
    const p=new THREE.Vector3(),q=new THREE.Vector3();
    const line=(u,v)=>{vertices.push(u.x,u.y+.002,u.z,v.x,v.y+.002,v.z);};
    for(const face of faces){
      a.copy(points[face[0]]);b.copy(points[face[1]]);c.copy(points[face[2]]);
      const divisions=Math.min(18,Math.max(2,Math.ceil(Math.max(a.distanceTo(b),b.distanceTo(c),c.distanceTo(a))/.18)));
      for(let i=0;i<=divisions;i++){
        const t=i/divisions;
        line(p.copy(a).lerp(b,t),q.copy(a).lerp(c,t));
        line(p.copy(b).lerp(a,t),q.copy(b).lerp(c,t));
        line(p.copy(c).lerp(a,t),q.copy(c).lerp(b,t));
      }
    }
    return new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  }
  return {
    update(frame,reference,scanning) {
      group.visible=!!scanning;
      if(!scanning)return;
      let detected;
      try{detected=frame.detectedPlanes;}catch{return;}
      if(!detected)return;
      const selected=new Set(Array.from(detected).slice(0,24));
      for(const plane of records.keys())if(!selected.has(plane))remove(plane);
      for(const plane of selected){
        try{
          const pose=frame.getPose(plane.planeSpace,reference);
          if(!pose || pose.emulatedPosition || !rigidAnchorPose(pose.transform.matrix)){
            if(records.has(plane))records.get(plane).mesh.visible=false;
            continue;
          }
          let record=records.get(plane);
          if(!record || record.changed!==plane.lastChangedTime){
            const next=geometry(plane.polygon);if(!next)continue;
            if(record)record.mesh.geometry.dispose();
            else{const mesh=new THREE.LineSegments(next,material);mesh.matrixAutoUpdate=false;group.add(mesh);record={mesh};records.set(plane,record);}
            record.mesh.geometry=next;record.changed=plane.lastChangedTime;
          }
          record.mesh.visible=true;record.mesh.matrix.fromArray(pose.transform.matrix);
        }catch{if(records.has(plane))records.get(plane).mesh.visible=false;}
      }
      group.userData.planes=records.size;
    },
    clear(){for(const plane of [...records.keys()])remove(plane);group.visible=false;group.userData.planes=0;},
    dispose(){this.clear();group.removeFromParent();material.dispose();}
  };
}

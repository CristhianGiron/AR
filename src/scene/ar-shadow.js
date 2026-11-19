import * as THREE from 'three';

/** A transparent receiver in anchor space; model rotation cannot tilt the real surface. */
export function createARShadow(renderer, placement, entries) {
  const saved={enabled:renderer.shadowMap.enabled,type:renderer.shadowMap.type,autoUpdate:renderer.shadowMap.autoUpdate};
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=true;
  for(const entry of entries)entry.mesh.traverse(node=>{if(node.isMesh)node.castShadow=true;});
  const geometry=new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2);
  const material=new THREE.ShadowMaterial({color:0x15202d,opacity:.42,depthWrite:false,side:THREE.DoubleSide});
  const receiver=new THREE.Mesh(geometry,material);
  receiver.name='Sombra sobre superficie AR';receiver.position.y=.001;receiver.receiveShadow=true;
  // The receiver draws only the shadow; it never draws an opaque virtual floor.
  placement.add(receiver);
  const light=new THREE.DirectionalLight(0xffffff,2);
  light.name='Luz para sombra AR';light.position.set(.35,1.8,.35);light.castShadow=true;
  light.shadow.mapSize.set(512,512);light.shadow.bias=-.0002;light.shadow.normalBias=.002;
  Object.assign(light.shadow.camera,{left:-.9,right:.9,top:.9,bottom:-.9,near:.05,far:4});
  light.shadow.camera.updateProjectionMatrix();
  placement.add(light,light.target);
  return {
    receiver,
    dispose(){
      receiver.removeFromParent();geometry.dispose();material.dispose();
      light.removeFromParent();light.target.removeFromParent();light.dispose();
      Object.assign(renderer.shadowMap,saved);
    }
  };
}

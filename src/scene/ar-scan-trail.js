import * as THREE from 'three';
import { horizontalSurface } from './surface-pose.js';

const LIMIT = 48, LIFETIME = 7000, SIZE = .24, CELLS = 4;
/** Bounded visualization of sampled hits, not a reconstruction of unobserved surfaces. */
export function createARScanTrail(scene) {
  const patch = new THREE.PlaneGeometry(SIZE,SIZE,CELLS,CELLS).rotateX(-Math.PI/2);
  const wire = new THREE.WireframeGeometry(patch); patch.dispose();
  const template = wire.getAttribute('position').array.slice(); wire.dispose();
  const vertices = template.length/3, positions = new Float32Array(template.length*LIMIT), born = new Float32Array(vertices*LIMIT);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('born',new THREE.BufferAttribute(born,1).setUsage(THREE.DynamicDrawUsage));
  geometry.setDrawRange(0,0);
  const material = new THREE.ShaderMaterial({
    uniforms:{time:{value:0}},
    vertexShader:'attribute float born; varying float age; uniform float time; void main(){ age=time-born; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'varying float age; void main(){ float fade=1.0-smoothstep(1.5,7.0,age); gl_FragColor=vec4(0.28,0.9,1.0,0.48*fade); }',
    transparent:true,depthTest:true,depthWrite:false
  });
  const mesh = new THREE.LineSegments(geometry,material);
  mesh.name='Rastro de escaneo AR'; mesh.frustumCulled=false; mesh.visible=false; scene.add(mesh);
  const samples = [], point = new THREE.Vector3(), matrix = new THREE.Matrix4();
  function rebuild() {
    samples.forEach((sample,index)=>{
      matrix.fromArray(sample.matrix);
      for(let v=0;v<vertices;v++){
        point.fromArray(template,v*3); point.y+=.002; point.applyMatrix4(matrix);
        point.toArray(positions,index*template.length+v*3);
        born[index*vertices+v]=sample.time/1000;
      }
    });
    geometry.attributes.position.needsUpdate=true; geometry.attributes.born.needsUpdate=true;
    geometry.setDrawRange(0,samples.length*vertices);
    mesh.userData.samples=samples.length;
  }
  return {
    mesh,
    sample(transform,time) {
      if(!horizontalSurface(transform)||!Number.isFinite(time))return;
      const nearby=samples.find(sample=>{
        const m=sample.matrix;
        return Math.hypot(m[12]-transform[12],m[13]-transform[13],m[14]-transform[14])<.08
          && m[4]*transform[4]+m[5]*transform[5]+m[6]*transform[6]>.985;
      });
      // Revisit the measured patch without changing older samples into a new plane.
      if(nearby){if(time-nearby.time<350)return;nearby.time=time;nearby.matrix=Array.from(transform);}
      else {if(samples.length===LIMIT)samples.shift();samples.push({matrix:Array.from(transform),time});}
      rebuild();
    },
    update(time,scanning) {
      const count=samples.length;
      for(let i=samples.length-1;i>=0;i--)if(time-samples[i].time>LIFETIME)samples.splice(i,1);
      if(samples.length!==count)rebuild();
      material.uniforms.time.value=time/1000;
      mesh.visible=!!scanning&&samples.length>0;
    },
    clear(){samples.length=0;rebuild();mesh.visible=false;},
    dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();}
  };
}

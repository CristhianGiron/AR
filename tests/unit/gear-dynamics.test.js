import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_GEAR_DESIGN, gearFaceRelief } from '../../src/education/gear-design.js';
import { DEFAULT_DRIVE, validateDrive, dynamicsModel, advanceDrive, forceReadings, actualRPM } from '../../src/education/gear-dynamics.js';
import { gearPhysicalProperties, polygonProperties, STANDARD_GRAVITY } from '../../src/education/gear-physical.js';
import { validateGearState } from '../../src/education/gear-model.js';
import { validateProject } from '../../src/storage/project-format.js';
const drive = { ...DEFAULT_DRIVE, enabled: true };
const design = DEFAULT_GEAR_DESIGN;
const near = (a,b,tol=1e-9) => assert.ok(Math.abs(a-b)<tol, a+' ≈ '+b);
test('real design dimensions set force lever arms and ideal torque multiplication', () => {
  const m = dynamicsModel(design, drive);
  near(m.radius1,.025); near(m.radius2,.05); near(m.applied,.25); near(m.available,.5); near(m.ratio,2);
  const changed = dynamicsModel({...design,teeth:[40,20]},drive);
  near(changed.radius1,.05);near(changed.applied,.5);near(changed.available,.25);near(changed.ratio,.5);
  near(m.inertia,m.inertia1+m.inertia2/4);
});
test('force advances actual angular velocity and angle rather than multiplying a fixed RPM', () => {
  const model = dynamicsModel(design,drive), step=advanceDrive(design,drive,0,.1);
  near(step.omega,model.net/model.damping*(1-Math.exp(-model.damping*.1/model.inertia)));
  assert.ok(step.omega>0&&step.angle>0);
  assert.ok(advanceDrive(design,{...drive,force:20},0,.1).omega>step.omega);
  assert.ok(advanceDrive({...design,width:20},drive,0,.1).omega<step.omega);
  const a=advanceDrive(design,drive,0,.05),b=advanceDrive(design,drive,a.omega,.05);
  near(b.omega,step.omega);near(a.angle+b.angle,step.angle);
});
test('load reflects through the tooth ratio, brakes to rest and cannot spontaneously reverse', () => {
  const brake={...drive,force:1};
  const stopped=advanceDrive(design,brake,0,.1);near(stopped.omega,0);near(stopped.angle,0);
  let w=1,angle=0;
  for(let i=0;i<20;i++){const s=advanceDrive(design,brake,w,.1);assert.ok(s.omega>=0&&s.omega<=w);w=s.omega;angle+=s.angle;}
  near(w,0);assert.ok(angle>0);
  const balanced=advanceDrive(design,{...drive,force:4},0,.1);near(balanced.omega,0);
});
test('friction decays speed without force and the declared teaching cap is stable', () => {
  const coast=advanceDrive(design,{...drive,force:0},5,.001);assert.ok(coast.omega>0&&coast.omega<5);
  const strong={...drive,force:100};let w=0;
  for(let i=0;i<100;i++)w=advanceDrive(design,strong,w,.1).omega;
  near(w,240*Math.PI/30);const capped=advanceDrive(design,strong,w,.1);near(capped.angle,w*.1);assert.equal(capped.limited,true);
});
test('transmitted output torque satisfies load plus output inertia; static reaction is bounded', () => {
  const mechanism={design,motion:{omega:2},state:{drive:{...drive},running:true,separation:0,isolated:null,rpm:12}};
  const r=forceReadings(mechanism);near(r.torque2,r.load+r.inertia2*r.acceleration/r.ratio);near(r.force2,r.torque2/r.radius2);
  near(actualRPM(mechanism),2*30/Math.PI);
  mechanism.state.drive.force=1;mechanism.motion.omega=0;const stall=forceReadings(mechanism);assert.equal(stall.stalled,true);near(stall.torque2,stall.available);
  mechanism.state.separation=.5;near(forceReadings(mechanism).torque2,0);near(actualRPM(mechanism),0);
  mechanism.state.separation=0;mechanism.state.running=false;near(forceReadings(mechanism).torque2,0);
});
test('force config validates units/ranges and saves without runtime velocity', () => {
  assert.deepEqual(validateDrive(drive),drive);
  for(const patch of [{force:-1},{force:Infinity},{force:101},{version:3},{force:NaN},{enabled:'yes'}])assert.throws(()=>validateDrive({...drive,...patch}));
  const state={angle:0,rpm:12,direction:1,separation:0,offsets:[0,0],isolated:null,drive,design,motion:{omega:99}};
  const cleaned=validateGearState(state);assert.deepEqual(cleaned.drive,drive);assert.equal(cleaned.motion,undefined);
  const p={format:'explorar-project',version:1,name:'Fuerza',assets:[],entries:[{source:{catalog:'engranajes-rectos'},gearState:state,name:'Rectos',color:'#ffffff',position:[0,0,0],rotation:[0,0,0],size:1,height:2}],view:{x:0,y:0,zoom:1},answers:[]};
  assert.deepEqual(validateProject(p,new Set(['engranajes-rectos'])).entries[0].gearState.drive,drive);
  delete p.entries[0].gearState.design;
  assert.deepEqual(validateProject(p,new Set(['engranajes-rectos'])).entries[0].gearState.drive,drive,'original rectos can save force without replacing their mesh');
  p.entries[0].source.catalog='engranajes-conicos';assert.throws(()=>validateProject(p,new Set(['engranajes-conicos'])));
});

test('geometry derives mass, weight and polar inertia with correct physical scaling', () => {
  const square = polygonProperties([[-1,-1],[1,-1],[1,1],[-1,1]]);
  near(square.area,4); near(square.polarMoment,8/3);
  assert.deepEqual(polygonProperties([[1,-1],[-1,-1],[-1,1],[1,1]]), square);
  const physical=gearPhysicalProperties(design), [small,big]=physical.parts;
  near(small.pitchRadius,.025);near(small.outerRadius,.0275);
  assert.ok(big.mass>small.mass && big.inertia>small.inertia);
  near(small.mass,small.volume*7850);near(small.weight,small.mass*STANDARD_GRAVITY);
  const thick=gearPhysicalProperties({...design,width:20}).parts[0];
  near(thick.mass,small.mass*2);near(thick.inertia,small.inertia*2);
  const scaled=gearPhysicalProperties({...design,module:5,width:20,bore:8}).parts[0];
  near(scaled.mass,small.mass*8);near(scaled.inertia,small.inertia*32);
  const solid=gearPhysicalProperties({...design,bore:0}).parts[0], radius=design.bore/2000;
  near(solid.mass-small.mass,7850*Math.PI*radius**2*(.01-2*gearFaceRelief(20,2.5,10,4).depth/1000));
  near(solid.inertia-small.inertia,7850*Math.PI*radius**4*(.01-2*gearFaceRelief(20,2.5,10,4).depth/1000)/2);
  assert.equal(gearPhysicalProperties(design),physical);
  assert.throws(()=>gearPhysicalProperties({...design,width:0}));
});
test('legacy scenes migrate to force-only configuration and geometric properties', () => {
  const legacy={version:1,enabled:true,force:12,load:1,mass1:2,mass2:4,damping:.1};
  assert.deepEqual(validateDrive(legacy),{version:2,enabled:true,force:12});
  for(const patch of [{mass1:0},{load:21},{damping:0}])assert.throws(()=>validateDrive({...legacy,...patch}));
});

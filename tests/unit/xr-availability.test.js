import test from 'node:test';
import assert from 'node:assert/strict';
import {xrFailure,XR_UNAVAILABLE,spatialPolicyAllowed} from '../../src/scene/xr-availability.js';
test('native no-runtime error is translated without blaming the hosting provider',()=>{
 assert.equal(xrFailure({name:'NotSupportedError'}),XR_UNAVAILABLE);
 assert.equal(xrFailure({name:'Error',message:'Could not create a session because: No runtimes supported the requested configuration'}),XR_UNAVAILABLE);
 assert.ok(!XR_UNAVAILABLE.includes('Netlify'));
});
test('permission failures and cancellation have distinct next steps',()=>{
 assert.ok(xrFailure({name:'SecurityError'}).includes('pestaña'));
 assert.ok(xrFailure({name:'NotAllowedError'}).includes('permisos'));
 assert.ok(xrFailure({name:'AbortError'}).includes('cancelada'));
});
test('page policy blocks spatial tracking but unknown policy API does not imply unavailable runtime',()=>{
 assert.equal(spatialPolicyAllowed({featurePolicy:{features:()=>['xr-spatial-tracking'],allowsFeature:()=>false}}),false);
 assert.equal(spatialPolicyAllowed({}),true);
 assert.equal(spatialPolicyAllowed({featurePolicy:{features:()=>['camera'],allowsFeature:()=>false}}),true);
});

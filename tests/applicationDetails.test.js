import test from 'node:test'
import assert from 'node:assert/strict'
import { createApplicationDetails, keyMetadata, connectionMessage } from '../src/lib/applicationDetails.js'
const idle = { connected: false, has_received: false, last_seen_at: null, span_count: 0 }
const keys = Array.from({length:3},(_,i)=>({id:`key-${i}`,key_prefix:`to_live_TEST000${i}`,created_at:'2026-11-25T10:00:00Z',last_used_at:null,revoked_at:null}))
const tick = () => new Promise(resolve=>setImmediate(resolve))

test('recent database activity is explicitly distinct from HTTP activity and availability', () => {
  const details = { status: { ...idle, database_active: true }, keysLoaded: true, activeCount: 1 }
  assert.match(connectionMessage(details), /HTTP telemetry inactive.*database telemetry/)
  details.status = { ...details.status, has_received: true }
  assert.match(connectionMessage(details), /HTTP telemetry inactive/)
  details.status = { ...details.status, connected: true }
  assert.match(connectionMessage(details), /Connected.*HTTP server spans/)
  assert.ok(!connectionMessage(details).includes('available'))
})

test('three existing active keys remain visible when the same project is reselected',async()=>{
  const calls=[]
  const store=createApplicationDetails({request:async(path,options)=>{calls.push({path,options});return path.endsWith('/keys')?{keys,active_count:3}:idle}})
  store.selectProject('mafaconnect');await tick()
  store.selectProject('mafaconnect');await tick()
  assert.equal(store.getSnapshot().activeCount,3)
  assert.equal(store.getSnapshot().keys.length,3)
  assert.equal(calls.length,2)
  assert.ok(calls.every(call=>call.path.startsWith('/projects/mafaconnect/')&&!call.options.method))
  assert.match(connectionMessage(store.getSnapshot()),/Waiting for telemetry/)
  assert.ok(!connectionMessage(store.getSnapshot()).includes('generate a key'))
})

test('a late key or status response from another project cannot replace the selection',async()=>{
  const pending={}
  const store=createApplicationDetails({request:async path=>{
    if(path.includes('/old/'))return new Promise(resolve=>{pending[path]=resolve})
    return path.endsWith('/keys')?{keys:[],active_count:0}:idle
  }})
  store.selectProject('old');store.selectProject('new');await tick()
  pending['/projects/old/keys']({keys,active_count:3})
  pending['/projects/old/status']({...idle,connected:true,span_count:10})
  await tick()
  assert.equal(store.getSnapshot().projectId,'new')
  assert.equal(store.getSnapshot().activeCount,0)
  assert.equal(store.getSnapshot().status.span_count,0)
})

test('metadata failure and truncated old responses are unknown, never no-active-keys',async()=>{
  const store=createApplicationDetails({request:async path=>{if(path.endsWith('/keys'))throw new Error('metadata failed');return idle}})
  store.selectProject('mafa');await tick()
  assert.equal(store.getSnapshot().activeCount,null)
  assert.match(connectionMessage(store.getSnapshot()),/unavailable/)
  const old=keyMetadata({keys:Array.from({length:50},(_,i)=>({...keys[0],id:String(i),revoked_at:'2026-11-24T00:00:00Z'}))})
  assert.equal(old.activeCount,null)
  assert.match(connectionMessage({...store.getSnapshot(),...old,keysError:''}),/unavailable/)
})

test('metadata refresh is read-only and strips hashes and old secrets',async()=>{
  const store=createApplicationDetails({request:async path=>path.endsWith('/keys')?{keys:[{...keys[0],key_hash:'PRIVATE_HASH',secret:'OLD_SECRET'}],active_count:1}:idle})
  store.selectProject('mafa');await tick();await store.refreshKeys()
  assert.equal(store.getSnapshot().activeCount,1)
  assert.ok(!JSON.stringify(store.getSnapshot()).includes('PRIVATE_HASH'))
  assert.ok(!JSON.stringify(store.getSnapshot()).includes('OLD_SECRET'))
})

test('zero-span successful status is not a connection; status failure does not fabricate zero',async()=>{
  let fail=false
  const store=createApplicationDetails({request:async path=>{
    if(path.endsWith('/keys'))return {keys,active_count:3}
    if(fail)throw new Error('status failed')
    return idle
  }})
  store.selectProject('mafa');await tick()
  assert.match(connectionMessage(store.getSnapshot()),/Waiting/)
  fail=true;await store.refreshStatus()
  assert.equal(store.getSnapshot().status,null)
  assert.match(connectionMessage(store.getSnapshot()),/Connection error/)
})

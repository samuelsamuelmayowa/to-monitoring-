import test from 'node:test'
import assert from 'node:assert/strict'
import { databaseName, databaseOutcome, requestEvidence, timelinePositions } from '../src/lib/databaseInsights.js'
const request={span_kind:'SERVER',http_method:'GET',trace_id:'a',started_at:'2026-11-28T00:00:00.010Z',duration_ms:50}
const db=(patch={})=>({span_kind:'CLIENT',db_system:'mysql',db_operation:'SELECT',trace_id:'a',started_at:'2026-11-28T00:00:00.000Z',duration_ms:500,...patch})
test('threshold strictly exceeds latency, counts relevant correlated CLIENT database spans only',()=>{
 const spans=[request,db(),db({duration_ms:501}),db({trace_id:'startup'}),db({span_kind:'INTERNAL'}),db({db_system:null})]
 const e=requestEvidence(spans,request,500,2)
 assert.equal(e.count,2);assert.equal(e.slow,1);assert.equal(e.warning,true)
 assert.equal(requestEvidence([],request).slowest,null)
})
test('unknown outcomes and strict safe error categories never expose raw error strings',()=>{
 assert.equal(databaseOutcome(db()),'Unknown')
 assert.equal(databaseOutcome(db({span_error:true,error_type:'ETIMEDOUT'})),'Failed · timeout')
 assert.equal(databaseOutcome(db({span_error:true,error_type:'ECONNREFUSED'})),'Failed · connection failure')
 assert.equal(databaseOutcome(db({span_error:true,error_type:'SECRET SQL'})),'Failed · database operation failure')
 assert.equal(databaseName(db({db_operation:'SELECT private'})),'MySQL query')
 assert.equal(databaseName(db()),'MySQL SELECT')
})
test('actual timestamp geometry retains overlap and calls outside HTTP window without clipping',()=>{
 const rows=timelinePositions([request,db({duration_ms:100}),db({started_at:request.started_at,duration_ms:20})])
 assert.equal(rows[1].left,0);assert.equal(rows[1].width,100);assert.equal(rows[0].left,10);assert.equal(rows[2].left,10)
 assert.deepEqual(timelinePositions([{}]),[])
})

const {policy}=require('./lib/policy');
const {zipState,office,destination}=require('./lib/zip-state');
const {callBuyers}=require('./lib/call-buyers');
exports.handler=async(event)=>{
 const zip=event.queryStringParameters?.zip;
 const state=zip?await zipState(zip):'';
 const at=new Date();
 const p=policy();
 return {statusCode:200,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify({...p,buyers:callBuyers(state,at),zip:zip||'',state,office:office(state,at),routing_destination:destination(state,at),office_hours:'Monday–Friday, 9 AM–4 PM Central'})};
};

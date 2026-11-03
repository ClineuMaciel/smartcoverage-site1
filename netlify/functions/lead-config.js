const {policy}=require('./lib/policy');
const {zipState,office,destination}=require('./lib/zip-state');
exports.handler=async(event)=>{const zip=event.queryStringParameters?.zip;const state=zip?await zipState(zip):'';return {statusCode:200,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify({...policy(),zip:zip||'',state,office:office(state),routing_destination:destination(state),office_hours:"Monday–Friday, 9 AM–4 PM Central"})};};


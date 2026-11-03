const {policy}=require('./lib/policy');
const {zipState,office}=require('./lib/zip-state');
exports.handler=async(event)=>{const zip=event.queryStringParameters?.zip;const state=zip?await zipState(zip):'';return {statusCode:200,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify({...policy(),zip:zip||'',state,office:office(state)})};};

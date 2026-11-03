// External lookup returns a state, not eligibility or a verified street address.
async function zipState(zip,fetcher=fetch){
 if(!/^\d{5}$/.test(String(zip||'')))return '';
 try{const res=await fetcher('https://api.zippopotam.us/us/'+zip,{signal:AbortSignal.timeout(4000)});if(!res.ok)return '';const data=await res.json();const states=[...new Set((data.places||[]).map(p=>p['state abbreviation']).filter(Boolean))];return states.length===1&&/^[A-Z]{2}$/.test(states[0])?states[0]:'';}catch{return '';}
}
function office(state){return ['TN','MS'].includes(state)?{id:'office',name:'Premier Seguranza',phone:'+19012665507',state}:null;}
module.exports={zipState,office};

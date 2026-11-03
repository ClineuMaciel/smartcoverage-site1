// External lookup returns a state, not eligibility or a verified street address.
async function zipState(zip,fetcher=fetch){
 if(!/^\d{5}$/.test(String(zip||'')))return '';
 try{const res=await fetcher('https://api.zippopotam.us/us/'+zip,{signal:AbortSignal.timeout(4000)});if(!res.ok)return '';const data=await res.json();const states=[...new Set((data.places||[]).map(p=>p['state abbreviation']).filter(Boolean))];return states.length===1&&/^[A-Z]{2}$/.test(states[0])?states[0]:'';}catch{return '';}
}
function officeOpen(at=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(at).map(p=>[p.type,p.value]));
 return ['Mon','Tue','Wed','Thu','Fri'].includes(parts.weekday)&&Number(parts.hour)>=9&&Number(parts.hour)<16;
}
function office(state,at=new Date()){return ['TN','MS'].includes(state)&&officeOpen(at)?{id:'office',name:'Premier Seguranza',phone:'+19012665507',state,hours:'Monday–Friday, 9 AM–4 PM Central',valid_until:new Date(Math.floor(at.getTime()/60000)*60000+60000).toISOString()}:null;}
function destination(state,at=new Date()){return office(state,at)?'office':state?'buyer_queue':'state_lookup_pending';}
module.exports={zipState,office,officeOpen,destination};

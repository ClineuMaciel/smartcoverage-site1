const {google}=require('googleapis');
const {zipState,office,destination}=require('./lib/zip-state');
const {randomUUID,createHash}=require('node:crypto');
const {policy,buyers,validate,normEmail,normPhone,certificate}=require('./lib/policy');
const reply=(statusCode,data)=>({statusCode,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(data)});
const columns=['lead_id','received_at_utc','submission_id','email','phone','first_name','last_name','zip','coverage_type','status','server_ip','server_user_agent','source_url','referrer','consent_version','consent_sha256','consent_text','consent_checked','client_consent_at','form_started_at','vehicle_year','vehicle_make','vehicle_model','home_type','home_ownership','traffic_json','trustedform_url','certificate_verification','jornaya_lead_id','buyer_names_json','payload_sha256','delivery_gate','zip_lookup_state','office_route','routing_destination'];
async function ensure(sheets,id,title,headers){try{await sheets.spreadsheets.batchUpdate({spreadsheetId:id,requestBody:{requests:[{addSheet:{properties:{title}}}]}});}catch(e){if(!/already exists/i.test(String(e.message)))throw e;}const range=`'${title}'!A1:AI1`;const got=await sheets.spreadsheets.values.get({spreadsheetId:id,range});if(!got.data.values?.length)await sheets.spreadsheets.values.update({spreadsheetId:id,range,valueInputOption:'RAW',requestBody:{values:[headers]}});else {const current=got.data.values[0];if(current.some((h,i)=>h!==headers[i]))throw Error('Evidence sheet header mismatch');if(current.length<headers.length)await sheets.spreadsheets.values.update({spreadsheetId:id,range,valueInputOption:'RAW',requestBody:{values:[headers]}});}}
exports.handler=async(event)=>{
 if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Method Not Allowed'});
 if(Buffer.byteLength(event.body||'')>32000)return reply(413,{ok:false,error:'Request too large'});
 let b;try{b=JSON.parse(event.body||'{}');}catch{return reply(400,{ok:false,error:'Invalid JSON'});}
 if(!b||typeof b!=='object'||Array.isArray(b))return reply(400,{ok:false,error:'Invalid request'});
 const p=policy();let error;try{error=validate(b,p);}catch{error='Invalid field types';}if(error)return reply(400,{ok:false,error});
 try{
 const id=process.env.GOOGLE_SHEETS_ID;const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL||process.env.GOOGLE_CLIENT_EMAIL;const key=(process.env.GOOGLE_PRIVATE_KEY||'').replace(/\\n/g,'\n');if(!id||!email||!key)return reply(503,{ok:false,error:'Lead storage is not configured'});
 const sheets=google.sheets({version:'v4',auth:new google.auth.JWT({email,key,scopes:['https://www.googleapis.com/auth/spreadsheets']})});
 await ensure(sheets,id,'LeadEvidence',columns);await ensure(sheets,id,'BuyerDeliveries',['lead_id','attempted_at_utc','buyer','mode','result','http_status','response_sha256']);
 const opt=await sheets.spreadsheets.values.get({spreadsheetId:id,range:'OptOuts!A:C'});
 const em=normEmail(b.email),ph=normPhone(b.phone);const blocked=(opt.data.values||[]).some(r=>(em&&em===normEmail(r[1]))||(ph&&ph===normPhone(r[2])));
 const test=['testlead','example','maciel777'].some(t=>em.includes(t))||/\btest\b|do not contact/i.test(b.first_name+' '+b.last_name);
 const prior=await sheets.spreadsheets.values.get({spreadsheetId:id,range:'LeadEvidence!A2:AF'});const now=new Date().toISOString();
 const previous=(prior.data.values||[]).find(r=>r[2]===b.submission_id||((r[3]===em||normPhone(r[4])===ph)&&r[8]===b.coverage_type&&Date.now()-Date.parse(r[1])<24*3600000));
 if(previous)return reply(200,{ok:true,status:blocked?'blocked':'duplicate',lead_id:previous[0],message:blocked?'Your contact is on the opt-out list. No new request was sent.':'A matching request was already recorded. No new buyer delivery was attempted.'});
 const leadId=randomUUID(),status=blocked?'blocked':test?'test':'accepted';const headers=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
 const ip=headers['x-nf-client-connection-ip']||'';const ua=headers['user-agent']||'';const cert=certificate(b.trustedform_url);const allowed=buyers().filter(x=>b.coverage_type==='bundle'||x.id===b.coverage_type);
 const state=await zipState(b.zip);const routedAt=new Date();const route=destination(state,routedAt);
 const gate=blocked?'opt_out':test?'test':route==='office'?'office_hours':!allowed.length?'no_approved_buyer':'review_required';
 const traffic=Object.fromEntries(['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','ttclid'].map(k=>[k,String(b[k]||'').slice(0,500)]));
 const payload={lead_id:leadId,vertical:b.coverage_type,contact:{first_name:b.first_name,last_name:b.last_name,email:em,phone:ph},address:{postal_code:b.zip,country:'US'},vehicle:{year:b.vehicle_year||'',make:b.vehicle_make||'',model:b.vehicle_model||''},property:{home_type:b.home_type||'',ownership:b.home_ownership||''},tcpa:{consent_text:p.text,consent_version:p.version,consent_sha256:p.hash,consent_timestamp:now,ip_address:ip,user_agent:ua,consent_url:b.source_url,consent_checked:true,trustedform_url:cert,certificate_verification:'not_verified',jornaya_lead_id:b.jornaya_lead_id||''},traffic,compliance_flags:{is_opted_out:blocked,is_test:test}};
 const hash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
 const evidence=[leadId,now,b.submission_id,em,ph,b.first_name,b.last_name,b.zip,b.coverage_type,status,ip,ua,b.source_url||'',b.referrer||'',p.version,p.hash,p.text,true,b.client_consent_at||'',b.form_started_at||'',b.vehicle_year||'',b.vehicle_make||'',b.vehicle_model||'',b.home_type||'',b.home_ownership||'',JSON.stringify(traffic),cert,'not_verified',b.jornaya_lead_id||'',JSON.stringify(allowed.map(x=>x.name)),hash,gate,state,office(state,routedAt)?.phone||'',blocked?'suppressed':test?'test':route];
 await sheets.spreadsheets.values.append({spreadsheetId:id,range:'LeadEvidence!A:AI',valueInputOption:'RAW',insertDataOption:'INSERT_ROWS',requestBody:{values:[evidence]}});
 // Keep existing A:J integration compatible. LeadEvidence is the authoritative new evidence record.
 await sheets.spreadsheets.values.append({spreadsheetId:id,range:'Leads!A:J',valueInputOption:'RAW',insertDataOption:'INSERT_ROWS',requestBody:{values:[[now,em,ph,b.first_name,b.last_name,b.zip,b.coverage_type,b.source_url||'',p.text,status]]}});
 // Until a buyer-specific verification adapter is installed, do not dispatch unverified evidence.
 // A URL supplied by a visitor is not proof that a certificate is valid, retained or matched.
 for(const buyer of allowed){await sheets.spreadsheets.values.append({spreadsheetId:id,range:'BuyerDeliveries!A:G',valueInputOption:'RAW',requestBody:{values:[[leadId,now,buyer.name,process.env.BUYER_SEND_MODE||'dry-run',gate==='review_required'?'held_for_buyer_verification':gate,'','']]}});}
 return reply(200,{ok:true,status,lead_id:leadId,message:blocked?'Your request was recorded as opted out. It will not be sent to buyers.':test?'Test request saved. It will not be sent to buyers.':route==='office'?'Your request was saved for the TN/MS office route. You can call (901) 266-5507 during office hours.':route==='state_lookup_pending'?'Your request was saved. State lookup is pending; no buyer has been contacted.':'Your request was saved in the buyer queue. Delivery is pending buyer approval and verification; no buyer has been contacted.'});
 }catch(e){console.error('LEAD_STORAGE_ERROR',{code:e.code||'unknown'});return reply(503,{ok:false,error:'We could not finish saving your request. Please contact support before retrying.'});}
};


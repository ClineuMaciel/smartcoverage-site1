const {google}=require('googleapis');
const {randomUUID,createHash}=require('node:crypto');
const {normPhone}=require('./lib/policy');
const {zipState,office}=require('./lib/zip-state');
const columns=require('./lib/evidence-headers.json');
const VERSION='2026-11-04.callback.1';
const TEXT='I ask SearchNRate, or Premier Seguranza for Tennessee/Mississippi requests, to call the number I provide about this insurance request. This does not authorize marketing calls or texts from other companies. I agree to the Privacy Policy.';
const reply=(statusCode,data)=>({statusCode,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(data)});
const string=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const clientTime=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():'';
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Method Not Allowed'});
 if(Buffer.byteLength(event.body||'')>10000)return reply(413,{ok:false,error:'Request too large'});
 let b;try{b=JSON.parse(event.body||'{}');}catch{return reply(400,{ok:false,error:'Invalid JSON'});}
 if(!b||typeof b!=='object'||Array.isArray(b)||b.hp_field)return reply(400,{ok:false,error:'Unable to accept this request'});
 const name=string(b.name,120),phone=normPhone(b.phone),zip=string(b.zip,10),needs=string(b.needs,1000),submission=string(b.submission_id,80);
 if(!name||phone.length!==10||!/^\d{5}$/.test(zip)||!needs||!['auto','home','bundle'].includes(b.coverage_type)||!/^[a-zA-Z0-9-]{16,80}$/.test(submission))return reply(400,{ok:false,error:'Enter your name, ten-digit phone number, ZIP code, and insurance needs'});
 if(b.consent!==true||b.consent_version!==VERSION)return reply(400,{ok:false,error:'Please agree to the callback permission shown on this form'});
 try{
 const id=process.env.GOOGLE_SHEETS_ID,email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL||process.env.GOOGLE_CLIENT_EMAIL,key=(process.env.GOOGLE_PRIVATE_KEY||'').replace(/\\n/g,'\n');
 if(!id||!email||!key)return reply(503,{ok:false,error:'Callback storage is not configured'});
 const sheets=google.sheets({version:'v4',auth:new google.auth.JWT({email,key,scopes:['https://www.googleapis.com/auth/spreadsheets']})});
 try{await sheets.spreadsheets.batchUpdate({spreadsheetId:id,requestBody:{requests:[{addSheet:{properties:{title:'LeadEvidence',gridProperties:{columnCount:35,rowCount:1000}}}}]}});}catch(e){if(!/already exists/i.test(String(e.message)))throw e;}
 const headers=(await sheets.spreadsheets.values.get({spreadsheetId:id,range:'LeadEvidence!A1:AI1'})).data.values?.[0]||[];
 if(headers.length&&headers.some((h,i)=>h!==columns[i]))throw Error('Evidence header mismatch');
 if(headers.length<columns.length)await sheets.spreadsheets.values.update({spreadsheetId:id,range:'LeadEvidence!A1:AI1',valueInputOption:'RAW',requestBody:{values:[columns]}});
 const [opt,prior]=await Promise.all([sheets.spreadsheets.values.get({spreadsheetId:id,range:'OptOuts!A:C'}),sheets.spreadsheets.values.get({spreadsheetId:id,range:'LeadEvidence!A2:AI'})]);
 const previous=(prior.data.values||[]).find(r=>r[2]===submission);
 if(previous)return reply(200,{ok:true,status:'duplicate',lead_id:previous[0],message:'Your callback request was already received. No additional request was created.'});
 const blocked=(opt.data.values||[]).some(r=>phone&&normPhone(r[2])===phone);
 const test=/\btest\b|testlead|example|maciel777/i.test(name+' '+needs);
 const state=await zipState(zip),now=new Date(),received=now.toISOString();
 const status=blocked?'blocked':test?'test':'accepted',leadId=randomUUID();
 const route=blocked?'suppressed':test?'test':['TN','MS'].includes(state)?(office(state,now)?'office':'office_callback'):state?'callback_review':'state_lookup_pending';
 const details={request_type:'callback',insurance_needs:needs,intent_started_at_client:clientTime(b.intent_started_at_client),call_attempt_at_client:clientTime(b.call_attempt_at_client),requested_at_client:clientTime(b.requested_at_client),callback_scope:'service_request_only',call_connection:'not_verified'};
 const names=name.split(/\s+/),first=names.shift(),last=names.join(' ');
 const incoming=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
 const hash=createHash('sha256').update(TEXT).digest('hex');
 const payloadHash=createHash('sha256').update(JSON.stringify({name,phone,zip,needs,received,details})).digest('hex');
 const row=[leadId,received,submission,'',phone,first,last,zip,b.coverage_type,status,incoming['x-nf-client-connection-ip']||'',incoming['user-agent']||'',string(b.source_url,1000),'',VERSION,hash,TEXT,true,clientTime(b.requested_at_client),'','','','','','',JSON.stringify(details),'','not_applicable','',JSON.stringify([]),payloadHash,'callback_only',state,['TN','MS'].includes(state)?'+19012665507':'',route];
 await sheets.spreadsheets.values.append({spreadsheetId:id,range:'LeadEvidence!A:AI',valueInputOption:'RAW',insertDataOption:'INSERT_ROWS',requestBody:{values:[row]}});
 return reply(200,{ok:true,status,lead_id:leadId,message:blocked?'This number is on our opt-out list. Your request was recorded, but a callback will not be scheduled.':test?'Test callback request saved. No callback will be made.':'Your callback request has been saved. We’ll review your insurance needs and respond as soon as possible. This request does not confirm a connected call or authorize sharing with buyers.'});
 }catch(e){console.error('CALLBACK_STORAGE_ERROR',{code:e.code||'storage_error'});return reply(503,{ok:false,error:'We could not confirm your callback request was saved. Please try again using this same form.'});}
};
exports.VERSION=VERSION;exports.TEXT=TEXT;

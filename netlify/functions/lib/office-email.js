const {suppressed}=require('./sales-register');
const TO='miked@premierseguranza.com';
const HEADERS=['lead_id','first_attempt_utc','status','provider_message_id','updated_utc'];
function eligible(e,optouts,start){return !!e[0]&&e[9]==='accepted'&&((['TN','MS'].includes(e[32])&&e[31]==='office_only')||(e[31]==='callback_only'&&e[14]==='2026-11-04.callback.2'))&&Date.parse(e[1])>=start&&!/testlead|example|maciel777/i.test(e[3]||'')&&!suppressed(e[3],e[4],optouts);}
function message(e,from){let details={};try{details=JSON.parse(e[25]||'{}');}catch{}
 return {from,to:[TO],subject:`SearchNRate ${e[32]} ${e[31]==='callback_only'?'callback':'quote'} — ${e[0]}`,text:[`Premier Seguranza follow-up only — do not sell this request to other buyers.`,`Lead ID: ${e[0]}`,`Received UTC: ${e[1]}`,`Name: ${e[5]} ${e[6]}`,`Phone: ${e[4]}`,`Email: ${e[3]||'(not supplied)'}`,`State / ZIP: ${e[32]} / ${e[7]}`,`Coverage: ${e[8]}`,`Vehicle: ${e.slice(20,23).filter(Boolean).join(' ')}`,`Home: ${e.slice(23,25).filter(Boolean).join(' ')}`,`Insurance needs: ${details.insurance_needs||''}`,`Permission: ${e[16]}`,`This notification is an insurance request, not proof of a connected or billable call.`].join('\n')};}
async function syncOfficeEmail(sheets,id,env=process.env,fetcher=fetch,now=new Date()){
 if(env.OFFICE_EMAIL_ENABLED!=='true')return {status:'disabled',accepted:0};
 const start=Date.parse(env.OFFICE_EMAIL_START_UTC||'');
 if(!Number.isFinite(start)||!env.RESEND_API_KEY||!/^.+@.+\..+$/.test(env.OFFICE_EMAIL_FROM||''))throw Error('Office email configuration incomplete');
 try{await sheets.spreadsheets.batchUpdate({spreadsheetId:id,requestBody:{requests:[{addSheet:{properties:{title:'OfficeNotifications'}}}]}});}catch(e){if(!/already exists/i.test(e.message))throw e;}
 const read=async range=>(await sheets.spreadsheets.values.get({spreadsheetId:id,range})).data.values||[];
 const heading=(await read('OfficeNotifications!A1:E1'))[0]||[];
 if(heading.length&&JSON.stringify(heading)!==JSON.stringify(HEADERS))throw Error('OfficeNotifications header mismatch');
 const update=async(range,values)=>sheets.spreadsheets.values.update({spreadsheetId:id,range,valueInputOption:'RAW',requestBody:{values}});
 if(!heading.length)await update('OfficeNotifications!A1:E1',[HEADERS]);
 const [evidence,optouts,ledger]=await Promise.all([read('LeadEvidence!A2:AI'),read('OptOuts!A2:C'),read('OfficeNotifications!A2:E')]);
 const indexed=new Map();for(let i=0;i<ledger.length;i++){if(indexed.has(ledger[i][0]))throw Error('Duplicate office notification ID');indexed.set(ledger[i][0],{row:i+2,value:ledger[i]});}
 let accepted=0,attempted=0;
 for(const e of evidence){if(!eligible(e,optouts,start))continue;const prior=indexed.get(e[0]);if(prior)continue;
 // One attempt per lead. An ambiguous network result requires manual provider reconciliation,
 // never a blind resend. Only this scheduled worker writes this ledger.
 if(attempted++>=10)break;const stamp=now.toISOString();
 await sheets.spreadsheets.values.append({spreadsheetId:id,range:'OfficeNotifications!A:E',valueInputOption:'RAW',insertDataOption:'INSERT_ROWS',requestBody:{values:[[e[0],stamp,'sending','',stamp]]}});
 const rows=await read('OfficeNotifications!A2:E');const matches=rows.map((v,i)=>({v,row:i+2})).filter(x=>x.v[0]===e[0]);if(matches.length!==1)throw Error('Office notification ledger conflict');
 const row=matches[0].row;let status='unknown_review_required',providerId='';
 try{const res=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`office/${e[0]}`},body:JSON.stringify(message(e,env.OFFICE_EMAIL_FROM)),signal:AbortSignal.timeout(10000)});const data=await res.json();if(res.ok&&data.id){status='accepted_by_provider';providerId=data.id;accepted++;}else if(res.status>=400&&res.status<500)status='rejected_review_required';}catch{}
 await update(`OfficeNotifications!C${row}:E${row}`,[[status,providerId,stamp]]);
 }
 return {status:'complete',accepted};
}
module.exports={eligible,message,syncOfficeEmail,TO};

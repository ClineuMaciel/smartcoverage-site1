const {google}=require('googleapis');
const {isIP}=require('node:net');
const HEADERS=['click_id','received_at_utc','client_clicked_at_utc','public_ip','likely_device','user_agent','page_path','referrer_host','destination','event_type','call_status'];
const reply=(statusCode,data)=>({statusCode,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(data)});
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return reply(405,{ok:false});
 const h=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
 if(h.origin!=='https://searchnrate.com'&&h.origin!=='https://www.searchnrate.com')return reply(403,{ok:false});
 if(Buffer.byteLength(event.body||'')>4000)return reply(413,{ok:false});
 let b;try{b=JSON.parse(event.body||'{}');}catch{return reply(400,{ok:false});}
 if(!b||!/^[a-zA-Z0-9-]{16,100}$/.test(b.click_id||'')||!/^\+1\d{10}$/.test(b.destination||''))return reply(400,{ok:false});
 const received=new Date().toISOString();
 const ip=isIP(h['x-nf-client-connection-ip']||'')?h['x-nf-client-connection-ip']:'';
 const ua=String(h['user-agent']||'').slice(0,600);
 const device=/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)?'likely_tablet':/Mobile|iPhone|Android/i.test(ua)?'likely_mobile':ua?'likely_desktop':'unknown';
 let page='',referrer='';try{const u=new URL(b.page);if(['searchnrate.com','www.searchnrate.com'].includes(u.hostname))page=u.pathname.slice(0,200);}catch{}
 try{referrer=new URL(b.referrer).hostname.slice(0,200);}catch{}
 const client=typeof b.clicked_at==='string'&&Number.isFinite(Date.parse(b.clicked_at))?new Date(b.clicked_at).toISOString():'';
 try{
 const id=process.env.GOOGLE_SHEETS_ID,email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL||process.env.GOOGLE_CLIENT_EMAIL,key=(process.env.GOOGLE_PRIVATE_KEY||'').replace(/\\n/g,'\n');
 if(!id||!email||!key)return reply(503,{ok:false});
 const sheets=google.sheets({version:'v4',auth:new google.auth.JWT({email,key,scopes:['https://www.googleapis.com/auth/spreadsheets']})});
 try{await sheets.spreadsheets.batchUpdate({spreadsheetId:id,requestBody:{requests:[{addSheet:{properties:{title:'WebsiteCallClicks'}}}]}});}catch(e){if(!/already exists/i.test(String(e.message)))throw e;}
 const existing=(await sheets.spreadsheets.values.get({spreadsheetId:id,range:'WebsiteCallClicks!A1:K1'})).data.values?.[0]||[];
 if(existing.length&&JSON.stringify(existing)!==JSON.stringify(HEADERS))throw Error('Header mismatch');
 if(!existing.length)await sheets.spreadsheets.values.update({spreadsheetId:id,range:'WebsiteCallClicks!A1:K1',valueInputOption:'RAW',requestBody:{values:[HEADERS]}});
 await sheets.spreadsheets.values.append({spreadsheetId:id,range:'WebsiteCallClicks!A:K',valueInputOption:'RAW',insertDataOption:'INSERT_ROWS',requestBody:{values:[[b.click_id,received,client,ip,device,ua,page,referrer,b.destination,'call_now_click','connection_not_verified']]}});
 return reply(200,{ok:true,click_id:b.click_id});
 }catch{console.error('CALL_CLICK_STORAGE_FAILED');return reply(503,{ok:false});}
};

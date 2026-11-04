const schema=require('./sales-schema.json');
const {normEmail,normPhone}=require('./policy');
const serial=value=>{const ms=Date.parse(value);return Number.isFinite(ms)?ms/86400000+25569:null;};
const col=n=>{let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;};
const quote=s=>`'${s.replace(/'/g,"''")}'`;
function suppressed(email,phone,optouts){return optouts.some(r=>(normEmail(email)&&normEmail(email)===normEmail(r[1]))||(normPhone(phone)&&normPhone(phone)===normPhone(r[2])));}
function eligibleEvidence(e,optouts){return !!e[0]&&e[9]==='accepted'&&serial(e[1])!==null&&!/testlead|example|maciel777/i.test(String(e[3]))&&!suppressed(e[3],e[4],optouts);}
function makeRow(e,evidenceRow){const t=serial(e[1]);return [e[0],t,t,'','','','',e[32]||'',e[8],e[5],e[6],e[3],e[4],e[7],'','Pending','Pending','Pending','Pending','Pending','No','No','','','','','',e[31]==='callback_only'?'Callback requested; service contact only. Insurance needs and client attempt timestamps are in Source layout and LeadEvidence traffic_json. Not authorized for buyer sale.':'Buyer approval, contact validation and consent evidence review pending.',e[1],e[10]||'',e[11]||'',e[5],e[6],e[3],e[4],e[7],e[8],e[17]===true||e[17]==='TRUE'?'yes':'',e[16],e[12],e[9],evidenceRow,'',`LeadEvidence row ${evidenceRow}; route ${e[34]||'pending'}; gate ${e[31]||'pending'}; ${e[31]==='callback_only'?'callback_only; '+e[25]:''}`,t];}
// Only code-owned formula columns are refreshed. Staff inputs and sales/call history are preserved.
function formulas(r){return {
 B:`=IF(AS${r}="","",INT(AS${r}))`,C:`=IF(AS${r}="","",MOD(AS${r},1))`,D:`=IF(AS${r}="","",'Parameters'!$B$2-AS${r})`,
 F:`=IF(AS${r}="","Missing timestamp",IF(D${r}<0,"Future timestamp",IF(AND(U${r}="Yes",V${r}="Yes"),"Archived",IF(D${r}<'Parameters'!$B$3,"Initial exclusive window",IF(D${r}<'Parameters'!$B$4,"Shared window",IF(D${r}<'Parameters'!$B$5,"Weekly window","Monthly resale review"))))))`,
 E:`=IF(F${r}="Archived","🗄",IF(F${r}="Initial exclusive window","🔒",IF(F${r}="Shared window","👥",IF(F${r}="Weekly window","📅",IF(F${r}="Monthly resale review","♻","⚠")))))`,
 G:`=IF(AQ${r}<>"","SUPPRESSED — do not sell/contact",IF(OR(H${r}="TN",H${r}="MS"),"OFFICE ONLY — no buyer sale",IF(ISNUMBER(SEARCH("callback_only",AR${r})),"CALLBACK ONLY — no buyer sale",IF(F${r}="Archived","Archived — retain record",IF(OR(AS${r}="",D${r}<0),"HOLD — timestamp",IF(OR(Z${r}>0,AA${r}>0),"HOLD — sale rights",IF(AND(P${r}="Yes",Q${r}="Yes",R${r}="Yes",S${r}="Yes",T${r}="Yes",H${r}<>"",O${r}<>""),"Manual delivery review","HOLD — verification")))))))`,
 W:`=COUNTIFS('Sales Log'!$B$2:$B$10001,A${r},'Sales Log'!$I$2:$I$10001,"Accepted")+COUNTIFS('Sales Log'!$B$2:$B$10001,A${r},'Sales Log'!$I$2:$I$10001,"Delivered")+COUNTIFS('Sales Log'!$B$2:$B$10001,A${r},'Sales Log'!$I$2:$I$10001,"Paid")`,
 X:`=SUMIFS('Sales Log'!$K$2:$K$10001,'Sales Log'!$B$2:$B$10001,A${r})`,
 Y:`=IF(COUNTIFS('Sales Log'!$B$2:$B$10001,A${r},'Sales Log'!$G$2:$G$10001,">0")=0,"",MAXIFS('Sales Log'!$G$2:$G$10001,'Sales Log'!$B$2:$B$10001,A${r}))`,
 Z:`=COUNTIFS('Sales Log'!$B$2:$B$10001,A${r},'Sales Log'!$N$2:$N$10001,"Active")`,
 AA:`=COUNTIFS('Sales Log'!$B$2:$B$10001,A${r},'Sales Log'!$N$2:$N$10001,"Unknown")+COUNTIFS('Sales Log'!$B$2:$B$10001,A${r},'Sales Log'!$N$2:$N$10001,"")`
};}
async function getValues(sheets,id,range){return (await sheets.spreadsheets.values.get({spreadsheetId:id,range})).data.values||[];}
async function ensureLayout(sheets,id){
 let meta=(await sheets.spreadsheets.get({spreadsheetId:id,fields:'sheets.properties'})).data.sheets||[];
 const titles=new Set(meta.map(s=>s.properties.title));
 const missing=Object.keys(schema).filter(t=>!titles.has(t));
 if(missing.length){await sheets.spreadsheets.batchUpdate({spreadsheetId:id,requestBody:{requests:missing.map(title=>({addSheet:{properties:{title,gridProperties:{rowCount:10001,columnCount:Math.max(26,schema[title].length),frozenRowCount:1}}}}))}});meta=(await sheets.spreadsheets.get({spreadsheetId:id,fields:'sheets.properties'})).data.sheets;}
 // Validate every existing heading before modifying any values. Never replace an incompatible tab.
 const headers={};for(const [name,h] of Object.entries(schema)){const rows=await getValues(sheets,id,`${quote(name)}!A1:${col(h.length)}1`);const current=rows[0]||[];if(current.length&&(current.length!==h.length||current.some((x,i)=>x!==h[i])))throw Error(`Sales register header mismatch: ${name}`);headers[name]=current;}
 const requests=[];
 for(const [name,h] of Object.entries(schema)){const props=meta.find(s=>s.properties.title===name).properties;const grid=props.gridProperties||{};if((grid.rowCount||0)<10001)requests.push({appendDimension:{sheetId:props.sheetId,dimension:'ROWS',length:10001-grid.rowCount}});if((grid.columnCount||0)<h.length)requests.push({appendDimension:{sheetId:props.sheetId,dimension:'COLUMNS',length:h.length-grid.columnCount}});
 if(!headers[name].length){requests.push({repeatCell:{range:{sheetId:props.sheetId,startRowIndex:0,endRowIndex:1,startColumnIndex:0,endColumnIndex:h.length},cell:{userEnteredFormat:{backgroundColor:{red:.09,green:.21,blue:.36},textFormat:{bold:true,foregroundColor:{red:1,green:1,blue:1}},wrapStrategy:'WRAP'}},fields:'userEnteredFormat'}},{updateDimensionProperties:{range:{sheetId:props.sheetId,dimension:'COLUMNS',startIndex:0,endIndex:h.length},properties:{pixelSize:170},fields:'pixelSize'}});}}
 if(requests.length)await sheets.spreadsheets.batchUpdate({spreadsheetId:id,requestBody:{requests}});
 const writes=Object.entries(schema).filter(([n])=>!headers[n].length).map(([n,h])=>({range:`${quote(n)}!A1`,values:[h]}));if(writes.length)await sheets.spreadsheets.values.batchUpdate({spreadsheetId:id,requestBody:{valueInputOption:'RAW',data:writes}});
 if(!headers.Parameters.length)await sheets.spreadsheets.values.update({spreadsheetId:id,range:"'Parameters'!A2:C14",valueInputOption:'RAW',requestBody:{values:[
 ['Review time (UTC)',serial(new Date().toISOString()),'Updated by the five-minute sales-register worker.'],['Exclusive window ends (days)',1,'Initial 24-hour planning window; no automatic sale.'],['Weekly window begins (days)',7,'Shared day 1–6; weekly day 7–29.'],['Monthly resale begins (days)',30,'Buyer approval and permitted resale rights required.'],['Lead connection','Live evidence projection','New accepted LeadEvidence records are added on the next successful five-minute run.'],['Timestamps','UTC','Server receipt time for newly collected evidence. Existing imported timestamps retain their original meaning.'],['Sales Log rows','One row per Sale ID','Update status on the same transaction row. Use numeric UTC date/time values.'],['Call Register rows','One row per provider Call ID','Manual provider-report entry until an authenticated provider adapter is installed. A click is not a call.'],['Historical requests','Hold until reviewed','Never imply fresh leads or backfill missing consent.'],['Archive rule','Manual approval required','Options exhausted and archive approved must both be Yes. Records remain retained.'],['Opt-outs','Suppressed','Live OptOuts controls suppression. Existing records are marked, never deleted.'],['Capacity',10000,'Sales Log totals cover rows 2–10001. Extend the schema before exceeding this capacity.'],['Website integration','Leads and LeadEvidence preserved','This worker never forwards leads to buyers.']
 ]}});
 // Numeric cells are UTC wall-clock serials; sheet timezone does not change their meaning.
 const specs={'Sales List':[[1,2,'DATE','mm/dd/yyyy'],[2,3,'TIME','hh:mm:ss'],[3,4,'NUMBER','0.0'],[23,24,'CURRENCY','$#,##0.00'],[24,25,'DATE_TIME','mm/dd/yyyy hh:mm:ss'],[44,45,'DATE_TIME','mm/dd/yyyy hh:mm:ss']], 'Sales Log':[[5,8,'DATE_TIME','mm/dd/yyyy hh:mm:ss'],[9,11,'CURRENCY','$#,##0.00'],[11,12,'DATE_TIME','mm/dd/yyyy hh:mm:ss'],[14,15,'DATE_TIME','mm/dd/yyyy hh:mm:ss']], 'Call Register':[[2,5,'DATE_TIME','mm/dd/yyyy hh:mm:ss'],[16,18,'CURRENCY','$#,##0.00'],[18,19,'DATE_TIME','mm/dd/yyyy hh:mm:ss']], 'Parameters':[[1,2,'DATE_TIME','mm/dd/yyyy hh:mm:ss',1,2]]};
 const formats=[];for(const [title,items] of Object.entries(specs)){const sheetId=meta.find(s=>s.properties.title===title).properties.sheetId;for(const [startColumnIndex,endColumnIndex,type,pattern,startRowIndex=1,endRowIndex=10001] of items)formats.push({repeatCell:{range:{sheetId,startColumnIndex,endColumnIndex,startRowIndex,endRowIndex},cell:{userEnteredFormat:{numberFormat:{type,pattern}}},fields:'userEnteredFormat.numberFormat'}});}
 await sheets.spreadsheets.batchUpdate({spreadsheetId:id,requestBody:{requests:formats}});
 const params=await getValues(sheets,id,"'Parameters'!B3:B5");const [a,b,c]=params.map(r=>Number(r[0]));if(!(a>0&&b>a&&c>b))throw Error('Invalid sales age windows');
 return {salesSheetId:meta.find(s=>s.properties.title==='Sales List').properties.sheetId};
}
async function syncRegister(sheets,id,now=new Date()){
 const layout=await ensureLayout(sheets,id);
 const [evidence,existing,optouts]=await Promise.all([getValues(sheets,id,'LeadEvidence!A2:AI'),getValues(sheets,id,"'Sales List'!A2:AS"),getValues(sheets,id,'OptOuts!A2:C')]);
 if(existing.length>10000)throw Error('Sales register capacity exceeded');
 const ids=new Set();for(const r of existing){if(r[0]&&ids.has(r[0]))throw Error('Duplicate Sales List ID requires review');if(r[0])ids.add(r[0]);}
 const additions=[];for(let i=0;i<evidence.length;i++){const e=evidence[i];if(!ids.has(e[0])&&eligibleEvidence(e,optouts)){ids.add(e[0]);additions.push(makeRow(e,i+2));}}
 if(existing.length+additions.length>10000)throw Error('Sales register capacity exceeded');
 // Scheduled worker is the sole automatic Sales List writer. No visitor-controlled formulas.
 if(additions.length)await sheets.spreadsheets.values.append({spreadsheetId:id,range:"'Sales List'!A:AS",valueInputOption:'RAW',insertDataOption:'INSERT_ROWS',requestBody:{values:additions}});
 let rows=existing.concat(additions);
 // Move complete records together, never individual ID/date/contact columns.
 // Re-read sorted rows before rebuilding row-relative formulas and suppression flags.
 if(rows.length>1){
  await sheets.spreadsheets.batchUpdate({spreadsheetId:id,requestBody:{requests:[{sortRange:{range:{sheetId:layout.salesSheetId,startRowIndex:1,endRowIndex:rows.length+1,startColumnIndex:0,endColumnIndex:45},sortSpecs:[{dimensionIndex:44,sortOrder:'DESCENDING'},{dimensionIndex:0,sortOrder:'ASCENDING'}]}}]}});
  rows=await getValues(sheets,id,"'Sales List'!A2:AS");
 }
 const updates=[];
 updates.push({range:"'Parameters'!B2",values:[[serial(now.toISOString())]]});
 updates.push({range:"'Parameters'!A6:C7",values:[['Lead connection','Live evidence projection','Refreshes every five minutes after successful production deployment.'],['Timestamps','UTC','New LeadEvidence records use server receipt time. Imported historical timestamps are unchanged.']]});
 for(let i=0;i<rows.length;i++){const row=rows[i],r=i+2;if(!row[0])continue;for(const [c,f] of Object.entries(formulas(r)))updates.push({range:`'Sales List'!${c}${r}`,values:[[f]]});
 if(suppressed(row[11],row[12],optouts)){updates.push({range:`'Sales List'!S${r}`,values:[['No']]},{range:`'Sales List'!AQ${r}`,values:[['Opt-out match: do not sell or contact']]});}}
 // Bound each request; imported staff review flags and transaction history are not overwritten.
 for(let i=0;i<updates.length;i+=400)await sheets.spreadsheets.values.batchUpdate({spreadsheetId:id,requestBody:{valueInputOption:'USER_ENTERED',data:updates.slice(i,i+400)}});
 return {added:additions.length,total:rows.filter(r=>r[0]).length};
}
module.exports={serial,suppressed,eligibleEvidence,makeRow,formulas,ensureLayout,syncRegister};

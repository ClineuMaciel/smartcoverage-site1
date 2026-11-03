import googleapis from 'googleapis';
import register from './lib/sales-register.js';
const {google}=googleapis;
const {syncRegister}=register;
export default async()=>{
 const id=process.env.GOOGLE_SHEETS_ID;
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL||process.env.GOOGLE_CLIENT_EMAIL;
 const key=(process.env.GOOGLE_PRIVATE_KEY||'').replace(/\\n/g,'\n');
 if(!id||!email||!key)throw Error('Sales register storage is not configured');
 const sheets=google.sheets({version:'v4',auth:new google.auth.JWT({email,key,scopes:['https://www.googleapis.com/auth/spreadsheets']})});
 try{const result=await syncRegister(sheets,id);console.log('SALES_REGISTER_SYNC_OK',result);}catch(e){console.error('SALES_REGISTER_SYNC_FAILED',{code:e.code||'sync_error'});throw Error('Sales register sync failed; check layout and Google permissions');}
};
export const config={schedule:'*/5 * * * *'};

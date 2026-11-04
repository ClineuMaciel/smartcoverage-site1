import googleapis from 'googleapis';
import notifications from './lib/office-email.js';
export default async()=>{
 if(process.env.OFFICE_EMAIL_ENABLED!=='true'){console.log('OFFICE_EMAIL_DISABLED');return;}
 const {google}=googleapis;
 const id=process.env.GOOGLE_SHEETS_ID,email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL||process.env.GOOGLE_CLIENT_EMAIL,key=(process.env.GOOGLE_PRIVATE_KEY||'').replace(/\\n/g,'\n');
 if(!id||!email||!key)throw Error('Office email storage configuration missing');
 const sheets=google.sheets({version:'v4',auth:new google.auth.JWT({email,key,scopes:['https://www.googleapis.com/auth/spreadsheets']})});
 try{console.log('OFFICE_EMAIL_SYNC_OK',await notifications.syncOfficeEmail(sheets,id));}catch{console.error('OFFICE_EMAIL_SYNC_FAILED');throw Error('Office email sync failed; inspect configuration and ledger');}
};
export const config={schedule:'*/5 * * * *'};

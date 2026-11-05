import googleapis from 'googleapis';
import notifications from './lib/office-email.js';
export default async()=>{
 if(process.env.OFFICE_EMAIL_ENABLED!=='true'){console.log('OFFICE_EMAIL_DISABLED');return;}
 const invalid=[];
 if(!process.env.RESEND_API_KEY?.trim())invalid.push('RESEND_API_KEY missing');
 if(!Number.isFinite(Date.parse(process.env.OFFICE_EMAIL_START_UTC||'')))invalid.push('OFFICE_EMAIL_START_UTC missing or invalid');
 if(!/^.+@.+\..+$/.test(process.env.OFFICE_EMAIL_FROM||''))invalid.push('OFFICE_EMAIL_FROM missing or invalid');
 if(invalid.length){console.error('OFFICE_EMAIL_CONFIG_INVALID',{fields:invalid});throw Error('Office email configuration invalid: '+invalid.join('; '));}
 const {google}=googleapis;
 const id=process.env.GOOGLE_SHEETS_ID,email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL||process.env.GOOGLE_CLIENT_EMAIL,key=(process.env.GOOGLE_PRIVATE_KEY||'').replace(/\\n/g,'\n');
 if(!id||!email||!key)throw Error('Office email storage configuration missing');
 const sheets=google.sheets({version:'v4',auth:new google.auth.JWT({email,key,scopes:['https://www.googleapis.com/auth/spreadsheets']})});
 try{console.log('OFFICE_EMAIL_SYNC_OK',await notifications.syncOfficeEmail(sheets,id));}catch(e){
 const known=['Office email configuration incomplete','OfficeNotifications header mismatch','Duplicate office notification ID','Office notification ledger conflict'];
 const reason=known.includes(e?.message)?e.message:'Storage or runtime error';
 const status=Number(e?.response?.status||e?.status||e?.code);
 console.error('OFFICE_EMAIL_SYNC_FAILED',{reason,http_status:Number.isFinite(status)?status:undefined});
 throw Error('Office email sync failed: '+reason);
 }
};
export const config={schedule:'*/5 * * * *'};

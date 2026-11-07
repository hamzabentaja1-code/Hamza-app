export type ContactChannel='whatsapp'|'call'|'email';
export function contactChannelUrl(value:string,channel:ContactChannel):string{
 if(channel==='email'){
  const email=value.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('البريد الإلكتروني غير صالح');
  return 'mailto:'+email;
 }
 const digits=value.replace(/\D/g,'');
 const international=digits.startsWith('00')?digits.slice(2):digits.startsWith('0')&&digits.length===10?'212'+digits.slice(1):digits;
 if(international.length<8||international.length>15)throw new Error('رقم الهاتف غير صالح');
 return channel==='whatsapp'?'https://wa.me/'+international:'tel:+'+international;
}

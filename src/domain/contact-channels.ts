export type ContactChannel='whatsapp'|'call';
export function contactChannelUrl(phone:string,channel:ContactChannel):string{
 const digits=phone.replace(/\\D/g,'');
 const international=digits.startsWith('00')?digits.slice(2):digits.startsWith('0')?'212'+digits.slice(1):digits;
 if(international.length<8||international.length>15)throw new Error('رقم الهاتف غير صالح');
 return channel==='whatsapp'?'https://wa.me/'+international:'tel:+'+international;
}

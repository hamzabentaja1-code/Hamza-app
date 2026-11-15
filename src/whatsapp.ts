export function buildWhatsAppChatUrl(phone?:string):string|null{
  if(typeof phone!=='string')return null;
  let digits=phone.replace(/\D/g,'');
  if(digits.startsWith('00'))digits=digits.slice(2);
  if(digits.startsWith('2120'))digits=`212${digits.slice(4)}`;
  if(digits.startsWith('0'))digits=`212${digits.slice(1)}`;
  if(digits.length<8||digits.length>15)return null;
  return `https://wa.me/${digits}`;
}

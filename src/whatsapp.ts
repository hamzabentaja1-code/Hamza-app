export function buildWhatsAppChatUrl(phone?:string,message?:string):string|null{
  if(typeof phone!=='string')return null;
  let digits=phone.replace(/\D/g,'');
  if(digits.startsWith('00'))digits=digits.slice(2);
  if(digits.startsWith('2120'))digits=`212${digits.slice(4)}`;
  if(digits.startsWith('0'))digits=`212${digits.slice(1)}`;
  if(digits.length<8||digits.length>15)return null;
  const text=typeof message==='string'&&message.trim()?`?text=${encodeURIComponent(message.trim())}`:'';
  return `https://wa.me/${digits}${text}`;
}

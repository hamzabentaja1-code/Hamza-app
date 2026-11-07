export type ContactCustomField={id:string;name:string;value:string};
export type ContactAttachment={id:string;name:string;mimeType:string;dataUri:string;createdAt:string};
export type ContactPriceGroup={id:string;name:string;discountPercent:number;active:boolean};

const MAX_CUSTOM_FIELDS=20;
const MAX_FIELD_NAME=40;
const MAX_FIELD_VALUE=240;
const MAX_ATTACHMENTS=8;
const MAX_ATTACHMENT_DATA_URI=5_500_000;
const ALLOWED_CONTACT_MIME_TYPES=new Set(['image/jpeg','image/png','image/webp','application/pdf','text/plain','text/csv','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);


export function normalizeContactCustomFields(value:unknown):ContactCustomField[]{
 if(!Array.isArray(value))return [];
 const result:ContactCustomField[]=[];
 const names=new Set<string>();
 for(const item of value){
  if(!item||typeof item!=='object')continue;
  const field=item as Record<string,unknown>;
  if(typeof field.id!=='string'||typeof field.name!=='string'||typeof field.value!=='string')continue;
  const name=field.name.trim(), normalized=name.toLocaleLowerCase();
  if(!name||name.length>MAX_FIELD_NAME||field.value.length>MAX_FIELD_VALUE||names.has(normalized)||result.length>=MAX_CUSTOM_FIELDS)continue;
  names.add(normalized);result.push({id:field.id,name,value:field.value});
 }
 return result;
}

export function addContactCustomField(fields:ContactCustomField[],name:string,value:string,id:string):ContactCustomField[]{
 const normalized=normalizeContactCustomFields(fields),cleanName=name.trim(),cleanValue=value.trim();
 if(!cleanName||cleanName.length>MAX_FIELD_NAME)throw new Error('اسم الحقل مطلوب ولا يتجاوز 40 حرفاً');
 if(!cleanValue||cleanValue.length>MAX_FIELD_VALUE)throw new Error('قيمة الحقل مطلوبة ولا تتجاوز 240 حرفاً');
 if(normalized.length>=MAX_CUSTOM_FIELDS)throw new Error('الحد الأقصى هو 20 حقلاً مخصصاً');
 if(normalized.some(field=>field.name.toLocaleLowerCase()===cleanName.toLocaleLowerCase()))throw new Error('اسم الحقل المخصص موجود من قبل');
 if(!id.trim()||normalized.some(field=>field.id===id))throw new Error('معرف الحقل غير صالح أو مكرر');
 return [...normalized,{id,name:cleanName,value:cleanValue}];
}

export function parseContactCustomFieldsText(value:string,idPrefix:string):ContactCustomField[]{
 const lines=value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
 if(lines.length>MAX_CUSTOM_FIELDS)throw new Error('الحد الأقصى هو 20 حقلاً مخصصاً');
 let fields:ContactCustomField[]=[];
 for(let index=0;index<lines.length;index++){
  const separator=lines[index].indexOf('=');
  if(separator<=0||separator===lines[index].length-1)throw new Error('اكتب كل حقل بهذا الشكل: الاسم=القيمة');
  fields=addContactCustomField(fields,lines[index].slice(0,separator),lines[index].slice(separator+1),idPrefix+'-'+index);
 }
 return fields;
}

export function normalizeContactAttachments(value:unknown):ContactAttachment[]{
 if(!Array.isArray(value))return [];
 return value.filter((item):item is ContactAttachment=>{
  if(!item||typeof item!=='object')return false;
  const file=item as Record<string,unknown>;
  return typeof file.id==='string'&&typeof file.name==='string'&&file.name.length>0&&file.name.length<=120&&
   typeof file.mimeType==='string'&&ALLOWED_CONTACT_MIME_TYPES.has(file.mimeType)&&
   typeof file.dataUri==='string'&&file.dataUri.length<=MAX_ATTACHMENT_DATA_URI&&
   file.dataUri.startsWith('data:'+file.mimeType+';base64,')&&typeof file.createdAt==='string';
 }).slice(0,MAX_ATTACHMENTS);
}

export function addContactAttachment(files:ContactAttachment[],file:ContactAttachment):ContactAttachment[]{
 const normalized=normalizeContactAttachments(files);
 if(normalized.length>=MAX_ATTACHMENTS)throw new Error('الحد الأقصى هو 8 مرفقات لكل جهة اتصال');
 if(normalized.some(item=>item.id===file.id))throw new Error('معرف المرفق مكرر');
 if(!normalizeContactAttachments([file]).length)throw new Error('المرفق غير صالح أو حجمه أكبر من الحد المسموح؛ استعمل JPG أو PNG أو WebP أو PDF أو DOC/DOCX أو XLS/XLSX أو TXT/CSV');
 return [...normalized,file];
}

export function removeContactAttachment(files:ContactAttachment[],id:string):ContactAttachment[]{
 return normalizeContactAttachments(files).filter(file=>file.id!==id);
}

export function validateContactPriceGroups(groups:ContactPriceGroup[]):ContactPriceGroup[]{
 const seen=new Set<string>();
 return groups.map(group=>{
  const name=group.name.trim(),key=name.toLocaleLowerCase();
  if(!group.id.trim()||!name||name.length>60||seen.has(key)||!Number.isFinite(group.discountPercent)||group.discountPercent<0||group.discountPercent>90)
   throw new Error('مجموعة الأسعار غير صالحة: تحقق من الاسم والخصم (0 إلى 90%)');
  seen.add(key);return {...group,name};
 });
}

/** Applies a contact group's discount to the base price, rounded to whole centimes. */
export function priceForContactGroup(basePrice:number,group?:ContactPriceGroup):number{
 if(!Number.isFinite(basePrice)||basePrice<0)throw new Error('الثمن الأصلي غير صالح');
 if(!group||!group.active)return Math.round(basePrice*100)/100;
 if(!Number.isFinite(group.discountPercent)||group.discountPercent<0||group.discountPercent>90)throw new Error('نسبة خصم مجموعة الأسعار غير صالحة');
 return Math.round(basePrice*100*(1-group.discountPercent/100))/100;
}

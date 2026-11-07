export function normalizeEquipmentCategories(value:unknown):string[]{
 if(!Array.isArray(value))return [];
 const seen=new Set<string>();const result:string[]=[];
 for(const item of value){if(typeof item!=='string')continue;const name=item.trim().replace(/\\s+/g,' ');const key=name.toLocaleLowerCase();if(!name||name.length>48||seen.has(key))continue;seen.add(key);result.push(name);}
 return result;
}
export function addEquipmentCategory(categories:unknown,name:string):string[]{
 const current=normalizeEquipmentCategories(categories);const clean=name.trim().replace(/\\s+/g,' ');
 if(!clean||clean.length>48)throw new Error('اسم فئة المعدات مطلوب وأقصاه 48 حرفاً');
 if(current.some(item=>item.toLocaleLowerCase()===clean.toLocaleLowerCase()))throw new Error('فئة المعدات موجودة من قبل');
 return [...current,clean];
}

declare const require:(id:string)=>typeof import('jszip');
const JSZip=require('jszip');

export type XlsxCell = string | number | boolean | null | undefined;
export type XlsxSheet = {name:string;headers:readonly XlsxCell[];rows:readonly (readonly XlsxCell[])[]};

const xmlEscape=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const columnName=(index:number)=>{let name='';for(let value=index+1;value>0;value=Math.floor((value-1)/26))name=String.fromCharCode(65+(value-1)%26)+name;return name;};

function safeSheetName(input:string,used:Set<string>):string{
  const base=(input.replace(/[\\/*?:\[\]]/g,' ').trim()||'Sheet').slice(0,31);
  let name=base;let suffix=2;
  while(used.has(name.toLocaleLowerCase())){const tag=` ${suffix++}`;name=base.slice(0,31-tag.length)+tag;}
  used.add(name.toLocaleLowerCase());
  return name;
}

function cellXml(value:XlsxCell,reference:string):string{
  if(value===null||value===undefined)return '';
  if(typeof value==='number')return Number.isFinite(value)?`<c r="${reference}"><v>${String(value)}</v></c>`:'';
  if(typeof value==='boolean')return `<c r="${reference}" t="b"><v>${value?'1':'0'}</v></c>`;
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function worksheetXml(sheet:XlsxSheet):string{
  const rows=[sheet.headers,...sheet.rows];
  const xmlRows=rows.map((row,rowIndex)=>{
    const cells=row.map((value,columnIndex)=>cellXml(value,`${columnName(columnIndex)}${rowIndex+1}`)).join('');
    return `<row r="${rowIndex+1}">${cells}</row>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`;
}

/** Build a real OOXML workbook as a base64 string suitable for Expo FileSystem. */
export async function buildXlsx(sheets:XlsxSheet[]):Promise<string>{
  if(!sheets.length)throw new Error('خاص ملف Excel يحتوي على ورقة واحدة على الأقل.');
  const zip=new JSZip();
  const names=new Set<string>();
  const prepared=sheets.map(sheet=>({...sheet,name:safeSheetName(sheet.name,names)}));
  const contentOverrides=prepared.map((_,index)=>`<Override PartName="/xl/worksheets/sheet${index+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  const workbookSheets=prepared.map((sheet,index)=>`<sheet name="${xmlEscape(sheet.name)}" sheetId="${index+1}" r:id="rId${index+1}"/>`).join('');
  const relationships=prepared.map((_,index)=>`<Relationship Id="rId${index+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index+1}.xml"/>`).join('');
  zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${contentOverrides}</Types>`);
  zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`);
  prepared.forEach((sheet,index)=>zip.file(`xl/worksheets/sheet${index+1}.xml`,worksheetXml(sheet)));
  return zip.generateAsync({type:'base64',compression:'DEFLATE'});
}

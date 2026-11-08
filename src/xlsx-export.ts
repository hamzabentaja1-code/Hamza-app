import {strToU8,zipSync} from 'fflate';

export type XlsxCell=string|number|boolean|null|undefined;
export type XlsxSheet={name:string;rows:XlsxCell[][]};

const xml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const columnName=(index:number)=>{let value='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))value=String.fromCharCode(65+(n-1)%26)+value;return value;};

function sheetXml(rows:XlsxCell[][]){
  const body=rows.map((row,rowIndex)=>`<row r="${rowIndex+1}">${row.map((value,columnIndex)=>{
    if(value===null||value===undefined||value==='')return '';
    const ref=columnName(columnIndex)+(rowIndex+1);
    if(typeof value==='number'&&Number.isFinite(value))return `<c r="${ref}"><v>${value}</v></c>`;
    const text=String(value);
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(text)}</t></is></c>`;
  }).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function toBase64(bytes:Uint8Array){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let output='';
  for(let index=0;index<bytes.length;index+=3){
    const a=bytes[index],hasB=index+1<bytes.length,hasC=index+2<bytes.length,b=hasB?bytes[index+1]:0,c=hasC?bytes[index+2]:0;
    output+=alphabet[a>>2]+alphabet[((a&3)<<4)|(b>>4)]+(hasB?alphabet[((b&15)<<2)|(c>>6)]:'=')+(hasC?alphabet[c&63]:'=');
  }
  return output;
}

export function createXlsxBase64(sheets:XlsxSheet[]):string{
  if(!sheets.length)throw new Error('Workbook needs at least one sheet');
  const used=new Set<string>();
  const names=sheets.map((sheet,index)=>{
    let name=sheet.name.replace(/[\\/*?:\[\]]/g,'_').trim().slice(0,31)||`Sheet${index+1}`;
    let candidate=name,suffix=1;
    while(used.has(candidate.toLowerCase())){const marker=`_${suffix++}`;candidate=name.slice(0,31-marker.length)+marker;}
    used.add(candidate.toLowerCase());return candidate;
  });
  const overrides=sheets.map((_,index)=>`<Override PartName="/xl/worksheets/sheet${index+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  const workbookSheets=sheets.map((_,index)=>`<sheet name="${xml(names[index])}" sheetId="${index+1}" r:id="rId${index+1}"/>`).join('');
  const relationships=sheets.map((_,index)=>`<Relationship Id="rId${index+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index+1}.xml"/>`).join('');
  const files:Record<string,Uint8Array>={
    '[Content_Types].xml':strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}</Types>`),
    '_rels/.rels':strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml':strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`),
    'xl/_rels/workbook.xml.rels':strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`),
  };
  sheets.forEach((sheet,index)=>{files[`xl/worksheets/sheet${index+1}.xml`]=strToU8(sheetXml(sheet.rows));});
  return toBase64(zipSync(files,{level:6}));
}

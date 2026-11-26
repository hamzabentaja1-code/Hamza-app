export const MAX_PRODUCT_IMPORT_BYTES=1024*1024;
const MAX_ROWS=2000;
type Field='name'|'reference'|'barcode'|'category'|'costPrice'|'price'|'qty'|'brand'|'unit'|'variant'|'quotePrice'|'invoicePrice';
type Draft={name:string;reference?:string;barcode?:string;category?:string;brand?:string;unit?:string;variant?:string;qty:number;price:number;costPrice:number;quotePrice?:number;invoicePrice?:number};
const legacy:Field[]=['name','reference','barcode','category','costPrice','price','qty','brand','unit','variant','quotePrice','invoicePrice'];
const aliases:Record<Field,readonly string[]>={
  name:['nom','name','product','produit','الاسم','اسم المنتج'],
  reference:['reference','ref','المرجع'],barcode:['codebarres','codebarre','barcode','الباركود'],
  category:['categorie','category','الصنف','التصنيف'],
  costPrice:['prixachatdh','prixachat','costprice','ثمنالشراء'],
  price:['prixventedh','prixvente','price','saleprice','ثمنالبيع'],
  qty:['quantite','qty','quantity','الكمية'],
  brand:['marque','brand','العلامةالتجارية'],unit:['unite','unit','الوحدة'],variant:['modele','variant','الموديل'],
  quotePrice:['prixdevisdh','prixdevis','quoteprice','ثمنالعرض'],
  invoicePrice:['prixfacturedh','prixfacture','invoiceprice','ثمنالفاتورة'],
};
const clean=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\s_.-]/g,'');
const headerNames=new Map<string,Field>(legacy.flatMap(field=>aliases[field].map(label=>[clean(label),field] as const)));
const normRef=(s?:string)=>s?.trim().toLowerCase()??'';
export type ProductImportPreview={
  accepted:Array<{line:number;product:Draft}>;
  rejected:Array<{line:number;code:'missing_name'|'invalid_number'|'duplicate'|'column_count'|'unsupported_text'}>;
};

function delimiterFor(text:string):string{
  const counts:Record<string,number>={';':0,'\t':0,',':0};
  let inQuotes=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(inQuotes&&text[i+1]==='"'){i++;continue;}inQuotes=!inQuotes;}
    else if(!inQuotes){
      if(c==='\r'||c==='\n')break;
      if(c in counts)counts[c]++;
    }
  }
  return counts['\t']?'\t':counts[';']?';':',';
}

function delimitedRows(input:string){
  const raw=input.replace(/^\uFEFF/,'');
  const leadingBlankLines=/^(?:[ \t]*\r?\n)+/.exec(raw)?.[0]??'';
  const source=raw.slice(leadingBlankLines.length);
  if(raw.length>MAX_PRODUCT_IMPORT_BYTES||source.includes('\0'))throw new Error('product_import_size_or_encoding');
  const delimiter=delimiterFor(source);
  const rows:Array<{line:number;cells:string[]}>=[];
  let row:string[]=[], value='', quoted=false, ended=false,line=1+(leadingBlankLines.match(/\n/g)?.length??0),start=line;
  const pushCell=()=>{
    row.push(value.trim());value='';ended=false;
    if(row.length>40)throw new Error('product_import_format');
  };
  const pushRow=()=>{
    pushCell();
    if(row.some(Boolean))rows.push({line:start,cells:row});
    if(rows.length>MAX_ROWS+1)throw new Error('product_import_too_many_rows');
    row=[];
  };
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(quoted){
      if(c==='"'){
        if(source[i+1]==='"'){value+='"';i++;}
        else{quoted=false;ended=true;}
      }else if(c==='\r'||c==='\n'){
        if(c==='\r'&&source[i+1]==='\n')i++;
        value+='\n';line++;
      }else value+=c;
    }else if(c===delimiter){pushCell();}
    else if(c==='\r'||c==='\n'){if(c==='\r'&&source[i+1]==='\n')i++;pushRow();line++;start=line;}
    else if(c==='"'&&!ended&&!value.trim()){quoted=true;value='';}
    else if(c==='"'||ended&&c!==' '&&c!=='\t')throw new Error('product_import_format');
    else if(!ended)value+=c;
    if(value.length>10000)throw new Error('product_import_format');
  }
  if(quoted)throw new Error('product_import_format');
  if(row.length||value||ended)pushRow();
  return rows;
}

function numeric(value:string,kind:'optional'|'required'|'quantity'):number|undefined {
  if(!value)return kind==='optional'?undefined:kind==='quantity'?0:NaN;
  const normalized=value.replace(/[٠-٩۰-۹]/g,digit=>String(digit.charCodeAt(0)-(digit <= '٩'?0x660:0x6f0))).replace(/[٫,]/g,'.');
  const pattern=kind==='quantity'?/^\d{1,9}$/:/^\d{1,9}(?:\.\d{1,2})?$/;
  return pattern.test(normalized)?Number(normalized):NaN;
}

export function previewProductImport(input:string,existing:readonly {reference?:string;barcode?:string}[]):ProductImportPreview{
  const rows=delimitedRows(input);
  const accepted:ProductImportPreview['accepted']=[],rejected:ProductImportPreview['rejected']=[];
  if(!rows.length)return {accepted,rejected};
  const possibleHeaders=rows[0].cells.map(value=>headerNames.get(clean(value)));
  const recognized=possibleHeaders.filter((v):v is Field=>v!==undefined);
  const hasHeader=recognized.length>=2;
  if(hasHeader&&(!recognized.includes('name')||!recognized.includes('price')||new Set(recognized).size!==recognized.length))throw new Error('product_import_headers');
  if(rows.length-(hasHeader?1:0)>MAX_ROWS)throw new Error('product_import_too_many_rows');
  const mapping=hasHeader?possibleHeaders:legacy;
  const seenRefs=new Set(existing.map(row=>normRef(row.reference)).filter(Boolean));
  const seenBarcodes=new Set(existing.map(row=>row.barcode?.trim()).filter(Boolean));
  for(const {line,cells} of hasHeader?rows.slice(1):rows){
    const reject=(code:ProductImportPreview['rejected'][number]['code'])=>rejected.push({line,code});
    if(cells.length>mapping.length||(!hasHeader&&cells.length<6)){reject('column_count');continue;}
    const item:Partial<Record<Field,string>>={};
    mapping.forEach((field,index)=>{if(field)item[field]=cells[index]??'';});
    if(!item.name){reject('missing_name');continue;}
    if(Object.values(item).some(value=>value.length>240||value.includes('\uFFFD'))){reject('unsupported_text');continue;}
    const price=numeric(item.price??'','required')!;
    const optCost=numeric(item.costPrice??'','optional');
    const qty=numeric(item.qty??'','quantity')!;
    const quotePrice=numeric(item.quotePrice??'','optional');
    const invoicePrice=numeric(item.invoicePrice??'','optional');
    if([price,optCost,qty,quotePrice,invoicePrice].some(value=>Number.isNaN(value))){reject('invalid_number');continue;}
    const ref=normRef(item.reference),barcode=item.barcode;
    if(ref&&seenRefs.has(ref)||barcode&&seenBarcodes.has(barcode)){reject('duplicate');continue;}
    const {name,reference,category,brand,unit,variant}=item;
    accepted.push({line,product:{name,reference:reference||undefined,barcode:barcode||undefined,category:category||undefined,brand:brand||undefined,unit:unit||undefined,variant:variant||undefined,qty,price,costPrice:optCost??0,quotePrice,invoicePrice}});
    if(ref)seenRefs.add(ref);if(barcode)seenBarcodes.add(barcode);
  }
  return {accepted,rejected};
}

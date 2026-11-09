export type FingerprintCandidate<T> = {item:T; fingerprint:string};
export type FingerprintMatch<T> = {item:T; distance:number};

const grayAt=(data:Uint8Array,width:number,x:number,y:number)=>{
  const offset=(y*width+x)*4;
  return 0.299*data[offset]+0.587*data[offset+1]+0.114*data[offset+2];
};

/** Creates a 64-bit difference hash from an RGBA image buffer. */
export function differenceHash(width:number,height:number,rgba:Uint8Array):string{
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<1||rgba.length<width*height*4){
    throw new Error('Image pixels or dimensions are invalid.');
  }
  let high=0,low=0,bit=0;
  for(let y=0;y<8;y++){
    const sampleY=Math.min(height-1,Math.floor((y+0.5)*height/8));
    for(let x=0;x<8;x++){
      const leftX=Math.min(width-1,Math.floor((x+0.5)*width/9));
      const rightX=Math.min(width-1,Math.floor((x+1.5)*width/9));
      if(grayAt(rgba,width,leftX,sampleY)>grayAt(rgba,width,rightX,sampleY)){
        if(bit<32)high=(high|(1<<(31-bit)))>>>0;
        else low=(low|(1<<(63-bit)))>>>0;
      }
      bit++;
    }
  }
  return high.toString(16).padStart(8,'0')+low.toString(16).padStart(8,'0');
}

export function fingerprintDistance(left:string,right:string):number{
  if(!/^[0-9a-f]{16}$/i.test(left)||!/^[0-9a-f]{16}$/i.test(right)){
    throw new Error('Image fingerprint is invalid.');
  }
  let distance=0;
  for(let offset=0;offset<16;offset+=4){
    let bits=(parseInt(left.slice(offset,offset+4),16)^parseInt(right.slice(offset,offset+4),16))>>>0;
    while(bits){bits&=bits-1;distance++;}
  }
  return distance;
}

export function rankImageMatches<T>(query:string,candidates:FingerprintCandidate<T>[],maxDistance=18,limit=20):FingerprintMatch<T>[]{
  if(!Number.isInteger(maxDistance)||maxDistance<0||maxDistance>64)throw new Error('Maximum image distance must be between 0 and 64.');
  if(!Number.isInteger(limit)||limit<1)throw new Error('Image result limit must be positive.');
  return candidates.map(candidate=>({item:candidate.item,distance:fingerprintDistance(query,candidate.fingerprint)}))
    .filter(match=>match.distance<=maxDistance)
    .sort((a,b)=>a.distance-b.distance)
    .slice(0,limit);
}

/** Return one result per product, using its best-matching saved photo. */
export function rankUniqueProductImageMatches<T extends {id: string | number}>(
  query: string,
  candidates: FingerprintCandidate<T>[],
  maxDistance = 18,
  limit = 20,
): FingerprintMatch<T>[] {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('Image result limit must be positive.');
  const ranked = rankImageMatches(query, candidates, maxDistance, Math.max(1, candidates.length));
  const seen = new Set<string | number>();
  const unique: FingerprintMatch<T>[] = [];
  for (const match of ranked) {
    if (seen.has(match.item.id)) continue;
    seen.add(match.item.id);
    unique.push(match);
    if (unique.length >= limit) break;
  }
  return unique;
}

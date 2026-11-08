import {toByteArray} from 'base64-js';
import {decode} from 'jpeg-js';
import {differenceHash} from './domain/image-search';

type JpegOptions={useTArray:true;maxResolutionInMP:number;maxMemoryUsageInMB:number};
type JpegPixels={data:Uint8Array;width:number;height:number};
const decodeImage=decode as unknown as (data:Uint8Array,options:JpegOptions)=>JpegPixels;

/** Decodes the JPEG data URI returned by Expo ImagePicker and fingerprints it locally. */
export function fingerprintJpegDataUri(dataUri:string):string{
  const separator=dataUri.indexOf(',');
  const encoded=separator>=0?dataUri.slice(separator+1):dataUri;
  if(!encoded)throw new Error('Image data is empty.');
  const bytes=toByteArray(encoded);
  const image=decodeImage(bytes,{useTArray:true,maxResolutionInMP:12,maxMemoryUsageInMB:48});
  return differenceHash(image.width,image.height,image.data);
}

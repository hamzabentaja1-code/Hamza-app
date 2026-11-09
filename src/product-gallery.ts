export const MAX_PRODUCT_PHOTOS = 4;

export type ProductPhotoRecord = {photoData?: string; photoGallery?: string[]};

export function productPhotos(product: ProductPhotoRecord): string[] {
  const gallery = Array.isArray(product.photoGallery) ? product.photoGallery : [];
  const legacy = typeof product.photoData === 'string' ? product.photoData : '';
  const candidates = gallery.length > 0 ? gallery : (legacy ? [legacy] : []);
  return [...new Set(candidates.filter((uri): uri is string => typeof uri === 'string' && uri.trim().length > 0))].slice(0, MAX_PRODUCT_PHOTOS);
}

export function appendProductPhoto(photos: string[], uri: string): string[] {
  const normalized = productPhotos({photoGallery: photos});
  if (!uri.trim() || normalized.includes(uri)) return normalized;
  if (normalized.length >= MAX_PRODUCT_PHOTOS) throw new Error('Maximum four photos per product');
  return [...normalized, uri];
}

export function removeProductPhoto(photos: string[], index: number): string[] {
  return productPhotos({photoGallery: photos}).filter((_, currentIndex) => currentIndex !== index);
}

export function serializeProductPhotos(photos: string[]): ProductPhotoRecord {
  const normalized = productPhotos({photoGallery: photos});
  return {photoData: normalized[0] || undefined, photoGallery: normalized.length ? normalized : undefined};
}

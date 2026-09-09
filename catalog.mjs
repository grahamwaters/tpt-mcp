import {readFile, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import {Listing} from './listing.mjs';
export async function confined(root, name) {
  const base = await realpath(root), file = await realpath(path.resolve(base, name));
  if (file !== base && !file.startsWith(base + path.sep)) throw new Error('Path outside product workspace');
  return file;
}
export async function listProducts(root) {
  const manifest = JSON.parse(await readFile(await confined(root, 'release/upload-ready/UPLOAD-MANIFEST.json'), 'utf8'));
  if (!Array.isArray(manifest.products)) throw new Error('Invalid catalog');
  return manifest.products.map(({id,title,price})=>({id,title,price}));
}
export async function getProduct(root, id) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error('Invalid product ID');
  const manifest = JSON.parse(await readFile(await confined(root, 'release/upload-ready/UPLOAD-MANIFEST.json'), 'utf8'));
  const entry = manifest.products.find(p=>p.id===id);
  if (!entry) throw new Error('Product not in catalog');
  const folder = await confined(root, entry.folder);
  const metadata = JSON.parse(await readFile(await confined(root, path.join(folder,'product.json')), 'utf8'));
  const packagePath = await confined(root, entry.upload_package);
  const images = await Promise.all(['cover.png','thumb-1.png','thumb-2.png','thumb-3.png'].map(n=>confined(root,path.join(folder,n))));
  for (const file of [packagePath,...images]) if (!(await stat(file)).isFile() || !(await stat(file)).size) throw new Error('Missing or empty asset: '+file);
  if (!Number.isFinite(entry.price) || entry.price < 0 || !entry.title?.trim()) throw new Error('Invalid title or price');
  const listing=Listing.parse(JSON.parse(await readFile(await confined(root,path.join(folder,'listing.json')),'utf8')));
  if(listing.id!==id || listing.title!==entry.title || listing.pricing.price!==entry.price) throw new Error('Catalog and listing identity or price mismatch');
  const previewPath=await confined(root,listing.files.preview);
  const videoPreviewPath=listing.files.videoPreview?await confined(root,listing.files.videoPreview):null;
  if(await confined(root,listing.files.download)!==packagePath)throw new Error('Listing download does not match catalog');
  for(let i=0;i<images.length;i++)if(await confined(root,listing.files.thumbnails[i])!==images[i])throw new Error('Thumbnail mismatch');
  for(const f of [previewPath,...(videoPreviewPath?[videoPreviewPath]:[])])if(!(await stat(f)).isFile()||!(await stat(f)).size)throw new Error('Empty preview');
  return {...entry,folder,packagePath,images,description:listing.description,metadata,listing,previewPath,videoPreviewPath};
}

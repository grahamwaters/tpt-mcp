import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
export async function createFixture(){
 const root=await mkdtemp(path.join(os.tmpdir(),'tpt-catalog-'));
 const listing=JSON.parse(await readFile(new URL('examples/listing.json',import.meta.url),'utf8'));
 const folder='release/upload-ready/example-product';
 await mkdir(path.join(root,folder),{recursive:true});
 const product={id:listing.id,title:listing.title,price:listing.pricing.price,folder,upload_package:listing.files.download};
 await writeFile(path.join(root,'release/upload-ready/UPLOAD-MANIFEST.json'),JSON.stringify({count:1,products:[product]}));
 await writeFile(path.join(root,folder,'product.json'),JSON.stringify({id:listing.id,title:listing.title}));
 await writeFile(path.join(root,folder,'listing.json'),JSON.stringify(listing));
 // Deliberately fake file bytes. Catalog tests never upload these to TPT.
 for(const name of ['example-product.zip','preview.pdf','cover.png','thumb-1.png','thumb-2.png','thumb-3.png'])await writeFile(path.join(root,folder,name),'synthetic test fixture');
 return {root,listing,cleanup:()=>rm(root,{recursive:true,force:true})};
}

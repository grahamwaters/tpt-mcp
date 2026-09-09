import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile,symlink} from 'node:fs/promises';
import path from 'node:path';
import {createFixture} from './test-fixture.mjs';
import {confined,listProducts,getProduct} from './catalog.mjs';
test('catalog loads a complete listing and rejects absent IDs and price mismatch',async()=>{
 const f=await createFixture();
 try{assert.equal((await listProducts(f.root)).length,1);const p=await getProduct(f.root,'example-product');assert.equal(p.images.length,4);assert.ok(path.isAbsolute(p.previewPath));await assert.rejects(getProduct(f.root,'../outside'),/Invalid/);await assert.rejects(getProduct(f.root,'missing'),/not in catalog/);f.listing.pricing.price=100;await writeFile(path.join(p.folder,'listing.json'),JSON.stringify(f.listing));await assert.rejects(getProduct(f.root,'example-product'),/mismatch/);}finally{await f.cleanup();}
});
test('catalog rejects files escaping through parent traversal or symlinks',async()=>{
 const f=await createFixture();
 try{await symlink(path.dirname(f.root),path.join(f.root,'escape'));await assert.rejects(confined(f.root,'..'),/outside/);await assert.rejects(confined(f.root,'escape'),/outside/);}finally{await f.cleanup();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {TptBrowser} from './browser.mjs';
test('unprocessed assets prevent any submit click',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'tpt-submit-'));let clicks=0;
 try{const b=new TptBrowser(dir);b.current='one';b.page={url:()=> 'https://www.teacherspayteachers.com/My-Products/New/Digital-Next',getByRole:()=>({click:async()=>clicks++,isChecked:async()=>true})};b.inspect=async()=>({uploads:[]});await b.save('one',{status:'prepared'});await assert.rejects(b.submit('one',false),/Wait for every/);assert.equal(clicks,0);assert.equal((await b.record('one')).status,'prepared');}finally{await rm(dir,{recursive:true,force:true});}
});
test('closing browser cancels a submission waiting on inspection',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'tpt-cancel-'));let unblock;
 try{const b=new TptBrowser(dir);b.current='one';b.page={url:()=> 'https://www.teacherspayteachers.com/My-Products/New/Digital-Next'};let entered;const ready=new Promise(r=>entered=r);b.inspect=()=>{entered();return new Promise(r=>unblock=r)};await b.save('one',{status:'prepared'});const pending=b.submit('one',false);await ready;await b.close();unblock({uploads:[]});await assert.rejects(pending,/cancelled/);assert.equal((await b.record('one')).status,'prepared');}finally{await rm(dir,{recursive:true,force:true});}
});
test('without custom uploads submission selects automatic thumbnails, never later',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'tpt-auto-'));const selected=[];
 try{const b=new TptBrowser(dir);b.current='one';let url='https://www.teacherspayteachers.com/My-Products/New/Digital-Next';
 b.page={url:()=>url,getByRole:(role,options)=>({isChecked:async()=>false,check:async()=>selected.push(String(options.name)),setChecked:async()=>{},click:async()=>{url='https://www.teacherspayteachers.com/My-Products';}}),waitForURL:async()=>{}};
 b.inspect=async()=>({uploads:[{id:'ItemDigitalProduct',processed:true},{id:'ItemDigitalPreview',processed:true}]});
 await b.save('one',{status:'prepared'});const result=await b.submit('one',false);
 assert.equal(result.thumbnailMode,'auto-generate');assert.equal(selected.length,1);assert.match(selected[0],/Auto generate/);assert.ok(!selected[0].includes('later'));
 }finally{await rm(dir,{recursive:true,force:true});}
});

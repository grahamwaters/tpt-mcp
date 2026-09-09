import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {TptBrowser} from './browser.mjs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
test('real browser selects file bytes; journal prevents blind retry after uncertain submission',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'tpt-browser-test-'));
 let context;
 try{
 const file=path.join(temp,'sample.zip');await writeFile(file,Buffer.from('PK-test-upload'));
 context=await chromium.launch({channel:'chrome',headless:true});
 const p=await context.newPage();
 await p.route('https://www.teacherspayteachers.com/**',route=>route.fulfill({contentType:'text/html',body:'<input id="ItemDigitalProduct" type="file"><label><input type="checkbox">Make Listing Active</label><button onclick="this.textContent=\'Sent\'">Submit</button>'}));
 await p.goto('https://www.teacherspayteachers.com/My-Products/New/Digital-Next');
 await p.locator('#ItemDigitalProduct').setInputFiles(file);
 assert.equal(await p.locator('#ItemDigitalProduct').evaluate(async e=>await e.files[0].text()),'PK-test-upload');
 const b=new TptBrowser(temp); b.page=p; b.current='example';
 await b.save('example',{status:'prepared'});
 // Simulate the server persisting its attempt before a connection drops.
 await b.save('example',{status:'submission_attempted'});
 await assert.rejects(b.submit('example',true),/Prepare and review/);
 assert.equal((await b.record('example')).status,'submission_attempted');
 }finally{if(context)await context.close();await rm(temp,{recursive:true,force:true});}
});

import {chromium} from 'playwright';
import {mkdir, readFile, writeFile, appendFile} from 'node:fs/promises';
import path from 'node:path';
import {enterDescription} from './description.mjs';
export const NEW_PRODUCT = 'https://www.teacherspayteachers.com/My-Products/New/Digital-Next';
export class TptBrowser {
  constructor(local) { this.local=local; this.context=null; this.page=null; }
  async open() {
    if (!this.context) {
      await mkdir(this.local,{recursive:true,mode:0o700});
      this.context=await chromium.launchPersistentContext(path.join(this.local,'browser'),{channel:'chrome',headless:false});
      this.context.setDefaultTimeout(15000);
      this.page=this.context.pages()[0] || await this.context.newPage();
    }
    return this.page;
  }
  assertOrigin() {
    if (new URL(this.page.url()).origin!=='https://www.teacherspayteachers.com') throw new Error('TPT login or navigation required');
  }
  async login() { const p=await this.open(); await p.goto(NEW_PRODUCT,{waitUntil:'domcontentloaded',timeout:60000}); return this.inspect(); }
  async inspect() {
    const p=await this.open(); this.assertOrigin();
    const uploads=await p.locator('input[type="file"]').evaluateAll(inputs=>inputs.map(e=>({id:e.id,selected:[...e.files].map(f=>({name:f.name,size:f.size})),processed:!![...document.querySelectorAll('input[type="hidden"]')].find(h=>h.id===e.id&&h.value)})));
    return {url:p.url(),form:await p.locator('input[type="file"]#ItemDigitalProduct').count()>0,uploads,snapshot:await p.locator('body').ariaSnapshot()};
  }
  async choose(label,value) {
    const p=this.page, input=p.getByRole('combobox',{name:new RegExp('^'+label)});
    await input.click();
    if (await input.evaluate(e=>e.tagName==='SELECT')) await input.selectOption({label:value});
    else {
      if (await input.evaluate(e=>e.tagName==='INPUT')) await input.fill(value);
      await p.getByRole('option',{name:value,exact:true}).click();
    }
  }
  async options(label) {
    this.assertOrigin();await this.page.getByRole('combobox',{name:new RegExp('^'+label)}).click();
    return this.page.getByRole('option').allTextContents();
  }
  async attach(inputId,file) {
    const input=this.page.locator('input[type="file"]#'+inputId);
    // TPT can render inputs before its upload event handlers attach.
    // Retry a file selection only when the page has not acknowledged its filename.
    for(let attempt=0;attempt<2;attempt++){
      await input.setInputFiles(file);
      try{await this.page.getByText(path.basename(file),{exact:false}).first().waitFor({state:'visible',timeout:10000});return;}
      catch(e){if(attempt)throw new Error('TPT did not acknowledge file selection: '+path.basename(file));}
    }
  }
  async applyDetails(product) {
    this.assertOrigin();const p=this.page,l=product.listing;
    await this.attach('ItemDigitalPreview',product.previewPath);
    if(product.videoPreviewPath)await this.attach('UploadVideopreview',product.videoPreviewPath);
    await this.choose('Tax Code',l.pricing.taxCode);
    for(const subject of l.categories.subjects)await this.choose('Subject Area',subject);
    for(const tag of l.categories.tags)await this.choose('Tag',tag);
    for(const format of l.categories.formats)await this.choose('Format',format);
    if(l.categories.customCategories.length)throw new Error('Custom categories require review in the browser');
    await this.choose('Teaching Duration',l.details.teachingDuration);
    await this.choose('Answer Key',l.details.answerKey);
    await p.getByRole('textbox',{name:'Number of Pages or Slides',exact:true}).fill(l.details.pageCountDisplay);
    const copyright=l.copyright.declaration==='original'?'I attest that this product I am about to post is an original work':'I attest that I have used copyrighted and/or trademarked materials';
    await p.getByRole('radio',{name:new RegExp('^'+copyright)}).check();
    for(const key of ['CCSS','NGSS','TEKS','VA_SOL'])if(l.educationStandards[key].length)throw new Error('Standard tags require verified manual selection before submitting: '+key);
  }
  async prepare(product, options={}) {
    const p=await this.open();
    const previous=await this.record(product.id);
    if (previous && ['submission_attempted','submitted_unverified','verified'].includes(previous.status)) throw new Error('Submission already attempted; reconcile status before creating another listing');
    await p.goto(NEW_PRODUCT,{waitUntil:'domcontentloaded',timeout:60000}); this.assertOrigin();
    await p.getByRole('textbox',{name:'TitleRequired',exact:true}).fill(product.title);
    await enterDescription(p,product.description);
    await p.getByRole('textbox',{name:'PriceRequired',exact:true}).fill(product.price.toFixed(2));
    await p.getByRole('textbox',{name:'Multiple LicensesRequired',exact:true}).fill((options.multipleLicensePrice??product.listing.pricing.multipleLicensePrice).toFixed(2));
    if(product.listing.pricing.bundleDiscountPrice!==null)await p.getByRole('textbox',{name:'Bundle Discount Price',exact:true}).fill(product.listing.pricing.bundleDiscountPrice.toFixed(2));
    await this.attach('ItemDigitalProduct',product.packagePath);
    await p.getByRole('radio',{name:'Upload thumbnails now',exact:true}).check();
    for (let i=0;i<product.images.length;i++) await this.attach('ItemDigitalThumb'+(i+1),product.images[i]);
    for (const grade of product.listing.categories.grades) await p.getByRole('checkbox',{name:grade,exact:true}).check();
    await this.applyDetails(product);
    await p.getByRole('checkbox',{name:'Make Listing Active',exact:true}).uncheck();
    this.current=product.id;
    await this.save(product.id,{status:'prepared',title:product.title,price:product.price});
    return {status:'prepared',note:'Files selected; inspect upload completion and remaining required categories before submission.',...(await this.inspect())};
  }
  async record(id) { try {return JSON.parse(await readFile(path.join(this.local,id+'.json'),'utf8'));} catch(e) {if(e.code==='ENOENT')return null; throw e;} }
  async save(id,data) {
    const record={id,...data,at:new Date().toISOString()};
    await mkdir(this.local,{recursive:true,mode:0o700});
    await writeFile(path.join(this.local,id+'.json'),JSON.stringify(record,null,2),{mode:0o600});
    await appendFile(path.join(this.local,'events.jsonl'),JSON.stringify(record)+'\n',{mode:0o600});
    return record;
  }
  async submit(id,active) {
    this.assertOrigin();
    if (this.current!==id || (await this.record(id))?.status!=='prepared') throw new Error('Prepare and review this product in the current session first');
    const p=this.page;
    const originalUrl=p.url();
    const view=await this.inspect();
    if(this.current!==id)throw new Error('Submission cancelled before upload validation');
    const required=['ItemDigitalProduct','ItemDigitalPreview','ItemDigitalThumb1','ItemDigitalThumb2','ItemDigitalThumb3','ItemDigitalThumb4'];
    const editing=p.url().includes('/itemsDigital/editNext/');
    const customThumbnails=await p.getByRole('radio',{name:'Upload thumbnails now',exact:true}).isChecked();
    if(!customThumbnails)await p.getByRole('radio',{name:/^Auto generate thumbnails from the product file/}).check();
    const requiredInputs=required.filter(inputId=>(!editing||!['ItemDigitalProduct','ItemDigitalPreview'].includes(inputId))&&(customThumbnails||!inputId.startsWith('ItemDigitalThumb')));
    if(requiredInputs.some(id=>!view.uploads.find(u=>u.id===id)?.processed))throw new Error('Wait for every product, preview and thumbnail upload to finish before submitting');
    if(editing&&(!await p.locator('a[href*="/Download/"]').count()||!await p.locator('a[href*="/Preview/"]').count()))throw new Error('Existing product or preview missing');
    await p.getByRole('checkbox',{name:'Make Listing Active',exact:true}).setChecked(active);
    if(this.current!==id)throw new Error('Submission cancelled before persistence');
    // Persist before clicking: a timeout must never cause an automatic duplicate submission.
    await this.save(id,{status:'submission_attempted',active,url:p.url(),thumbnailMode:customThumbnails?'upload-now':'auto-generate'});
    if(this.current!==id)throw new Error('Submission cancelled; reconcile the recorded attempt before retrying');
    await p.getByRole('button',{name:'Submit',exact:true}).click();
    await p.waitForURL(u=>u.href!==originalUrl,{timeout:30000}).catch(()=>{});
    return this.save(id,{status:'submitted_unverified',active,url:p.url(),thumbnailMode:customThumbnails?'upload-now':'auto-generate',note:'Inspect seller listing and verify its product ID. A click or redirect alone is not publication proof.'});
  }
  async editDescription(product,remoteId) {
    await this.verify(product,remoteId);
    const structure=await enterDescription(this.page,product.description);
    await this.page.getByRole('radio',{name:/^Auto generate thumbnails from the product file/}).check();
    this.current=product.id;
    await this.save(product.id,{status:'prepared',remoteId,url:this.page.url(),operation:'description_formatting',structure});
    return {status:'prepared',structure,note:'Rich description entered; submit to save the existing listing.'};
  }
  async verify(product,remoteId) {
    if(!/^\d+$/.test(remoteId))throw new Error('Invalid remote product ID');
    const p=await this.open();
    const editUrl='https://www.teacherspayteachers.com/itemsDigital/editNext/'+remoteId;
    if(p.url()!==editUrl)await p.goto(editUrl,{waitUntil:'domcontentloaded',timeout:60000});
    this.assertOrigin();
    // Edit fields hydrate after the initial document and input controls exist.
    for(let i=0;i<40;i++){
      if((await p.getByRole('textbox',{name:'TitleRequired',exact:true}).inputValue())===product.title && Number(await p.getByRole('textbox',{name:'PriceRequired',exact:true}).inputValue())===product.price)break;
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    const title=await p.getByRole('textbox',{name:'TitleRequired',exact:true}).inputValue();
    const price=Number(await p.getByRole('textbox',{name:'PriceRequired',exact:true}).inputValue());
    if(title!==product.title || price!==product.price)throw new Error('Saved title or price does not match this product');
    const normalize=s=>s.replace(/\s+/g,' ').trim();
    const description=await p.getByRole('textbox',{name:'Description',exact:true}).innerText();
    const normalizeCopy=s=>normalize(s.replace(/(^|\s)-\s+/g,'$1'));
    if(normalizeCopy(description)!==normalizeCopy(product.description))throw new Error('Saved description differs from the listing record');
    const l=product.listing;
    for(const grade of l.categories.grades)if(!await p.getByRole('checkbox',{name:grade,exact:true}).isChecked())throw new Error('Missing saved grade: '+grade);
    for(const value of [...l.categories.subjects,...l.categories.tags,...l.categories.formats])if(!await p.getByRole('button',{name:value,exact:true}).count())throw new Error('Missing saved category: '+value);
    for(const [name,value] of [['Teaching Duration',l.details.teachingDuration],['Answer Key',l.details.answerKey]])if(normalize(await p.getByRole('combobox',{name,exact:true}).innerText())!==value)throw new Error('Saved field differs: '+name);
    if(await p.getByRole('textbox',{name:'Number of Pages or Slides',exact:true}).inputValue()!==l.details.pageCountDisplay)throw new Error('Saved resource size differs');
    const thumbnailMode=(await this.record(product.id))?.thumbnailMode||'upload-now';
    let thumbnailsVerified=0;
    for(let i=0;i<60;i++){
      thumbnailsVerified=await p.locator('input[type="hidden"]').evaluateAll(inputs=>inputs.filter(e=>/^ItemDigitalThumb[1-4]$/.test(e.id)&&e.value).length);
      if(thumbnailsVerified>=(thumbnailMode==='auto-generate'?1:4))break;
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    if(thumbnailsVerified<(thumbnailMode==='auto-generate'?1:4))throw new Error('Saved thumbnails not confirmed for '+thumbnailMode);
    // TPT renames assets from the listing title after background processing.
    const savedDownload=p.locator('a[href*="/Download/"][href*="-'+remoteId+'?"]');
    const savedPreview=p.locator('a[href*="/Preview/"][href*="-'+remoteId+'?"]');
    for(const link of [savedDownload,savedPreview])if(!((await link.getAttribute('href'))||'').includes('-'+remoteId+'?'))throw new Error('Saved product or preview link not confirmed for this remote ID');
    const active=await p.getByRole('checkbox',{name:'Make Listing Active',exact:true}).isChecked();
    if(Number(await p.getByRole('textbox',{name:'Multiple LicensesRequired',exact:true}).inputValue())!==l.pricing.multipleLicensePrice)throw new Error('Saved multiple-license price differs');
    if(normalize(await p.getByRole('combobox',{name:/^Tax CodeRequired/}).innerText())!==l.pricing.taxCode)throw new Error('Saved tax code differs');
    const editor=p.getByRole('textbox',{name:'Description',exact:true});
    const formatting={paragraphs:await editor.locator('p,div').count(),headings:await editor.locator('strong,b').count(),listItems:await editor.locator('li').count()};
    await editor.screenshot({path:path.join(this.local,'description-preview.png')});
    return this.save(product.id,{status:'verified',remoteId,url:p.url(),active,title,price,filesVerified:2+thumbnailsVerified,thumbnailMode,thumbnailsVerified,formatting,downloadUrl:await savedDownload.getAttribute('href'),previewUrl:await savedPreview.getAttribute('href'),fieldsVerified:['title','description','price','multipleLicensePrice','taxCode','grades','subjects','tags','formats','teachingDuration','pageCountDisplay','answerKey']});
  }
  async close() {this.current=null;const context=this.context;this.context=null;this.page=null;if(context)await context.close();}
}

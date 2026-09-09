export function descriptionBlocks(text) {
  const result=[];
  for(const block of text.split(/\n\s*\n/)){
    const lines=block.split('\n').filter(Boolean);
    if(/^[A-Z][A-Z ]+$/.test(lines[0]))result.push({type:'heading',text:lines.shift()});
    if(!lines.length)continue;
    if(lines.every(line=>line.startsWith('- ')))result.push({type:'list',items:lines.map(s=>s.slice(2))});
    else result.push({type:'paragraph',text:lines.join(' ')});
  }
  return result;
}
export async function enterDescription(page,text) {
  const editor=page.getByRole('textbox',{name:'Description',exact:true});
  await editor.fill('');await editor.click();
  for(const block of descriptionBlocks(text)){
    if(block.type==='list'){
      await page.getByRole('button',{name:'unordered list',exact:true}).click();
      for(let i=0;i<block.items.length;i++){
        await page.keyboard.insertText(block.items[i]);
        if(i<block.items.length-1)await page.keyboard.press('Enter');
      }
      await page.keyboard.press('Enter');await page.keyboard.press('Enter');
    }else{
      if(block.type==='heading')await page.keyboard.press('ControlOrMeta+b');
      await page.keyboard.insertText(block.text);
      if(block.type==='heading')await page.keyboard.press('ControlOrMeta+b');
      await page.keyboard.press('Enter');
    }
  }
  const structure={paragraphs:await editor.locator('p,div').count(),headings:await editor.locator('strong,b').count(),listItems:await editor.locator('li').count()};
  if(descriptionBlocks(text).some(b=>b.type==='list')&&!structure.listItems)throw new Error('Description editor did not retain bullet-list formatting');
  return structure;
}

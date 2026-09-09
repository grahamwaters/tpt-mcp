import test from 'node:test';
import assert from 'node:assert/strict';
import {descriptionBlocks} from './description.mjs';
test('plain listing text becomes paragraphs, headings and real list entries',()=>{
 const blocks=descriptionBlocks('An introduction.\n\nWHAT YOU GET\n\n- First item\n- Second item\n\nHOW TO USE\nOpen the file.');
 assert.deepEqual(blocks,[{type:'paragraph',text:'An introduction.'},{type:'heading',text:'WHAT YOU GET'},{type:'list',items:['First item','Second item']},{type:'heading',text:'HOW TO USE'},{type:'paragraph',text:'Open the file.'}]);
});

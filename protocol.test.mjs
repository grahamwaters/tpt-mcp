import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {fileURLToPath} from 'node:url';
import {createFixture} from './test-fixture.mjs';
test('MCP stdio handshake and catalog call work without a private catalog',async()=>{
 const f=await createFixture(),client=new Client({name:'public-smoke-test',version:'1.0.0'});
 const env=Object.fromEntries(Object.entries(process.env).filter(([,v])=>typeof v==='string'));
 try{await client.connect(new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('server.mjs',import.meta.url))],env:{...env,TPT_WORKSPACE:f.root},stderr:'pipe'}));
 const {tools}=await client.listTools();for(const name of ['tpt_prepare_product','tpt_submit_product','tpt_verify_saved_product','tpt_format_saved_description'])assert.ok(tools.some(t=>t.name===name));
 const result=await client.callTool({name:'tpt_list_products',arguments:{}});assert.equal(JSON.parse(result.content[0].text)[0].id,'example-product');
 const invalid=await client.callTool({name:'tpt_get_product',arguments:{id:'missing'}});assert.equal(invalid.isError,true);
 }finally{await client.close();await f.cleanup();}
});

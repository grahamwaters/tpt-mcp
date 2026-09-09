// Terminal MCP client for verification and environments awaiting a tool-list reload.
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import {writeFile,mkdir} from 'node:fs/promises';
await mkdir(new URL(".local/",import.meta.url),{recursive:true,mode:0o700});
const client=new Client({name:'educode-operator',version:'1.0.0'});
await client.connect(new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('server.mjs',import.meta.url))],stderr:'inherit'}));
console.log('Ready: enter one JSON {name,arguments} per line.');
for await(const line of createInterface({input:process.stdin})){
 try{const result=await client.callTool(JSON.parse(line),undefined,{timeout:180000});await writeFile(new URL('.local/last-response.json',import.meta.url),JSON.stringify(result,null,2),{mode:0o600});for(const c of result.content||[])if(c.type==='text'){try{const data=JSON.parse(c.text);if(data.snapshot){console.log(JSON.stringify({...data,snapshot:undefined}));console.log(data.snapshot.slice(data.snapshot.indexOf('- heading "Upload New Product"'),data.snapshot.lastIndexOf('- link "TPT"')));}else console.log(c.text);}catch{console.log(c.text);}}}catch(e){console.error(e.message);}
}
await client.close();

import {TptBrowser} from './browser.mjs';
import {fileURLToPath} from 'node:url';
const browser=new TptBrowser(fileURLToPath(new URL('.local/',import.meta.url)));
await browser.login();
console.error('Sign into TPT in the dedicated Chrome window. Close the window when finished.');

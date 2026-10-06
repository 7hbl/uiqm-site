import fs from 'fs';
import vm from 'vm';

const code = fs.readFileSync('views/dist/scram/working.all.js', 'utf8');
const context = { globalThis: {}, self: {}, window: {}, TextDecoder, TextEncoder, URL, WebSocket: class {}, location: new URL('https://uiqm.lol/'), EventTarget, Event, fetch, Headers, Request, Response };
context.globalThis = context;
context.self = context;
context.window = context;
vm.createContext(context);

try {
  vm.runInContext(code, context);
  const sj = context['$scramjet'];
  console.log('Scramjet keys:', Object.keys(sj || {}));
  if (typeof sj?.defaultConfig === 'function') {
    console.log('defaultConfig():', sj.defaultConfig());
  }
} catch(e) {
  console.log('eval error:', e.message);
}

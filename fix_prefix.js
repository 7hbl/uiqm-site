const fs = require('fs');
const hubPath = 'c:\\Users\\attem\\Downloads\\InvisiProxy-6.9.6\\uiqm site\\views\\pages\\hub.html';
let content = fs.readFileSync(hubPath, 'utf8').replace(/\r\n/g, '\n');

// FIX: Revert to /worker/ prefix (server maps scram -> worker, so /worker/ is correct URL externally)
// The altPaths in routes.mjs: scram: 'worker' means /scram/file.js is served at /worker/file.js
content = content.replace(
    "const SCRAMJET_PREFIX = '/scram/network/', WISP_URL",
    "const SCRAMJET_PREFIX = '/worker/network/', WISP_URL"
);
content = content.replace(
    "const WORKER_ROOT = '/scram/';",
    "const WORKER_ROOT = '/worker/';"
);
content = content.replace(
    "await navigator.serviceWorker.register('/scram/working.sw.js', {\n                        scope: '/scram/'",
    "await navigator.serviceWorker.register('/worker/working.sw.js', {\n                        scope: '/worker/'"
);
content = content.replace(
    "script.src = '/scram/working.all.js';",
    "script.src = '/worker/working.all.js';"
);

fs.writeFileSync(hubPath, content);
console.log('hub.html reverted to /worker/ prefix (correct for this server)');

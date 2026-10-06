const fs = require('fs');
const code = fs.readFileSync('views/dist/scram/working.all.js', 'utf8');
const end = code.slice(-2000);
console.log('End of working.all.js:', end);

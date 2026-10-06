const fs = require('fs');
const code = fs.readFileSync('views/dist/scram/working.all.js', 'utf8');
const fakeSelf = {
    location: { origin: 'https://uiqm.lol', protocol: 'https:', host: 'uiqm.lol' },
    navigator: { userAgent: 'test' }
};
const fn = new Function('self', 'globalThis', 'window', 'location', 'navigator', code + '\nreturn $scramjet;');
const sj = fn(fakeSelf, fakeSelf, fakeSelf, fakeSelf.location, fakeSelf.navigator);
console.log('Resulting $scramjet:', sj ? Object.keys(sj) : null);
if (sj) {
    console.log('ScramjetFetchHandler:', typeof sj.ScramjetFetchHandler);
    console.log('defaultConfig:', sj.defaultConfig);
}

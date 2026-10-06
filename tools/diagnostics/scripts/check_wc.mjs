fetch('https://www.youtube.com/s/desktop/85a3164d/jsbin/webcomponents-all-noPatch.vflset/webcomponents-all-noPatch.js')
  .then(r => r.text())
  .then(t => {
    console.log('webcomponents-sd in webcomponents-all:', t.includes('webcomponents-sd'));
    const matches = t.match(/["'][^"']*\.js["']/g);
    console.log('JS files mentioned in webcomponents-all:', matches);
  });

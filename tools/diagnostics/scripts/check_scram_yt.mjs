fetch('https://uiqm.lol/worker/network/https%3A%2F%2Fwww.youtube.com')
  .then(r => r.text())
  .then(t => {
    const scripts = t.match(/<script[^>]*src=[^>]*>/g) || [];
    console.log(`Found ${scripts.length} rewritten script tags:`);
    scripts.forEach((s, i) => console.log(`${i+1}: ${s}`));
  })
  .catch(e => console.error(e));

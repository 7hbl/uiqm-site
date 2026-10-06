fetch('https://www.youtube.com/', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } })
  .then(r => r.text())
  .then(t => {
    const scripts = t.match(/<script[^>]*src=[^>]*>/g) || [];
    console.log(`Found ${scripts.length} script tags with src:`);
    scripts.forEach((s, i) => console.log(`${i+1}: ${s}`));
  });

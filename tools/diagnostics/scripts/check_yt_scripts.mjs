fetch('https://www.youtube.com/', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } })
  .then(r => r.text())
  .then(t => {
    const scripts = t.match(/["']([^"']*\.js[^"']*)["']/g);
    const matches = scripts ? scripts.filter(s => s.includes('spf') || s.includes('scheduler') || s.includes('network') || s.includes('adapter') || s.includes('webcomponents') || s.includes('observer')) : [];
    console.log('Matches:', matches);
  });

const res = await fetch('https://www.wikipedia.org');
const html = await res.text();
const matches = [...html.matchAll(/src=["']([^"']+)["']/g)];
for (const m of matches) {
  console.log('SRC:', m[1]);
}

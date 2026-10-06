function fix(url) {
    return url
        .replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)@([^/]+)\//gi, 'https://raw.githack.com/$1/$2/$3/')
        .replace(/https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)\//gi, 'https://raw.githack.com/$1/$2/master/');
}

const urls = [
    'https://cdn.jsdelivr.net/gh/gn-math/assets@51462750d29b68ac1e33887c1bf13d9c478d5ead/198/Build/UnityLoader.js',
    'https://cdn.jsdelivr.net/gh/genizy/web-port@main/jelly-drift/Build/UnityLoader.js',
    'https://cdn.jsdelivr.net/gh/genizy/assets@main/retro-bowl/html5game/RetroBowl.js',
    'https://cdn.jsdelivr.net/gh/bubbls/subwaysurfersmerge/4399.ss.js'
];

Promise.all(urls.map(u => fetch(fix(u)).then(r => ({ orig: u, fixed: fix(u), status: r.status }))))
  .then(console.log)
  .catch(console.error);

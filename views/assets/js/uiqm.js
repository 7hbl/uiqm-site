document.addEventListener('DOMContentLoaded', async () => {
    const input = document.getElementById('term-input');
    const output = document.getElementById('term-output-lines');
    const terminal = document.getElementById('terminal-shell');
    const frame = document.getElementById('proxy-frame');
    const loading = document.getElementById('proxy-loading');
    const proxyShell = document.getElementById('proxy-shell');
    const statusLine = document.getElementById('status-line');

    const WISP_URL = (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host + '/cron/';
    const BARE_MUX_WORKER = '/gmt/worker.js';
    const SCRAMJET_SW = '/worker/working.sw.js';
    const TRANSPORT_MJS = '/unix/index.mjs';
    const SCRAMJET_PREFIX = '/worker/network/';

    let sjEncode = null;
    let isReady = false;

    const print = (text, type = '') => {
        const div = document.createElement('div');
        div.className = `line ${type}`;
        div.innerHTML = text;
        output.appendChild(div);
        terminal.scrollTop = terminal.scrollHeight;
    };

    const initProxy = async () => {
        try {
            if (!navigator.serviceWorker) {
                statusLine.innerHTML = '<span style="color:red">Error: Browser does not support Service Workers.</span>';
                return;
            }

            // 1. Initialize BareMux
            const { BareMuxConnection } = window.BareMux || {};
            if (BareMuxConnection) {
                const conn = new BareMuxConnection(BARE_MUX_WORKER);
                await conn.setTransport(TRANSPORT_MJS, [{ wisp: WISP_URL }]);
            }

            // 2. Register Scramjet SW
            const registration = await navigator.serviceWorker.register(SCRAMJET_SW, {
                scope: '/worker/'
            });

            // 3. Robust Controller Sync
            const waitForController = () => new Promise(resolve => {
                if (navigator.serviceWorker.controller) return resolve();
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (navigator.serviceWorker.controller) resolve();
                });
                setTimeout(() => { if (!navigator.serviceWorker.controller) location.reload(); }, 4000);
            });

            await waitForController();

            // 4. Initialize Scramjet Controller
            if (window.$scramjetLoadController) {
                const { ScramjetController } = await window.$scramjetLoadController();
                const scramjet = new ScramjetController({
                    prefix: SCRAMJET_PREFIX,
                    files: {
                        wasm: '/worker/working.wasm.wasm',
                        all: '/worker/working.all.js',
                        sync: '/worker/working.sync.js',
                    }
                });
                scramjet.init();
                sjEncode = (url) => scramjet.encodeUrl(url);
            }

            statusLine.innerHTML = '<span style="color:#00ff00">Secure Channel Active. System ready.</span>';
            input.disabled = false;
            input.focus();
            isReady = true;

        } catch (e) {
            console.error('Initialization failed:', e);
            statusLine.innerHTML = '<span style="color:red">Secure Channel Failed. Check console for details.</span>';
        }
    };

    const runCommand = (cmd) => {
        const raw = cmd.trim();
        if (!raw || !isReady) return;

        print(`<span class="term-prefix">root@uiqm:~$</span> ${raw}`);
        const parts = raw.split(' ');
        const base = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (base === 'help') {
            print('Command List:', 'system');
            print(' theme [color], <span style="color:white">creds</span>, clear, [url]');
            return;
        }

        if (base === 'creds') {
            print('Huge thanks to <a href="https://github.com/QuiteAFancyEmerald" target="_blank" style="color:white">QuiteAFancyEmerald</a> for the original InvisiProxy engine.');
            print('This terminal fork is just skidded :p <3', 'system');
            return;
        }

        if (base === 'theme') {
            const color = args[0]?.toLowerCase();
            const valid = ['red', 'green', 'blue', 'white', 'pink', 'purple', 'cyan'];
            if (valid.includes(color)) {
                document.body.setAttribute('data-theme', color === 'red' ? 'default' : color);
                print(`Theme updated: ${color}.`, 'system');
            } else {
                print(`Error: theme "${color}" not found.`, 'system');
            }
            return;
        }

        if (base === 'clear') { output.innerHTML = ''; return; }

        if (raw.includes('.') && !raw.includes(' ')) {
            if (!navigator.serviceWorker.controller) {
                print('Re-syncing Secure Channel... Refresh required.', 'system');
                location.reload();
                return;
            }

            let url = raw;
            if (!url.startsWith('http')) url = 'https://' + url;
            
            print(`Routing via Scramjet...`, 'system');
            proxyShell.style.display = 'block';
            loading.style.display = 'flex';
            frame.style.display = 'block';
            frame.src = sjEncode ? sjEncode(url) : (SCRAMJET_PREFIX + encodeURIComponent(url));
            return;
        }

        print(`Command not found: ${base}.`, 'system');
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            runCommand(input.value);
            input.value = '';
        }
    });

    document.addEventListener('click', () => { if(isReady) input.focus(); });
    frame.onload = () => { loading.style.display = 'none'; print(`Loaded.`, 'system'); };

    await initProxy();
});

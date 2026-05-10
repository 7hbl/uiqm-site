document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('term-input');
    const output = document.getElementById('term-output-lines');
    const terminal = document.getElementById('terminal-shell');
    const frame = document.getElementById('proxy-frame');
    const loading = document.getElementById('proxy-loading');
    const proxyShell = document.getElementById('proxy-shell');

    const print = (text, type = '') => {
        const div = document.createElement('div');
        div.className = `line ${type}`;
        div.innerHTML = text;
        output.appendChild(div);
        terminal.scrollTop = terminal.scrollHeight;
    };

    const runCommand = (cmd) => {
        const raw = cmd.trim();
        const parts = raw.split(' ');
        const base = parts[0].toLowerCase();
        const args = parts.slice(1);

        print(`<span class="term-prefix">root@uiqm:~$</span> ${raw}`);

        if (base === 'help') {
            print('Command List:', 'system');
            print(' <span style="color:white">theme [red|green|blue|white]</span>');
            print(' <span style="color:white">clear</span> - clear console');
            print(' <span style="color:white">[url]</span> - browse site');
            return;
        }

        if (base === 'theme') {
            const color = args[0]?.toLowerCase();
            const valid = ['red', 'green', 'blue', 'white'];
            if (valid.includes(color)) {
                document.body.setAttribute('data-theme', color === 'red' ? 'default' : color);
                print(`Theme updated: ${color}.`, 'system');
            } else {
                print('Error: theme not found.', 'system');
            }
            return;
        }

        if (base === 'clear') {
            output.innerHTML = '';
            return;
        }

        if (raw) {
            let url = raw;
            if (!url.includes('.') || url.includes(' ')) {
                url = 'https://duckduckgo.com/?q=' + encodeURIComponent(raw);
            } else if (!url.startsWith('http')) {
                url = 'https://' + url;
            }

            print(`Routing via Scramjet...`, 'system');
            
            proxyShell.style.display = 'block';
            loading.style.display = 'flex';
            frame.style.display = 'block';
            
            frame.src = '/worker/' + encodeURIComponent(url);
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            runCommand(input.value);
            input.value = '';
        }
    });

    document.addEventListener('click', () => input.focus());
    
    frame.onload = () => {
        loading.style.display = 'none';
        print(`Loaded.`, 'system');
    };
});

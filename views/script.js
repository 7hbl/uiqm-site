document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('terminal-input');
    const output = document.getElementById('output');
    const terminal = document.getElementById('terminal');

    // Always keep input focused
    document.addEventListener('click', () => input.focus());

    const print = (text, type = '') => {
        const div = document.createElement('div');
        div.className = `line ${type}`;
        div.innerHTML = text;
        output.appendChild(div);
        terminal.scrollTop = terminal.scrollHeight;
    };

    const processCommand = (raw) => {
        const cmd = raw.trim();
        const parts = cmd.split(' ');
        const base = parts[0].toLowerCase();
        const args = parts.slice(1);

        print(`<span class="prompt-label">root@uiqm:~$</span> ${raw}`);

        if (base === 'help') {
            print('Available commands:', 'system');
            print(' <span style="color:white">theme [color]</span> - Change text color');
            print(' <span style="color:white">clear</span> - Clear screen');
            print(' <span style="color:white">[url]</span> - Open site through proxy');
            return;
        }

        if (base === 'theme') {
            const color = args[0]?.toLowerCase();
            const valid = ['red', 'green', 'blue', 'white'];
            if (valid.includes(color)) {
                document.body.setAttribute('data-theme', color === 'red' ? 'default' : color);
                print(`Theme updated to ${color}.`, 'system');
            } else {
                print('Error: usage "theme [red/green/blue/white]"', 'system');
            }
            return;
        }

        if (base === 'clear') {
            output.innerHTML = '';
            return;
        }

        if (cmd) {
            let url = cmd;
            if (!url.includes('.') || url.includes(' ')) {
                url = 'https://duckduckgo.com/?q=' + encodeURIComponent(cmd);
            } else if (!url.startsWith('http')) {
                url = 'https://' + url;
            }

            print(`Routing via Scramjet...`, 'system');
            
            setTimeout(() => {
                window.location.href = '/worker/' + encodeURIComponent(url);
            }, 600);
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = input.value;
            processCommand(val);
            input.value = '';
        }
    });
});

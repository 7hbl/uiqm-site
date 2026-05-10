document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('terminal-input');
    const output = document.getElementById('output');
    const terminal = document.getElementById('terminal');

    // Focus input on click anywhere
    terminal.addEventListener('click', () => input.focus());

    const addLine = (text, type = '') => {
        const div = document.createElement('div');
        div.className = `line ${type}`;
        div.innerHTML = text;
        output.appendChild(div);
        terminal.scrollTop = terminal.scrollHeight;
    };

    const handleCommand = (cmd) => {
        const parts = cmd.trim().split(' ');
        const baseCmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        addLine(`<span class="prompt-prefix">root@uiqm:~$</span> ${cmd}`);

        if (baseCmd === 'help') {
            addLine('available commands:', 'system');
            addLine('<span class="help-cmd">theme [color]</span> - changes terminal text color');
            addLine('  options: red (default), green, blue, white', 'system');
            return;
        }

        if (baseCmd === 'theme') {
            const color = args[0]?.toLowerCase();
            const themes = ['red', 'green', 'blue', 'white'];
            if (themes.includes(color)) {
                document.body.setAttribute('data-theme', color === 'red' ? 'default' : color);
                addLine(`theme changed to ${color}`, 'system');
            } else {
                addLine('usage: theme [red|green|blue|white]', 'system');
            }
            return;
        }

        if (baseCmd === 'clear') {
            output.innerHTML = '';
            return;
        }

        // URL Handling
        if (cmd) {
            let url = cmd;
            if (!url.includes('.') || url.includes(' ')) {
                // If it's a search, use DuckDuckGo
                url = 'https://duckduckgo.com/?q=' + encodeURIComponent(cmd);
            } else if (!url.startsWith('http')) {
                url = 'https://' + url;
            }

            addLine(`proxying to: ${url}...`, 'system');
            
            // Defaulting to Scramjet (/worker/)
            // Fallback logic could be complex purely client-side, but usually we just route.
            setTimeout(() => {
                window.location.href = '/worker/' + encodeURIComponent(url);
            }, 500);
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const cmd = input.value;
            handleCommand(cmd);
            input.value = '';
        }
    });
});

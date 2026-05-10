document.addEventListener('DOMContentLoaded', () => {
    // Theme Persistence
    const savedTheme = localStorage.getItem('uiqm-theme') || 'default';
    document.body.setAttribute('data-theme', savedTheme);
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) themeSelector.value = savedTheme;

    // Show initial engine selection if not already selected
    if (!sessionStorage.getItem('engine-selected')) {
        document.getElementById('initial-proxy-modal')?.classList.add('active');
    }

    // Proxy Engine Logic
    window.selectInitialProxy = (engine) => {
        localStorage.setItem('proxy-engine', engine);
        sessionStorage.setItem('engine-selected', 'true');
        document.getElementById('initial-proxy-modal')?.classList.remove('active');
    };

    // Modal Handlers
    window.openModal = (id) => {
        document.getElementById(id)?.classList.add('active');
    };

    window.forceCloseModal = (id) => {
        document.getElementById(id)?.classList.remove('active');
    };

    window.closeModal = (e, id) => {
        if (e.target.classList.contains('modal-overlay')) {
            forceCloseModal(id);
        }
    };

    // Tab Switching
    window.switchThemeTab = (tabId, btn) => {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(tabId)?.classList.add('active');
        btn.classList.add('active');
    };

    // Theme Switching
    window.changeTheme = () => {
        const theme = document.getElementById('theme-selector').value;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('uiqm-theme', theme);
    };

    // Cloaking Logic
    window.applyPresetCloak = () => {
        const preset = document.getElementById('preset-cloak').value;
        const presets = {
            classroom: { title: 'Google Classroom', icon: 'https://ssl.gstatic.com/classroom/favicon.png' },
            drive: { title: 'My Drive - Google Drive', icon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png' },
            canvas: { title: 'Dashboard', icon: 'https://du11bjcvkw4z7.cloudfront.net/canvas/images/favicon.ico' }
        };

        if (presets[preset]) {
            document.title = presets[preset].title;
            const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = presets[preset].icon;
            document.getElementsByTagName('head')[0].appendChild(link);
        }
    };

    // Search Logic
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');

    const handleSearch = () => {
        const query = searchInput.value.trim();
        const engine = localStorage.getItem('proxy-engine') || 'pr-sj';
        const searchEngine = document.getElementById('search-engine-select').value;

        if (!query) return;

        let url = query;
        if (!query.includes('.') || query.includes(' ')) {
            const engines = {
                Google: 'https://www.google.com/search?q=',
                DuckDuckGo: 'https://duckduckgo.com/?q=',
                Brave: 'https://search.brave.com/search?q=',
                Bing: 'https://www.bing.com/search?q='
            };
            url = engines[searchEngine] + encodeURIComponent(query);
        } else if (!query.startsWith('http')) {
            url = 'https://' + query;
        }

        const pathPrefix = engine === 'pr-sj' ? '/worker/' : (engine === 'pr-uv' ? '/network/' : '/physics/');
        window.location.href = pathPrefix + encodeURIComponent(url);
    };

    searchBtn?.addEventListener('click', handleSearch);
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
});

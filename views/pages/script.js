window.addEventListener('load', () => {
    openModal('initial-proxy-modal');

    const savedTheme = localStorage.getItem('uiqm-theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) themeSelector.value = savedTheme;
    }
    
    const savedTitle = localStorage.getItem('uiqm-title');
    const savedIcon = localStorage.getItem('uiqm-icon');
    if (savedTitle) setDocumentTitle(savedTitle);
    if (savedIcon) setDocumentIcon(savedIcon);
});

let currentEngine = 'pr-sj';

function selectInitialProxy(proxyValue) {
    currentEngine = proxyValue;
    const formPanel = document.getElementById('proxy-engine-wrapper');
    if (formPanel) formPanel.className = 'pr-form ' + proxyValue;
    
    forceCloseModal('initial-proxy-modal');
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(event, modalId) {
    if (event.target.id === modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
}

function forceCloseModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function switchThemeTab(tabId, btn) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
}

function changeTheme() {
    const themeSelector = document.getElementById('theme-selector');
    const theme = themeSelector.value;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('uiqm-theme', theme);
}

document.getElementById('search-btn').addEventListener('click', () => {
    let query = document.getElementById('search-input').value.trim();
    if (!query) return;

    let url = query;
    if (query.includes('.') && !query.includes(' ') && !query.startsWith('http')) {
        url = 'https://' + query;
    } else if (!query.includes('.') || query.includes(' ')) {
        const platform = document.getElementById('search-engine-select').value;
        if (platform === 'Google') url = 'https://www.google.com/search?q=' + encodeURIComponent(query);
        else if (platform === 'DuckDuckGo') url = 'https://duckduckgo.com/?q=' + encodeURIComponent(query);
        else if (platform === 'Bing') url = 'https://www.bing.com/search?q=' + encodeURIComponent(query);
        else if (platform === 'Brave') url = 'https://search.brave.com/search?q=' + encodeURIComponent(query);
        else url = 'https://duckduckgo.com/?q=' + encodeURIComponent(query);
    }
    
    if (currentEngine === 'pr-uv') {
        if (typeof __uv$config !== 'undefined') {
            window.location.href = __uv$config.prefix + __uv$config.encodeUrl(url);
        } else {
            window.location.href = '/uv/service/' + encodeURIComponent(url);
        }
    } else if (currentEngine === 'pr-rh') {
        alert('Rammerhead requires backend session initiation. Attempting static redirect...');
        window.location.href = '/rh/' + encodeURIComponent(url);
    } else {
        window.location.href = '/scram/network/' + encodeURIComponent(url);
    }
});

document.getElementById('search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('search-btn').click();
    }
});


const cloaks = {
    classroom: { title: "Home", icon: "https://ssl.gstatic.com/classroom/favicon.png" },
    drive: { title: "My Drive - Google Drive", icon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" },
    docs: { title: "Google Docs", icon: "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico" },
    canvas: { title: "Dashboard", icon: "https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico" },
    colegia: { title: "Colegia", icon: "https://colegia.org/favicon.ico" }
};

function applyPresetCloak() {
    const preset = document.getElementById('preset-cloak').value;
    if (preset === 'none') {
        const originalTitle = "UIQM Web Proxy";
        const originalIcon = "/assets/ico/ms-icon-144x144.png";
        setDocumentTitle(originalTitle);
        setDocumentIcon(originalIcon);
        localStorage.removeItem('uiqm-title');
        localStorage.removeItem('uiqm-icon');
        return;
    }
    
    const cloak = cloaks[preset];
    if (cloak) {
        setDocumentTitle(cloak.title);
        setDocumentIcon(cloak.icon);
        localStorage.setItem('uiqm-title', cloak.title);
        localStorage.setItem('uiqm-icon', cloak.icon);
        
        document.getElementById('custom-title').value = '';
        document.getElementById('custom-icon').value = '';
    }
}

function applyCustomCloak() {
    const title = document.getElementById('custom-title').value;
    const icon = document.getElementById('custom-icon').value;
    
    if (title) {
        setDocumentTitle(title);
        localStorage.setItem('uiqm-title', title);
    }
    
    if (icon) {
        setDocumentIcon(icon);
        localStorage.setItem('uiqm-icon', icon);
    }
    
    document.getElementById('preset-cloak').value = "none";
}

function setDocumentTitle(title) {
    document.title = title;
}

function setDocumentIcon(url) {
    let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = url;
    document.getElementsByTagName('head')[0].appendChild(link);
}

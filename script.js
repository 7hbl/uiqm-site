/* UIQM Site Client Logic */

// Modal System
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

// Modal Tab Switching Logic
function switchThemeTab(tabId, btn) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
}

// Theme System
function changeTheme() {
    const themeSelector = document.getElementById('theme-selector');
    const theme = themeSelector.value;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('uiqm-theme', theme);
}

// Load saved theme on load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('uiqm-theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) themeSelector.value = savedTheme;
    }
    
    // Load Cloak Settings
    const savedTitle = localStorage.getItem('uiqm-title');
    const savedIcon = localStorage.getItem('uiqm-icon');
    if (savedTitle) setDocumentTitle(savedTitle);
    if (savedIcon) setDocumentIcon(savedIcon);
});

// Proxy Engine Selection
function updateProxyEngine(value) {
    // The common.js from InvisiProxy relies on the parent div having an ID like 'pr-sj', 'pr-uv', 'pr-rh'
    // By changing the ID here, we change which event listeners fire from the common.js file if they hook onto form IDs
    const formPanel = document.querySelector('.pr-form');
    // Note: common.js runs once on load, so changing ID dynamically might not re-attach listeners.
    // However, common.js already setup listeners if we had the ID on load.
    // To make it fully functional with common.js dynamically, we might need to simulate it,
    // but the easiest way is to let common.js attach to all, so we can just update the button.
    
    // Actually, common.js attaches listeners securely. Let's just update the ID of the container
    // If it doesn't work dynamically, we'll refresh page with query param or store it in localStorage.
    formPanel.id = value;
    localStorage.setItem('uiqm-proxy', value);
}

window.addEventListener('load', () => {
    const savedProxy = localStorage.getItem('uiqm-proxy');
    if (savedProxy) {
        const formPanel = document.querySelector('.pr-form');
        if (formPanel) formPanel.id = savedProxy;
        
        // Update radio buttons
        const radios = document.getElementsByName('proxy-type');
        for (let r of radios) {
            if (r.value === savedProxy) {
                r.checked = true;
            }
        }
    } else {
        // Ask on first entrance
        openModal('initial-proxy-modal');
    }
});

function selectInitialProxy(proxyValue) {
    updateProxyEngine(proxyValue);
    
    // Update radio buttons to reflect selection
    const radios = document.getElementsByName('proxy-type');
    for (let r of radios) {
        if (r.value === proxyValue) {
            r.checked = true;
        }
    }
    
    forceCloseModal('initial-proxy-modal');
}

// Cloak System
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
        const originalTitle = "UIQM | Secure Proxy By Atte";
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
    
    // Reset preset selector
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

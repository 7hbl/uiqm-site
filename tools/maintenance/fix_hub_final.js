const fs = require('fs');

function fixHubFinal() {
    const hubPath = 'c:\\Users\\attem\\Downloads\\InvisiProxy-6.9.6\\uiqm site\\views\\pages\\hub.html';
    let content = fs.readFileSync(hubPath, 'utf8');
    
    const styleEnd = '</style>';
    const styleEndIndex = content.indexOf(styleEnd);
    
    const scriptStart = 'function initMatrix()';
    const scriptStartIndex = content.indexOf(scriptStart);
    
    const fixedHeader = `
    </style>

    <script src="/assets/js/games-data.js"></script>
    <script>
        function initMatrix() {
            const canvas = document.getElementById('matrix-canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const letters = "0101010101010101";`;

    const newContent = content.substring(0, styleEndIndex) + fixedHeader + content.substring(scriptStartIndex + scriptStart.length);
    
    fs.writeFileSync(hubPath, newContent);
    console.log("Fixed hub.html structure.");
}

fixHubFinal();

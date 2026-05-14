const fs = require('fs');
const path = 'C:/Users/attem/.gemini/antigravity/brain/fe5b438c-1e0c-4c5c-9aa2-f6ca67350ea4/.system_generated/logs/overview.txt';
const lines = fs.readFileSync(path, 'utf8').split('\n');
const line = lines.find(l => l.includes('step_index":336'));
if (line) {
    const data = JSON.parse(line);
    fs.writeFileSync('full_request.txt', data.content);
} else {
    fs.writeFileSync('full_request.txt', 'Not found');
}

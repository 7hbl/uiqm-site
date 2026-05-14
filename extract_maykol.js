const fs = require('fs');
const path = 'C:/Users/attem/.gemini/antigravity/brain/fe5b438c-1e0c-4c5c-9aa2-f6ca67350ea4/.system_generated/logs/overview.txt';
const lines = fs.readFileSync(path, 'utf8').split('\n');
const line = lines.find(l => l.includes('step_index":233'));
if (line) {
    const data = JSON.parse(line);
    fs.writeFileSync('extracted_maykol.txt', data.tool_calls[0].args.ReplacementContent);
} else {
    fs.writeFileSync('extracted_maykol.txt', 'Not found');
}

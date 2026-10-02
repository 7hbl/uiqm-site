async function test() {
    try {
        const r1 = await fetch('http://localhost:8080/worker/network/https%3A%2F%2Fexample.com');
        const t1 = await r1.text();
        console.log('Test 1 (example.com):', r1.status, 'Length:', t1.length, 'Has base:', t1.includes('<base href="https://example.com/">'));

        const r2 = await fetch('http://localhost:8080/proxy/https://www.youtube.com');
        const t2 = await r2.text();
        console.log('Test 2 (youtube.com):', r2.status, 'Length:', t2.length, 'Has title:', t2.includes('<title>'));

        const r3 = await fetch('http://localhost:8080/worker/network/https%3A%2F%2Fraw.githubusercontent.com%2FNoahsAmazingTutoringHelp%2FNoahs-Calculus-Tutor%2Frefs%2Fheads%2Fmaster%2Fgames%2F415.html');
        const t3 = await r3.text();
        console.log('Test 3 (Game 415 HTML):', r3.status, 'Content-Type:', r3.headers.get('content-type'), 'Length:', t3.length);
    } catch (e) {
        console.error('Test error:', e.message);
    }
}
test();

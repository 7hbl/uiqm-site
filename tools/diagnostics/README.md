# Proxy diagnostics

Manual proxy investigation scripts are in `scripts/`, captured browser images are in `screenshots/`, and generated machine-readable results belong in `results/`.

Run a script from the repository root so its relative paths resolve, for example:

```powershell
node tools/diagnostics/scripts/verify_production.mjs
```

The scripts are historical debugging aids rather than the project's automated test suite. Some target the public deployment at `https://uiqm.lol` and may be affected by upstream sites, network policy, or content availability. New captures and result files should stay under this diagnostics directory.

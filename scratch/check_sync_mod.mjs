fetch('https://www.youtube.com/s/_/ytmainappweb/_/js/k=ytmainappweb.kevlar_base.en_US.QoIJCn4IPpA.es5.O/am=AAAAEAAAEICU/d=1/br=1/rs=AGKMywHp20iW_5LMuyVq0fVUf8cZfX3-NQ/m=kevlar_base_module,kevlar_main_module,kevlar_base_sync_mod_chunk')
  .then(r => r.text())
  .then(t => {
    console.log('Total length:', t.length);
    const matches = ['webcomponents-sd', 'intersection-observer', 'scheduler', 'spf'].map(term => {
      const idx = t.indexOf(term);
      return { term, found: idx !== -1, snippet: idx !== -1 ? t.slice(idx - 50, idx + 100) : null };
    });
    console.log(JSON.stringify(matches, null, 2));
  });

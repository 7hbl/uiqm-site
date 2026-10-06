fetch('https://www.youtube.com/s/_/ytmainappweb/_/js/k=ytmainappweb.kevlar_base.en_US.QoIJCn4IPpA.es5.O/am=AAAAQAAAEICU/d=1/br=1/rs=AGKMywGhUdu1iCviVDNWs7kToeyQpSismg/m=kevlar_base_module,kevlar_main_module,kevlar_base_sync_mod_chunk')
  .then(r => r.text())
  .then(t => {
    const lines = t.split('\n');
    console.log('Total lines:', lines.length);
    for (let i = 11695; i <= Math.min(lines.length - 1, 11715); i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
  })
  .catch(e => console.error(e));

/* Crash test et non-régression du formulateur.
   Lancement : npm install playwright && npx playwright install chromium && node tests/crash-test.js
   Le script sert le dossier localement, passe chaque note de tests/cas.json dans la page
   et vérifie les sorties attendues, l'absence d'erreur, d'injection et de lenteur. */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RACINE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const serveur = http.createServer((req, res) => {
  const f = path.join(RACINE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(RACINE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
const cas = JSON.parse(fs.readFileSync(path.join(__dirname, 'cas.json'), 'utf8'));
cas.push({ nom: 'tres-long', notes: Array(200).fill(cas[0].notes).join(' ') });

serveur.listen(0, async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  let dialogues = 0; p.on('dialog', d => { dialogues++; d.dismiss(); });
  await p.goto('http://localhost:' + serveur.address().port + '/'); await p.waitForTimeout(400);
  let echecs = 0;
  for (const c of cas) {
    await p.click('#btnEffacer');
    const t0 = Date.now();
    await p.fill('#notes', c.notes);
    await p.waitForTimeout(260);
    await p.waitForFunction(() => !document.getElementById('sortieSujet').value.trim() || document.getElementById('gram').dataset.fini === '1', null, { timeout: 30000 });
    const r = await p.evaluate(() => ({
      corrige: document.getElementById('gram').innerText,
      sujet: document.getElementById('sortieSujet').value,
      propo: document.getElementById('sortiePropo').value,
      alertes: [...document.querySelectorAll('#alertes .alerte b')].map(x => x.innerText).join(' | '),
      img: document.querySelectorAll('img:not(.logo)').length
    }));
    const ms = Date.now() - t0 - 260, pb = [];
    if (process.env.DETAIL) console.log('        ' + r.sujet.replace(/\n/g, ' ¶ ') + '\n        ' + r.propo.replace(/\n/g, ' / ') + '\n        ' + r.corrige.replace(/\n/g, ' '));
    (c.sujet || []).forEach(x => { if (!r.sujet.includes(x)) pb.push('sujet sans « ' + x + ' »'); });
    (c.absent || []).forEach(x => { if (r.sujet.includes(x)) pb.push('sujet contient « ' + x + ' »'); });
    if (c.propo !== undefined && r.propo !== c.propo) pb.push('proposition « ' + r.propo.replace(/\n/g, ' / ') + ' » au lieu de « ' + c.propo.replace(/\n/g, ' / ') + ' »');
    (c.alertes || []).forEach(x => { if (!r.alertes.includes(x)) pb.push('alerte « ' + x + ' » absente'); });
    if (/undefined|NaN|\[object/.test(r.sujet + r.propo)) pb.push('valeur technique dans la sortie');
    if (r.img) pb.push('HTML injecté dans la page');
    if (ms > 1500 && c.nom !== 'tres-long') pb.push('lent : ' + ms + ' ms');
    if (pb.length) echecs++;
    console.log((pb.length ? 'ÉCHEC  ' : 'RÉUSSI ') + c.nom + (pb.length ? '\n        - ' + pb.join('\n        - ') : ''));
  }
  /* Retouche manuelle d'une case : conservée lors d'un nouveau calcul, annulée par « Régénérer » */
  await p.click('#btnEffacer'); await p.fill('#notes', cas[0].notes); await p.waitForTimeout(260);
  const genere = await p.inputValue('#sortiePropo');
  await p.fill('#sortiePropo', 'Retouche manuelle.');
  await p.check('#suivi'); await p.waitForTimeout(300);
  const garde = await p.inputValue('#sortiePropo') === 'Retouche manuelle.';
  await p.click('[data-regen="sortiePropo"]'); await p.waitForTimeout(300);
  const regen = (await p.inputValue('#sortiePropo')).startsWith(genere.slice(0, 20));
  cas.push({ nom: 'retouche-protegee' });
  if (!garde || !regen) { echecs++; console.log('ÉCHEC  retouche-protegee' + (garde ? '' : ' (retouche écrasée)') + (regen ? '' : ' (régénération inopérante)')); }
  else console.log('RÉUSSI retouche-protegee');

  /* Sans proposition : un modèle remplit la case, la vérification demande de compléter les crochets */
  await p.click('#btnEffacer'); await p.fill('#notes', 'Théo s\'isole dans sa chambre depuis la rentrée, il ne vient plus aux repas du soir.'); await p.waitForTimeout(300);
  await p.click('#modeles button[data-i="1"]');
  const statut = () => p.evaluate(() => document.querySelectorAll('#controles .statut')[2].innerText);
  const avecTrous = await statut(), case1 = await p.inputValue('#sortiePropo');
  await p.fill('#sortiePropo', case1.replace(/\[[^\]]*\]/g, 'deux semaines'));
  const complete = await statut();
  cas.push({ nom: 'modele-choisi' });
  if (!case1.includes('[') || avecTrous !== 'À compléter' || complete !== 'Présent') { echecs++; console.log('ÉCHEC  modele-choisi (' + [case1, avecTrous, complete].join(' / ') + ')'); }
  else console.log('RÉUSSI modele-choisi');

  /* Proposition vague (« en parler ») : signalée « À préciser », pistes du thème proposées */
  await p.click('#btnEffacer'); await p.fill('#notes', 'Tom insulte les autres résidents au repas depuis lundi. je propose d\'être plus vigilants'); await p.waitForTimeout(300);
  const vague = await statut(), pistes = await p.evaluate(() => !document.getElementById('zoneModeles').hidden && document.getElementById('modeles').innerText);
  cas.push({ nom: 'propo-vague' });
  if (vague !== 'À préciser' || !pistes || !pistes.includes('Tom')) { echecs++; console.log('ÉCHEC  propo-vague (' + vague + ' / ' + pistes + ')'); }
  else console.log('RÉUSSI propo-vague');

  if (erreurs.length) { echecs++; console.log('ÉCHEC  erreurs JavaScript : ' + erreurs.join(' / ')); }
  if (dialogues) { echecs++; console.log('ÉCHEC  ' + dialogues + ' boîte(s) de dialogue ouverte(s)'); }
  console.log('\n' + (cas.length - echecs) + ' / ' + cas.length + ' réussis');
  await b.close(); serveur.close(); process.exit(echecs ? 1 : 0);
});

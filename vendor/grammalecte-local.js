/* Grammalecte lit normalement ses données par requête réseau (XMLHttpRequest).
   La page interdit toute requête (connect-src 'none') : les données sont donc
   chargées comme scripts locaux (vendor/grammalecte-data/) et servies ici. */
window.grammalecte.helpers.loadFile = function (chemin) {
  var nom = String(chemin).split('/').pop();
  var donnees = window.__glData && window.__glData[nom];
  if (!donnees) { console.error('Données Grammalecte absentes : ' + nom); return null; }
  return JSON.stringify(donnees);
};

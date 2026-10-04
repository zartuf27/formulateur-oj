(function () {
  const $ = id => document.getElementById(id);
  const L = '[\\p{L}\\d]';
  /* Mot ou expression entière ; drapeaux « iu » pour un simple test (pas d'état lastIndex) */
  const mot = (s, drapeaux = 'giu') => new RegExp('(?<!' + L + ')(?:' + s + ')(?!' + L + ')', drapeaux);
  const maj = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const min1 = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  const sansAccents = x => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const propre = s => s.replace(/\s+/g, ' ').replace(/\s+([,.])/g, '$1').replace(/([.,])\s*\.(?!\.)/g, '$1').replace(/^[\s,;.]+|[\s,;]+$/g, '').trim();
  const point = s => { s = (s || '').trim(); return s && !/[.!?]$/.test(s) ? s + '.' : s; };
  const sansPoint = s => (s || '').trim().replace(/[.]+$/, '');
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /* ---------- Lexiques ---------- */
  const ABREV = [
    ['(il\\s+)?(y[\'’]a|ya)', 'il y a'], ['rdv|rv', 'rendez-vous'], ['bcp', 'beaucoup'], ['pcq|pck|psk', 'parce que'],
    ['tjrs|tjs', 'toujours'], ['qqch', 'quelque chose'], ['qqn', "quelqu'un"], ['dc', 'donc'], ['pr', 'pour'],
    ['ds', 'dans'], ['auj|ajd', "aujourd'hui"], ['pb|pbm|pblm', 'problème'], ['mtn', 'maintenant'],
    ['educ', 'éducateur'], ['ça|ca', 'cela'], ['càd|cad', "c'est-à-dire"], ['jsp|jsais\\s+pas|chais\\s+pas', 'je ne sais pas'],
    ['quon|qu\\s+on', "qu'on"], ['peut\\s+etre', 'peut-être'], ['propo', 'proposition']
  ];
  const THEMES = [
    ['Santé', 'santé|médic\\p{L}*|traitement\\p{L}*|médecin\\p{L}*|infirm\\p{L}*|douleur\\p{L}*|malade|maladie|pharmac\\p{L}*|dentiste|psychiatr\\p{L}*|hôpital|urgences?|vaccin\\p{L}*|soins?'],
    ['Sécurité', 'sécurité|incendie|extincteurs?|alarmes?|fugue\\p{L}*|chute|tomb\\p{L}*|accident\\p{L}*|incident\\p{L}*|danger\\p{L}*|bless\\p{L}*'],
    ['Comportement', 'comportement\\p{L}*|crises?|agress\\p{L}*|conflit\\p{L}*|disput\\p{L}*|violen\\p{L}*|insult\\p{L}*|frapp\\p{L}*|cris|crie\\p{L}*|hurl\\p{L}*|tensions?|colère|énerv\\p{L}*|menac\\p{L}*|provoc\\p{L}*'],
    ['Bien-être et relations', 'isol\\p{L}*|repli\\p{L}*|triste\\p{L}*|tristesse|anxi\\p{L}*|angoiss\\p{L}*|moral|solitude|relations?|amis?|amitié'],
    ['Hygiène et quotidien', 'hygiène|douches?|toilette|bain|vêtements?|habill\\p{L}*|lever|coucher|repas|alimentation|mange\\p{L}*|ménage|linge|lessive'],
    ['Sommeil', 'sommeil|dort|dormir|endorm\\p{L}*|insomni\\p{L}*|couche|minuit|réveil\\p{L}*'],
    ['Projet personnalisé', 'projet de vie|PdV|appartement protégé|autonomie|objectifs?|bilan|évaluation|synthèse|référent\\p{L}*'],
    ['Famille et réseau', 'famille|parents?|mère|maman|père|papa|curat\\p{L}*|réseau|frère|sœur|visites?|tuteur'],
    ['Activités et loisirs', 'sorties?|activités?|loisirs?|camps?|sport|piscine|excursion|anniversaire|fête'],
    ['Travail et occupation', 'travail|stage|emploi|occupation|patron|entreprise|ateliers?'],
    ['Finances', 'argent|budget|dépenses?|achats?|factures?|paiement|devis|CHF'],
    ['Organisation de l’équipe', 'horaires?|tournus|auxiliaires?|personnel|effectifs?|piquet|manque\\s+(?:une|deux|\\d+)\\s+personnes?|remplac\\p{L}*|transmissions?|communication|absences?|congés?|formation|vacances'],
    ['Logistique et matériel', 'gants|produits|stock|matériel|voiture|véhicule|bus|clés?|réparation|commande\\p{L}*|courses|cuisine|frigo|meubles?']
  ];
  const SUIVI_RE = mot('suite à|suivi|où en est|où en sommes|point de situation|retour sur|comme décidé|la dernière fois|dernier colloque|on avait décidé|avait été décidé|toujours d[\'’]actualité', 'iu');
  const FAITS = mot('depuis|hier|avant-hier|ce matin|ce soir|cette nuit|cette semaine|la semaine (?:passée|dernière)|le mois dernier|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|plusieurs fois|à chaque|chaque (?:soir|matin|jour|nuit|semaine)|parce que|car|lors de|pendant|en (?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)|\\d+|(?:de |en )?(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)|le \\d{1,2}|\\d{1,2}[./]\\d{1,2}');
  const JUGEMENTS = 'insupportable|ingérable|pénible|chiant\\p{L}*|n[\'’]importe quoi|capricieu\\p{L}*|manipul\\p{L}*|fait exprès|comme d[\'’]habitude|encore une fois|nulle?|catastroph\\p{L}*|pas normal|abus\\p{L}*|fainéant\\p{L}*|paresseu\\p{L}*|méchant\\p{L}*|infernal\\p{L}*|n[\'’]en fait qu[\'’]à sa tête';
  const GENERALISATIONS = 'toujours|jamais|tout le temps|à chaque fois|systématiquement';
  const VAGUES = 'truc|trucs|machin|bidule|chose|choses|souci|soucis|histoire|voir pour|parler de|discuter de|faire un point|etc';
  const PLUSIEURS = mot('et aussi|autre chose|par ailleurs|deuxième point|autre point|ah et|et sinon|également', 'iu');
  const PROPO_FORT = /((?<![\p{L}'’])(?:je|on|nous|l['’]équipe)\s+(?:propos|suggér|suggèr)\p{L}*|ma\s+proposition\s*(?:est|serait)?\s*(?:de|que|:)?|proposition\s*:|idée\s*:|solution\s*:|suggestion\s*:)/iu;
  const PARLER = "(?:absolument\\s+|vraiment\\s+)?(?:qu['’]on\\s+(?:en\\s+)?)?(?:en\\s+)?(?:parle|parler|discute|discuter|reparle|voie|voir|aborde|aborder|fasse\\s+un\\s+point|faire\\s+un\\s+point|décider)(?!\\s+(?:avec|à)\\s)";
  const PROPO_FAIBLE = new RegExp("(on\\s+pourrait|il\\s+faudrait(?!\\s+" + PARLER + ")|l['’]idée\\s+(?:serait|c['’]est|est)\\s+de|pourquoi\\s+(?:ne\\s+)?pas|" +
    "ce\\s+serait\\s+(?:bien|bon|mieux|utile)(?=\\s+(?:de|d['’]|qu))(?!\\s+(?:de\\s+|d['’])?" + PARLER + ")|il\\s+serait\\s+(?:bien|bon|utile|important|judicieux|préférable)(?=\\s+(?:de|d['’]))|" +
    "est[- ]ce\\s+qu['’]on\\s+(?:peut|pourrait)(?!\\s+" + PARLER + ")|on\\s+peut\\s+essayer\\s+de|j['’]aimerais\\s+qu['’]on|on\\s+devrait(?!\\s+" + PARLER + ")|on\\s+doit(?!\\s+" + PARLER + ")|il\\s+faut(?!\\s+" + PARLER + "))", 'iu');
  const NON_NOMS = new Set(('je j il elle ils elles on nous vous le la les l un une des du de d ce cet cette ces cela ça c et mais ou donc or ni car si quand comme lorsque depuis hier demain aujourd pour par avec sans sur sous dans en au aux à a y suite pendant après avant alors bon euh bref voilà ok oui non faut faudrait merci info rappel lundi mardi mercredi jeudi vendredi samedi dimanche janvier février mars avril mai juin juillet août septembre octobre novembre décembre foyer porrentruy mandchourie delémont castors fondation noël pâques suisse jura qui que quoi comment pourquoi où tout tous toute toutes chaque plusieurs certains ma mon mes sa son ses leur leurs notre nos votre vos ensuite puis enfin aussi également madame monsieur mme dr docteur équipe colloque point sujet contexte proposition est sont était ont avait quel quelle quels quelles voir pas plus très responsable délai bilan bâle berne genève lausanne zurich neuchâtel bienne moutier courrendlin saignelégier fribourg sion lucerne bassecourt courgenay alle fontenais moi toi lui genre divers idée retour urgent question suivi résidents est-ce attention important direction service m mr').split(' '));
  const IRR = { fasse: 'faire', mette: 'mettre', remette: 'remettre', prenne: 'prendre', reprenne: 'reprendre', voie: 'voir', revoie: 'revoir', aille: 'aller', soit: 'être', ait: 'avoir', puisse: 'pouvoir', dise: 'dire', écrive: 'écrire', appelle: 'appeler', rappelle: 'rappeler', essaie: 'essayer', essaye: 'essayer', envoie: 'envoyer', achète: 'acheter', lève: 'lever', mène: 'mener', amène: 'amener', emmène: 'emmener', convienne: 'convenir', maintienne: 'maintenir', tienne: 'tenir', vienne: 'venir', sorte: 'sortir', parte: 'partir', lise: 'lire', suive: 'suivre', rende: 'rendre', attende: 'attendre', réponde: 'répondre', descende: 'descendre', ouvre: 'ouvrir', offre: 'offrir' };

  /* ---------- Exemples (fictifs) ---------- */
  const EXEMPLES = [
    "faudrait qu'on parle du truc avec Mélissa le soir, elle refuse tjrs sa douche depuis 2 semaines et ça crée des tensions avec l'équipe de nuit. je propose qu'on teste la douche le matin pendant un mois",
    "où en est-on avec le projet de camp de Kevin ? on avait décidé en septembre de demander un devis à l'organisateur, on l'a reçu, 850 CHF",
    "Théo s'isole dans sa chambre depuis la rentrée, il ne vient plus aux repas du soir. je sais pas trop quoi faire",
    "les horaires du tournus de décembre changent, il manque 2 remplacements pour les week-ends. je propose que Chantal contacte les auxiliaires d'ici vendredi"
  ];
  let iEx = 0, estExemple = true;

  /* ---------- Traitements du texte ---------- */
  function normaliser(t) {
    t = t.replace(/\r/g, '');
    const lettres = t.match(/\p{L}/gu) || [];
    if (lettres.length >= 10 && lettres.filter(c => c === c.toUpperCase() && c !== c.toLowerCase()).length / lettres.length > 0.7) t = t.toLowerCase();
    t = t.replace(/\n\s*[-•*–]\s*/g, ', ').replace(/([^.!?:;,\s])\s*\n+\s*/g, '$1. ').replace(/\n+/g, ' ');
    t = t.replace(/([!?.])\1+/g, '$1');
    ABREV.forEach(([re, rem]) => { t = t.replace(mot(re), rem); });
    t = t.replace(/(^|[.!?,]\s+)(faudrait|faut)(?!\p{L})/giu, '$1il $2');
    t = t.replace(/(?<!\p{L})genre\s+(?=\d)/giu, 'vers ');
    t = t.replace(/(?<!\p{L})je\s+sais\s+pas/giu, 'je ne sais pas');
    t = propre(t).replace(/([^\s\d])([:;?!])(?=\s|$)/g, '$1 $2');
    return t;
  }

  function trouverNoms(t) {
    const noms = [];
    const re = /(?<![\p{L}'’])(\p{Lu}\p{Ll}+(?:[-'’]\p{Lu}\p{Ll}+)*|\p{Lu}\.)(?!\p{L})/gu;
    let m;
    while ((m = re.exec(t))) {
      const brut = m[1];
      const base = brut.toLowerCase().split(/['’]/)[0].replace(/\.$/, '');
      if (NON_NOMS.has(base) || brut.length < 2) continue;
      if (!noms.includes(brut)) noms.push(brut);
    }
    /* prénom écrit sans majuscule : « avec kevin il… », « pour julie qui… » */
    const reMin = /(?:(?<!\p{L})(?:avec|chez|pour)\s+|^)(\p{Ll}{3,})\s+(?:il|elle|qui)(?!\p{L})/gu;
    while ((m = reMin.exec(t))) { const n = maj(m[1]); if (!NON_NOMS.has(m[1]) && !noms.includes(n)) noms.push(n); }
    return noms;
  }
  function retirerRemplissage(s) {
    const R = [
      /^(alors|bon|euh|donc|bref|voilà|ok|du coup|en fait|enfin|moi)[,\s]+/iu,
      /^(je\s+(?:trouve|pense|crois|constate|remarque)\s+que\s+|j['’]ai\s+(?:l['’]impression|remarqué|constaté)\s+que\s+)/iu,
      /^je\s+ne\s+sais\s+pas\s+si\s+c['’]est\s+important,?\s*(mais\s+)?/iu,
      /^(suite\s+(?:au|à\s+notre|à\s+la)\s+(?:dernier\s+|dernière\s+)?(?:colloque|réunion|décision)|lors\s+du\s+dernier\s+colloque|comme\s+décidé|point\s+de\s+situation\s+sur|retour\s+sur|suivi\s+(?:de\s+la|du|des|de))[,:\s]+/iu,
      /^(nous\s+avions|on\s+avait|l['’]équipe\s+avait|nous\s+avons|on\s+a)\s+décidé\s+(d['’]|de\s+)(essayer\s+|mettre\s+en\s+place\s+|tester\s+|faire\s+)?/iu,
      /^(on\s+a|nous\s+avons|j['’]ai)\s+re[çc]u\s+/iu,
      /^(pour\s+info(?:rmation)?|info)[,:\s]+/iu,
      /^divers\s*[:,–-]\s*/iu,
      /^(rappel|important|urgent|question)\s*[:,–-]\s*/iu,
      /^est[- ]ce\s+que?\s+(?:qu['’])?(?:on|quelqu['’]un|l['’]équipe|il|elle)\s+(?:peut|pourrait|doit)?\s*/iu,
      /^est[- ]ce\s+qu['’](?:on|il|elle)\s+/iu,
      /^depuis\s+(?:\d+|un|une|deux|trois|quatre|quelques|plusieurs)\s+\p{L}+,?\s*/iu,
      /^(il\s+)?(faudrait|faut|faudra)\s+(absolument\s+|vraiment\s+)?((qu['’]on|que\s+l['’]on|que\s+nous|que\s+l['’]équipe)\s+)?(en\s+)?(?=(re)?(parle|discute|voi|voie|aborde|évoque|fasse|faire))/iu,
      /^(je\s+(?:voudrais|veux|souhaite|souhaiterais|aimerais)|j['’]aimerais|on\s+(?:doit|devrait|pourrait))\s+(qu['’]on\s+|que\s+l['’]on\s+|que\s+nous\s+)?/iu,
      /^(re)?(parle|parler|discute|discuter|voit\s+pour|voir\s+pour|voie|voit|voir|revoir|aborde|aborder|évoque|évoquer|fasse\s+un\s+point|faire\s+un\s+point|fasse\s+le\s+point|faire\s+le\s+point)\s+(ensemble\s+)?/iu,
      /^(?:(?:de\s+la|du|des|de|sur\s+(?:le|la|les)|sur|concernant|à\s+propos\s+(?:de\s+la|du|des|de))\s+|de\s+l['’]|d['’]|sur\s+l['’]|à\s+propos\s+(?:de\s+l['’]|d['’]))/iu,
      /^(il\s+y\s+a\s+)?(le|la|les|l['’]|un|une)?\s*(gros\s+|petit\s+)?(truc|souci|problème|histoire|affaire|machin|bidule|chose|cas)\s+(avec|de|du|des|d['’]|concernant|pour)?\s*/iu,
      /^je\s+ne\s+sais\s+pas\s+(trop\s+)?(quoi\s+faire|comment\s+faire)?\s*(avec|pour)?\s*/iu,
      /^(où\s+en\s+(?:est-on|sommes-nous|est\s+l['’]équipe)|qu['’]en\s+est-il)\s+(avec|de\s+la|de\s+l['’]|du|des|de|pour|concernant)?\s*/iu,
      /^comment\s+(faire|réagir|agir|s['’]y\s+prendre)\s+(avec|pour|face\s+à)?\s*/iu
    ];
    for (let k = 0; k < 8; k++) { const avant = s; R.forEach(r => { s = s.replace(r, ''); }); if (s === avant) break; }
    return s.trim();
  }

  /* Allègement léger pour la description : on retire seulement les formules orales */
  function allegerDebut(s) {
    const R = [
      /^(alors|bon|euh|donc|bref|voilà|ok|du coup|en fait|enfin|moi)[,\s]+/iu,
      /^(pour\s+info(?:rmation)?|info)[,:\s]+/iu,
      /^je\s+ne\s+sais\s+pas\s+si\s+c['’]est\s+important,?\s*(mais\s+)?/iu,
      /^(je\s+(?:trouve|pense|crois)\s+que\s+)/iu,
      /^(il\s+)?(faudrait|faut)\s+(absolument\s+|vraiment\s+)?(qu['’]on\s+)?(en\s+)?(re)?(parler|parle|discuter|discute|voir\s+pour|voit\s+pour|voie|aborder|aborde|faire\s+un\s+point|fasse\s+un\s+point)\s+(ensemble\s+)?(de\s+la\s+|de\s+l['’]|du\s+|des\s+|de\s+|d['’]|sur\s+)?/iu,
      /^(le|la|les|l['’])?\s*(truc|machin|bidule)\s+(avec|de|du|des|concernant)\s+/iu,
      /^(il\s+y\s+a\s+)?(un\s+)?(souci|problème)\s+avec\s+(?=\p{Lu})/iu
    ];
    for (let k = 0; k < 4; k++) { const avant = s; R.forEach(r => { s = s.replace(r, ''); }); if (s === avant) break; }
    return s.trim();
  }

  /* Proposition : passe au verbe à l'infinitif, repère un éventuel responsable */
  function verbeInfinitif(v) {
    const l = v.toLowerCase();
    if (IRR[l]) return IRR[l];
    if (/isse$/.test(l)) return l.slice(0, -3) + 'ir';
    if (/aie$/.test(l)) return l.slice(0, -3) + 'ayer';
    if (/[^v]oie$/.test(l)) return l.slice(0, -3) + 'oyer';
    if (/e$/.test(l)) return l + 'r';
    return null;
  }
  function mettreAInfinitif(p, noms) {
    let resp = '';
    const m = p.match(/^(qu['’]on|que\s+l['’]on|que\s+nous|que\s+l['’]équipe|qu['’]|que\s+)\s*(\S+)?\s*/iu);
    if (!m) return { texte: p, resp };
    let reste = p.slice(m[1].length).trim();
    const sujetNom = noms.find(n => new RegExp('^' + escRe(n) + '(?!\\p{L})', 'u').test(reste));
    if (sujetNom) { resp = sujetNom; reste = reste.slice(sujetNom.length).trim(); }
    else if (/^(qu['’]on|que\s+l['’]on|que\s+nous|que\s+l['’]équipe)/iu.test(m[1])) { /* sujet collectif */ }
    else if (/^(il|elle|ils|elles)\s+/iu.test(reste)) { reste = reste.replace(/^(il|elle|ils|elles)\s+/iu, ''); }
    else return { texte: p, resp };
    const pro = reste.match(/^((?:ne\s+|n['’])?(?:se\s+|s['’]|lui\s+|leur\s+|la\s+|le\s+|les\s+|l['’]|en\s+|y\s+)*)(\p{L}+)(.*)$/u);
    if (!pro) return { texte: p, resp };
    const inf = verbeInfinitif(pro[2]);
    if (!inf) return { texte: p, resp };
    return { texte: propre(pro[1] + inf + pro[3]), resp };
  }

  /* « lui proposer… » → « proposer à Julie… », « l'accompagner » → « accompagner Kevin » :
     la proposition doit se comprendre seule dans l'OJ. Seulement pour des verbes qui visent une personne. */
  const VERBES_PERSONNE = 'accompagner|aider|encourager|inviter|soutenir|rencontrer|recevoir|accueillir|emmener|appeler|rappeler|recadrer|féliciter|valoriser|réveiller|motiver|rassurer|écouter|stimuler|responsabiliser|convoquer';
  function nommer(p, nom) {
    if (!p || !nom) return p;
    const r = p.replace(/(?<!\p{L})lui\s+(\p{L}+(?:er|ir|re))(?!\p{L})/iu, '$1 à ' + nom)
      .replace(new RegExp('(?<!\\p{L})(?:l[\'’]|le\\s+|la\\s+)(' + VERBES_PERSONNE + ')(?!\\p{L})', 'iu'), '$1 ' + nom);
    return maj(r);
  }

  function extraireProposition(t, noms) {
    const m = PROPO_FORT.exec(t) || PROPO_FAIBLE.exec(t);
    if (!m) return { propo: '', propoB: '', reste: t, resp: '' };
    const debut = m.index;
    const finPhrase = t.slice(debut).search(/[.!?\n]/);
    const fin = finPhrase === -1 ? t.length : debut + finPhrase + 1;
    let p = t.slice(debut + m[0].length, fin).trim().replace(/[.!?]$/, '');
    if (/^on\s+peut\s+essayer/i.test(m[0])) p = 'essayer de ' + p;
    if (/^j['’]aimerais\s+qu['’]on/i.test(m[0])) p = "qu'on " + p;
    p = p.replace(/^de\s+/iu, '').replace(/^d['’]/iu, '').replace(/^peut-être\s+/iu, '');
    let pB = '';
    const alt = p.match(/,?\s+(?:sinon|ou\s+alors|ou\s+bien|autre\s+option\s*:?)\s+/iu);
    if (alt) { pB = p.slice(alt.index + alt[0].length); p = p.slice(0, alt.index); }
    if (/^(un|une|des|le|la|les|du|l['’])\s*/iu.test(p) && !/^(la|le|les|l['’])\s*\p{L}+er(?!\p{L})/iu.test(p)) p = 'faire ' + p;
    const conv = mettreAInfinitif(p, noms);
    const convB = pB ? mettreAInfinitif(pB.replace(/^de\s+/iu, ''), noms) : { texte: '' };
    const reste = propre((t.slice(0, debut) + ' ' + t.slice(fin)).replace(/,\s*$/, ''));
    return { propo: conv.texte ? point(maj(conv.texte)) : '', propoB: convB.texte ? point(maj(convB.texte)) : '', reste, resp: conv.resp };
  }

  function nominaliser(core) {
    const N = [
      [/((?:ne\s+)?veut\s+(?:pas|plus)|refuse\p{L}*)\s+(de\s+)?/iu, 'refus de '],
      [/(?:a\s+)?fugu\p{L}*/iu, 'fugue'],
      [/prend\p{L}*\s+du\s+poids/iu, 'prise de poids'],
      [/perd\p{L}*\s+du\s+poids/iu, 'perte de poids'],
      [/(?:on\s+)?(?:n['’])?a\s+plus\s+(?:de\s+|d['’])|il\s+(?:nous\s+)?manque\s+(?:des\s+|du\s+|de\s+la\s+)?/iu, 'manque de '],
      [/maintien\p{L}*\s+/iu, 'maintien de '],
      [/(?:peut\s+|pourrait\s+)?remplac\p{L}*\s+/iu, 'remplacement de '],
      [/(n['’]arrive\s+pas\s+à|a\s+du\s+mal\s+à)\s+/iu, 'difficulté à '],
      [/oubli\p{L}*\s+(de\s+)?/iu, 'oubli de '],
      [/(arrive|rentre)\p{L}*\s+((?:toujours|souvent|régulièrement|encore|parfois|systématiquement)\s+)?(en\s+retard|tard)/iu, 'retards'],
      [/s['’]isole\p{L}*/iu, 'isolement'],
      [/(dort\s+mal|ne\s+dort\s+pas)/iu, 'troubles du sommeil'],
      [/(crie|hurle)\p{L}*/iu, 'cris'],
      [/insulte\p{L}*/iu, 'insultes'],
      [/(?:a\s+)?(frapp\p{L}*|tapé|tape)\s+/iu, 'geste violent envers '],
      [/(?:ne\s+)?mange\s+(?:pas|plus|presque\s+plus|peu)(?:\s+trop|\s+beaucoup)?/iu, 'alimentation insuffisante'],
      [/ne\s+vient\s+plus\s+(aux?|à\s+la|à\s+l['’])\s+/iu, 'absence aux '],
      [/se\s+plai\p{L}*\s+/iu, 'plaintes concernant '],
      [/(est\s+tombée?|tombe\p{L}*)/iu, 'chute'],
      [/pleure\p{L}*/iu, 'pleurs'],
      [/a\s+besoin\s+(de\s+|d['’])?/iu, 'besoin de '],
      [/demande\p{L}*\s+(à\s+|de\s+)?/iu, 'demande de '],
      [/(souhaite\p{L}*|voudrait|aimerait|veu[tx])\s+/iu, 'souhait de ']
    ];
    const citations = [...core.matchAll(/«[^»]*»|"[^"]*"/g)].map(c => [c.index, c.index + c[0].length]);
    /* on retient le verbe qui apparaît le plus tôt dans la phrase */
    const trouves = N.map(([re, nom]) => { const m = re.exec(core); return m && !citations.some(([a, b]) => m.index >= a && m.index < b) ? [m, nom] : null; })
      .filter(Boolean).sort((x, y) => x[0].index - y[0].index);
    for (const [m, nom] of trouves.slice(0, 1)) {
      let suite = core.slice(m.index + m[0].length).trim();
      suite = suite.replace(/^((toujours|souvent|encore|régulièrement|parfois|jamais|systématiquement|plus|beaucoup|de plus en plus)\s+)+/iu, '');
      if (/^(?:depuis|et|car|parce|mais|alors|quand|lorsque|pendant|lors|vu)(?!\p{L})/iu.test(suite)) suite = ''; /* « refuse depuis… » : pas de complément */
      suite = suite.replace(/^sa\s+/iu, 'la ').replace(/^son\s+/iu, 'le ').replace(/^ses\s+/iu, 'les ').replace(/^leurs?\s+/iu, 'le ');
      const coupe = suite.search(/[,;:!?]|\.(?!\d)|\s(et|depuis|car|parce|ce qui|cela|mais|alors|quand|lorsque|avec|pendant|pour|il|elle|je|lors|vu)\s/iu);
      suite = (coupe === -1 ? suite : suite.slice(0, coupe)).split(/\s+/).slice(0, 6).join(' ').trim();
      let n = nom;
      if (n.endsWith('concernant ')) suite = suite.replace(/^du\s+/iu, 'le ').replace(/^des\s+/iu, 'les ').replace(/^de\s+(la|l['’])\s*/iu, '$1 ').replace(/^de\s+/iu, '');
      if (n.endsWith('de ')) {
        if (/^le\s/i.test(suite)) { n = n.slice(0, -3) + 'du '; suite = suite.slice(3); }
        else if (/^les\s/i.test(suite)) { n = n.slice(0, -3) + 'des '; suite = suite.slice(4); }
        else if (/^qu/i.test(suite)) { n = n.slice(0, -3); }
        else if (/^[aeiouyéèêàâh]/i.test(suite)) { n = n.slice(0, -3) + "d'"; }
      }
      if (n === 'absence aux ' && /^repas/i.test(suite) === false && /^(le|la)\s/i.test(suite)) n = 'absence à ';
      let r = (n + (suite && !/[\s'’]$/.test(n) ? ' ' : '') + suite).trim();
      if (n.startsWith('manque')) r = r.replace(/\s+ni\s+/giu, ' et '); /* « plus de gants ni de produits » */
      const tm = core.split(/[,;]/)[0].match(/(le|au)\s+(soir|matin)|la nuit|le week-end|à midi|en soirée|au coucher|au lever/iu);
      if (tm && !r.toLowerCase().includes(tm[0].toLowerCase()) && !/soir|matin|nuit/i.test(r)) r += ' ' + tm[0].toLowerCase();
      return r;
    }
    return '';
  }

  function objetCourt(core, noms) {
    let s = core;
    if (noms.length) {
      const N = noms.map(escRe).join('|');
      s = s.replace(new RegExp('^(?:(?:' + N + ')(?![\\p{L}])\\s*(?:,|\\+|&|et(?!\\p{L}))?\\s*)+', 'iu'), '');
      s = s.replace(new RegExp('\\s+(?:de|d[\'’]|pour|avec|chez)\\s*(?:' + N + ')(?![\\p{L}])', 'giu'), '');
    }
    s = propre(s);
    for (let k = 0; k < 3; k++) s = s.replace(/^(avec|de|du|chez|pour|concernant)\s+/iu, '').replace(/^(il|elle|ils|elles|on)\s+/iu, '').replace(/^(a\s+eu|ont\s+eu|a\s+fait)\s+/iu, '').replace(/^,\s*/, '');
    s = s.replace(/^(ont|a)\s+particip\p{L}*\s+/iu, 'participation ');
    const nom = nominaliser(s);
    if (nom) return nom.replace(/(\s+(de|du|des|d['’]|avec|pour|chez|à|au|et|avant|après|le|la|les|un|une))+$/iu, '');
    const coupe = s.search(/[,;:!?]|\.(?!\d)|\s(car|parce|ce qui|cela|mais|depuis|à partir|dès|d['’]ici|avant le|pour le|il manque|et|c['’]est|est prévue?|sont prévue?s|pour aller|qui|lors)(?!\p{L})/iu);
    s = (coupe === -1 ? s : s.slice(0, coupe)).trim();
    const chg = s.match(/^(.+?)\s+(changent|change|sont modifiés?|est modifiée?|évoluent|évolue|sont annulée?s|est annulée?|sont reportée?s|est reportée?)(?!\p{L})/iu);
    if (chg) {
      const action = /annul/i.test(chg[2]) ? 'annulation' : /report/i.test(chg[2]) ? 'report' : 'changement';
      let sujet = chg[1].trim();
      sujet = /^les\s/i.test(sujet) ? 'des ' + sujet.slice(4) : /^le\s/i.test(sujet) ? 'du ' + sujet.slice(3) : 'de ' + sujet;
      return action + ' ' + sujet;
    }
    s = s.split(/\s+/).slice(0, 9).join(' ').replace(/(\s+(de|du|des|d['’]|avec|pour|chez|à|au|et|avant|après|le|la|les|un|une))+$/iu, '').trim();
    return s.replace(/^(le|la|les|un|une|sa|son|ses|leur|leurs)\s+/iu, '').replace(/^l['’]/iu, '');
  }

  /* Description : phrases propres, prénom remis en tête, remplissage retiré */
  function rediger(reste) {
    let phr = reste.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
    phr = phr.map((s, i) => {
      if (i === 0 && /^(où\s+en|qu['’]en\s+est)/iu.test(s)) return '';
      if (i === 0) s = allegerDebut(s) || s;
      s = s.replace(/^(\p{Lu}[\p{L}'’-]*\.?)\s+(?:il|elle)\s+/u, '$1 ');
      s = s.replace(/(?<!\p{L})on\s+avait\s+décidé/giu, "l'équipe avait décidé");
      s = s.replace(/^(\p{Lu}[\p{L}'’-]*\.?)\s+((?:le|au)\s+(?:soir|matin)|la nuit|le week-end)\s*,\s*(?:il|elle)\s+/u, (m, n, t) => maj(t) + ', ' + n + ' ');
      s = s.replace(/^(\p{Lu}[\p{L}'’-]*\.?)\s*,\s*(?:il|elle)\s+/u, '$1 ');
      s = s.replace(/,?\s*(?:je\s+ne\s+sais|on\s+(?:ne\s+)?sait)\s+(?:pas|plus)\s+(trop\s+)?(quoi|comment)\s+faire(\s+avec\s+\p{L}+)?\.?/giu, '').trim();
      return s ? point(maj(s)) : '';
    }).filter(Boolean);
    return phr.join(' ');
  }

  function compter(re, t) { const m = t.match(mot(re)); return m ? m.length : 0; }
  function trouver(re, t) { const m = t.match(mot(re)); return m ? [...new Set(m.map(x => x.toLowerCase()))] : []; }

  /* ---------- Analyse ---------- */
  function analyser() {
    const brut = $('notes').value;
    if (!brut.trim()) return { vide: true };
    let texte = normaliser(brut);
    const noms = trouverNoms(texte);
    noms.forEach(n => { texte = texte.replace(new RegExp('(?<!\\p{L})' + escRe(n.toLowerCase()) + '(?!\\p{L})', 'gu'), n); });
    const { propo, propoB, reste, resp } = extraireProposition(texte, noms);
    const phrases = reste.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
    const core = phrases.length ? retirerRemplissage(phrases[0]) : sansPoint(propo).replace(/^\p{L}+\s+/u, '');
    const obj = objetCourt(core, noms);
    const description = rediger(reste);

    let theme = '', meilleur = 0;
    THEMES.forEach(([nom, re]) => {
      const sc = compter(re, reste) + 3 * compter(re, obj);
      if (sc > meilleur) { meilleur = sc; theme = nom; }
    });
    const personne = noms.find(n => n !== resp) || (phrases.length ? '' : resp) || '';
    const seul = noms.filter(n => n !== resp).length === 1 ? personne : '';
    return {
      texte, noms, propo: nommer(propo, seul), propoB: nommer(propoB, seul), obj, description, theme, personne,
      estSuivi: $('suivi').checked || SUIVI_RE.test(texte),
      jugements: trouver(JUGEMENTS, texte), generalisations: trouver(GENERALISATIONS, texte), vagues: trouver(VAGUES, brut),
      plusieurs: PLUSIEURS.test(texte) || (texte.match(/\?/g) || []).length > 1
    };
  }

  /* Pistes de décision quand les notes n'en contiennent pas (ou seulement une vague) :
     des actions concrètes, propres au thème, que l'équipe peut accepter ou refuser.
     Ce qui est connu (prénom, montant) est repris ; le reste est entre crochets. */
  function modelesProposition(a, pers) {
    if (a.estSuivi) return [
      'Clore le point « ' + min1(a.obj || 'situation') + (pers ? ' (' + pers + ')' : '') + ' » : [motif].',
      'Maintenir la décision précédente et refaire le point au colloque du [date].',
      'Modifier la décision précédente : [nouvelle mesure], puis refaire le point au colloque du [date].'
    ];
    const qui = pers || 'la personne concernée';
    const de = pers ? (/^[aeiouyhéèêàâîô]/iu.test(pers) ? 'd’' : 'de ') + pers : 'de la personne concernée';
    const chf = (a.texte.match(/(\d[\d'’]*)\s*(?:CHF|francs|fr\.)/iu) || [])[1];
    const montant = chf ? chf + ' CHF' : '[montant] CHF';
    const P = {
      'Santé': [
        'Prendre rendez-vous chez le médecin ' + de + ' pour lui exposer la situation.',
        'Noter chaque jour ce qui est observé pendant [durée] et transmettre ces observations au médecin ' + de + '.',
        'Organiser un entretien avec ' + qui + ' pour comprendre ce qui se passe et chercher une solution ensemble.'
      ],
      'Sécurité': [
        'Mettre en place une mesure de prévention : [mesure].',
        'Faire évaluer la situation par [médecin, ergothérapeute, service technique].',
        'Remplir un rapport d’incident et en informer la direction.'
      ],
      'Comportement': [
        'Définir une réponse commune de toute l’équipe face à ce comportement : [réponse], appliquée pendant [durée].',
        'Noter chaque situation (moment, déclencheur, réaction) pendant [durée] pour comprendre ce qui provoque ce comportement.',
        'Organiser un entretien avec ' + qui + ' et son référent pour rappeler le cadre et les conséquences.'
      ],
      'Bien-être et relations': [
        'Proposer à ' + qui + ' un moment individuel avec son référent chaque semaine pendant [durée].',
        'Proposer à ' + qui + ' une activité de groupe choisie ensemble : [activité].',
        'Partager les observations avec [la famille, le médecin] et leur demander leur avis.'
      ],
      'Hygiène et quotidien': [
        'Tester une autre organisation avec ' + qui + ' : [moment, aide, lieu], pendant [durée], puis faire le bilan.',
        'Établir avec ' + qui + ' un planning visuel [des tâches, de la toilette] à suivre pendant [durée].',
        'Fixer une règle commune à toute l’équipe : [règle], appliquée pendant [durée].'
      ],
      'Sommeil': [
        'Tenir un agenda du sommeil ' + de + ' pendant deux semaines (coucher, réveils, lever).',
        'Mettre en place un rituel du coucher avec ' + qui + ' : [heure, écrans, activité calme], à l’essai pendant [durée].',
        'Prendre rendez-vous chez le médecin ' + de + ' si les troubles durent encore dans [durée].'
      ],
      'Projet personnalisé': [
        'Planifier le bilan du projet personnalisé ' + de + ' avec son référent.',
        'Fixer avec ' + qui + ' un objectif concret pour les [durée] à venir : [objectif].',
        'Organiser une séance de réseau avec ' + qui + ', sa famille et [partenaires].'
      ],
      'Famille et réseau': [
        'Organiser un entretien avec la famille ' + de + ' et son référent.',
        'Fixer avec la famille un cadre écrit pour [les visites, les week-ends] et en informer toute l’équipe.',
        'Informer le curateur ou la curatrice ' + de + ' et demander son avis.'
      ],
      'Activités et loisirs': [
        'Accepter à l’essai pendant [durée], avec [conditions].',
        'Construire le projet avec ' + qui + ' et le présenter au prochain colloque.',
        'Organiser [activité] le [date], avec un budget de ' + montant + '.'
      ],
      'Travail et occupation': [
        'Prendre contact avec [l’employeur ou le maître de stage] ' + de + ' pour faire le point.',
        'Organiser un bilan avec ' + qui + ', son référent et [l’employeur ou le maître de stage].',
        'Accompagner ' + qui + ' [le matin, au travail] pendant [durée], puis faire le bilan.'
      ],
      'Finances': pers ? [
        'Accepter la dépense de ' + montant + ', prise sur [budget].',
        'Refuser la dépense et en expliquer la raison à ' + pers + '.',
        'Demander l’accord du curateur ou de la curatrice ' + de + ' avant la dépense.'
      ] : [
        'Accepter la dépense de ' + montant + ', prise sur [budget].',
        'Revoir la répartition du budget [poste] pour la suite de l’année.',
        'Suspendre les dépenses [du poste concerné] jusqu’au [date].'
      ],
      'Organisation de l’équipe': [
        'Modifier l’organisation : [changement], à l’essai pendant [durée], puis faire le bilan en colloque.',
        'Contacter les auxiliaires pour couvrir [dates ou horaires].',
        'Fixer une règle commune : [règle], inscrite dans le cahier de transmissions.'
      ],
      'Logistique et matériel': [
        'Faire réparer [matériel] ou, si ce n’est pas possible, le remplacer.',
        'Demander un devis pour [matériel] et le présenter au prochain colloque.',
        'Commander [matériel] sur le budget [compte].'
      ]
    };
    return P[a.theme] || [
      'Mettre en place [mesure concrète] à l’essai pendant [durée], puis faire le bilan en colloque.',
      'Observer et noter la situation pendant [durée], puis décider sur la base des observations.',
      'Organiser un entretien avec ' + (pers || '[personne concernée ou réseau]') + ' pour chercher une solution ensemble.'
    ];
  }

  /* Proposition qui n'engage à rien : « en parler », « être vigilants », « voir avec… » */
  const PROPO_VAGUE = /^(?:A\.\s*)?(?:en\s+)?(?:re)?(?:parler|discuter|échanger|réfléchir|aborder|voir|faire\s+(?:un|le)\s+point|être\s+(?:plus\s+)?(?:vigilant|attenti)\p{L}*|faire\s+(?:plus\s+)?attention|rester\s+(?:vigilant|attenti)\p{L}*)(?!\p{L})/iu;

  /* ---------- Affichage ---------- */
  /* Cases retouchées à la main : plus remplies ni corrigées automatiquement (jusqu'à « Régénérer » ou « Effacer ») */
  const touches = new Set();
  const remplir = (id, v) => { if (!touches.has(id)) $(id).value = v || ''; };
  const effacerCopie = () => { $('okSujet').textContent = ''; $('okPropo').textContent = ''; };
  const montrerRegen = id => { document.querySelector('[data-regen="' + id + '"]').hidden = false; };
  let derniereAnalyse = { noms: [] };

  function rendre() {
    const a = derniereAnalyse = analyser();
    const al = $('alertes'), zm = $('zoneModeles');
    if (a.vide) {
      remplir('sortieSujet', ''); remplir('sortiePropo', '');
      al.innerHTML = ''; zm.hidden = true;
      verifier();
      return;
    }
    const pers = a.personne && !new RegExp('(?<!\\p{L})' + escRe(a.personne) + '(?!\\p{L})', 'u').test(a.obj) ? a.personne : '';
    /* thème omis s'il répète l'objet : « Sécurité incendie » plutôt que « Sécurité – Sécurité incendie » */
    const theme = a.theme && !sansAccents(a.obj).startsWith(sansAccents(a.theme.split(' ')[0])) ? a.theme : '';
    const sujet = [theme, [pers, maj(a.obj)].filter(Boolean).join(' : ')].filter(Boolean).join(' – ').trim();
    const description = (a.description || '').trim();

    /* Les deux cases de l'OJ */
    remplir('sortieSujet', (a.estSuivi ? 'Suivi – ' : '') + (sujet || '[Intitulé à préciser]') + '\n' + (description || '[Description : faits, depuis quand, combien de fois]'));
    remplir('sortiePropo', a.propoB
      ? 'A. ' + (a.propo || '[à compléter]') + '\nB. ' + a.propoB
      : (a.propo || '[Proposition à compléter]'));

    /* Pistes de décision (affichées par verifier() si la proposition manque ou reste vague) */
    const M = modelesProposition(a, pers);
    $('modeles').innerHTML = M.map((v, i) => '<button type="button" data-i="' + i + '">' + esc(v) + '</button>').join('');
    $('modeles').dataset.m = JSON.stringify(M);

    /* Alertes */
    const W = [];
    if (a.plusieurs) W.push(['Plusieurs sujets dans un même point', 'Chaque point doit aboutir à une décision claire. Faites un point d’OJ par sujet.']);
    if (/(?<!\p{L})divers(?!\p{L})/iu.test(a.texte)) W.push(['Sujet prévu en « divers »', 'Pas de décision dans les divers. Inscrivez ce sujet comme point à part entière.']);
    if (a.jugements.length) W.push(['Jugement de valeur : « ' + a.jugements.join(' », « ') + ' »', 'Décrivez ce qui a été observé (paroles, gestes, moments) pour que le sujet reste clair et compréhensible.']);
    if (a.generalisations.length) W.push(['Généralisation : « ' + a.generalisations.join(' », « ') + ' »', 'Précisez la fréquence réelle : combien de fois, sur quelle période.']);
    if (a.vagues.length) W.push(['Termes vagues : « ' + a.vagues.join(' », « ') + ' »', 'Nommez précisément la situation. « Parler de » ne dit pas quelle décision prendre.']);
    al.innerHTML = W.map(([t, d]) => '<div class="alerte"><b>' + esc(t) + '</b>' + esc(d) + '</div>').join('');

    verifier();
    effacerCopie();
    $('gram').innerHTML = ''; delete $('gram').dataset.fini;
    planifierCorrection();
  }

  /* Contrôles lus dans les deux cases : ils suivent aussi les retouches manuelles */
  function verifier() {
    const ctrl = $('controles');
    if (derniereAnalyse.vide) {
      $('zoneModeles').hidden = true;
      ctrl.innerHTML = '<li><span></span><p class="vide">Commencez à écrire vos notes : la vérification apparaît ici.</p></li>';
      return;
    }
    const aFaire = s => !s || s.startsWith('[');
    const [premiere, ...suite] = $('sortieSujet').value.trim().split('\n');
    const sujet = (premiere || '').replace(/^Suivi – /, '').trim();
    const description = suite.join(' ').trim();
    const propo = $('sortiePropo').value.trim();
    const C = [];
    const sujetOk = !aFaire(sujet) && sujet.split(/\s+/).length >= 3;
    C.push([sujetOk ? 'ok' : 'manque', 'Sujet clairement nommé',
      sujetOk ? sujet : 'De qui ou de quoi parle-t-on ? Nommez la situation en quelques mots.']);
    const descOk = !aFaire(description) && (description.match(FAITS) || []).length > 0 && description.split(/\s+/).length >= 8;
    C.push([descOk ? 'ok' : 'manque', 'Sujet bien décrit',
      descOk ? 'Compréhensible par un collègue absent : faits et repères de temps présents.' : 'Un collègue absent doit comprendre sans vous : que se passe-t-il, depuis quand, combien de fois ?']);
    const propoEtat = !propo || propo === '[Proposition à compléter]' ? 'manque'
      : /\[[^\]]*\]/.test(propo) ? 'trous' : PROPO_VAGUE.test(propo) ? 'vague' : 'ok';
    C.push([propoEtat, 'Proposition de décision', {
      ok: propo.replace(/\n/g, ' '),
      trous: 'Remplacez les éléments entre crochets dans la case « Proposition de décision ».',
      vague: '« ' + sansPoint(propo.split('\n')[0].replace(/^A\.\s*/, '')) + ' » n’est pas une décision. Proposez une action concrète que l’équipe peut accepter ou refuser.',
      manque: 'Que proposez-vous de décider ? Choisissez une piste ou écrivez votre proposition dans la case.'
    }[propoEtat]]);
    const lib = { ok: 'Présent', manque: 'Manquant', trous: 'À compléter', vague: 'À préciser' };
    $('zoneModeles').hidden = propoEtat !== 'manque' && propoEtat !== 'vague';
    $('l-mod').textContent = propoEtat === 'vague' ? 'Pistes plus concrètes :' : 'Aucune proposition dans vos notes. Choisissez une piste à compléter :';
    ctrl.innerHTML = C.map(([s, t, x]) => '<li><span class="statut s-' + s + '">' + lib[s] + '</span><div><strong>' + esc(t) + '</strong><p>' + esc(x) + '</p></div></li>').join('');
  }

  /* ---------- Événements ---------- */
  let minuterie;
  function plusTard() { clearTimeout(minuterie); minuterie = setTimeout(rendre, 200); }
  $('notes').addEventListener('input', () => {
    if (estExemple) { estExemple = false; $('etiqEx').hidden = true; }
    plusTard();
  });
  $('suivi').addEventListener('change', rendre);
  /* Cases de l'OJ retouchées : le bouton « Régénérer » apparaît, la vérification suit */
  ['sortieSujet', 'sortiePropo'].forEach(id => $(id).addEventListener('input', () => {
    touches.add(id); montrerRegen(id); verifier();
  }));
  document.querySelectorAll('[data-regen]').forEach(b => b.addEventListener('click', () => {
    touches.delete(b.dataset.regen); b.hidden = true; rendre();
  }));
  /* Piste choisie : elle remplace la case, le premier élément entre crochets est sélectionné */
  $('modeles').addEventListener('click', e => {
    const b = e.target.closest('button[data-i]'); if (!b) return;
    const v = JSON.parse($('modeles').dataset.m || '[]')[+b.dataset.i], zone = $('sortiePropo');
    zone.value = v; touches.add('sortiePropo'); montrerRegen('sortiePropo');
    verifier();
    const i = v.indexOf('[');
    zone.focus(); if (i >= 0) zone.setSelectionRange(i, v.indexOf(']', i) + 1);
  });
  function reinitialiser() {
    touches.clear();
    document.querySelectorAll('[data-regen]').forEach(b => { b.hidden = true; });
    $('suivi').checked = false;
  }
  $('btnExemple').addEventListener('click', () => {
    iEx = (iEx + 1) % EXEMPLES.length;
    reinitialiser();
    $('notes').value = EXEMPLES[iEx]; estExemple = true; $('etiqEx').hidden = false;
    rendre();
  });
  $('btnEffacer').addEventListener('click', () => {
    reinitialiser();
    $('notes').value = ''; estExemple = false; $('etiqEx').hidden = true;
    rendre(); $('notes').focus();
  });
  document.querySelectorAll('[data-copier]').forEach(b => b.addEventListener('click', () => {
    const zone = $(b.dataset.copier), r = $(b.dataset.ok);
    effacerCopie();
    /* Repli (page ouverte depuis un fichier local, navigateur ancien) : copie classique, sinon sélection */
    const repli = () => {
      zone.focus(); zone.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* non pris en charge */ }
      r.textContent = ok ? 'Copié' : 'Sélectionné : Ctrl+C';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(zone.value).then(() => { r.textContent = 'Copié'; }, repli);
    } else repli();
  }));

  /* ---------- Correcteur Grammalecte (chargé en arrière-plan à l'ouverture, sans réseau) ---------- */
  const GL = 'vendor/grammalecte-sdk/';
  const GL_FICHIERS = [
    GL + 'api.js', GL + 'grammalecte/graphspell/helpers.js', 'vendor/grammalecte-local.js',
    'vendor/grammalecte-data/fr-allvars.js', 'vendor/grammalecte-data/conj_data.js', 'vendor/grammalecte-data/mfsp_data.js', 'vendor/grammalecte-data/phonet_data.js',
    GL + 'grammalecte/graphspell/char_player.js', GL + 'grammalecte/fr/conj.js', GL + 'grammalecte/fr/mfsp.js', GL + 'grammalecte/fr/phonet.js',
    GL + 'grammalecte/fr/gc_options.js', GL + 'grammalecte/fr/gc_engine.js', GL + 'grammalecte/fr/gc_functions.js', GL + 'grammalecte/fr/gc_rules.js',
    GL + 'grammalecte/fr/gc_rules_graph.js', GL + 'grammalecte/fr/cregex.js', GL + 'grammalecte/text.js', GL + 'grammalecte/graphspell/spellchecker.js',
    GL + 'grammalecte/graphspell/tokenizer.js', GL + 'grammalecte/fr/textformatter.js', GL + 'grammalecte/graphspell/str_transform.js', GL + 'grammalecte/graphspell/ibdawg.js'
  ];
  let correcteur = null, chargement = null;
  const chargerScript = src => new Promise((ok, ko) => {
    const el = document.createElement('script'); el.src = src; el.async = false;
    el.onload = ok; el.onerror = () => ko(new Error('fichier introuvable : ' + src));
    document.head.appendChild(el);
  });
  function chargerCorrecteur() {
    if (!chargement) chargement = (async () => {
      for (let i = 0; i < GL_FICHIERS.length; i++) {
        $('gram').innerHTML = '<p class="aide">Chargement du correcteur (' + Math.round(100 * i / GL_FICHIERS.length) + ' %)…</p>';
        await chargerScript(GL_FICHIERS[i]);
      }
      const c = new GrammarChecker(GL + 'grammalecte', ['Grammalecte', 'TextFormatter'], 'fr');
      ['apos', 'num', 'esp', 'nbsp', 'typo'].forEach(o => c.setGceOption(o, false));
      c.setGceOption('neg', true); /* « il a pas » → « il n'a pas » : registre écrit attendu dans l'OJ */
      return c;
    })();
    return chargement;
  }
  /* Correction automatique des deux cases.
     Corrigé d'office : fautes de grammaire et d'accord, mots à une lettre ou un accent près.
     Le reste est seulement signalé, pour ne jamais remplacer un mot par un autre au hasard. */
  const CASES = ['sortieSujet', 'sortiePropo'];
  /* Mots suisses et termes du métier inconnus du dictionnaire : jamais corrigés */
  const MOTS_ADMIS = new Set('tournus éduc éducs pdv auxiliaire auxiliaires colloque colloques référent référente référents curatelle curateur curatrice natel septante huitante nonante souper dîner déjeuner sous-sol ae ase asa msp oj pv'.split(' '));
  const doublement = (a, b) => [[a, b], [b, a]].some(([x, y]) => y.length === x.length + 1 && [...y].some((c, i) => c === y[i - 1] && y.slice(0, i) + y.slice(i + 1) === x));
  function choixOrtho(mot, suggestions, enTete) {
    if (MOTS_ADMIS.has(mot.toLowerCase())) return null;
    return suggestions.find(s => s !== mot && sansAccents(s) === sansAccents(mot) && (s[0] === mot[0] || sansAccents(s[0]) === sansAccents(mot[0])))
      || (enTete || !/^\p{Lu}/u.test(mot) ? suggestions.find(s => doublement(mot.toLowerCase(), s.toLowerCase())) : null)
      || null;
  }
  function choixGram(original, suggestions) {
    const s = suggestions[0];
    if (!s || s.trim() === original.trim()) return null;
    if (s === s.toUpperCase() && original !== original.toUpperCase()) return null;
    return s;
  }
  function erreursDe(texte) {
    const erreurs = [];
    let decalage = 0;
    texte.split('\n').forEach(ligne => {
      if (ligne.trim()) {
        correcteur.gramma(ligne).forEach(e => erreurs.push({ debut: decalage + e.nStart, fin: decalage + e.nEnd, sugg: e.aSuggestions || [], gram: true }));
        correcteur.spellParagraph(ligne, true).forEach(t => {
          if (/\d/.test(t.sValue)) return;
          erreurs.push({ debut: decalage + t.nStart, fin: decalage + t.nEnd, sugg: t.aSuggestions || [], gram: false });
        });
      }
      decalage += ligne.length + 1;
    });
    return erreurs.filter(e => !/^\[|\]$/.test(texte.slice(e.debut, e.fin)));
  }
  /* Part de mots inconnus du dictionnaire : au-delà, le texte n'est sans doute pas du français */
  function partInconnue(texte) {
    const mots = texte.match(/\p{L}+/gu) || [];
    const inconnus = erreursDe(texte).filter(e => !e.gram).map(e => texte.slice(e.debut, e.fin).toLowerCase())
      .filter(m => !nomsProteges.has(m) && !MOTS_ADMIS.has(m));
    return mots.length < 6 ? 0 : inconnus.length / mots.length;
  }
  function corrigerTexte(texte, faits, doutes, auto) {
    for (let passe = 0; passe < 2; passe++) {
      const erreurs = erreursDe(texte);
      erreurs.forEach(e => {
        const mot = texte.slice(e.debut, e.fin);
        e.enTete = /(^|\n|[.!?:]\s+)$/.test(texte.slice(0, e.debut));
        e.choix = null;
        /* sans correction automatique, seuls les mots inconnus sont signalés, pas la grammaire */
        if (e.gram ? !auto : nomsProteges.has(mot.toLowerCase())) { e.ignore = true; return; }
        if (!auto) return;
        e.choix = e.gram ? choixGram(mot, e.sugg) : choixOrtho(mot, e.sugg, e.enTete);
        if (e.choix && e.enTete && !e.gram) e.choix = maj(e.choix);
        if (e.choix && !texte.includes('’')) e.choix = e.choix.replace(/’/g, "'");
      });
      const sures = erreurs.filter(e => e.choix);
      erreurs.filter(e => !e.choix && !e.ignore).forEach(e => {
        const mot = texte.slice(e.debut, e.fin);
        if (!MOTS_ADMIS.has(mot.toLowerCase()) && (e.enTete || !/^\p{Lu}/u.test(mot)) && mot.trim()) doutes.add(mot);
      });
      if (!sures.length) break;
      let limite = Infinity;
      sures.sort((x, y) => y.debut - x.debut).forEach(e => {
        if (e.fin > limite) return;
        /* une 2e passe peut reprendre une correction : « perimes → périmes → périmés » s'affiche « perimes → périmés » */
        const avant = texte.slice(e.debut, e.fin), prec = faits.find(f => f[1] === avant);
        if (prec) prec[1] = e.choix; else faits.push([avant, e.choix]);
        texte = texte.slice(0, e.debut) + e.choix + texte.slice(e.fin);
        limite = e.debut;
      });
    }
    return texte;
  }
  let minuterieCorrection, nomsProteges = new Set();
  function planifierCorrection() { clearTimeout(minuterieCorrection); minuterieCorrection = setTimeout(corrigerAuto, 250); }
  async function corrigerAuto() {
    if (!CASES.some(id => $(id).value.trim())) return;
    if (!correcteur) {
      try { correcteur = await chargerCorrecteur(); }
      catch (e) { chargement = null; $('gram').innerHTML = '<p class="aide">Correcteur indisponible : le texte n’a pas été vérifié.</p>'; return; }
    }
    nomsProteges = new Set((derniereAnalyse.noms || []).map(n => n.toLowerCase()));
    const faits = [], doutes = new Set();
    const aCorriger = CASES.filter(id => !touches.has(id));
    const auto = partInconnue(aCorriger.map(id => $(id).value).join('\n')) <= 0.3;
    aCorriger.forEach(id => { const v = $(id).value, c = corrigerTexte(v, faits, doutes, auto); if (c !== v) $(id).value = c; });
    const lignes = [];
    if (!auto) lignes.push('<p class="aide">Beaucoup de mots inconnus (autre langue ?) : aucune correction automatique.</p>');
    if (doutes.size) lignes.push('<p class="aide">À vérifier, sans correction sûre : ' + esc([...doutes].join(', ')) + '</p>');
    $('gram').innerHTML = lignes.join('');
    $('gram').dataset.fini = '1';
    verifier();
  }

  $('notes').value = EXEMPLES[0];
  rendre();
})();

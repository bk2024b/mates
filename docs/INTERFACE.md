# Interface produit — Mates Neon Premium

## Direction artistique

La couche visuelle Neon Premium remplace l'ambiance papier clair/lilas par une identité nocturne et technologique :

- Fond encre profond (#05090D), surfaces bleu nuit et bordures froides discrètes.
- Vert néon (#A3FF12) réservé aux actions principales, états actifs et repères de marque.
- Violet électrique utilisé en accent secondaire, notamment pour l'univers cinéma.
- Typographie système nette, titres compacts, contrastes renforcés et composants arrondis.
- Reflets, halos et dégradés subtils ; pas d'animation décorative imposée.

Le thème est chargé après les feuilles de style historiques via `src/app/mates-neon.css`. Cette feuille est une couche de présentation : elle ne remplace aucun composant métier et ne modifie aucune API, règle d'accès, permission, session, état React, transport LiveKit ou donnée Supabase.

## Écrans concernés

- Accueil : hero, navigation, création/rejoindre un salon, sections de présentation et appels à l'action.
- Explorer : recherche, filtre de disponibilité, actualisation, cartes des salons et états vides/erreur.
- Entrée de salon : carte de préentrée, pseudo, statut des participants et indications micro/caméra.
- Salon en direct : en-tête, scène, participants, commandes média, chat, réactions, qualité, réglages et états cinéma.
- Mobile : navigation repliable, grilles adaptatives, commandes compactes et respect des zones tactiles.

Les contenus et les actions des composants existants restent responsables des comportements. Les styles n'ajoutent pas de faux salon, de faux compteur, de média simulé ni de commande factice.

## Fonctionnalités natives préservées

La refonte ne modifie pas les parcours ni la logique de :

- authentification et identité invité/Supabase ;
- création, découverte, accès par lien et capacité des salons ;
- connexion LiveKit, micro, caméra, partage d'écran et audio ;
- chat, réactions, blocage, contrôles de l'hôte et rôles ;
- cinéma, présence, état « prêt », immersion et orientation mobile ;
- panneau qualité, mesures RTC et export CSV.

Aucune migration, variable d'environnement ou dépendance supplémentaire n'est requise.

## Accessibilité et responsive

Les focus clavier restent visibles, les commandes tactiles conservent une cible confortable, les champs conservent leurs libellés, et la préférence système de réduction des animations est respectée. Contrôler les contrastes sur les états désactivés, erreurs, chat et participants lors de la recette visuelle.

## Vérifications avant fusion

Depuis la branche de refonte, exécuter :

```bash
npm ci
npm run check
npm run build
```

Puis vérifier sur ordinateur et téléphone : accueil, création et accès par lien, exploration/actualisation, connexion à deux participants, micro/caméra, partage écran avec audio, chat, réactions, réglages, sortie, et parcours cinéma. Les tests automatisés couvrent la logique existante ; ils ne remplacent pas les essais média réels sur navigateur et appareils.

## Écran de connexion — Mates Welcome

La route `/account` utilise une composition split-screen inspirée de la référence MATES :

- panneau gauche de bienvenue avec marque, actions « Create a Room » et « Join a Room », connexion Google et accès invité ;
- panneau droit illustré par la mascotte Mates sur un décor bleu nuit/violet et accent vert néon ;
- connexion email, inscription, récupération et changement de mot de passe conservés dans un panneau secondaire extensible ;
- adaptation mobile avec mascotte conservée sous le formulaire.

Les actions de salon réutilisent les parcours existants (`/#start` et `/explore`). L'accès invité reste le parcours actuel de la plateforme. L'action Google utilise le fournisseur OAuth Supabase existant et le callback `/auth/callback` ; le fournisseur Google doit être activé dans la configuration Supabase du déploiement. Aucune clé secrète n'est exposée au navigateur.

## Mates v2 — refonte d'après les moodboards « Neon Social App »

`src/app/mates-v2.css` est chargée après `mates-neon.css` (voir `layout.tsx`). C'est une couche de présentation : aucun handler, prop, appel API, règle d'accès, état React, transport LiveKit ou donnée Supabase n'est modifié.

- **Marque** : nouveau logo « M » à deux personnages (blanc + vert `#A3FF12`) dans `src/components/brand.tsx`, `public/icon.svg` et `public/mates-logo.svg`. Ces SVG sont une redessin fidèle à l'esprit du moodboard : remplacer par l'asset vectoriel officiel si disponible.
- **Palette** : fond `#0F0F10`, surfaces `#141417` / `#1E1E22`, texte secondaire `#A1A1AA`, accent `#A3FF12`, violet réservé à l'univers cinéma, rouge pour « Quitter ».
- **Typographie** : pile `Inter` puis polices système (aucune dépendance ajoutée ; pour embarquer Inter, utiliser `next/font` côté déploiement).
- **Composants** : boutons en pilule, cartes à 18 px, onglets et champs arrondis, cartes de salons, pills de thèmes.
- **Salon** : bandeau de participants horizontal, barre de contrôles centrée (micro/caméra/partage/chat/quitter), chat et participants dans un panneau latéral.
- **Espace cinéma (« Cinema Mode »)** : scène avec cadre à coins verts (hors immersion), bannière, billet de lobby, sièges et message de lancement restylés ; toute la logique de séance, de présence et d'immersion reste inchangée.
- **Mobile** : sous 700 px, la navigation devient une barre basse fixe (Explorer, Cinéma, Mon espace, Créer un salon).

Hors périmètre volontairement : messagerie privée, amis, abonnement « Pro » et compteurs globaux visibles sur les moodboards, car ces fonctionnalités n'existent pas dans le produit.

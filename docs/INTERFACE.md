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

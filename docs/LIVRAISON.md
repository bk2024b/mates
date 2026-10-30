# Livraison Mates 0.1

Date : 30 octobre 2026. Périmètre : étapes 1 et 2 du plan de développement.

## Vérifications effectuées

- Vérification TypeScript et compilation Next.js de production.
- 15 tests automatisés : signature et expiration des sessions, usurpation d’identité, permissions média hôte/invité, jetons signés vérifiés, API avec service média simulé, contrôle d’origine, limites de requêtes et calculs RTC.
- Vérification dans le navigateur : accueil, message de configuration manquante, changement de formulaire, refus d’un lien invalide, affichage du labo et activation puis arrêt de sa tonalité.

## Limites de la vérification

Aucune clé de projet LiveKit n’a été fournie. Un essai de démarrage d’un serveur LiveKit local a été empêché par les restrictions réseau du conteneur de développement. Par conséquent, la connexion réelle de deux participants, la publication média, le chemin TURN et la performance 1080p30 n’ont pas été validés ici. Les tests API utilisent explicitement un fournisseur simulé, pas un SFU réel.

Les smoke tests HTTP dans `tests/integration` sont fournis pour être exécutés contre le serveur lancé dans l’environnement du développeur. Les tests navigateur n’ont pas validé une matrice mobile complète.

Après configuration des clés, suivre `docs/RECETTE.md`. Le prototype ne doit pas être présenté comme une plateforme publique complète ni comme une garantie de performance.

## Suite prévue

Étape 3 : Supabase, identité durable, règles d’accès. Étape 4 : présentateurs désignés, contrôle exclusif de scène, révocation, fermeture et exclusions. Puis chat, réactions et découverte publique selon le plan.

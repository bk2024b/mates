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

## Mise à jour 0.2 étape 3

Comptes Supabase, sessions anonymes, conversion d’invité, confirmation email, récupération du mot de passe, schéma des profils et salons, politiques RLS et persistance des participations ajoutés. Activation explicite pour préserver le prototype déployé.

19 tests automatisés passent, dont l’exécution de la migration et des politiques RLS sur PostgreSQL embarqué avec PGlite. Ces tests vérifient notamment l’impossibilité pour un invité de créer un salon, de modifier son identifiant de profil ou de se donner le rôle hôte. Les tables `auth.users`, fonctions `auth.uid()` et `auth.jwt()` sont des fixtures locales dans ce test ; le service Auth distant, les emails et PostgREST du projet Supabase réel restent à valider après configuration. Aucune migration distante ni clé réelle n’a été utilisée ici.

## Mise à jour 0.3 étape 4

Le message de confirmation email disparaît lorsqu’une inscription ouvre directement une session permanente confirmée : Mates retourne alors vers les salons. Le cas restant reçoit une confirmation neutre, sans affirmer qu’un email a été envoyé.

Ajout des présentateurs désignés, scène exclusive avec verrou transactionnel, reprise et arrêt par l’hôte, exclusion, fermeture et révocation explicite des anciens jetons LiveKit Cloud. L’activation exige la seconde migration et une clé Supabase serveur séparée. Les anciens salons continuent avec leur mode historique.

30 tests automatisés passent, dont les migrations PostgreSQL, les droits de commande, le verrouillage, l’idempotence, les exclusions, les commandes devenues périmées après fermeture, la vérification des pistes avant transfert et les jetons initiaux sans source écran. Compilation de production vérifiée. Les transferts et révocations réels entre appareils restent à vérifier sur le projet Cloud configuré, selon `docs/COMMANDES_SALON.md`.

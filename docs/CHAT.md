# Chat et réactions — Mates 0.4

## Activation

1. Conserver la configuration Supabase et LiveKit fonctionnelle, dont `SUPABASE_SECRET_KEY` côté serveur.
2. Dans le SQL Editor Supabase, appliquer les migrations dans l’ordre : identité, commandes de salon, puis `supabase/migrations/202610310001_room_chat.sql`.
3. Ajouter `MATES_CHAT=enabled` aux variables de déploiement, avec `MATES_IDENTITY_MODE=supabase`, puis redéployer.
4. Créer un **nouveau salon**. Les anciens salons conservent leurs capacités initiales. Les commandes de l’hôte restent activées séparément par `MATES_ROOM_CONTROLS=enabled`.

## Fonctionnement

Les messages passent par une route authentifiée qui vérifie l’accès au salon et la présence LiveKit. PostgreSQL impose l’auteur, le pseudo, les droits et les limites : 5 messages et 10 réactions par tranche glissante de 10 secondes et par membre/salon. Un message contient au maximum 1 000 caractères. Son identifiant permet de retenter un envoi sans le dupliquer.

Le serveur diffuse les événements via LiveKit. Les participants ne peuvent pas publier de paquets de données arbitraires avec leur jeton. Un rattrapage toutes les 8 secondes récupère les messages manqués ; les réactions sont éphémères et ne sont pas rejouées. L’interface charge les 50 derniers messages et permet de consulter jusqu’à 500 messages. Le texte est affiché comme texte, sans HTML ni pièces jointes.

Le blocage personnel masque les messages et coupe localement les médias de la personne ; il ne l’exclut pas du salon. Ces préférences persistent pour cette identité Supabase. L’hôte dispose séparément de l’exclusion dans les commandes du salon. Les visiteurs anonymes restent identifiés techniquement par un UUID ; leur pseudo public ne révèle pas leur compte.

Les messages sont conservés en base. Cette version ne programme pas de suppression automatique : prévoir une politique de conservation et un nettoyage avant une ouverture publique durable. Les salons fermés et les membres exclus ne peuvent plus consulter l’historique par l’API.

Dans l’onglet Qualité, les sélecteurs permettent de choisir micro, caméra et sortie audio lorsque le navigateur le prend en charge. Les noms des périphériques peuvent rester génériques avant autorisation du navigateur.

## Validation sur le déploiement

Ouvrir deux profils de navigateur distincts. Vérifier les messages dans les deux sens, les réactions, le rattrapage après une coupure réseau, puis le blocage et le déblocage. Exclure le second participant et vérifier qu’il ne peut plus lire ni envoyer. Essayer les périphériques pendant un appel.

Les tests automatisés couvrent les migrations PostgreSQL, l’isolation, les quotas, les doublons et le filtrage des paquets. Un essai média et chat avec deux clients sur le vrai projet LiveKit/Supabase reste nécessaire.

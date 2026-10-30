# Étape 4 des salons Mates

Version 0.3. Les commandes avancées sont disponibles dans les **nouveaux** salons Supabase après activation. Les salons déjà créés conservent leur fonctionnement antérieur, afin de ne pas interrompre une réunion.

## Activation

1. Conserver la première migration et la configuration Supabase qui fonctionnent.
2. Exécuter une fois `supabase/migrations/202610300002_room_controls.sql` dans SQL Editor. Elle ajoute les présentateurs, exclusions, commandes idempotentes et champs de contrôle de scène.
3. Sur Vercel, conserver `SUPABASE_PUBLISHABLE_KEY` avec la valeur publique ou anon déjà utilisée. Ajouter **une variable distincte** :

```dotenv
SUPABASE_SECRET_KEY=sb_secret_votre_cle_serveur
MATES_ROOM_CONTROLS=enabled
```

`SUPABASE_SECRET_KEY` reçoit une clé secrète du même projet, ou l’ancienne clé `service_role`. Elle dispose de privilèges administratifs : serveur uniquement, jamais `NEXT_PUBLIC_`, jamais dans le navigateur ou GitHub. Les routes vérifient l’utilisateur avant chaque opération privilégiée ; le navigateur ne choisit pas son identité ni son rôle.

4. Garder `MATES_IDENTITY_MODE=supabase` et l’URL standard de votre projet LiveKit Cloud (`wss://…livekit.cloud`). Les commandes strictes de cette version reposent sur la révocation des jetons de LiveKit Cloud ; elles ne sont pas activées sur un serveur auto-hébergé.
5. Redéployer et **créer un nouveau salon**. Désactiver le drapeau empêche la création de nouveaux salons contrôlés ; conserver la clé serveur tant que des salons contrôlés sont actifs.

## Utilisation

- Dans l’onglet **Mates**, l’hôte peut autoriser un membre à partager, retirer cette autorisation, exclure une personne ou fermer le salon. Exclusion et fermeture demandent une confirmation dans l’interface.
- Un membre désigné doit cliquer sur Partager et choisir lui-même sa source. La désignation ne déclenche jamais une capture à distance.
- Une seule scène est attribuée. Un présentateur doit attendre la fin de la diffusion précédente ; l’hôte peut reprendre la scène ou arrêter la diffusion.
- Les changements de désignation s’affichent après le prochain rafraîchissement des commandes, environ quatre secondes.
- Pour révoquer strictement les anciens jetons, un arrêt ou retrait de partage peut entraîner une brève reconnexion du diffuseur. Mates demande alors un jeton neuf avec permissions minimales. Micro et caméra doivent être réactivés volontairement après cette reconnexion.
- Une exclusion interdit de nouveaux jetons à cette identité. Une personne anonyme peut néanmoins recréer une identité en effaçant ses cookies ; ce n’est pas un bannissement permanent.

## Cohérence et incidents

La base verrouille chaque commande avant l’appel média. Une clé UUID identifie la commande et empêche la réexécution d’une commande déjà terminée ou le recyclage de sa clé avec un autre contenu. La réservation de scène ne crée pas de droit média à elle seule. Le serveur retire les anciennes autorisations, vérifie la disparition des pistes puis accorde le partage au nouveau détenteur.

Les jetons d’entrée d’un salon contrôlé ne donnent de source écran à personne, y compris à l’hôte. Les privilèges média sont accordés par l’API serveur après réservation. Lors de la révocation, `RemoveParticipant` reçoit un cutoff explicite afin de couvrir aussi les jetons rafraîchis et les identités déjà déconnectées. La réentrée passe par l’API, les règles d’exclusion et des permissions minimales.

Une erreur après prise du verrou bloque les nouvelles commandes de scène plutôt que d’autoriser deux diffuseurs. L’hôte peut encore fermer le salon et en créer un nouveau. Une fermeture échouée peut être redemandée. Aucun déverrouillage arbitraire après timeout ne permet à une ancienne requête de réaccorder des droits.

Une réservation sans piste expire après 30 secondes et est nettoyée au prochain rafraîchissement des commandes. Si des participants continuent à interroger le salon, l’absence média de l’hôte est détectée puis le salon est fermé après 90 secondes d’absence observée. Sans navigateur actif, il n’y a pas de tâche planifiée : LiveKit finit par supprimer la salle vide selon ses propres délais.

`room_members` reste un historique de participations. LiveKit mesure encore l’occupation réelle. Les contrôles ne constituent pas une implémentation de réservation distribuée des places ; vérifier les entrées simultanées et les reconnexions à capacité maximale pendant la recette.

## Recette avant utilisation élargie

Les tests automatisés couvrent les transactions PostgreSQL et l’isolation des permissions. Les appels média sont simulés dans les tests unitaires. La recette de ces nouvelles commandes sur votre projet LiveKit Cloud reste à effectuer :

1. Hôte et deux invités : seul l’hôte voit les commandes administratives.
2. Désigner deux présentateurs ; lancer deux demandes proches ; un seul doit obtenir la scène.
3. Reprendre la scène comme hôte, arrêter par la barre native, puis relancer avec audio.
4. Retirer le droit d’un diffuseur ; vérifier arrêt, reconnexion et absence de nouvelle publication écran.
5. Rejouer un ancien jeton après retrait et après exclusion ; vérifier le refus effectif par LiveKit Cloud, y compris un jeton rafraîchi très récemment.
6. Quitter pendant la sélection d’écran et attendre l’expiration de réservation.
7. Exclure puis tenter de rejoindre depuis la même identité ; fermer puis rejouer une entrée ancienne.
8. Couper le réseau de l’hôte plus de 90 secondes en gardant un spectateur actif.
9. Simuler une erreur de l’API média : aucun nouveau diffuseur ne doit être accordé ; la fermeture doit rester accessible.
10. Vérifier la capacité maximale et la réentrée automatique après retrait d’une permission.

Les jetons et horloges distribués doivent être testés sur le service réel avant toute promesse d’exclusivité stricte en production. Cette version reste un pilote.

## Refus 401 pendant la création

Un `PATCH /rest/v1/rooms` qui répond 401 correspond à un refus d’authentification de la connexion privilégiée, pas à une preuve de migration manquante. Vérifier la valeur complète de `SUPABASE_SECRET_KEY` dans l’environnement Vercel réellement utilisé, le projet associé et l’état de la clé, puis redéployer. Conserver la clé publique qui fonctionne dans `SUPABASE_PUBLISHABLE_KEY`. Une absence de colonne/table reçoit maintenant un diagnostic distinct. Une réponse 204 est un succès sans contenu et ne produit plus d’alerte de type de réponse.

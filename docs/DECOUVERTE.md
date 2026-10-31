# Découverte — Mates 0.5

## Déploiement

Aucune nouvelle migration et aucune variable supplémentaire. Redéployer le dépôt puis ouvrir `/explore` depuis le menu d’accueil.

Le formulaire propose deux visibilités : **par lien** (valeur par défaut) ou **public**. Le choix est conservé dans les métadonnées du salon LiveKit, écrites uniquement par le serveur. Les anciens salons sans visibilité explicite restent non listés. Cette version fixe la visibilité à la création ; pour la modifier, créer un autre salon.

## Liste publique

`GET /api/discovery` consulte les salons LiveKit de ce projet. Seuls les salons Mates valides, explicitement publics et contenant au moins un participant sont retournés. La réponse contient uniquement identifiant, sujet, occupation, capacité et date de création. Aucun jeton, UUID d’hôte, pseudo ou liste de participants n’est diffusé.

L’interface actualise la liste toutes les 30 secondes et propose une actualisation manuelle. Le serveur mutualise les requêtes simultanées et conserve un résultat pendant 5 secondes par instance. La liste contient au maximum les 200 salons les plus récents. Recherche insensible aux accents par sujet ; filtre des places disponibles. Les chiffres restent indicatifs : la limite LiveKit est vérifiée à l’entrée.

Un salon par lien n’est pas protégé par un mot de passe : toute personne possédant le lien peut tenter de le rejoindre. Un salon public devient visible dès qu’un participant est connecté et disparaît de la liste lorsqu’il est vide ou supprimé. Les exclusions et les permissions média restent appliquées à l’entrée comme auparavant.

## Recette

Créer un salon par lien et vérifier son absence dans Explorer depuis un second navigateur. Créer ensuite un salon public, entrer dans la session média, puis vérifier sa présence, son occupation et l’accès par un pseudo invité. Tester la recherche, le filtre, puis quitter tous les participants et actualiser. Vérifier également qu’un ancien salon reste non listé.

Les tests automatisés valident l’opt-in public, le masquage des salons vides/étrangers/invalides et l’absence d’identité dans la réponse. Le test avec des salons réels nécessite le déploiement connecté au projet LiveKit.

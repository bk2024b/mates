# Recette média à réaliser avec les clés du projet

Les tests ci-dessous sont fournis pour mesurer la qualité réelle ; ils ne sont pas déclarés réussis dans cette livraison. Le projet n’embarque aucune clé LiveKit.

## Conditions et matériel

- Un hôte sur Chrome ou Edge récent pour ordinateur ; noter version, OS, processeur et date.
- Au moins un spectateur sur un second appareil ; monter ensuite à 11 spectateurs et un hôte.
- Idéalement au moins 15 Mbit/s montants disponibles chez l’hôte, 10 Mbit/s descendants par spectateur, RTT vers le service inférieur à 100 ms et pertes sous 1 %.
- Un casque ; fermer les logiciels qui capturent déjà les périphériques.
- Un déploiement HTTPS avec `APP_ORIGIN` correcte pour le test à distance.

## Premier appel

1. Créer le salon depuis le navigateur A ; copier le lien.
2. Ouvrir le lien depuis B, dans un autre profil/appareil.
3. Vérifier que seul A propose le bouton de partage ; micro et caméra coupés à l’entrée.
4. Activer un micro puis une caméra et vérifier la réception.
5. Partager l’onglet `/lab` avec l’audio, tonalité active. Vérifier image et tonalité chez B.
6. Arrêter la capture avec la commande native du navigateur ; la scène doit revenir en attente et la tonalité distante s’arrêter.
7. Refaire l’essai en annulant le sélecteur ; aucune piste ni capture ne doit rester active.

## Vidéo et synchronisation

La mire animée teste le mouvement et la lisibilité. Sa tonalité continue confirme seulement le transport audio.

Pour la synchronisation, utiliser une vidéo de clap ou une vidéo comportant un événement visuel et sonore connu. Partager l’onglet de lecture avec son audio. Mesurer le décalage sur un enregistrement de test local, réalisé volontairement par le testeur. La plateforme ne lance pas cet enregistrement.

Comparer horloges source et réception avec des horloges synchronisées, ou filmer les deux écrans avec une même caméra. Le RTT WebRTC affiché n’est pas une mesure de cette latence.

## Seuils cibles proposés

| Mesure               | Objectif sur scénario nominal                                            |
| -------------------- | ------------------------------------------------------------------------ |
| Vidéo en mouvement   | 1080p, au moins 25 i/s dans 95 % des fenêtres de 5 s après stabilisation |
| Latence image        | p95 inférieur à 1 seconde                                                |
| Décalage audio/vidéo | Valeur absolue p95 inférieure à 150 ms                                   |
| Gels                 | Moins de 1 % des 15 minutes d’essai                                      |
| Entrée               | p95 inférieur à 5 s après validation d’entrée                            |

Ouvrir Qualité avant la séquence, puis laisser ce panneau ouvert pendant la mesure. Exporter le CSV avant de changer de panneau ou quitter. Le CSV contient des relevés de 2 secondes ; il aide au diagnostic mais ne prouve pas seul les métriques de latence, synchronisation, gels ou percentile par fenêtre de 5 secondes. Utiliser une instrumentation vidéo complémentaire pour ces critères.

## Réseaux dégradés et charge

- Récepteur limité à environ 2 Mbit/s : attendre une baisse de qualité reçue, sans dégradation imposée aux autres.
- Pertes simulées de 3 % puis coupure de 10 secondes : vérifier message de reconnexion et retour des pistes.
- Vérifier un réseau qui nécessite TURN et confirmer le chemin réellement négocié à l’aide des outils WebRTC du navigateur.
- Monter progressivement 1 → 3 → 6 → 11 récepteurs. Surveiller le CPU de l’hôte et la consommation du projet LiveKit.
- Répéter avec les deux profils et avec les caméras reçues suspendues ou réactivées.

## Compatibilité à renseigner

| Émetteur ou récepteur                         | État lors de la livraison       |
| --------------------------------------------- | ------------------------------- |
| Chrome ordinateur, partage onglet avec audio  | À tester avec LiveKit           |
| Edge ordinateur, partage onglet avec audio    | À tester avec LiveKit           |
| Firefox ordinateur, réception                 | À tester avec LiveKit           |
| Safari ordinateur, réception                  | À tester avec LiveKit           |
| Chrome Android, réception                     | À tester avec LiveKit           |
| Safari iOS, réception et déverrouillage audio | À tester avec LiveKit           |
| Partage depuis navigateur mobile              | Hors engagement de ce prototype |

## Accès et incidents

- Modifier le pseudo en « Hôte » n’accorde pas le partage.
- Tester la publication écran depuis un client invité modifié : LiveKit doit refuser la source.
- Ouvrir deux onglets d’un même profil : vérifier le message lié à l’identité dupliquée.
- Dépasser 12 connexions simultanées : vérifier refus serveur média et message exploitable.
- Tester refus des permissions, absence de caméra, source vidéo protégée, absence d’audio, expiration d’un salon et retour après perte réseau.
- Vérifier qu’une requête cross-origin reçoit 403 et qu’aucun secret ne figure dans le HTML, les jetons exposés dans l’URL ou les logs.

Consigner pour chaque essai : date, versions, source, profil, nombre de participants, conditions réseau, mesures et résultat observé. Ne pas déduire un succès réel des seuls tests avec fournisseur simulé.

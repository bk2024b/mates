# Interface produit — Mates 0.6

## Direction

Une ambiance de club créatif : papier clair, encre sombre, citron vert, lilas et illustrations CSS originales. La scène conserve un fond sombre pour le confort de visionnage. Aucune police ni image distante nécessaire.

Accueil, exploration, compte et entrée des salons partagent une navigation responsive. Le menu mobile propose exploration, espace personnel et création. La création reste accessible directement via `/#start`.

## Salon mobile

Sous 900 px, la barre des commandes reste en bas de l’écran et tient compte de la zone de sécurité du téléphone. Le chat est visible par défaut sous la scène, avec les onglets participants et réglages. Il reste dans le flux de la page et ne recouvre pas l’écran partagé. Une icône permet de le masquer ; le bouton de discussion de la barre des commandes permet de le réafficher. Les messages non lus restent signalés lorsque le panneau est fermé. La touche Échap ferme le panneau.

Les champs utilisent une taille adaptée au mobile ; les commandes principales mesurent au moins 44 px. Les animations sont réduites selon la préférence du système. Les erreurs de chargement du compte, les liens de salon expirés et les pages introuvables proposent une action de récupération.

La capture d’écran dépend toujours du navigateur et reste principalement disponible sur ordinateur. Cette refonte ne change ni le transport média, ni les permissions, ni l’authentification.

## Déploiement et recette

Redéployer normalement. Aucune migration ni nouvelle variable.

Vérifier sur un téléphone réel : menu ouvert/fermé, accès à la création, champs et clavier, exploration, entrée par pseudo, lecture du partage, micro/caméra, panneau de discussion et retour à la scène, réglages et sortie du salon. Vérifier en portrait et en paysage, ainsi qu’avec le clavier du chat ouvert.

Le contrôle automatisé couvre les fonctionnalités et la compilation. L’accueil a été inspecté dans le navigateur de prévisualisation ; la vérification visuelle complète sur téléphone et pendant un vrai appel reste à effectuer sur le déploiement.

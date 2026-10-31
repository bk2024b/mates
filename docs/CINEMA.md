# Mates Cinéma — première version

## Activation

Redéployer la version 0.7 puis ouvrir `/cinema`. Aucune nouvelle variable ou migration. Conserver les migrations et variables déjà activées pour les comptes, le chat, les commandes et la capacité de 50 personnes.

## Parcours

L’organisateur crée une séance avec son pseudo, son titre, une note facultative et la visibilité. Le choix par défaut est par lien, sans liste publique. La page Cinéma affiche les séances publiques occupées issues de la découverte existante. Le lien de séance reste `/room/:id` ; l’entrée reconnaît le mode cinéma et affiche son titre et sa note. Un compte est nécessaire à la création en mode Supabase ; les invités peuvent entrer avec un pseudo.

L’hôte et les présentateurs désignés conservent leurs permissions habituelles. Ils choisissent « Onglet vidéo » ou « Application / écran » avant d’ouvrir le sélecteur du navigateur. Ce sont des préférences de capture ; l’utilisateur reste libre de choisir la source autorisée par le navigateur. Le partage d’un onglet demande son audio ; une application ou un écran ne fournit pas nécessairement du son selon le navigateur et le système.

En cinéma, la capture reste locale avant diffusion. Le dialogue d’aperçu montre l’image, la présence d’une piste audio et, lorsque AudioContext est disponible, un niveau audio réellement mesuré. Il ne garantit ni un son non silencieux en permanence ni sa réception chez les invités. L’hôte peut changer de source, annuler ou diffuser sans son explicitement. Annuler arrête les pistes capturées. Confirmer publie les pistes existantes, sans rouvrir le sélecteur ; en mode contrôlé, l’acquisition de scène intervient seulement à cette confirmation.

Les invités reçoivent uniquement le flux en cours. Aucun fichier n’est importé et aucune commande de pause ou de déplacement dans le film n’est fournie aux spectateurs. L’organisateur garde les commandes de son lecteur : pause ou déplacement dans celui-ci affecte toute la projection. La synchronisation dépend du transport WebRTC et du réseau ; aucune synchronisation parfaite à la milliseconde n’est promise.

Les micros et caméras sont coupés à l’arrivée comme dans les autres salons. Le cinéma masque initialement la bande de caméras, avec un bouton pour la réafficher localement. Les réactions peuvent être masquées localement. Le chat reste visible par défaut sur mobile et peut être masqué avec son icône. La discussion vocale n’est pas bloquée : chaque participant peut activer son micro.

Le statut « projection en cours » est déduit de la présence d’une piste écran. L’hôte peut passer du foyer à la discussion et revenir au foyer avec `/api/rooms/:id/cinema` ; le serveur vérifie son identité, sa présence et l’origine de la requête avant de modifier uniquement les informations cinéma dans les métadonnées LiveKit. Les événements de métadonnées actualisent les autres clients. Un présentateur désigné peut diffuser mais ne peut pas modifier cette ambiance.

## Limites de cette version

Pas de programmation différée persistante, d’import d’affiche ni de catalogue de films. La séance est un salon LiveKit et expire lorsqu’il reste vide suivant les délais existants. Pour une soirée prévue plus tard, conserver l’hôte connecté au foyer ou créer la salle au moment de l’accueil. Une déconnexion de l’hôte suit toujours les règles des commandes du salon existantes.

Le lecteur source et le débit montant de l’organisateur déterminent la qualité. Les contenus protégés peuvent être noirs à la capture. Utiliser un contenu dont l’organisateur possède les autorisations de diffusion. Les protections des services vidéo restent applicables.

## Recette réelle

Tester sur deux profils/appareils : création privée, invitation, arrivée dans le foyer, aperçu local sans diffusion chez l’invité, annulation avec arrêt de l’indicateur de capture, puis diffusion avec audio et confirmation du spectateur. Essayer ensuite le lecteur d’une application (image et son à vérifier séparément), le partage par un présentateur désigné, l’arrivée en cours de film, la discussion après arrêt du partage et le retour au foyer. Vérifier le chat et l’écran en portrait, puis la projection en paysage sur téléphone.

Les tests automatisés valident la création, les métadonnées, les préférences de capture et le refus des changements d’ambiance sans identité d’hôte. Le transport média et les sélecteurs système doivent être vérifiés sur les appareils réels.

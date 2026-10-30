# Architecture Mates 0.1

## Flux

- Navigateur → API Next.js : création du salon, consultation et jeton d’entrée.
- API Next.js → LiveKit RoomService : création et lecture de la salle.
- Navigateur → LiveKit SFU / TURN : signalisation et flux WebRTC audio et vidéo.
- Les API Next.js ne reçoivent jamais les captures vidéo.

## Identité et autorisation

`mates_session` contient un UUID et une expiration, signés par HMAC SHA-256. Cookie HttpOnly, SameSite strict et Secure lorsque la requête est HTTPS. La signature est comparée à temps constant. Aucun rôle n’est accepté dans les données client.

À la création, l’UUID de session est enregistré dans les métadonnées de la salle LiveKit. Lors de l’entrée, le serveur relit ces métadonnées et compare l’UUID. Un simple pseudo nommé « Hôte » n’accorde rien.

Jetons média d’une durée initiale de 10 minutes. Le SDK LiveKit gère leur renouvellement pendant une connexion active ; les 10 minutes ne limitent pas la durée du salon. Hôte : caméra, micro, écran, audio d’écran. Invité : caméra et micro. Personne ne reçoit `roomAdmin`, ni le droit de mettre à jour ses métadonnées ou de publier des données. Le chat est volontairement absent.

Les jetons restent en mémoire côté navigateur et ne sont pas mis dans les URL, localStorage ou logs. La réponse d’entrée et les métadonnées utilisent `Cache-Control: no-store`. Aucun secret serveur n’est envoyé au client.

## API

| Route                 | Méthode | Effet                                                       |
| --------------------- | ------- | ----------------------------------------------------------- |
| `/api/health`         | GET     | Noms des variables manquantes, jamais leurs valeurs         |
| `/api/rooms`          | POST    | Valide pseudo et sujet, crée le salon, signe la session     |
| `/api/rooms/:id`      | GET     | Retourne titre, occupation et capacité                      |
| `/api/rooms/:id/join` | POST    | Établit une identité et délivre les permissions appropriées |

Erreurs structurées : `error.code`, `error.message`, `error.requestId`. Codes usuels : `ORIGIN_DENIED`, `NOT_CONFIGURED`, `INVALID_INPUT`, `ROOM_NOT_FOUND`, `ROOM_FULL`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`.

Les mutations exigent une origine exacte et du JSON de moins de 4 096 caractères. Pseudos limités à 28 caractères et sujets à 80. Une première vérification de capacité précède le jeton ; la limite de connexions finale est imposée par LiveKit, y compris en cas d’entrées simultanées.

Le limiteur mémoire sert de frein aux clics répétés ; il n’est ni distribué ni résistant aux changements d’identité. Mettre un quota distribué, un contrôle de création et les identités durables avant une ouverture publique.

## Capture et lecture

Le clic utilisateur déclenche directement `setScreenShareEnabled`. Aucune requête serveur n’est intercalée avant le sélecteur, pour conserver l’activation utilisateur. Le navigateur décide de la source effectivement partagée et du support de l’audio. La préférence pour un onglet n’est pas une contrainte imposée.

VP8 et simulcast : une couche source ciblée à 1080p et une couche supplémentaire 720p15. Dynacast suspend les couches inutilisées ; adaptiveStream adapte l’abonnement à la surface d’affichage. Les clients qui ont une connexion limitée doivent être observés en recette, aucune résolution minimale n’est garantie.

Le mode mouvement privilégie la cadence ; le mode texte privilégie la résolution. Le changement de profil exige l’arrêt puis la relance de capture. L’audio d’écran est demandé sans suppression de bruit ni gain automatique ; le microphone conserve son traitement de voix. La scène audio et vidéo partage un identifiant de flux de publication et le même élément vidéo de réception. Le micro a une lecture audio distincte.

## Tests et étapes suivantes

Tests de routes avec RoomService simulé, tests de jetons signés vérifiés avec le SDK, de session et de calculs RTC. Ces tests ne valident pas le routage média, TURN, le support audio système ou les débits réels. Voir RECETTE.md.

Étape 3 : Supabase et identités durables. Étape 4 : contrôle de scène transactionnel, désignation et révocation, fermeture et exclusion. Étapes 5–7 : compléter interface, chat et découverte. Une partie de l’interface existe déjà pour rendre le prototype testable ; cela ne remplace pas ces étapes.

## Sources primaires

Documentation et signatures SDK vérifiées pendant l’implémentation :

- https://nextjs.org/docs/app/getting-started/installation
- https://docs.livekit.io/transport/media/screenshare/
- https://docs.livekit.io/frontends/reference/tokens-grants/
- https://docs.livekit.io/reference/client-sdk-js/interfaces/ScreenShareCaptureOptions.html
- https://docs.livekit.io/reference/client-sdk-js/interfaces/TrackPublishOptions.html
- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
- https://developer.chrome.com/docs/web-platform/screen-sharing-controls

## Évolution étape 3 en version 0.2

Le fonctionnement ci-dessus décrit le mode historique `prototype`. Le mode `supabase` est activé par variable d’environnement après installation de la migration. Consulter `docs/SUPABASE.md` pour l’installation et les limites.

Les routes `/api/auth/session`, `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout`, `/api/auth/recover` et `/api/auth/password` gèrent l’identité côté serveur. Le callback `/auth/callback` échange le code PKCE et n’accepte que des chemins de retour explicitement autorisés. Les cookies sont HttpOnly et les réponses personnelles non mises en cache.

Pour un salon Supabase, l’identité média est l’UUID vérifié par Auth. L’insertion d’un salon utilise la session utilisateur et les politiques RLS, jamais une clé administrative. La participation passe par une fonction SQL qui calcule le rôle à partir du propriétaire. Le serveur compare ensuite le propriétaire de la base et celui des métadonnées LiveKit avant de délivrer un jeton média. En cas d’échec de provisioning, le nouveau salon est supprimé au mieux des deux services ; un échec partiel reste fermé à l’entrée si la base ne confirme pas l’accès.

Les salons historiques conservent le mode inscrit dans leurs métadonnées, même après activation des comptes. Aucun pseudo ou identifiant fourni dans un formulaire ne permet de choisir sa propre identité technique ou son rôle.

## Évolution étape 4 en version 0.3

Les nouveaux salons contrôlés déclarent `controls=true` dans leurs métadonnées média et `controls_enabled=true` dans la base, uniquement après activation explicite. Les utilisateurs conservent des jetons d’entrée minimaux. `/api/rooms/:id/control` vérifie Auth et l’appartenance au salon avant d’accéder aux commandes privilégiées.

`begin_mates_control` et `finish_mates_control` sont réservées au rôle serveur Supabase. Elles sérialisent les commandes, calculent les droits et suivent une clé d’idempotence. Le navigateur ne peut ni réécrire le détenteur de scène ni finaliser une commande. Les appels média restent entre deux transactions courtes : toute erreur intermédiaire conserve un verrou fermé. Les limites et la recette sont documentées dans `docs/COMMANDES_SALON.md`.

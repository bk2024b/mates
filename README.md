# Mates

**Les mêmes passions. Le même moment.**

Version 0.5 — diffusion WebRTC, comptes Supabase, commandes du salon, chat, réactions et découverte des salons. Le média utilise un vrai serveur LiveKit ; aucune connexion ou statistique n’est simulée dans le produit.

## Démarrage rapide

Prérequis : Node.js **22 ou supérieur**, npm, un projet LiveKit Cloud (ou un serveur LiveKit existant). Supabase reste facultatif tant que `MATES_IDENTITY_MODE=prototype`. Pour activer les comptes, suivre [docs/SUPABASE.md](docs/SUPABASE.md).

```bash
npm ci
npm run setup
```

Ouvrir le fichier `.env.local` créé à la racine et renseigner les trois valeurs de votre projet LiveKit :

```dotenv
LIVEKIT_URL=wss://votre-projet.livekit.cloud
LIVEKIT_API_KEY=votre_cle
LIVEKIT_API_SECRET=votre_secret
APP_SESSION_SECRET=secret_aleatoire_genere_par_npm_run_setup
APP_ORIGIN=http://localhost:3000
```

Les valeurs ci-dessus sont des exemples. `npm run setup` génère réellement un secret aléatoire de 32 octets et ne remplace jamais un `.env.local` existant. Obtenir l’URL et une paire clé/secret depuis le tableau de bord de **votre** projet sur https://cloud.livekit.io. Ne pas utiliser un jeton participant à la place d’une clé API.

```bash
npm run doctor
npm run dev
```

Ouvrir **http://localhost:3000**. La page affiche les variables manquantes si le projet n’est pas configuré. Ne jamais préfixer les secrets par `NEXT_PUBLIC_` ni partager `.env.local`.

Sous Windows, ces commandes fonctionnent dans PowerShell depuis le dossier `mates`. Sous Ubuntu, elles fonctionnent depuis le même dossier dans le terminal.

## Faire le premier essai

1. Sur le navigateur A, créer un salon avec un pseudo et un sujet.
2. Entrer dans le salon. Le micro et la caméra sont coupés au départ.
3. Copier son lien avec **Inviter des mates**.
4. Sur un autre appareil, ou un autre navigateur/profil privé, ouvrir le lien et choisir un pseudo. Deux onglets du même profil partagent une identité et ne constituent pas deux participants : le second peut déconnecter le premier.
5. Dans le salon de l’hôte, ouvrir l’onglet **Qualité**, puis choisir **Vidéo fluide** ou **Texte net**.
6. Ouvrir `/lab` dans un autre onglet. Activer la tonalité de test si souhaité.
7. Dans le salon, cliquer sur **Partager l’écran**, sélectionner l’onglet du labo et cocher le partage audio dans le sélecteur du navigateur.
8. Vérifier le mouvement et le son chez le spectateur. Si nécessaire, cliquer sur **Activer le son du salon**.
9. Ouvrir **Qualité** chez le spectateur pour lire les valeurs reçues et exporter les mesures CSV.

Pour tester depuis deux appareils, utiliser une URL **HTTPS** accessible aux deux, avec `APP_ORIGIN` réglée exactement sur cette origine. `http://192.168.…` ne fournit généralement pas les permissions de capture. `localhost` est une exception sécurisée, mais chaque appareil y voit sa propre machine.

## Inclus

- Accueil Mates responsive, création et accès par lien, préentrée sous pseudo.
- API serveur de création de salon et génération de jetons LiveKit.
- Sessions signées dans un cookie HttpOnly ; seul le créateur obtient les sources écran et audio de partage.
- Salon de 12 participants maximum côté serveur média, voix et caméra facultatives.
- Partage d’écran, fenêtre ou onglet, avec audio **si le navigateur et la source l’autorisent**.
- Profils 1080p30 / 6 Mbit/s et 1080p15 / 3 Mbit/s **cibles**, VP8, simulcast avec couche 720p15, adaptation et dynacast.
- Audio partagé sans traitement de voix demandé à la capture, encodage stéréo ciblé à 128 kbit/s, piste séparée du micro.
- Vidéo et audio de la scène reçue attachés au même élément de lecture ; aucun retour sonore local de son propre partage.
- Volumes indépendants pour voix et contenu, plein écran, invitation, reconnexion automatique du SDK.
- Option activée par défaut pour suspendre les caméras reçues pendant un partage.
- Mesures WebRTC réelles et export CSV ; mire animée 1080p avec horloge UTC et tonalité 440 Hz.
- Erreurs explicites en cas de capture annulée, son absent, connexion impossible ou lien invalide.

## Périmètre du prototype

Dans les salons historiques, seul **l’hôte** peut diffuser. Les nouveaux salons contrôlés permettent les présentateurs désignés et une scène exclusive après activation de l’étape 4. Les comptes durables et les sessions invitées Supabase sont intégrés en mode `supabase`. Le chat, les réactions, le blocage, l’exclusion et la découverte restent dans les étapes suivantes. Aucun faux salon public ni faux compteur d’audience.

En mode prototype, le cookie de session dure 24 heures. Effacer les cookies, changer de navigateur ou changer de secret fait perdre le rôle d’hôte. L’identité est anonyme publiquement, pas au sens d’un anonymat réseau garanti. Une URL non répertoriée n’est pas un contrôle d’accès fort. Les sessions invitées et les quotas en mémoire sont adaptés à un pilote privé, pas à une ouverture publique sans contrôles supplémentaires.

Les salles média sont temporaires dans LiveKit. En mode Supabase, les profils, les métadonnées de salon et les participations sont aussi persistés en base. Les salles média expirent : un salon jamais rejoint expire après environ 10 minutes ; après le départ du dernier participant, environ 2 minutes. Le départ de l’hôte ne ferme pas immédiatement un salon encore occupé ; la fermeture et le transfert contrôlés relèvent de l’étape 4.

Aucun enregistrement n’est déclenché par l’application. Le transport WebRTC est chiffré ; aucun chiffrement applicatif de bout en bout contre le fournisseur média n’est implémenté. Les limites exactes du navigateur et du matériel restent déterminantes.

## Activer les comptes Supabase

La mise à jour conserve les salons actuels. Ajouter `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY`, appliquer la migration SQL, activer les connexions anonymes et configurer les emails, puis définir `MATES_IDENTITY_MODE=supabase` et redéployer. Guide détaillé : [docs/SUPABASE.md](docs/SUPABASE.md). Aucun secret `service_role` requis.

## Activer les commandes de l’hôte

Présentateurs désignés, arrêt et reprise de scène, exclusion et fermeture : appliquer la seconde migration et ajouter la clé serveur distincte, selon [docs/COMMANDES_SALON.md](docs/COMMANDES_SALON.md). Les salons historiques restent accessibles. Cette activation est indépendante de la correction du message d’inscription.

## Mesures et qualité

Le panneau calcule le débit par différences de compteurs RTC, les images/s si disponibles, la résolution encodée ou reçue, les pertes, la gigue et le RTT. `—` signifie non disponible. Côté émission, le débit additionne les couches simulcast. **Le RTT réseau n’est pas la latence de bout en bout de l’image.** Les pertes et la gigue ne sont pas toujours disponibles côté émetteur.

Les mesures sont conservées localement pendant que le panneau Qualité est monté, à raison d’une mesure toutes les 2 secondes, jusqu’à environ une heure. Changer de panneau ou quitter le salon réinitialise cet historique. Le CSV contient uniquement des mesures techniques, pas les pseudos, jetons ou contenus. Aucun envoi de télémétrie par Mates.

Le 1080p30 est un objectif de test, pas une garantie. Le simulcast peut accroître le débit montant et la charge CPU. Lancer la recette décrite dans [docs/RECETTE.md](docs/RECETTE.md) avant d’annoncer une qualité ou une capacité au public.

## Commandes

```bash
npm run typecheck        # TypeScript
npm test                 # Tests sécurité, droits, API et calculs RTC
npm run check            # Vérification des types et tests
npm run build            # Compilation production
npm start                # Serveur production, après build
npm run test:integration # Smoke HTTP contre un serveur déjà lancé sur localhost:3000
```

Pour une autre adresse, définir `TEST_BASE_URL` avant `npm run test:integration`. Ces smoke tests n’ouvrent pas de salon et ne génèrent pas de trafic média.

## Déploiement de test sur Vercel

1. Importer le dossier `mates` dans un dépôt ou le sélectionner comme racine du projet.
2. Utiliser le preset Next.js et Node.js 22 ou supérieur. Aucun export statique : les routes API sont nécessaires.
3. Ajouter les cinq variables d’environnement, avec `APP_ORIGIN=https://votre-domaine-exact` et une URL LiveKit sécurisée `wss://…`.
4. Déployer puis vérifier `/api/health` et un salon à deux appareils.
5. Pour une URL de prévisualisation différente, adapter `APP_ORIGIN` à cette URL et redéployer. Aucune origine générique ou joker.

Le média passe directement par LiveKit. Vercel héberge l’interface et les API courtes, pas un serveur de streaming ni un relais WebSocket maison. Vérifier les quotas et la facturation LiveKit avant les essais prolongés.

## Structure

```text
src/app/                 Pages et API App Router
src/components/          Accueil, préentrée, salon, lecture média, statistiques, labo
src/lib/media.ts         Profils de capture et publication
src/lib/stats.ts         Calculs RTC et export CSV
src/lib/server/          Sessions, validation HTTP, service LiveKit et permissions
scripts/                 Préparation locale et diagnostic
 tests/                  Tests automatisés (sans clés réelles)
docs/                    Architecture, recette et état de livraison
```

Dépendances exactes dans `package.json` et `package-lock.json`. Utiliser `npm ci` pour reproduire l’installation. Le ZIP n’inclut ni `node_modules`, ni `.next`, ni `.env.local`.

## Chat et réactions

Voir [docs/CHAT.md](docs/CHAT.md) pour appliquer la migration et activer `MATES_CHAT`. Inclut historique, blocage personnel et sélection des périphériques dans l’onglet Qualité.

## Découverte des salons

La page `/explore` liste les salons explicitement publics et occupés, avec recherche par sujet et filtre de places disponibles. À la création, le choix par défaut reste « uniquement par lien » ; les anciens salons restent non listés. Aucune migration ni variable supplémentaire. Voir [docs/DECOUVERTE.md](docs/DECOUVERTE.md).

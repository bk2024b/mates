# Activer l’étape 3 de Mates

La version 0.2 n’interrompt pas le prototype existant : sans activation explicite, les cinq variables actuelles suffisent. La création du projet Supabase et l’application de cette migration ne sont pas réalisées automatiquement par le code.

## 1 Créer le projet et la base

1. Créer un projet sur https://supabase.com/dashboard.
2. Dans **SQL Editor**, exécuter le contenu de `supabase/migrations/202610300001_identity.sql` **une seule fois** sur un nouveau schéma ne contenant pas ces tables.
3. La migration crée `profiles`, `rooms`, `room_members`, leurs index, les politiques RLS et la fonction `join_mates_room`.
4. Ne pas désactiver RLS et ne pas donner de privilèges supplémentaires aux rôles `anon` ou `authenticated`.

## 2 Configurer Auth

- Activer le fournisseur **Email** et conserver la confirmation d’email activée.
- Activer **Anonymous Sign-Ins** pour que les invités puissent entrer sans email.
- Dans **URL Configuration**, régler Site URL sur l’origine exacte de Mates, identique à `APP_ORIGIN`.
- Ajouter l’URL autorisée `https://votre-domaine/auth/callback` et la même URL avec `?next=%2Faccount%3Freset%3D1` pour la récupération. Pour les essais locaux, ajouter les équivalents sur `http://localhost:3000`.
- Ouvrir les liens de confirmation et de récupération dans le même navigateur que la demande : le flux PKCE utilise un vérificateur enregistré dans ce navigateur. Sinon, revenir à la connexion après avoir confirmé l’adresse ou redemander un lien de récupération.
- Prévoir un SMTP configuré pour envoyer des emails à de vrais utilisateurs. Le service email par défaut de Supabase a des restrictions et quotas : vérifier les réglages du projet avant le pilote.

## 3 Ajouter les variables puis activer

Conserver les cinq variables actuelles et ajouter :

```dotenv
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_votre_cle
MATES_IDENTITY_MODE=supabase
```

La clé publishable vient du dialogue **Connect** ou des clés API du projet. Une ancienne clé publique `anon` peut aussi être utilisée dans cette variable ; **aucune clé service_role ou sb_secret n’est nécessaire**. Ces variables sont lues côté serveur : aucun préfixe `NEXT_PUBLIC_` requis.

Ne basculer le mode sur `supabase` qu’une fois la migration et Auth configurés. Redéployer Vercel après modification des variables. Pour revenir au prototype, remettre `MATES_IDENTITY_MODE=prototype`. Les nouveaux salons créés en mode Supabase continuent à nécessiter une configuration Supabase valide ; aucun accès n’est accordé en contournant cette configuration.

## 4 Vérifier le parcours complet

1. Aller sur `/account`, s’inscrire avec pseudo, email et mot de passe, puis confirmer l’email et se connecter.
2. Créer un salon. Vérifier `host_id` dans `rooms` et le profil sous pseudo dans `profiles`.
3. Depuis une fenêtre privée, rejoindre sous pseudo sans email. Une identité anonyme Supabase est créée et le rôle `participant` est attribué en base.
4. Vérifier que cet invité ne peut pas créer un nouveau salon ni publier son écran.
5. Depuis l’écran compte de l’invité, choisir Inscription : la conversion utilise `updateUser` pour conserver son identifiant. Confirmer l’email puis se reconnecter et vérifier cette conservation.
6. Tester la récupération du mot de passe et le lien expiré ; l’email du compte n’est jamais envoyé dans le profil public ou les métadonnées LiveKit.
7. Après expiration du jeton Auth, effectuer une nouvelle requête de session : les routes rafraîchissent les cookies avec le SDK Supabase.

## Fonctionnement et limites

Les cookies Supabase sont HttpOnly. Tous les appels Auth passent par les routes serveur de Mates, et chaque requête sensible vérifie l’utilisateur avec `getUser()` ; elle ne fait pas confiance à un rôle envoyé par le navigateur ou à `user_metadata`. Les routes de session sont dynamiques et non mises en cache. Il n’y a pas de client Supabase dans le navigateur et aucune session personnelle n’est rendue dans une page statique, donc pas de proxy SSR nécessaire dans cette architecture.

Un compte permanent avec email confirmé peut créer un salon ; la base refuse aussi la création par un JWT anonyme. Le pseudo est modifiable pour chaque entrée et synchronisé avec le profil. Les métadonnées des anciens salons indiquent le mode historique ou ne comportent pas encore de mode : ils continuent à utiliser leur cookie signé initial, sans migration d’identité automatique.

`room_members` conserve les participations et leur dernière date d’entrée, **pas la présence en direct**. L’occupation affichée et la capacité sont encore gérées par LiveKit. Une ligne `rooms` n’est pas une garantie que la salle média est encore active ; la synchronisation du cycle de vie sera complétée avec les commandes d’hôte et webhooks à l’étape 4.

Les profils sont lisibles uniquement par leur propriétaire. Les participants voient les pseudos exposés par le salon LiveKit, jamais les emails ni les fiches privées. Aucune liste publique de profils n’est créée.

Les quotas mémoire actuels et les limites Auth Supabase conviennent à des essais privés. Les connexions anonymes étant initiées côté serveur, les quotas IP Supabase peuvent s’appliquer à plusieurs invités via la même sortie réseau. Avant ouverture publique, compléter par protection antiabus, CAPTCHA intégré et quotas distribués. Rien de cela n’est présenté comme déjà opérationnel.

La suppression et la rétention des comptes anonymes ne sont pas automatisées dans cette étape. Prévoir une politique de conservation avant ouverture publique. Effacer les cookies fait perdre l’identité invitée ; les comptes permanents restent récupérables par connexion.

## Sources primaires

- https://supabase.com/docs/guides/auth/auth-anonymous
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/server-side/advanced-guide
- https://supabase.com/docs/guides/database/postgres/row-level-security

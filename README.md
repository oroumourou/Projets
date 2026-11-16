# Campus Papers — API backend

Backend en JavaScript pour partager des épreuves universitaires. Il utilise
Express, PostgreSQL et `pg` (requêtes SQL paramétrées, sans ORM). Les PDF sont
stockés sur le disque de la machine, dans un répertoire non exposé directement
sur Internet.

Le frontend React du projet se trouve dans le dossier `client/` et communique
avec cette API.

## Fonctionnalités

- Création de compte, connexion et consultation du compte courant.
- Dépôt d'épreuves PDF, avec matière, filière, université et école/faculté.
- Recherche et filtres, pagination, consultation et téléchargement partagé.
- Suppression d'une épreuve par la personne qui l'a déposée.
- Validation des entrées, hachage des mots de passe, authentification JWT,
  limites de taille des fichiers et de fréquence des requêtes.

Les épreuves sont visibles dès leur dépôt. Pour un vrai service public, ajoutez
une étape de signalement et de modération avant de traiter des contenus publiés.
Les étudiants ne doivent déposer que des documents qu'ils ont le droit de
partager; une épreuve peut être protégée par le droit d'auteur ou contenir des
informations personnelles.

## Prérequis — sans Docker

1. Installer **Node.js 20.19 ou plus récent** (npm est inclus; requis par Vite 8).
2. Installer **PostgreSQL 13 ou plus récent** directement sur Windows, par exemple avec
   l'installateur officiel PostgreSQL. Docker n'est pas nécessaire.
3. Créer une base de données vide nommée `campus_papers`. Dans pgAdmin, faites
   clic droit sur *Databases* → *Create* → *Database*, puis saisissez ce nom.
   Vous pouvez aussi utiliser `createdb -U postgres campus_papers` dans un
   terminal PostgreSQL.

## Installation et démarrage

Dans PowerShell, depuis ce dossier :

```powershell
npm install
Copy-Item .env.example .env
```

Ouvrez `.env` et remplacez le mot de passe dans `DATABASE_URL` par celui défini
à l'installation de PostgreSQL. Remplacez aussi `JWT_SECRET` par une clé privée
aléatoire d'au moins 32 caractères. Si le mot de passe PostgreSQL contient des
caractères réservés d'une URL (par exemple `@`, `:` ou `/`), encodez-les dans
`DATABASE_URL`. Par exemple, dans PowerShell :

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Initialisez les tables et démarrez l'API :

```powershell
npm run db:migrate
npm run dev
```

L'API répond sur `http://localhost:3000`. Le contrôle de santé est disponible
sur `http://localhost:3000/health`.

Dans un autre terminal PowerShell, démarrez le frontend :

```powershell
Set-Location .\client
npm install
Copy-Item .env.example .env
npm run dev
```

Le site sera disponible sur `http://localhost:5173`. Le frontend utilise
`http://localhost:3000` par défaut. Si l'API est à une autre adresse, modifiez
`VITE_API_URL` dans `client/.env`.
Les adresses `localhost:5173` et `127.0.0.1:5173` sont autorisées par défaut
dans la configuration CORS; si vous modifiez cette liste dans `.env`, redémarrez
le backend pour appliquer le changement.

## API

Toutes les réponses d'erreur ont la forme `{ "error": { "message": "..." } }`.
Les routes protégées reçoivent l'en-tête
`Authorization: Bearer <jeton>`.

| Méthode | Route | Authentification | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Non | Créer un compte (`displayName`, `email`, `password`) |
| `POST` | `/api/auth/login` | Non | Se connecter (`email`, `password`) |
| `GET` | `/api/auth/me` | Oui | Lire son profil |
| `GET` | `/api/exams` | Non | Lister/rechercher les épreuves |
| `GET` | `/api/exams/mine` | Oui | Lister ses propres dépôts |
| `GET` | `/api/exams/:id` | Non | Lire une épreuve |
| `GET` | `/api/exams/:id/file` | Non | Télécharger le PDF |
| `POST` | `/api/exams` | Oui | Déposer une épreuve |
| `DELETE` | `/api/exams/:id` | Oui, propriétaire | Supprimer son épreuve |

Pour `POST /api/exams`, envoyez une requête `multipart/form-data` avec :

- `file` : un PDF (15 Mo maximum par défaut);
- `subject`, `program`, `university`, `faculty` : champs obligatoires;
- `examYear` : année facultative entre 1900 et 2100.

Exemple de recherche : `GET /api/exams?subject=math&page=1&limit=20`.
Les filtres `subject`, `program`, `university` et `faculty` sont facultatifs.

## Exemple de test manuel (PowerShell)

Créer un compte et se connecter avec un client API (Postman/Insomnia) ou
`curl.exe`. Exemple d'inscription :

```powershell
curl.exe -X POST http://localhost:3000/api/auth/register `
  -H "Content-Type: application/json" `
  -d "{\"displayName\":\"Awa\",\"email\":\"awa@example.com\",\"password\":\"UnePhraseDePasseSolide123!\"}"
```

La connexion renvoie un jeton. Utilisez-le comme Bearer pour déposer un fichier.
Ne partagez pas un jeton et ne l'enregistrez pas dans le dépôt Git.

## Pourquoi je conseille d'attendre avant d'ajouter les commentaires

Les commentaires peuvent aider à corriger une épreuve, mais nécessitent
signalement, modération, lutte contre le spam et gestion des abus. Commencez par
les dépôts et téléchargements; ajoutez les commentaires lorsque ces règles et
les outils de modération sont prêts.

## Sécurité et limites à connaître

- Les mots de passe sont hachés avec bcrypt; ils ne sont jamais renvoyés par
  l'API. Les requêtes SQL utilisent des paramètres plutôt que de concaténer
  les valeurs utilisateur.
- L'API accepte uniquement des PDF, vérifie leur signature et leur taille, et
  génère elle-même les noms de fichiers.
- Les jetons d'accès expirent. Le frontend devra éviter de les exposer à du
  code non fiable; une version de production peut préférer des cookies
  `HttpOnly`, `Secure` et `SameSite` avec une stratégie de renouvellement.
- Pour conserver la connexion après un rechargement, le frontend de démonstration
  mémorise le jeton dans `localStorage`. Cela expose le jeton si un script malveillant
  s'exécute dans la page; pour un service public, préférez des cookies `HttpOnly`
  et adaptez l'authentification du backend.
- Le limiteur de requêtes intégré garde ses compteurs en mémoire : il convient
  au développement sur une seule instance. En production multi-instance,
  configurez un stockage partagé.
- Le stockage local convient à l'apprentissage et au développement. Il faut
  sauvegarder séparément la base et le dossier `storage`. En production,
  privilégiez un stockage objet privé, l'analyse antivirus, HTTPS, des
  sauvegardes testées et une politique de conservation des données.

## Docker : concept et utilisation

Docker sert à exécuter un programme dans un **conteneur**, un environnement
isolé qui embarque l'application et ses dépendances. Une *image* est le modèle
servant à créer ce conteneur. `Dockerfile` décrit la construction de l'image;
`docker compose` peut démarrer plusieurs services (par exemple l'API et
PostgreSQL), leur réseau et leurs volumes avec une seule commande.

Docker n'est pas obligatoire pour ce projet. Comme la virtualisation de votre
ordinateur est désactivée, vous pouvez travailler avec Node.js et PostgreSQL
installés directement sur Windows, en suivant les étapes plus haut. Docker
Desktop nécessite généralement la virtualisation et WSL 2 sous Windows. Vous
pourrez l'apprendre plus tard sur une machine compatible :

1. Écrire un `Dockerfile` pour installer les dépendances et lancer l'API.
2. Décrire l'API et PostgreSQL dans `compose.yaml`.
3. Stocker les données PostgreSQL dans un volume persistant.
4. Lancer l'ensemble avec `docker compose up --build`.

Ne mettez jamais les mots de passe de production dans l'image ou dans Git;
utilisez des variables/secrets et des volumes pour les données persistantes.

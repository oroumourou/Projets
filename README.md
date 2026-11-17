# AutoMoto — API backend

Backend REST pour une marketplace de voitures et motos **neuves**, construit avec Django REST Framework et PostgreSQL.

## Fonctionnalités

- Comptes clients et concessionnaires, authentification JWT.
- Profil concessionnaire soumis à validation par un administrateur Django avant publication.
- Annonces de voitures et motos, brouillons, publication, archivage et vente.
- Détails techniques, prix, localisation et galerie d'images.
- Recherche, filtres, tri et pagination des annonces publiques.
- Commentaires, likes (activation/désactivation) et suivi des partages.
- Tableau de bord concessionnaire avec annonces et indicateurs d'engagement.
- Interface d'administration et documentation OpenAPI (Swagger/ReDoc).

## Démarrage local

Python 3.12 ou ultérieur et PostgreSQL sont requis.

```powershell
Copy-Item .env.example .env
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Le fichier `.env` est chargé automatiquement. Vérifiez que `DB_HOST=localhost` et que `DB_NAME`, `DB_USER` et `DB_PASSWORD` correspondent à votre installation PostgreSQL. Si nécessaire, créez la base et son utilisateur depuis pgAdmin, connecté avec un compte administrateur PostgreSQL :

```sql
ALTER USER automoto WITH PASSWORD 'automoto';
```

Si la base `automoto` n'existe pas encore, créez-la également depuis pgAdmin : `CREATE DATABASE automoto OWNER automoto;`. Le mot de passe ci-dessus correspond à la valeur de développement de `.env.example`; choisissez-en un autre hors développement.

## Principales routes

| Méthode | Route | Accès |
|---|---|---|
| POST | `/api/v1/auth/register/` | Public — inscription client |
| POST | `/api/v1/auth/register/dealer/` | Public — inscription concessionnaire |
| POST | `/api/v1/auth/token/` | Public — email et mot de passe, retourne les JWT |
| POST | `/api/v1/auth/token/refresh/` | Public — renouvellement du JWT |
| GET/PATCH | `/api/v1/auth/me/` | Connecté — profil courant |
| GET/PATCH | `/api/v1/auth/dealer-profile/` | Concessionnaire |
| GET | `/api/v1/vehicles/` | Public — annonces publiées |
| GET | `/api/v1/vehicles/{id}/` | Public — détail par identifiant |
| POST | `/api/v1/vehicles/` | Concessionnaire approuvé |
| PATCH/DELETE | `/api/v1/vehicles/{id}/` | Propriétaire de l'annonce |
| POST | `/api/v1/vehicles/{id}/publish/` | Concessionnaire propriétaire |
| POST | `/api/v1/vehicle-images/` | Concessionnaire approuvé — multipart |
| GET/POST | `/api/v1/vehicles/{slug}/comments/` | Lecture publique / client connecté |
| POST | `/api/v1/vehicles/{slug}/like/` | Connecté — bascule like/unlike |
| POST | `/api/v1/vehicles/{slug}/share/` | Public |
| GET | `/api/v1/dealer/dashboard/` | Concessionnaire |

Filtres des annonces : `vehicle_type`, `make`, `model`, `country`, `city`, `fuel_type`, `transmission`, `min_price`, `max_price`, `min_year`, `max_year`, `dealer`. La recherche textuelle utilise `search` et le tri `ordering` (ex. `ordering=price`).

Les endpoints JWT retournent les jetons d'accès et de renouvellement. Pour les routes protégées, envoyer `Authorization: Bearer <access>`.

## Frontend React

L'interface React se trouve dans [`frontend/`](./frontend/README.md). Après avoir démarré le backend, lancez-la dans un second terminal :

```powershell
Set-Location frontend
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

Ouvrez l'adresse Vite affichée dans le terminal, généralement `http://localhost:5173`.

## Tests

```powershell
# Pour exécuter les tests sans serveur PostgreSQL local :
$env:DB_ENGINE="django.db.backends.sqlite3"
$env:DB_NAME=":memory:"
python manage.py test
```

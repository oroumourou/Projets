# Mobila

Mobila est une application web de location de maisons, appartements, studios et chambres. Le projet est conçu pour fonctionner localement sous Windows, sans Docker :

- **API** : Django REST Framework, PostgreSQL, JWT.
- **Interface** : React, Vite et React Router.
- **Fonctionnalités** : annonces, recherche, photos et vidéos, demandes de séjour, décisions d’hôte, annulation et avis vérifiés.

Les paiements en ligne ne sont pas activés : aucun prélèvement n’est effectué depuis l’application.

## Démarrer en local

### 1. Configurer PostgreSQL

Créer la base et un utilisateur applicatif dans pgAdmin ou `psql`. Accorder à ce rôle la propriété de la base (ou au minimum les droits de création sur le schéma `public`).

### 2. Démarrer l’API

Dans PowerShell :

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Modifier `backend\.env` avec une clé secrète Django et l’URL de la base PostgreSQL, puis lancer :

```powershell
python manage.py check
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

L’API est à `http://127.0.0.1:8000/api/v1/`; la documentation Swagger est à `http://127.0.0.1:8000/api/v1/docs/`.

### 3. Démarrer le frontend

Dans un second terminal :

```powershell
cd frontend
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Ouvrir `http://127.0.0.1:3000`. Les explications détaillées figurent dans [backend/README.md](./backend/README.md) et [frontend/README.md](./frontend/README.md).

## Parcours principaux

1. Un visiteur explore les annonces publiées, filtre les résultats et consulte les photos, vidéos et avis.
2. Un compte peut créer une annonce, gérer ses médias et la publier ou l’archiver.
3. Un voyageur connecté soumet une demande de séjour; les dates sont bloquées pendant 24 heures.
4. L’hôte confirme ou refuse la demande dans son espace. Le voyageur peut annuler avant le jour d’arrivée.
5. Après la fin d’un séjour confirmé, le voyageur peut publier un avis vérifié.

Les demandes en attente expirent automatiquement lors des opérations de réservation et de consultation des séjours. En production, planifier également `python manage.py expire_pending_bookings` toutes les 15 minutes pour maintenir les statuts à jour même sans trafic.


import os

os.environ.setdefault("DJANGO_SECRET_KEY", "mobila-test-only-secret-key-with-at-least-thirty-two-bytes")
os.environ.setdefault("DJANGO_DEBUG", "True")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from .settings import *  # noqa: E402,F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {
    "anon": "1000/minute",
    "user": "1000/minute",
    "auth": "1000/minute",
    "media_upload": "1000/hour",
    "review": "1000/hour",
}

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.text import slugify


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Une adresse e-mail est obligatoire.")
        user = self.model(email=self.normalize_email(email), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        if not extra_fields["is_staff"] or not extra_fields["is_superuser"]:
            raise ValueError("Un superutilisateur doit être membre du staff et superuser.")
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        CUSTOMER = "customer", "Client"
        DEALER = "dealer", "Concessionnaire"

    username = None
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=12, choices=Role.choices, default=Role.CUSTOMER)
    phone = models.CharField(max_length=30, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    def __str__(self):
        return self.email


class DealerProfile(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        APPROVED = "approved", "Approuvé"
        REJECTED = "rejected", "Refusé"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="dealer_profile")
    business_name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True, blank=True)
    description = models.TextField(blank=True)
    registration_number = models.CharField(max_length=80, blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    website = models.URLField(blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.business_name) or "concessionnaire"
            candidate, suffix = base, 2
            while DealerProfile.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                candidate, suffix = f"{base}-{suffix}", suffix + 1
            self.slug = candidate
        super().save(*args, **kwargs)

    def __str__(self):
        return self.business_name

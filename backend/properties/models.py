from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

from .validators import media_upload_path, validate_media_file


class Property(models.Model):
    class PropertyType(models.TextChoices):
        APARTMENT = "apartment", "Appartement"
        HOUSE = "house", "Maison"
        STUDIO = "studio", "Studio"
        ROOM = "room", "Chambre"

    class Status(models.TextChoices):
        DRAFT = "draft", "Brouillon"
        PUBLISHED = "published", "Publié"
        ARCHIVED = "archived", "Archivé"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="properties")
    title = models.CharField(max_length=180)
    description = models.TextField(max_length=10_000)
    property_type = models.CharField(max_length=20, choices=PropertyType.choices, default=PropertyType.APARTMENT)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=120, db_index=True)
    country = models.CharField(max_length=120, default="France")
    postal_code = models.CharField(max_length=20)
    nightly_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(1)])
    max_guests = models.PositiveSmallIntegerField(
        default=2, validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    bedrooms = models.PositiveSmallIntegerField(default=1, validators=[MaxValueValidator(100)])
    bathrooms = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=1,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    amenities = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.CheckConstraint(condition=Q(nightly_price__gt=0), name="property_price_positive"),
            models.CheckConstraint(condition=Q(max_guests__gte=1), name="property_guests_positive"),
            models.CheckConstraint(condition=Q(max_guests__lte=100), name="property_guests_cap"),
            models.CheckConstraint(condition=Q(bedrooms__lte=100), name="property_bedrooms_cap"),
            models.CheckConstraint(condition=Q(bathrooms__gte=0), name="property_bathrooms_nonnegative"),
            models.CheckConstraint(condition=Q(bathrooms__lte=100), name="property_bathrooms_cap"),
        ]
        indexes = [
            models.Index(fields=("status", "city", "-created_at"), name="property_search_idx"),
        ]

    def __str__(self):
        return self.title


class PropertyMedia(models.Model):
    class Kind(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Vidéo"

    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="media")
    file = models.FileField(upload_to=media_upload_path, validators=[validate_media_file])
    kind = models.CharField(max_length=8, choices=Kind.choices)
    alt_text = models.CharField(max_length=180, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("sort_order", "id")

    def save(self, *args, **kwargs):
        self.file.seek(0)
        self.kind = validate_media_file(self.file)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.kind}: {self.property.title}"

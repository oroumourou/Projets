from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify


class Vehicle(models.Model):
    class Type(models.TextChoices):
        CAR = "car", "Voiture"
        MOTORCYCLE = "motorcycle", "Moto"

    class Status(models.TextChoices):
        DRAFT = "draft", "Brouillon"
        PUBLISHED = "published", "Publié"
        SOLD = "sold", "Vendu"
        ARCHIVED = "archived", "Archivé"

    dealer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="vehicles")
    vehicle_type = models.CharField(max_length=12, choices=Type.choices)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField()
    make = models.CharField(max_length=80, db_index=True)
    model = models.CharField(max_length=100, db_index=True)
    trim = models.CharField(max_length=100, blank=True)
    year = models.PositiveSmallIntegerField()
    price = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)])
    currency = models.CharField(max_length=3, default="EUR")
    mileage_km = models.PositiveIntegerField(default=0)
    fuel_type = models.CharField(max_length=30, blank=True)
    transmission = models.CharField(max_length=30, blank=True)
    engine_displacement_cc = models.PositiveIntegerField(null=True, blank=True)
    power_hp = models.PositiveIntegerField(null=True, blank=True)
    exterior_color = models.CharField(max_length=60, blank=True)
    body_style = models.CharField(max_length=40, blank=True)
    doors = models.PositiveSmallIntegerField(null=True, blank=True)
    seats = models.PositiveSmallIntegerField(null=True, blank=True)
    drivetrain = models.CharField(max_length=30, blank=True)
    condition = models.CharField(max_length=12, default="new", editable=False)
    vin = models.CharField(max_length=32, blank=True)
    stock_number = models.CharField(max_length=60, blank=True)
    country = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    is_featured = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-published_at", "-created_at")
        indexes = [
            models.Index(fields=("vehicle_type", "status", "published_at")),
            models.Index(fields=("make", "model")),
            models.Index(fields=("country", "city")),
            models.Index(fields=("price",)),
        ]
        constraints = [
            models.UniqueConstraint(fields=("dealer", "stock_number"), condition=~models.Q(stock_number=""), name="unique_dealer_stock_number")
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(f"{self.make}-{self.model}-{self.title}")[:190] or "vehicule"
            candidate, suffix = base, 2
            while Vehicle.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                candidate, suffix = f"{base}-{suffix}", suffix + 1
            self.slug = candidate
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class VehicleImage(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="vehicles/%Y/%m/")
    alt_text = models.CharField(max_length=160, blank=True)
    position = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("position", "id")

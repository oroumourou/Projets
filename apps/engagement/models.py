from django.conf import settings
from django.db import models
from apps.vehicles.models import Vehicle


class Like(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="likes")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("user", "vehicle"), name="unique_user_vehicle_like")]


class Comment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="comments")
    content = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("vehicle", "-created_at"))]


class ShareEvent(models.Model):
    class Platform(models.TextChoices):
        LINK = "link", "Lien copié"
        FACEBOOK = "facebook", "Facebook"
        WHATSAPP = "whatsapp", "WhatsApp"
        X = "x", "X"
        OTHER = "other", "Autre"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="vehicle_shares")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="shares")
    platform = models.CharField(max_length=12, choices=Platform.choices, default=Platform.LINK)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=("vehicle", "-created_at"))]

from builtins import property as builtin_property

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        CONFIRMED = "confirmed", "Confirmée"
        REJECTED = "rejected", "Refusée"
        CANCELLED = "cancelled", "Annulée"
        EXPIRED = "expired", "Expirée"

    property = models.ForeignKey("properties.Property", on_delete=models.PROTECT, related_name="bookings")
    guest = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="bookings")
    check_in = models.DateField()
    check_out = models.DateField()
    guests = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    nightly_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    host_message = models.CharField(max_length=500, blank=True)
    hold_expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.CheckConstraint(condition=Q(check_out__gt=models.F("check_in")), name="booking_dates_ordered"),
            models.CheckConstraint(condition=Q(guests__gte=1), name="booking_guests_positive"),
            models.CheckConstraint(condition=Q(total_price__gte=0), name="booking_total_nonnegative"),
        ]
        indexes = [
            models.Index(fields=("property", "status", "check_in", "check_out"), name="booking_conflict_idx"),
            models.Index(fields=("guest", "-created_at"), name="booking_guest_idx"),
        ]

    @builtin_property
    def nights(self):
        return (self.check_out - self.check_in).days

    def __str__(self):
        return f"{self.property.title} — {self.check_in} / {self.check_out}"

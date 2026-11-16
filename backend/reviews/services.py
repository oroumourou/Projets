from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from bookings.models import Booking

from .models import Review


@transaction.atomic
def create_verified_review(*, author, booking_id, rating, comment, property_id):
    booking = (
        Booking.objects.select_related("property")
        .filter(pk=booking_id, property_id=property_id)
        .first()
    )
    if booking is None:
        raise ValidationError({"booking": "Réservation introuvable pour ce logement."})
    if booking.guest_id != author.id:
        raise ValidationError({"booking": "Seul le voyageur concerné peut déposer cet avis."})
    if booking.property.owner_id == author.id:
        raise ValidationError({"booking": "Vous ne pouvez pas évaluer votre propre logement."})
    if booking.status != Booking.Status.CONFIRMED or booking.check_out > timezone.localdate():
        raise ValidationError({"booking": "Un avis est possible après la fin d’un séjour confirmé."})
    if Review.objects.filter(booking=booking).exists():
        raise ValidationError({"booking": "Cette réservation a déjà reçu un avis."})
    try:
        return Review.objects.create(
            booking=booking,
            author=author,
            rating=rating,
            comment=comment.strip(),
        )
    except IntegrityError as exc:
        raise ValidationError({"booking": "Cette réservation a déjà reçu un avis."}) from exc

from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from properties.models import Property

from .models import Booking

HOLD_DURATION = timedelta(hours=24)
MAX_STAY_NIGHTS = 90


def _active_overlap(property_obj, check_in, check_out, *, exclude_id=None):
    now = timezone.now()
    query = Booking.objects.filter(
        property=property_obj,
        check_in__lt=check_out,
        check_out__gt=check_in,
    ).filter(
        Q(status=Booking.Status.CONFIRMED)
        | Q(status=Booking.Status.PENDING, hold_expires_at__gt=now)
    )
    if exclude_id is not None:
        query = query.exclude(pk=exclude_id)
    return query.exists()


def expire_pending_bookings(property_obj=None):
    expired = Booking.objects.filter(status=Booking.Status.PENDING, hold_expires_at__lte=timezone.now())
    if property_obj is not None:
        expired = expired.filter(property=property_obj)
    return expired.update(status=Booking.Status.EXPIRED, updated_at=timezone.now())


@transaction.atomic
def create_booking(*, guest, property_id, check_in, check_out, guests):
    property_obj = Property.objects.select_for_update().filter(pk=property_id).first()
    if property_obj is None or property_obj.status != Property.Status.PUBLISHED:
        raise ValidationError({"property": "Ce logement n’est pas disponible."})
    if property_obj.owner_id == guest.id:
        raise ValidationError({"property": "Vous ne pouvez pas réserver votre propre logement."})
    today = timezone.localdate()
    if check_in < today or check_out <= check_in:
        raise ValidationError({"check_in": "Choisissez des dates futures et une date de départ après l’arrivée."})
    nights = (check_out - check_in).days
    if nights > MAX_STAY_NIGHTS:
        raise ValidationError({"check_out": f"Un séjour ne peut pas dépasser {MAX_STAY_NIGHTS} nuits."})
    if guests > property_obj.max_guests:
        raise ValidationError({"guests": "Le nombre de voyageurs dépasse la capacité du logement."})

    expire_pending_bookings(property_obj)
    if _active_overlap(property_obj, check_in, check_out):
        raise ValidationError({"dates": "Ce logement n’est pas disponible pour ces dates."})

    nightly_price = property_obj.nightly_price
    return Booking.objects.create(
        property=property_obj,
        guest=guest,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        nightly_price=nightly_price,
        total_price=nightly_price * Decimal(nights),
        status=Booking.Status.PENDING,
        hold_expires_at=timezone.now() + HOLD_DURATION,
    )


@transaction.atomic
def host_decide_booking(*, booking_id, host, decision, message=""):
    property_id = Booking.objects.filter(pk=booking_id).values_list("property_id", flat=True).first()
    if property_id is None:
        raise ValidationError({"detail": "Réservation introuvable."})
    property_obj = Property.objects.select_for_update().get(pk=property_id)
    if property_obj.owner_id != host.id:
        raise ValidationError({"detail": "Seul l’hôte de ce logement peut répondre à la demande."})
    booking = Booking.objects.select_for_update().get(pk=booking_id, property=property_obj)
    if booking.status != Booking.Status.PENDING or booking.hold_expires_at <= timezone.now():
        raise ValidationError({"detail": "Cette demande n’est plus en attente ou a expiré."})
    if decision == "confirm":
        if _active_overlap(property_obj, booking.check_in, booking.check_out, exclude_id=booking.id):
            raise ValidationError({"detail": "Les dates ne sont plus disponibles."})
        booking.status = Booking.Status.CONFIRMED
        booking.host_message = message.strip()
    elif decision == "reject":
        booking.status = Booking.Status.REJECTED
        booking.host_message = message.strip()
    else:
        raise ValidationError({"decision": "Choisissez confirm ou reject."})
    booking.save(update_fields=("status", "host_message", "updated_at"))
    return booking


@transaction.atomic
def cancel_booking(*, booking, user):
    locked = Booking.objects.select_for_update().select_related("property").get(pk=booking.pk)
    if locked.guest_id != user.id:
        raise ValidationError({"detail": "Seul le voyageur peut annuler cette réservation."})
    if locked.status not in (Booking.Status.PENDING, Booking.Status.CONFIRMED):
        raise ValidationError({"detail": "Cette réservation ne peut plus être annulée."})
    if locked.check_in <= timezone.localdate():
        raise ValidationError({"detail": "Une réservation ne peut être annulée à partir du jour d’arrivée."})
    locked.status = Booking.Status.CANCELLED
    locked.save(update_fields=("status", "updated_at"))
    return locked


@transaction.atomic
def host_cancel_booking(*, booking, host, message=""):
    property_id = Booking.objects.filter(pk=booking.pk).values_list("property_id", flat=True).first()
    if property_id is None:
        raise ValidationError({"detail": "Réservation introuvable."})
    property_obj = Property.objects.select_for_update().get(pk=property_id)
    if property_obj.owner_id != host.id:
        raise ValidationError({"detail": "Seul l’hôte de ce logement peut annuler le séjour."})
    locked = Booking.objects.select_for_update().get(pk=booking.pk, property=property_obj)
    if locked.status not in (Booking.Status.PENDING, Booking.Status.CONFIRMED):
        raise ValidationError({"detail": "Cette réservation ne peut plus être annulée."})
    if locked.check_in <= timezone.localdate():
        raise ValidationError({"detail": "Un séjour ne peut pas être annulé à partir du jour d’arrivée."})
    locked.status = Booking.Status.CANCELLED
    locked.host_message = message.strip()
    locked.save(update_fields=("status", "host_message", "updated_at"))
    return locked

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from properties.models import Property

from .models import Booking
from .services import create_booking, expire_pending_bookings

User = get_user_model()


class BookingApiTests(APITestCase):
    def setUp(self):
        self.host = User.objects.create_user(email="host@example.fr", password="StrongPassword2026!")
        self.guest = User.objects.create_user(email="guest@example.fr", password="StrongPassword2026!")
        self.other = User.objects.create_user(email="other@example.fr", password="StrongPassword2026!")
        self.property = Property.objects.create(
            owner=self.host,
            title="Studio du port",
            description="Un joli studio.",
            address="4 quai des Fleurs",
            city="Lyon",
            country="France",
            postal_code="69000",
            nightly_price="95.00",
            max_guests=3,
            status=Property.Status.PUBLISHED,
        )
        self.start = timezone.localdate() + timedelta(days=14)
        self.end = self.start + timedelta(days=3)

    def make_booking(self, start=None, end=None):
        return create_booking(
            guest=self.guest,
            property_id=self.property.pk,
            check_in=start or self.start,
            check_out=end or self.end,
            guests=2,
        )

    def test_booking_prices_are_snapshotted_and_host_can_confirm(self):
        self.client.force_authenticate(self.guest)
        response = self.client.post(
            "/api/v1/bookings/",
            {"property_id": self.property.pk, "check_in": str(self.start), "check_out": str(self.end), "guests": 2},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["total_price"], "285.00")
        booking = Booking.objects.get(pk=response.data["id"])
        self.property.nightly_price = Decimal("150.00")
        self.property.save(update_fields=("nightly_price",))
        booking.refresh_from_db()
        self.assertEqual(booking.nightly_price, Decimal("95.00"))

        self.client.force_authenticate(self.host)
        decision = self.client.post(f"/api/v1/bookings/{booking.pk}/decision/", {"decision": "confirm"}, format="json")
        self.assertEqual(decision.status_code, 200, decision.data)
        self.assertEqual(decision.data["status"], Booking.Status.CONFIRMED)

    def test_pending_booking_holds_dates_then_expiration_releases_them(self):
        first = self.make_booking()
        with self.assertRaisesMessage(Exception, "Ce logement n’est pas disponible"):
            self.make_booking(self.start + timedelta(days=1), self.end + timedelta(days=1))
        Booking.objects.filter(pk=first.pk).update(hold_expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(expire_pending_bookings(), 1)
        second = self.make_booking(self.start + timedelta(days=1), self.end + timedelta(days=1))
        self.assertEqual(second.status, Booking.Status.PENDING)

    def test_host_cannot_book_own_property_and_stranger_cannot_decide(self):
        self.client.force_authenticate(self.host)
        own = self.client.post(
            "/api/v1/bookings/",
            {"property_id": self.property.pk, "check_in": str(self.start), "check_out": str(self.end), "guests": 1},
            format="json",
        )
        self.assertEqual(own.status_code, 400)
        booking = self.make_booking()
        self.client.force_authenticate(self.other)
        response = self.client.post(f"/api/v1/bookings/{booking.pk}/decision/", {"decision": "confirm"}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_guest_can_cancel_before_arrival(self):
        booking = self.make_booking()
        self.client.force_authenticate(self.guest)
        response = self.client.post(f"/api/v1/bookings/{booking.pk}/cancel/", {}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], Booking.Status.CANCELLED)

    def test_host_can_cancel_a_confirmed_future_stay(self):
        booking = self.make_booking()
        booking.status = Booking.Status.CONFIRMED
        booking.save(update_fields=("status",))
        self.client.force_authenticate(self.host)
        response = self.client.post(
            f"/api/v1/bookings/{booking.pk}/host-cancel/",
            {"message": "Travaux imprévus dans le logement."},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["status"], Booking.Status.CANCELLED)
        self.assertEqual(response.data["host_message"], "Travaux imprévus dans le logement.")

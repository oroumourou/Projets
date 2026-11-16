from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from bookings.models import Booking
from properties.models import Property

User = get_user_model()


class VerifiedReviewApiTests(APITestCase):
    def setUp(self):
        self.host = User.objects.create_user(email="host@example.fr", password="StrongPassword2026!")
        self.guest = User.objects.create_user(email="guest@example.fr", password="StrongPassword2026!")
        self.property = Property.objects.create(
            owner=self.host,
            title="Maison des dunes",
            description="Séjour au calme.",
            address="2 rue de la Plage",
            city="Biarritz",
            country="France",
            postal_code="64200",
            nightly_price="150.00",
            status=Property.Status.PUBLISHED,
        )
        self.booking = Booking.objects.create(
            property=self.property,
            guest=self.guest,
            check_in=timezone.localdate() - timedelta(days=8),
            check_out=timezone.localdate() - timedelta(days=2),
            guests=2,
            nightly_price="150.00",
            total_price="900.00",
            status=Booking.Status.CONFIRMED,
            hold_expires_at=timezone.now() - timedelta(days=7),
        )

    def test_only_guest_of_completed_confirmed_booking_can_review_once(self):
        self.client.force_authenticate(self.guest)
        path = f"/api/v1/properties/{self.property.pk}/reviews/"
        response = self.client.post(path, {"booking": self.booking.pk, "rating": 5, "comment": "Très beau séjour."}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        duplicate = self.client.post(path, {"booking": self.booking.pk, "rating": 4, "comment": ""}, format="json")
        self.assertEqual(duplicate.status_code, 400)
        public = self.client.get(path)
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.data["results"][0]["rating"], 5)

    def test_pending_or_unrelated_booking_cannot_be_reviewed(self):
        self.booking.status = Booking.Status.PENDING
        self.booking.save(update_fields=("status",))
        self.client.force_authenticate(self.guest)
        response = self.client.post(
            f"/api/v1/properties/{self.property.pk}/reviews/",
            {"booking": self.booking.pk, "rating": 5, "comment": ""},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

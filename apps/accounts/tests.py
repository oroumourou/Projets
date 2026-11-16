from django.test import TestCase
from rest_framework.test import APIClient

from .models import DealerProfile, User


class RegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_customer_registration(self):
        response = self.client.post("/api/v1/auth/register/", {
            "email": "client@example.com", "password": "StrongPass!902", "first_name": "Awa",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(User.objects.get(email="client@example.com").role, User.Role.CUSTOMER)

    def test_dealer_registration_starts_pending(self):
        response = self.client.post("/api/v1/auth/register/dealer/", {
            "email": "dealer@example.com", "password": "StrongPass!902",
            "business_name": "Garage Central", "city": "Abidjan", "country": "Côte d'Ivoire",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="dealer@example.com")
        self.assertEqual(user.dealer_profile.status, DealerProfile.Status.PENDING)
        self.assertEqual(response.data["user"]["role"], User.Role.DEALER)

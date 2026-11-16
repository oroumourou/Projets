from django.test import TestCase
from rest_framework.test import APIClient
from apps.accounts.models import DealerProfile, User
from .models import Vehicle


class VehicleApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.dealer = User.objects.create_user(email="dealer@example.com", password="StrongPass!902", role=User.Role.DEALER)
        DealerProfile.objects.create(user=self.dealer, business_name="Auto Central", city="Abidjan", country="Côte d'Ivoire", status=DealerProfile.Status.APPROVED)

    def test_approved_dealer_can_create_new_vehicle(self):
        self.client.force_authenticate(self.dealer)
        response = self.client.post("/api/v1/vehicles/", {
            "vehicle_type": "car", "title": "Berline neuve", "description": "Avec garantie.",
            "make": "Exemple", "model": "Berline", "year": 2026, "price": "25000000",
            "country": "Côte d'Ivoire", "city": "Abidjan",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Vehicle.objects.get().dealer, self.dealer)

    def test_used_vehicle_mileage_is_rejected(self):
        self.client.force_authenticate(self.dealer)
        response = self.client.post("/api/v1/vehicles/", {
            "vehicle_type": "motorcycle", "title": "Moto", "description": "Moto",
            "make": "Exemple", "model": "Route", "year": 2026, "price": "1000000",
            "mileage_km": 10, "country": "Côte d'Ivoire", "city": "Abidjan",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("mileage_km", response.data)

    def test_public_list_hides_drafts(self):
        Vehicle.objects.create(dealer=self.dealer, vehicle_type="car", title="Brouillon", description="Non publié",
            make="Exemple", model="Modèle", year=2026, price="1000000", country="Côte d'Ivoire", city="Abidjan")
        response = self.client.get("/api/v1/vehicles/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

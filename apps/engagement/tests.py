from django.test import TestCase
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.vehicles.models import Vehicle


class CommentPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.dealer = User.objects.create_user(email="dealer@example.com", password="StrongPass!902", role=User.Role.DEALER)
        self.vehicle = Vehicle.objects.create(
            dealer=self.dealer, vehicle_type=Vehicle.Type.CAR, status=Vehicle.Status.PUBLISHED,
            title="Berline neuve", description="Annonce publiée.", make="Exemple", model="Berline",
            year=2026, price="25000000", country="Côte d'Ivoire", city="Abidjan",
        )

    def test_guest_can_read_but_cannot_comment(self):
        url = f"/api/v1/vehicles/{self.vehicle.slug}/comments/"
        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.post(url, {"content": "Disponible ?"}, format="json").status_code, 401)

    def test_authenticated_customer_can_comment(self):
        customer = User.objects.create_user(email="client@example.com", password="StrongPass!902")
        self.client.force_authenticate(customer)
        response = self.client.post(f"/api/v1/vehicles/{self.vehicle.slug}/comments/", {"content": "Disponible ?"}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertNotIn("email", response.data["user"])

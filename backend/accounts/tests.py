from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class AccountApiTests(APITestCase):
    def test_registration_creates_email_based_account(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "email": "Voyageur@example.fr",
                "first_name": "Aline",
                "last_name": "Durand",
                "password": "UnMotDePasseTresSolide2026!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["email"], "voyageur@example.fr")
        self.assertTrue(User.objects.get().check_password("UnMotDePasseTresSolide2026!"))

    def test_profile_is_private_and_can_be_updated(self):
        user = User.objects.create_user(email="me@example.fr", password="StrongPassword2026!")
        self.client.force_authenticate(user)
        response = self.client.patch("/api/v1/auth/me/", {"first_name": "Camille"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["first_name"], "Camille")

        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 401)

    def test_logout_blacklists_only_the_current_users_refresh_token(self):
        user = User.objects.create_user(email="me@example.fr", password="StrongPassword2026!")
        other = User.objects.create_user(email="other@example.fr", password="StrongPassword2026!")
        refresh = RefreshToken.for_user(user)
        self.client.force_authenticate(other)
        forbidden = self.client.post("/api/v1/auth/logout/", {"refresh": str(refresh)}, format="json")
        self.assertEqual(forbidden.status_code, 400)
        self.assertFalse(BlacklistedToken.objects.filter(token__jti=refresh["jti"]).exists())

        self.client.force_authenticate(user)
        response = self.client.post("/api/v1/auth/logout/", {"refresh": str(refresh)}, format="json")
        self.assertEqual(response.status_code, 205)
        self.assertTrue(BlacklistedToken.objects.filter(token__jti=refresh["jti"]).exists())

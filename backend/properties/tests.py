from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APITestCase

from .models import Property, PropertyMedia

User = get_user_model()
def png_pixel():
    output = BytesIO()
    Image.new("RGB", (2, 2), "green").save(output, format="PNG")
    return output.getvalue()


class PropertyApiTests(APITestCase):
    def setUp(self):
        self.host = User.objects.create_user(email="host@example.fr", password="StrongPassword2026!")
        self.guest = User.objects.create_user(email="guest@example.fr", password="StrongPassword2026!")
        self.property = Property.objects.create(
            owner=self.host,
            title="La maison des pins",
            description="Une maison lumineuse.",
            address="12 rue des Pins",
            city="Bordeaux",
            country="France",
            postal_code="33000",
            nightly_price="120.00",
            status=Property.Status.PUBLISHED,
        )

    def test_public_can_only_see_published_properties_without_private_address(self):
        Property.objects.create(
            owner=self.host,
            title="Brouillon privé",
            description="Non publié.",
            address="1 rue secrète",
            city="Bordeaux",
            country="France",
            postal_code="33000",
            nightly_price="80.00",
        )
        response = self.client.get("/api/v1/properties/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertNotIn("address", response.data["results"][0])
        self.assertNotIn("postal_code", response.data["results"][0])
        self.assertNotIn("owner_id", response.data["results"][0])
        self.assertFalse(response.data["results"][0]["is_owner"])

    def test_other_user_cannot_change_or_read_a_draft(self):
        draft = Property.objects.create(
            owner=self.host,
            title="Draft",
            description="Privé.",
            address="1 rue privée",
            city="Bordeaux",
            country="France",
            postal_code="33000",
            nightly_price="90.00",
        )
        self.client.force_authenticate(self.guest)
        self.assertEqual(self.client.get(f"/api/v1/properties/{draft.pk}/").status_code, 404)
        self.assertEqual(self.client.patch(f"/api/v1/properties/{draft.pk}/", {"title": "Hacked"}).status_code, 404)

    def test_owner_can_upload_and_delete_media(self):
        self.client.force_authenticate(self.host)
        upload = SimpleUploadedFile("tiny.png", png_pixel(), content_type="image/png")
        response = self.client.post(
            f"/api/v1/properties/{self.property.pk}/media/",
            {"file": upload, "alt_text": "Façade"},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201, response.data)
        media = PropertyMedia.objects.get(property=self.property)
        self.assertEqual(media.kind, PropertyMedia.Kind.IMAGE)
        self.assertTrue(media.file.name.startswith(f"properties/{self.property.pk}/"))
        self.assertEqual(
            self.client.delete(f"/api/v1/properties/{self.property.pk}/media/{media.pk}/").status_code,
            204,
        )

    def test_draft_media_is_not_public(self):
        draft = Property.objects.create(
            owner=self.host,
            title="Draft media",
            description="Privé.",
            address="1 rue privée",
            city="Bordeaux",
            country="France",
            postal_code="33000",
            nightly_price="90.00",
        )
        self.assertEqual(self.client.get(f"/api/v1/properties/{draft.pk}/media/").status_code, 401)

    def test_upload_rejects_mime_spoofed_content(self):
        self.client.force_authenticate(self.host)
        response = self.client.post(
            f"/api/v1/properties/{self.property.pk}/media/",
            {"file": SimpleUploadedFile("fake.png", b"not an image", content_type="image/png")},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(PropertyMedia.objects.count(), 0)

    def test_listing_rejects_invalid_capacity_and_negative_bathrooms(self):
        self.client.force_authenticate(self.host)
        response = self.client.post(
            "/api/v1/properties/",
            {
                "title": "Annonce invalide",
                "description": "Données incohérentes.",
                "address": "Rue de test",
                "city": "Lille",
                "country": "France",
                "postal_code": "59000",
                "nightly_price": "80.00",
                "max_guests": 101,
                "bathrooms": -1,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("Annonce invalide", Property.objects.values_list("title", flat=True))

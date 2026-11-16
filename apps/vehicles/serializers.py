from datetime import date
from rest_framework import serializers

from apps.accounts.serializers import DealerPublicSerializer
from .models import Vehicle, VehicleImage


class VehicleImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleImage
        fields = ("id", "image", "alt_text", "position", "created_at")
        read_only_fields = ("id", "created_at")


class VehicleSerializer(serializers.ModelSerializer):
    images = VehicleImageSerializer(many=True, read_only=True)
    dealer = DealerPublicSerializer(read_only=True)
    dealer_id = serializers.PrimaryKeyRelatedField(source="dealer", read_only=True)
    like_count = serializers.IntegerField(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Vehicle
        fields = (
            "id", "dealer", "dealer_id", "vehicle_type", "status", "title", "slug", "description",
            "make", "model", "trim", "year", "price", "currency", "mileage_km", "fuel_type",
            "transmission", "engine_displacement_cc", "power_hp", "exterior_color", "body_style",
            "doors", "seats", "drivetrain", "condition", "vin", "stock_number", "country", "city",
            "is_featured", "published_at", "images", "like_count", "comment_count", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "dealer", "dealer_id", "slug", "condition", "is_featured", "published_at",
            "images", "like_count", "comment_count", "created_at", "updated_at",
        )

    def validate_year(self, value):
        if value > date.today().year + 1:
            raise serializers.ValidationError("L'année ne peut pas dépasser l'année prochaine.")
        return value

    def validate(self, attrs):
        if attrs.get("mileage_km", 0) != 0:
            raise serializers.ValidationError({"mileage_km": "Seuls les véhicules neufs (kilométrage nul) sont acceptés."})
        return attrs

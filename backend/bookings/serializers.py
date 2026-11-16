from rest_framework import serializers

from .models import Booking


class BookingPropertySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    owner_id = serializers.IntegerField()
    title = serializers.CharField()
    city = serializers.CharField()
    country = serializers.CharField()
    property_type = serializers.CharField()


class BookingSerializer(serializers.ModelSerializer):
    property = BookingPropertySerializer(read_only=True)
    property_id = serializers.IntegerField(write_only=True, required=True)
    guest_id = serializers.IntegerField(read_only=True)
    nights = serializers.IntegerField(read_only=True)
    has_review = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            "id", "property", "property_id", "guest_id", "check_in", "check_out", "nights",
            "guests", "nightly_price", "total_price", "status", "host_message",
            "hold_expires_at", "has_review", "created_at",
        )
        read_only_fields = ("id", "guest_id", "nights", "nightly_price", "total_price", "status", "host_message", "hold_expires_at", "has_review", "created_at")

    def get_has_review(self, obj) -> bool:
        return hasattr(obj, "review")

    def validate_guests(self, value):
        if value < 1:
            raise serializers.ValidationError("Au moins un voyageur est requis.")
        return value

    def create(self, validated_data):
        from .services import create_booking

        guest = self.context["request"].user
        return create_booking(guest=guest, **validated_data)


class HostDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=("confirm", "reject"))
    message = serializers.CharField(required=False, allow_blank=True, max_length=500)


class HostCancelSerializer(serializers.Serializer):
    message = serializers.CharField(required=False, allow_blank=True, max_length=500)

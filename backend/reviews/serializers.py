from rest_framework import serializers

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    booking = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Review
        fields = ("id", "booking", "author_name", "rating", "comment", "created_at")
        read_only_fields = ("id", "booking", "author_name", "created_at")

    def get_author_name(self, obj) -> str:
        return obj.author.first_name or "Voyageur Mobila"

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("La note doit être comprise entre 1 et 5.")
        return value


class ReviewCreateSerializer(serializers.Serializer):
    booking = serializers.IntegerField(source="booking_id", write_only=True, min_value=1)
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, max_length=2_000)

    def create(self, validated_data):
        from .services import create_verified_review

        return create_verified_review(
            author=self.context["request"].user,
            property_id=self.context["property_id"],
            **validated_data,
        )

    def to_representation(self, instance):
        return ReviewSerializer(instance, context=self.context).data

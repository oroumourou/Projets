from rest_framework import serializers

from .models import Property, PropertyMedia


class PropertyMediaReadSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = PropertyMedia
        fields = ("id", "kind", "url", "alt_text", "sort_order", "created_at")

    def get_url(self, obj) -> str:
        request = self.context.get("request")
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url


class PropertyMediaUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyMedia
        fields = ("id", "file", "kind", "alt_text", "sort_order")
        read_only_fields = ("id", "kind")

    def validate_file(self, value):
        from .validators import validate_media_file

        validate_media_file(value)
        return value

    def create(self, validated_data):
        validated_data["kind"] = validated_data["file"].media_kind
        return super().create(validated_data)


class PropertySerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    media = PropertyMediaReadSerializer(many=True, read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Property
        fields = (
            "id", "owner_name", "is_owner", "title", "description", "property_type",
            "address", "city", "country", "postal_code", "nightly_price", "max_guests",
            "bedrooms", "bathrooms", "amenities", "status", "media", "average_rating",
            "review_count", "created_at", "updated_at",
        )
        read_only_fields = ("id", "owner_name", "is_owner", "media", "average_rating", "review_count", "created_at", "updated_at")

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        instance = self.instance
        property_obj = instance if isinstance(instance, Property) else None
        if request and request.method in ("GET", "HEAD") and (
            not request.user.is_authenticated or not property_obj or property_obj.owner_id != request.user.id
        ):
            fields.pop("address", None)
            fields.pop("postal_code", None)
        return fields

    def get_owner_name(self, obj) -> str:
        return obj.owner.first_name or "Hôte Mobila"

    def get_is_owner(self, obj) -> bool:
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.owner_id == request.user.id)

    def validate_amenities(self, value):
        if not isinstance(value, list) or len(value) > 40 or any(not isinstance(item, str) or len(item) > 80 for item in value):
            raise serializers.ValidationError("Fournissez une liste de 40 équipements maximum.")
        return [item.strip() for item in value if item.strip()]

    def validate_status(self, value):
        request = self.context.get("request")
        instance = self.instance
        if not request or not request.user.is_staff:
            if value not in (Property.Status.DRAFT, Property.Status.PUBLISHED, Property.Status.ARCHIVED):
                raise serializers.ValidationError("Statut invalide.")
            if instance and instance.status == Property.Status.ARCHIVED and value == Property.Status.DRAFT:
                raise serializers.ValidationError("Une annonce archivée ne peut pas redevenir brouillon.")
        return value

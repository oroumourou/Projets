from django.contrib.auth import password_validation
from rest_framework import serializers

from .models import DealerProfile, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "phone", "role")
        read_only_fields = ("id", "role")


class DealerPublicSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source="dealer_profile.business_name")
    dealer_slug = serializers.CharField(source="dealer_profile.slug")
    city = serializers.CharField(source="dealer_profile.city")
    country = serializers.CharField(source="dealer_profile.country")
    website = serializers.URLField(source="dealer_profile.website")

    class Meta:
        model = User
        fields = ("id", "first_name", "last_name", "phone", "business_name", "dealer_slug", "city", "country", "website")


class CommentAuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "first_name", "last_name")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[password_validation.validate_password])

    class Meta:
        model = User
        fields = ("email", "password", "first_name", "last_name", "phone")

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class DealerRegisterSerializer(RegisterSerializer):
    business_name = serializers.CharField(max_length=160)
    description = serializers.CharField(required=False, allow_blank=True)
    registration_number = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(max_length=100)
    country = serializers.CharField(max_length=100)
    website = serializers.URLField(required=False, allow_blank=True)

    class Meta(RegisterSerializer.Meta):
        fields = RegisterSerializer.Meta.fields + (
            "business_name", "description", "registration_number", "address", "city", "country", "website"
        )

    def create(self, validated_data):
        profile_fields = ("business_name", "description", "registration_number", "address", "city", "country", "website")
        profile_data = {key: validated_data.pop(key, "") for key in profile_fields}
        user = User.objects.create_user(role=User.Role.DEALER, **validated_data)
        user.dealer_profile = DealerProfile.objects.create(user=user, **profile_data)
        return user

    def to_representation(self, instance):
        return {"user": UserSerializer(instance).data, "dealer_profile": DealerProfileSerializer(instance.dealer_profile).data}


class DealerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DealerProfile
        fields = ("id", "business_name", "slug", "description", "registration_number", "address", "city", "country", "website", "status", "created_at")
        read_only_fields = ("id", "slug", "status", "created_at")


class MeResponseSerializer(serializers.Serializer):
    user = UserSerializer()
    dealer_profile = DealerProfileSerializer(required=False)

from rest_framework import serializers
from apps.accounts.serializers import CommentAuthorSerializer
from .models import Comment, ShareEvent


class CommentSerializer(serializers.ModelSerializer):
    user = CommentAuthorSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ("id", "vehicle", "user", "content", "created_at", "updated_at")
        read_only_fields = ("id", "vehicle", "user", "created_at", "updated_at")


class ShareSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShareEvent
        fields = ("id", "vehicle", "platform", "created_at")
        read_only_fields = ("id", "vehicle", "created_at")


class LikeResponseSerializer(serializers.Serializer):
    liked = serializers.BooleanField()
    like_count = serializers.IntegerField()


class DashboardCountSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    published = serializers.IntegerField()
    drafts = serializers.IntegerField()
    sold = serializers.IntegerField()


class DashboardEngagementSerializer(serializers.Serializer):
    likes = serializers.IntegerField()
    comments = serializers.IntegerField()
    shares = serializers.IntegerField()


class DealerDashboardSerializer(serializers.Serializer):
    dealer_status = serializers.CharField()
    vehicles = DashboardCountSerializer()
    engagement = DashboardEngagementSerializer()

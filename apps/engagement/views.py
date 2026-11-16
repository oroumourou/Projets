from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.vehicles.models import Vehicle
from .models import Comment, Like, ShareEvent
from .permissions import CommentPermission
from .serializers import CommentSerializer, DealerDashboardSerializer, LikeResponseSerializer, ShareSerializer


class VehicleCommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.none()
    serializer_class = CommentSerializer
    permission_classes = [CommentPermission]
    http_method_names = ("get", "post", "patch", "delete", "head", "options")

    def get_queryset(self):
        return Comment.objects.filter(vehicle__slug=self.kwargs["vehicle_slug"], vehicle__status=Vehicle.Status.PUBLISHED).select_related("user", "vehicle")

    def perform_create(self, serializer):
        vehicle = Vehicle.objects.filter(slug=self.kwargs["vehicle_slug"], status=Vehicle.Status.PUBLISHED).first()
        if vehicle is None:
            raise ValidationError({"vehicle": "Annonce publiée introuvable."})
        serializer.save(user=self.request.user, vehicle=vehicle)


class LikeToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses=LikeResponseSerializer)
    def post(self, request, vehicle_slug):
        vehicle = Vehicle.objects.filter(slug=vehicle_slug, status=Vehicle.Status.PUBLISHED).first()
        if vehicle is None:
            raise ValidationError({"vehicle": "Annonce publiée introuvable."})
        like, created = Like.objects.get_or_create(user=request.user, vehicle=vehicle)
        if not created:
            like.delete()
        count = Like.objects.filter(vehicle=vehicle).count()
        return Response({"liked": created, "like_count": count}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ShareCreateView(generics.CreateAPIView):
    serializer_class = ShareSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        vehicle = Vehicle.objects.filter(slug=self.kwargs["vehicle_slug"], status=Vehicle.Status.PUBLISHED).first()
        if vehicle is None:
            raise ValidationError({"vehicle": "Annonce publiée introuvable."})
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(vehicle=vehicle, user=user)


class DealerDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=DealerDashboardSerializer)
    def get(self, request):
        if request.user.role != User.Role.DEALER or not hasattr(request.user, "dealer_profile"):
            raise ValidationError("Réservé aux comptes concessionnaires.")
        vehicles = Vehicle.objects.filter(dealer=request.user)
        summary = vehicles.aggregate(
            total=Count("id"),
            published=Count("id", filter=Q(status=Vehicle.Status.PUBLISHED)),
            drafts=Count("id", filter=Q(status=Vehicle.Status.DRAFT)),
            sold=Count("id", filter=Q(status=Vehicle.Status.SOLD)),
        )
        activity = vehicles.aggregate(
            likes=Count("likes", distinct=True),
            comments=Count("comments", distinct=True),
            shares=Count("shares", distinct=True),
        )
        return Response({"dealer_status": request.user.dealer_profile.status, "vehicles": summary, "engagement": activity})

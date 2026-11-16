from django.db.models import Count
from django.utils import timezone
from rest_framework import decorators, mixins, permissions, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.accounts.permissions import IsApprovedDealer
from .filters import VehicleFilter
from .models import Vehicle, VehicleImage
from .permissions import VehiclePermission
from .serializers import VehicleImageSerializer, VehicleSerializer


class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [VehiclePermission]
    filterset_class = VehicleFilter
    search_fields = ("title", "make", "model", "description", "city", "country")
    ordering_fields = ("price", "year", "created_at", "published_at", "mileage_km")
    ordering = ("-published_at", "-created_at")

    def get_queryset(self):
        queryset = Vehicle.objects.select_related("dealer", "dealer__dealer_profile").prefetch_related("images")
        queryset = queryset.annotate(like_count=Count("likes", distinct=True), comment_count=Count("comments", distinct=True))
        if self.action in {"list", "retrieve"} and self.request.user.is_authenticated:
            return (queryset.filter(status=Vehicle.Status.PUBLISHED) | queryset.filter(dealer=self.request.user)).distinct()
        if self.action in {"list", "retrieve"}:
            return queryset.filter(status=Vehicle.Status.PUBLISHED)
        if self.request.user.is_authenticated and IsApprovedDealer().has_permission(self.request, self):
            return queryset.filter(dealer=self.request.user)
        return queryset.none()

    def perform_create(self, serializer):
        extra = {}
        if serializer.validated_data.get("status") == Vehicle.Status.PUBLISHED:
            extra["published_at"] = timezone.now()
        serializer.save(dealer=self.request.user, **extra)

    def perform_update(self, serializer):
        extra = {}
        if serializer.validated_data.get("status") == Vehicle.Status.PUBLISHED and not serializer.instance.published_at:
            extra["published_at"] = timezone.now()
        serializer.save(**extra)

    @decorators.action(detail=True, methods=["post"], permission_classes=[IsApprovedDealer])
    def publish(self, request, pk=None):
        vehicle = self.get_object()
        vehicle.status = Vehicle.Status.PUBLISHED
        if not vehicle.published_at:
            vehicle.published_at = timezone.now()
        vehicle.save(update_fields=("status", "published_at", "updated_at"))
        return Response(self.get_serializer(vehicle).data)

    @decorators.action(detail=True, methods=["post"], permission_classes=[IsApprovedDealer])
    def archive(self, request, pk=None):
        vehicle = self.get_object()
        vehicle.status = Vehicle.Status.ARCHIVED
        vehicle.save(update_fields=("status", "updated_at"))
        return Response(self.get_serializer(vehicle).data)


class VehicleImageViewSet(mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = VehicleImage.objects.all()
    serializer_class = VehicleImageSerializer
    permission_classes = [permissions.IsAuthenticated, IsApprovedDealer]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return VehicleImage.objects.filter(vehicle__dealer=self.request.user)

    def perform_create(self, serializer):
        vehicle = Vehicle.objects.filter(pk=self.request.data.get("vehicle"), dealer=self.request.user).first()
        if vehicle is None:
            raise ValidationError({"vehicle": "Annonce introuvable pour ce concessionnaire."})
        serializer.save(vehicle=vehicle)

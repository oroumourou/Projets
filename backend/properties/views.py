from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, serializers, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.throttling import ScopedRateThrottle

from .filters import PropertyFilter
from .models import Property, PropertyMedia
from .permissions import CanAccessPropertyMedia, IsOwnerOrPublishedReadOnly
from .serializers import PropertyMediaReadSerializer, PropertyMediaUploadSerializer, PropertySerializer
from .throttles import MediaUploadRateThrottle


class PropertyViewSet(viewsets.ModelViewSet):
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrPublishedReadOnly]
    filterset_class = PropertyFilter
    search_fields = ("title", "description", "city", "country")
    ordering_fields = ("nightly_price", "created_at", "max_guests")

    def get_queryset(self):
        queryset = (
            Property.objects.select_related("owner")
            .prefetch_related("media")
            .annotate(
                average_rating=Avg("bookings__review__rating"),
                review_count=Count("bookings__review"),
            )
            .order_by("-created_at", "-pk")
        )
        if self.request.user.is_authenticated:
            return queryset.filter(Q(status=Property.Status.PUBLISHED) | Q(owner=self.request.user)).distinct()
        return queryset.filter(status=Property.Status.PUBLISHED)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_destroy(self, instance):
        if instance.bookings.exists():
            raise serializers.ValidationError({"detail": "Cette annonce possède un historique de réservations; archivez-la plutôt que de la supprimer."})
        instance.delete()


class PropertyMediaListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, CanAccessPropertyMedia]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [ScopedRateThrottle, MediaUploadRateThrottle]
    throttle_scope = "media_upload"

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method == "POST":
            self.get_property()

    def get_property(self):
        if not hasattr(self, "_property_object"):
            self._property_object = get_object_or_404(
                Property.objects.select_related("owner"), pk=self.kwargs["property_pk"]
            )
            self.check_object_permissions(self.request, self._property_object)
        return self._property_object

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return PropertyMedia.objects.none()
        return PropertyMedia.objects.filter(property=self.get_property()).select_related("property")

    def get_serializer_class(self):
        return PropertyMediaUploadSerializer if self.request.method == "POST" else PropertyMediaReadSerializer

    def perform_create(self, serializer):
        property_obj = self.get_property()
        if property_obj.media.count() >= 30:
            raise serializers.ValidationError({"file": "Une annonce ne peut contenir plus de 30 médias."})
        serializer.save(property=property_obj)


class PropertyMediaDestroyView(generics.DestroyAPIView):
    serializer_class = PropertyMediaReadSerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessPropertyMedia]
    lookup_url_kwarg = "media_id"

    def get_queryset(self):
        property_obj = get_object_or_404(Property.objects.select_related("owner"), pk=self.kwargs["property_pk"])
        self.check_object_permissions(self.request, property_obj)
        return PropertyMedia.objects.filter(property=property_obj).select_related("property")

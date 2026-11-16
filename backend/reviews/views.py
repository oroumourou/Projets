from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.throttling import ScopedRateThrottle
from drf_spectacular.utils import extend_schema, extend_schema_view

from properties.models import Property

from .models import Review
from .serializers import ReviewCreateSerializer, ReviewSerializer


@extend_schema_view(
    post=extend_schema(request=ReviewCreateSerializer, responses=ReviewSerializer),
)
class PropertyReviewListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "review"

    def get_property(self):
        if not hasattr(self, "_property_object"):
            self._property_object = get_object_or_404(Property, pk=self.kwargs["property_pk"])
            if self._property_object.status != Property.Status.PUBLISHED and (
                not self.request.user.is_authenticated
                or self._property_object.owner_id != self.request.user.id
            ):
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied("Avis accessibles uniquement pour les annonces publiées.")
        return self._property_object

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Review.objects.none()
        return Review.objects.filter(booking__property=self.get_property()).select_related("author", "booking")

    def get_serializer_class(self):
        return ReviewCreateSerializer if self.request.method == "POST" else ReviewSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["property_id"] = self.kwargs["property_pk"]
        return context

from django.db.models import Q
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from drf_spectacular.utils import extend_schema

from .models import Booking
from .permissions import IsBookingParticipant
from .serializers import BookingSerializer, HostCancelSerializer, HostDecisionSerializer
from .services import cancel_booking, host_cancel_booking, host_decide_booking


class BookingViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsBookingParticipant]

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Booking.objects.none()
        if self.action == "list":
            from .services import expire_pending_bookings

            expire_pending_bookings()
        queryset = Booking.objects.select_related("property", "guest").order_by("-created_at")
        if self.action == "list":
            queryset = queryset.filter(Q(guest=self.request.user) | Q(property__owner=self.request.user))
        else:
            queryset = queryset.filter(Q(guest=self.request.user) | Q(property__owner=self.request.user))
        return queryset.distinct()

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=("post",), url_path="decision")
    @extend_schema(request=HostDecisionSerializer, responses=BookingSerializer)
    def decision(self, request, pk=None):
        booking = self.get_object()
        if booking.property.owner_id != request.user.id:
            return Response({"detail": "Réservé à l’hôte."}, status=status.HTTP_403_FORBIDDEN)
        serializer = HostDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        host_decide_booking(booking_id=booking.pk, host=request.user, **serializer.validated_data)
        booking.refresh_from_db()
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=("post",), url_path="cancel")
    def cancel(self, request, pk=None):
        booking = self.get_object()
        cancel_booking(booking=booking, user=request.user)
        booking.refresh_from_db()
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=("post",), url_path="host-cancel")
    @extend_schema(request=HostCancelSerializer, responses=BookingSerializer)
    def host_cancel(self, request, pk=None):
        booking = self.get_object()
        if booking.property.owner_id != request.user.id:
            return Response({"detail": "Réservé à l’hôte."}, status=status.HTTP_403_FORBIDDEN)
        serializer = HostCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        host_cancel_booking(booking=booking, host=request.user, **serializer.validated_data)
        booking.refresh_from_db()
        return Response(self.get_serializer(booking).data)

from rest_framework.permissions import SAFE_METHODS, BasePermission
from apps.accounts.models import User
from apps.accounts.permissions import IsApprovedDealer
from .models import Vehicle


class VehiclePermission(BasePermission):
    def has_permission(self, request, view):
        if view.action in {"list", "retrieve"}:
            return True
        return IsApprovedDealer().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return obj.status == Vehicle.Status.PUBLISHED or (
                request.user.is_authenticated and obj.dealer_id == request.user.id
            )
        return bool(
            request.user.is_authenticated and request.user.role == User.Role.DEALER
            and obj.dealer_id == request.user.id
        )

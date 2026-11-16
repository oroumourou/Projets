from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import User


class IsApprovedDealer(BasePermission):
    message = "Un compte concessionnaire approuvé est requis."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.role == User.Role.DEALER
            and hasattr(user, "dealer_profile") and user.dealer_profile.status == "approved"
        )


class IsOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        owner = getattr(obj, "user", None) or getattr(obj, "author", None)
        return request.user.is_authenticated and owner == request.user

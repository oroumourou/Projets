from rest_framework.permissions import BasePermission, SAFE_METHODS


class CommentPermission(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_authenticated and (
            obj.user_id == request.user.id or obj.vehicle.dealer_id == request.user.id
        )

from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Property


class IsOwnerOrPublishedReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return obj.status == Property.Status.PUBLISHED or (
                request.user.is_authenticated and obj.owner_id == request.user.id
            )
        return request.user.is_authenticated and obj.owner_id == request.user.id


class CanAccessPropertyMedia(BasePermission):
    def has_object_permission(self, request, view, obj):
        property_obj = obj.property if hasattr(obj, "property") else obj
        if request.method in SAFE_METHODS:
            return property_obj.status == Property.Status.PUBLISHED or (
                request.user.is_authenticated and property_obj.owner_id == request.user.id
            )
        return request.user.is_authenticated and property_obj.owner_id == request.user.id

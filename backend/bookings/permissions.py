from rest_framework.permissions import BasePermission


class IsBookingParticipant(BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and (
            obj.guest_id == request.user.id or obj.property.owner_id == request.user.id
        )

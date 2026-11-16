from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PropertyMediaDestroyView, PropertyMediaListCreateView, PropertyViewSet

router = DefaultRouter()
router.register("properties", PropertyViewSet, basename="property")

urlpatterns = [
    path("", include(router.urls)),
    path("properties/<int:property_pk>/media/", PropertyMediaListCreateView.as_view(), name="property-media"),
    path("properties/<int:property_pk>/media/<int:media_id>/", PropertyMediaDestroyView.as_view(), name="property-media-detail"),
]

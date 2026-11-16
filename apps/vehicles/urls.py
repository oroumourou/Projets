from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import VehicleImageViewSet, VehicleViewSet

router = DefaultRouter()
router.register("vehicles", VehicleViewSet, basename="vehicle")
router.register("vehicle-images", VehicleImageViewSet, basename="vehicle-image")
urlpatterns = [path("", include(router.urls))]

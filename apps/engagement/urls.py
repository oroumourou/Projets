from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import DealerDashboardView, LikeToggleView, ShareCreateView, VehicleCommentViewSet

router = DefaultRouter()
router.register(r"vehicles/(?P<vehicle_slug>[-a-zA-Z0-9_]+)/comments", VehicleCommentViewSet, basename="vehicle-comments")
urlpatterns = [
    path("", include(router.urls)),
    path("vehicles/<slug:vehicle_slug>/like/", LikeToggleView.as_view(), name="vehicle-like"),
    path("vehicles/<slug:vehicle_slug>/share/", ShareCreateView.as_view(), name="vehicle-share"),
    path("dealer/dashboard/", DealerDashboardView.as_view(), name="dealer-dashboard"),
]

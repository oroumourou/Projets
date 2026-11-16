from django.urls import path

from .views import PropertyReviewListCreateView

urlpatterns = [
    path("properties/<int:property_pk>/reviews/", PropertyReviewListCreateView.as_view(), name="property-reviews"),
]

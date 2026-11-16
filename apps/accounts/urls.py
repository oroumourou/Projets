from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import CustomerRegisterView, DealerProfileView, DealerRegisterView, MeView

urlpatterns = [
    path("register/", CustomerRegisterView.as_view(), name="register"),
    path("register/dealer/", DealerRegisterView.as_view(), name="register-dealer"),
    path("token/", TokenObtainPairView.as_view(), name="token-obtain"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("dealer-profile/", DealerProfileView.as_view(), name="dealer-profile"),
]

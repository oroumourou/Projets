from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .serializers import DealerProfileSerializer, DealerRegisterSerializer, MeResponseSerializer, RegisterSerializer, UserSerializer


class CustomerRegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class DealerRegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = DealerRegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    @extend_schema(responses=MeResponseSerializer)
    def get(self, request):
        data = {"user": UserSerializer(request.user).data}
        if request.user.role == User.Role.DEALER:
            data["dealer_profile"] = DealerProfileSerializer(request.user.dealer_profile).data
        return Response(data)

    @extend_schema(request=UserSerializer, responses=MeResponseSerializer)
    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        data = {"user": serializer.data}
        if request.user.role == User.Role.DEALER:
            data["dealer_profile"] = DealerProfileSerializer(request.user.dealer_profile).data
        return Response(data)


class DealerProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, request):
        if request.user.role != User.Role.DEALER or not hasattr(request.user, "dealer_profile"):
            raise serializers.ValidationError("Ce compte n'a pas de profil concessionnaire.")
        return request.user.dealer_profile

    @extend_schema(responses=DealerProfileSerializer)
    def get(self, request):
        return Response(DealerProfileSerializer(self.get_object(request)).data)

    @extend_schema(request=DealerProfileSerializer, responses=DealerProfileSerializer)
    def patch(self, request):
        profile = self.get_object(request)
        serializer = DealerProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

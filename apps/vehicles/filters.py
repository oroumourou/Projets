import django_filters
from .models import Vehicle


class VehicleFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    min_year = django_filters.NumberFilter(field_name="year", lookup_expr="gte")
    max_year = django_filters.NumberFilter(field_name="year", lookup_expr="lte")
    dealer = django_filters.NumberFilter(field_name="dealer_id")

    class Meta:
        model = Vehicle
        fields = ("vehicle_type", "make", "model", "country", "city", "fuel_type", "transmission")

import django_filters

from .models import Property


class PropertyFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="nightly_price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="nightly_price", lookup_expr="lte")
    guests = django_filters.NumberFilter(field_name="max_guests", lookup_expr="gte")

    class Meta:
        model = Property
        fields = ("city", "property_type", "bedrooms", "min_price", "max_price", "guests")

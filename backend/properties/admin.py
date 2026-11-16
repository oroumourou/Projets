from django.contrib import admin

from .models import Property, PropertyMedia


class PropertyMediaInline(admin.TabularInline):
    model = PropertyMedia
    extra = 0
    readonly_fields = ("kind", "created_at")


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ("title", "city", "owner", "status", "nightly_price", "created_at")
    list_filter = ("status", "property_type", "country")
    search_fields = ("title", "city", "owner__email")
    inlines = (PropertyMediaInline,)

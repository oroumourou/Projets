from django.contrib import admin
from .models import Vehicle, VehicleImage


class VehicleImageInline(admin.TabularInline):
    model = VehicleImage
    extra = 0


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ("title", "vehicle_type", "make", "model", "price", "dealer", "status")
    list_filter = ("vehicle_type", "status", "country")
    search_fields = ("title", "make", "model", "dealer__email", "stock_number")
    readonly_fields = ("slug", "published_at", "created_at", "updated_at")
    inlines = (VehicleImageInline,)

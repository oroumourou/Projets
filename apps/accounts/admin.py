from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import DealerProfile, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "role", "is_staff", "is_active")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Informations personnelles", {"fields": ("first_name", "last_name", "phone", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "password1", "password2", "role")}),)
    search_fields = ("email", "first_name", "last_name")


@admin.register(DealerProfile)
class DealerProfileAdmin(admin.ModelAdmin):
    list_display = ("business_name", "user", "city", "country", "status")
    list_filter = ("status", "country")
    search_fields = ("business_name", "user__email", "registration_number")
    readonly_fields = ("slug", "created_at", "updated_at")

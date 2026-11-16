from django.contrib import admin
from .models import Comment, Like, ShareEvent

admin.site.register(Like)
admin.site.register(ShareEvent)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("vehicle", "user", "created_at")
    search_fields = ("content", "user__email", "vehicle__title")
    readonly_fields = ("created_at", "updated_at")

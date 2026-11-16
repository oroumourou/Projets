from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import PropertyMedia


@receiver(post_delete, sender=PropertyMedia)
def remove_media_file(sender, instance, **kwargs):
    if instance.file:
        instance.file.delete(save=False)

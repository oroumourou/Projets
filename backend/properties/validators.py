import uuid

from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError

IMAGE_LIMIT = 15 * 1024 * 1024
VIDEO_LIMIT = 150 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
IMAGE_TYPES = {"JPEG": "image", "PNG": "image", "WEBP": "image", "GIF": "image"}


def validate_media_file(upload):
    upload.seek(0)
    header = upload.read(16)
    upload.seek(0)

    if header.startswith(b"\x1aE\xdf\xa3"):
        kind = "video"
    elif len(header) >= 12 and header[4:8] == b"ftyp":
        kind = "video"
    else:
        try:
            image = Image.open(upload)
            image_format = image.format
            width, height = image.size
            image.verify()
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
            raise ValidationError("Le fichier doit être une image JPEG, PNG, WebP ou GIF, ou une vidéo MP4/MOV/WebM.") from exc
        finally:
            upload.seek(0)
        if image_format not in IMAGE_TYPES or width * height > MAX_IMAGE_PIXELS:
            raise ValidationError("Format d’image non pris en charge ou résolution trop élevée.")
        kind = "image"

    max_size = IMAGE_LIMIT if kind == "image" else VIDEO_LIMIT
    if upload.size > max_size:
        limit_mib = max_size // (1024 * 1024)
        raise ValidationError(f"Fichier trop volumineux : limite de {limit_mib} Mio pour ce type de média.")
    upload.media_kind = kind
    return kind


def media_upload_path(instance, filename):
    validate_media_file(instance.file)
    kind = getattr(instance.file, "media_kind", None)
    if kind == "video":
        instance.file.seek(0)
        extension = "webm" if instance.file.read(4) == b"\x1aE\xdf\xa3" else "mp4"
    else:
        try:
            image = Image.open(instance.file)
            extension = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp", "GIF": "gif"}[image.format]
        finally:
            instance.file.seek(0)
    return f"properties/{instance.property_id}/{uuid.uuid4().hex}.{extension}"

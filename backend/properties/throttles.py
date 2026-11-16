from rest_framework.throttling import UserRateThrottle


class MediaUploadRateThrottle(UserRateThrottle):
    scope = "media_upload"

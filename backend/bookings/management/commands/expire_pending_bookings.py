from django.core.management.base import BaseCommand

from bookings.services import expire_pending_bookings


class Command(BaseCommand):
    help = "Libère les demandes de réservation non traitées après leur délai de 24 heures."

    def handle(self, *args, **options):
        count = expire_pending_bookings()
        self.stdout.write(self.style.SUCCESS(f"{count} demande(s) expirée(s)."))

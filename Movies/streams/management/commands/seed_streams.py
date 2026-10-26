from django.core.management.base import BaseCommand
from streams.models import MediaItem, StreamSource, StreamingProvider

class Command(BaseCommand):
    help = "Populate the database with clean Movies, Series, and Races using StreamEast and Flixto"

    def handle(self, *args, **kwargs):
        self.stdout.write("Initializing providers and streams...")

        # Setup Providers
        StreamingProvider.objects.all().delete()
        streameast = StreamingProvider.objects.create(
            name="StreamEast",
            url="https://streameasto.cx/",
            category="sports",
            description="Live Sports, Formula 1, MotoGP, UFC & Racing Streams",
            badge_color="#e10600"
        )
        flixto = StreamingProvider.objects.create(
            name="Flixto",
            url="http://flixto.watch/",
            category="movies",
            description="Movies & TV Series Streaming Portal",
            badge_color="#00e5ff"
        )

        StreamSource.objects.all().delete()
        MediaItem.objects.all().delete()

        sample_items = [
            # --- MOVIES & SERIES (Flixto) ---
            {
                "title": "Dune: Part Two",
                "media_type": "movie",
                "category_or_sport": "Sci-Fi, Adventure, Action",
                "description": "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
                "release_year": 2024,
                "duration": "2h 46m",
                "quality": "4K Ultra HD",
                "rating": 8.6,
                "featured": True,
                "poster_url": "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
                "backdrop_url": "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5200SV.jpg",
                "sources": [
                    {
                        "provider": flixto,
                        "server_name": "Flixto Movies",
                        "stream_url": "http://flixto.watch/",
                        "quality_label": "1080p FHD",
                        "language": "English",
                        "notes": "Stream on Flixto"
                    }
                ]
            },
            {
                "title": "Oppenheimer",
                "media_type": "movie",
                "category_or_sport": "Biography, Drama, History",
                "description": "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.",
                "release_year": 2023,
                "duration": "3h 00m",
                "quality": "4K Ultra HD",
                "rating": 8.9,
                "featured": False,
                "poster_url": "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
                "backdrop_url": "https://image.tmdb.org/t/p/original/rM5Y09xC99JEapXKN5aq0ocLzb1.jpg",
                "sources": [
                    {
                        "provider": flixto,
                        "server_name": "Flixto Movies",
                        "stream_url": "http://flixto.watch/",
                        "quality_label": "1080p FHD",
                        "language": "English",
                        "notes": "Stream on Flixto"
                    }
                ]
            },
            {
                "title": "Breaking Bad",
                "media_type": "series",
                "category_or_sport": "Crime, Drama, Thriller",
                "description": "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.",
                "release_year": 2008,
                "duration": "5 Seasons",
                "quality": "4K Ultra HD",
                "rating": 9.5,
                "featured": True,
                "poster_url": "https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
                "backdrop_url": "https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
                "sources": [
                    {
                        "provider": flixto,
                        "server_name": "Flixto Series",
                        "stream_url": "http://flixto.watch/",
                        "quality_label": "1080p Complete",
                        "language": "English",
                        "notes": "Full Seasons on Flixto"
                    }
                ]
            },

            # --- RACES & MOTORSPORT (StreamEast) ---
            {
                "title": "Formula 1 - Bahrain Grand Prix 2026",
                "media_type": "race",
                "category_or_sport": "Formula 1, Motorsport",
                "description": "Full Race Live & Replay: 57 Laps under the floodlights at Bahrain International Circuit in Sakhir.",
                "release_year": 2026,
                "duration": "Race (57 Laps / ~2h)",
                "quality": "1080p 60FPS",
                "rating": 9.2,
                "featured": True,
                "poster_url": "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80",
                "backdrop_url": "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1400&q=80",
                "sources": [
                    {
                        "provider": streameast,
                        "server_name": "StreamEast Live Sports",
                        "stream_url": "https://streameasto.cx/",
                        "quality_label": "1080p 60fps",
                        "language": "English (Sky Sports F1)",
                        "notes": "Live on StreamEast"
                    }
                ]
            },
            {
                "title": "Formula 1 - Monaco Grand Prix 2026",
                "media_type": "race",
                "category_or_sport": "Formula 1, Motorsport",
                "description": "The crown jewel of motorsport: 78 laps around the legendary streets of Monte Carlo.",
                "release_year": 2026,
                "duration": "Race (78 Laps / 2h)",
                "quality": "4K 60FPS",
                "rating": 9.4,
                "featured": True,
                "poster_url": "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=600&q=80",
                "backdrop_url": "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=1400&q=80",
                "sources": [
                    {
                        "provider": streameast,
                        "server_name": "StreamEast Live Sports",
                        "stream_url": "https://streameasto.cx/",
                        "quality_label": "1080p 60fps",
                        "language": "English",
                        "notes": "Live on StreamEast"
                    }
                ]
            },
            {
                "title": "MotoGP - Qatar Grand Prix 2026",
                "media_type": "race",
                "category_or_sport": "MotoGP, Motorcycle Racing",
                "description": "Lusail International Circuit night race. Two-wheeled beasts reaching speeds of 360 km/h.",
                "release_year": 2026,
                "duration": "Race (22 Laps / 45m)",
                "quality": "1080p 60FPS",
                "rating": 9.0,
                "featured": False,
                "poster_url": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80",
                "backdrop_url": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1400&q=80",
                "sources": [
                    {
                        "provider": streameast,
                        "server_name": "StreamEast Live Sports",
                        "stream_url": "https://streameasto.cx/",
                        "quality_label": "1080p 60fps",
                        "language": "English",
                        "notes": "Live on StreamEast"
                    }
                ]
            }
        ]

        for item_data in sample_items:
            sources_data = item_data.pop("sources", [])
            item = MediaItem.objects.create(**item_data)
            for src in sources_data:
                StreamSource.objects.create(media_item=item, **src)
            self.stdout.write(f"Added [{item.media_type.upper()}] {item.title}")

        self.stdout.write(self.style.SUCCESS("All streams seeded using real StreamEast & Flixto providers!"))

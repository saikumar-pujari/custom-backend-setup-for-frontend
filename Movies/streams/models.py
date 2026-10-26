from django.db import models

class StreamingProvider(models.Model):
    PROVIDER_TYPES = [
        ('sports', 'Sports & Races'),
        ('movies', 'Movies & Series'),
        ('all', 'All / Mixed'),
    ]

    name = models.CharField(max_length=120)
    url = models.URLField(max_length=1000)
    category = models.CharField(max_length=50, choices=PROVIDER_TYPES, default='movies')
    description = models.CharField(max_length=255, blank=True)
    badge_color = models.CharField(max_length=30, default='#ff2a54')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.url})"


class MediaItem(models.Model):
    MEDIA_TYPES = [
        ('movie', 'Movie'),
        ('series', 'TV Series'),
        ('race', 'Motorsport / Race'),
    ]

    title = models.CharField(max_length=255)
    tmdb_id = models.IntegerField(null=True, blank=True, help_text="TMDb ID for direct embed player")
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPES, default='movie')
    category_or_sport = models.CharField(
        max_length=120, 
        blank=True, 
        help_text="e.g. Formula 1, MotoGP, Sci-Fi, Action, Thriller, WEC"
    )
    description = models.TextField(blank=True)
    release_year = models.IntegerField(null=True, blank=True)
    duration = models.CharField(max_length=60, blank=True, default='')
    poster_url = models.URLField(max_length=1500, blank=True)
    backdrop_url = models.URLField(max_length=1500, blank=True)
    quality = models.CharField(max_length=50, default='1080p FHD')
    rating = models.FloatField(default=8.5, null=True, blank=True)
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-featured', '-created_at']

    def __str__(self):
        return f"[{self.get_media_type_display()}] {self.title}"


class StreamSource(models.Model):
    media_item = models.ForeignKey(MediaItem, related_name='sources', on_delete=models.CASCADE)
    provider = models.ForeignKey(StreamingProvider, related_name='sources', on_delete=models.SET_NULL, null=True, blank=True)
    server_name = models.CharField(max_length=120, default='Server 1')
    stream_url = models.URLField(max_length=2000)
    quality_label = models.CharField(max_length=50, default='1080p')
    language = models.CharField(max_length=50, default='English')
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.server_name} - {self.media_item.title}"

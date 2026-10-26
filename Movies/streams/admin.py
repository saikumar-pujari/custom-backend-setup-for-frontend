from django.contrib import admin
from .models import MediaItem, StreamSource, StreamingProvider

@admin.register(StreamingProvider)
class StreamingProviderAdmin(admin.ModelAdmin):
    list_display = ('name', 'url', 'category', 'is_active', 'created_at')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'url', 'description')

class StreamSourceInline(admin.TabularInline):
    model = StreamSource
    extra = 1

@admin.register(MediaItem)
class MediaItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'media_type', 'category_or_sport', 'release_year', 'quality', 'rating', 'featured')
    list_filter = ('media_type', 'quality', 'featured', 'created_at')
    search_fields = ('title', 'category_or_sport', 'description')
    inlines = [StreamSourceInline]

@admin.register(StreamSource)
class StreamSourceAdmin(admin.ModelAdmin):
    list_display = ('server_name', 'media_item', 'provider', 'stream_url', 'quality_label', 'language')
    list_filter = ('quality_label', 'language', 'provider')
    search_fields = ('server_name', 'stream_url', 'media_item__title')

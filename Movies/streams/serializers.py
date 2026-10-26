from rest_framework import serializers
from .models import MediaItem, StreamSource, StreamingProvider

class StreamingProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = StreamingProvider
        fields = ['id', 'name', 'url', 'category', 'description', 'badge_color', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class StreamSourceSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    provider_url = serializers.CharField(source='provider.url', read_only=True)

    class Meta:
        model = StreamSource
        fields = [
            'id', 'media_item', 'provider', 'provider_name', 'provider_url',
            'server_name', 'stream_url', 'quality_label', 'language', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'media_item': {'required': False}
        }


class MediaItemSerializer(serializers.ModelSerializer):
    sources = StreamSourceSerializer(many=True, required=False)
    media_type_display = serializers.CharField(source='get_media_type_display', read_only=True)

    class Meta:
        model = MediaItem
        fields = [
            'id', 'tmdb_id', 'title', 'media_type', 'media_type_display',
            'category_or_sport', 'description', 'release_year',
            'duration', 'poster_url', 'backdrop_url', 'quality',
            'rating', 'featured', 'sources', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        sources_data = validated_data.pop('sources', [])
        media_item = MediaItem.objects.create(**validated_data)
        for source_data in sources_data:
            StreamSource.objects.create(media_item=media_item, **source_data)
        return media_item

    def update(self, instance, validated_data):
        sources_data = validated_data.pop('sources', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if sources_data is not None:
            instance.sources.all().delete()
            for source_data in sources_data:
                StreamSource.objects.create(media_item=instance, **source_data)

        return instance

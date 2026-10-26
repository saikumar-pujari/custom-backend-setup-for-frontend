from django.shortcuts import render
from django.db.models import Q, Count
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from .models import MediaItem, StreamSource, StreamingProvider
from .serializers import MediaItemSerializer, StreamSourceSerializer, StreamingProviderSerializer
from .tmdb_service import search_tmdb, get_tmdb_details
from .search_service import aggregate_search

# ----------------- DRF API ViewSets -----------------

class StreamingProviderViewSet(viewsets.ModelViewSet):
    queryset = StreamingProvider.objects.filter(is_active=True)
    serializer_class = StreamingProviderSerializer


class MediaItemViewSet(viewsets.ModelViewSet):
    queryset = MediaItem.objects.all().prefetch_related('sources__provider')
    serializer_class = MediaItemSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        media_type = self.request.query_params.get('type', None)
        category = self.request.query_params.get('category', None)
        search = self.request.query_params.get('q', None)
        featured = self.request.query_params.get('featured', None)

        if media_type and media_type != 'all':
            queryset = queryset.filter(media_type=media_type)
        
        if category and category != 'all':
            queryset = queryset.filter(category_or_sport__icontains=category)

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(category_or_sport__icontains=search) |
                Q(description__icontains=search)
            )

        if featured is not None:
            is_feat = featured.lower() in ['1', 'true', 'yes']
            queryset = queryset.filter(featured=is_feat)

        return queryset

    @action(detail=True, methods=['post'], url_path='add-source')
    def add_source(self, request, pk=None):
        media_item = self.get_object()
        serializer = StreamSourceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(media_item=media_item)
            return Response(MediaItemSerializer(media_item).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StreamSourceViewSet(viewsets.ModelViewSet):
    queryset = StreamSource.objects.all()
    serializer_class = StreamSourceSerializer


@api_view(['GET'])
def api_stats(request):
    total = MediaItem.objects.count()
    movies = MediaItem.objects.filter(media_type='movie').count()
    series = MediaItem.objects.filter(media_type='series').count()
    races = MediaItem.objects.filter(media_type='race').count()
    sources = StreamSource.objects.count()
    providers = list(StreamingProvider.objects.filter(is_active=True).values('id', 'name', 'url', 'category', 'badge_color'))

    categories = MediaItem.objects.exclude(category_or_sport='').values_list('category_or_sport', flat=True).distinct()
    unique_cats = set()
    for cat in categories:
        for part in cat.split(','):
            cleaned = part.strip()
            if cleaned:
                unique_cats.add(cleaned)

    return Response({
        'total': total,
        'movies': movies,
        'series': series,
        'races': races,
        'sources': sources,
        'providers': providers,
        'available_categories': sorted(list(unique_cats)),
    })


@api_view(['GET'])
def api_tmdb_search(request):
    """
    Secure server-side proxy to search TMDb without exposing the API key to clients.
    """
    query = request.query_params.get('q', '').strip()
    media_type = request.query_params.get('type', 'all')
    if not query:
        return Response({'results': []})

    results = search_tmdb(query, media_type)
    return Response({'results': results})


@api_view(['GET'])
def api_tmdb_details(request):
    """
    Secure server-side proxy to fetch movie/tv metadata and posters from TMDb.
    """
    tmdb_id = request.query_params.get('id')
    media_type = request.query_params.get('type', 'movie')
    if not tmdb_id:
        return Response({'error': 'id parameter required'}, status=400)

    details = get_tmdb_details(tmdb_id, media_type)
    if not details:
        return Response({'error': 'Not found or TMDb unavailable'}, status=404)

    return Response(details)


@api_view(['GET'])
def api_global_search(request):
    """
    Universal multi-provider search across Local DB, TMDb, StreamEast, and Flixto.
    """
    query = request.query_params.get('q', '').strip()
    media_type = request.query_params.get('type', 'all')
    data = aggregate_search(query, media_type)
    return Response(data)


# ----------------- Frontend Views -----------------

def home_view(request):
    return render(request, 'index.html')

def manage_view(request):
    return render(request, 'manage.html')

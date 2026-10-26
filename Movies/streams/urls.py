from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'media', views.MediaItemViewSet, basename='media')
router.register(r'sources', views.StreamSourceViewSet, basename='source')
router.register(r'providers', views.StreamingProviderViewSet, basename='provider')

urlpatterns = [
    # Frontend Pages
    path('', views.home_view, name='home'),
    path('manage/', views.manage_view, name='manage'),

    # REST API endpoints
    path('api/', include(router.urls)),
    path('api/stats/', views.api_stats, name='api-stats'),

    # Multi-Provider Global Search Aggregator
    path('api/search/global/', views.api_global_search, name='api-global-search'),

    # TMDb Secure Proxy API (Key stays protected on server)
    path('api/tmdb/search/', views.api_tmdb_search, name='tmdb-search'),
    path('api/tmdb/details/', views.api_tmdb_details, name='tmdb-details'),
]

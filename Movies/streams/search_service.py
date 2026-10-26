import requests
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
from .tmdb_service import search_tmdb
from .models import MediaItem, StreamingProvider
from .multi_site_crawler import search_all_domains_live
from django.db.models import Q

def scrape_streameast_live(query=""):
    """
    Scrapes live sports events and races from StreamEast matching query.
    """
    results = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        resp = requests.get('https://streameasto.cx/', headers=headers, timeout=4)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            query_lower = query.lower().strip()
            variants = [query_lower]
            if query_lower == 'f1':
                variants.append('formula 1')
            elif 'formula 1' in query_lower:
                variants.append('f1')

            for a in soup.find_all('a', href=True):
                text = ' '.join(a.text.split())
                href = a.get('href', '')
                if not text or len(text) < 2 or href in ['#', '/']:
                    continue

                full_url = href if href.startswith('http') else f"https://streameasto.cx{href}"
                
                # Check if matches query variants or common sports keywords
                is_match = False
                if query_lower:
                    is_match = any(v in text.lower() or v in href.lower() for v in variants)
                else:
                    is_match = any(k in text.lower() for k in ['live', 'f1', 'ufc', 'race', 'motogp', 'grand prix', 'nba', 'nhl'])

                if is_match:
                    # Clean title
                    category = 'Motorsport / Race' if any(k in text.lower() for k in ['f1', 'race', 'motogp', 'prix', 'nascar', 'indy']) else 'Live Sports'
                    results.append({
                        'title': text,
                        'stream_url': full_url,
                        'provider': 'StreamEast',
                        'media_type': 'race',
                        'category': category,
                        'is_live': 'LIVE' in text.upper(),
                    })
    except Exception as e:
        print(f"StreamEast scrape warning: {e}")

    # Deduplicate by url
    seen = set()
    deduped = []
    for r in results:
        if r['stream_url'] not in seen:
            seen.add(r['stream_url'])
            deduped.append(r)
    return deduped[:6]


def aggregate_search(query, media_type='all'):
    """
    Unified multi-provider search across Local DB, TMDb, StreamEast, and Flixto.
    """
    query = query.strip()
    if not query:
        return {
            'local_results': [],
            'tmdb_results': [],
            'live_sports': [],
            'provider_search_links': []
        }

    # 1. Local Database Search
    query_variants = [query]
    q_lower = query.lower()
    if q_lower == 'f1':
        query_variants.append('Formula 1')
    elif 'formula 1' in q_lower:
        query_variants.append('F1')
    elif q_lower in ['motogp', 'moto gp']:
        query_variants.extend(['MotoGP', 'Motorcycle'])

    local_q_filter = Q()
    for q_var in query_variants:
        local_q_filter |= (
            Q(title__icontains=q_var) |
            Q(category_or_sport__icontains=q_var) |
            Q(description__icontains=q_var)
        )

    local_qs = MediaItem.objects.filter(local_q_filter).prefetch_related('sources')

    if media_type != 'all':
        local_qs = local_qs.filter(media_type=media_type)

    local_results = []
    for item in local_qs[:12]:
        local_results.append({
            'id': item.id,
            'tmdb_id': item.tmdb_id,
            'title': item.title,
            'media_type': item.media_type,
            'media_type_display': item.get_media_type_display(),
            'category_or_sport': item.category_or_sport,
            'release_year': item.release_year,
            'duration': item.duration,
            'quality': item.quality,
            'rating': item.rating,
            'poster_url': item.poster_url,
            'backdrop_url': item.backdrop_url,
            'sources_count': item.sources.count(),
            'sources': [
                {
                    'server_name': s.server_name,
                    'stream_url': s.stream_url,
                    'quality_label': s.quality_label
                } for s in item.sources.all()
            ]
        })

    # 2. TMDb Global Catalog (Movies & TV Series) with instant embed capability
    tmdb_results = []
    if media_type in ['all', 'movie', 'series']:
        tmdb_type = 'movie' if media_type == 'movie' else ('series' if media_type == 'series' else 'all')
        raw_tmdb = search_tmdb(query, tmdb_type)
        for r in raw_tmdb:
            # Check if this item is already saved locally
            already_saved = local_qs.filter(
                Q(tmdb_id=r['tmdb_id']) | Q(title__iexact=r['title'])
            ).first()

            tmdb_results.append({
                'tmdb_id': r['tmdb_id'],
                'title': r['title'],
                'media_type': r['media_type'],
                'release_year': r['release_year'],
                'rating': r['rating'],
                'overview': r['overview'],
                'poster_url': r['poster_url'],
                'backdrop_url': r['backdrop_url'],
                'is_saved_locally': bool(already_saved),
                'local_id': already_saved.id if already_saved else None,
                # Direct streaming embed URL ready to watch immediately!
                'embed_url': f"https://vidsrc.to/embed/{'tv' if r['media_type'] == 'series' else 'movie'}/{r['tmdb_id']}" + ("/1/1" if r['media_type'] == 'series' else ""),
                'flixto_url': f"http://flixto.watch/search?q={quote_plus(r['title'])}"
            })

    # 3. Live Scraped Results from Domain Network (All verified active domains)
    live_site_results = []
    crawl_stats = {
        'searched_count': 0,
        'matched_sites': [],
        'site_counts': {},
        'elapsed_seconds': 0
    }
    if media_type in ['all', 'movie', 'series']:
        crawl_data = search_all_domains_live(query)
        if isinstance(crawl_data, dict):
            live_site_results = crawl_data.get('results', [])
            crawl_stats = crawl_data.get('stats', crawl_stats)
        elif isinstance(crawl_data, list):
            live_site_results = crawl_data

    # 4. Live Sports / Race Stream Matches from StreamEast
    live_sports = []
    if media_type in ['all', 'race']:
        live_sports = scrape_streameast_live(query)

    # 5. Direct External Search Links for Registered Providers
    provider_search_links = []
    
    # Priority providers first
    provider_search_links.append({
        'name': 'Cinejoy',
        'badge': '4K & HD Cinema',
        'color': '#95FF50',
        'search_url': f"https://cinejoy.pk/search/{quote_plus(query)}"
    })
    provider_search_links.append({
        'name': 'NetMirror',
        'badge': 'Netflix & OTT',
        'color': '#e50914',
        'search_url': f"https://net77.cc/home"
    })
    provider_search_links.append({
        'name': 'Flixto',
        'badge': 'Movies & Shows',
        'color': '#00e5ff',
        'search_url': f"http://flixto.watch/search?q={quote_plus(query)}"
    })
    provider_search_links.append({
        'name': 'StreamEast',
        'badge': 'Sports & Racing',
        'color': '#ff2a54',
        'search_url': f"https://streameasto.cx/?s={quote_plus(query)}"
    })

    # All active providers from database
    other_providers = StreamingProvider.objects.filter(is_active=True).exclude(name__in=['Flixto', 'StreamEast', 'NetMirror', 'Cinejoy'])
    for p in other_providers:
        search_link = f"{p.url.rstrip('/')}/?s={quote_plus(query)}"
        if 'tamilblasters' in p.url.lower():
            search_link = f"{p.url.rstrip('/')}/index.php?/search/&q={quote_plus(query)}"
        provider_search_links.append({
            'name': p.name,
            'badge': p.get_category_display() if hasattr(p, 'get_category_display') else 'Streaming',
            'color': p.badge_color or '#a855f7',
            'search_url': search_link
        })

    return {
        'query': query,
        'local_results': local_results,
        'live_site_results': live_site_results,
        'crawl_stats': crawl_stats,
        'tmdb_results': tmdb_results,
        'live_sports': live_sports,
        'provider_search_links': provider_search_links,
    }

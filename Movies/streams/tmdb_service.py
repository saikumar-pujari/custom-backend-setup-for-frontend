import requests
from django.conf import settings

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE_W500 = "https://image.tmdb.org/t/p/w500"
TMDB_IMAGE_BASE_ORIGINAL = "https://image.tmdb.org/t/p/original"

def get_api_key():
    return getattr(settings, 'TMDB_API_KEY', '')

def search_tmdb(query, media_type='all'):
    """
    Search TMDb for movies, tv series, or both.
    media_type: 'movie', 'series' (maps to 'tv'), or 'all'
    """
    api_key = get_api_key()
    if not api_key:
        return []

    if media_type == 'movie':
        endpoint = f"{TMDB_BASE_URL}/search/movie"
    elif media_type in ['series', 'tv']:
        endpoint = f"{TMDB_BASE_URL}/search/tv"
    else:
        endpoint = f"{TMDB_BASE_URL}/search/multi"

    params = {
        'api_key': api_key,
        'query': query,
        'language': 'en-US',
        'include_adult': 'false',
    }

    try:
        resp = requests.get(endpoint, params=params, timeout=5)
        if resp.status_code != 200:
            return []

        data = resp.json()
        results = []
        for item in data.get('results', []):
            item_type = item.get('media_type', media_type)
            if item_type not in ['movie', 'tv']:
                if media_type in ['movie', 'series', 'tv']:
                    item_type = 'tv' if media_type == 'series' else media_type
                else:
                    continue

            title = item.get('title') or item.get('name') or 'Untitled'
            release_date = item.get('release_date') or item.get('first_air_date') or ''
            year = release_date.split('-')[0] if release_date else ''
            poster_path = item.get('poster_path')
            backdrop_path = item.get('backdrop_path')

            results.append({
                'tmdb_id': item.get('id'),
                'title': title,
                'media_type': 'series' if item_type == 'tv' else 'movie',
                'release_year': int(year) if year.isdigit() else None,
                'rating': round(item.get('vote_average', 0), 1) if item.get('vote_average') else None,
                'overview': item.get('overview', ''),
                'poster_url': f"{TMDB_IMAGE_BASE_W500}{poster_path}" if poster_path else '',
                'backdrop_url': f"{TMDB_IMAGE_BASE_ORIGINAL}{backdrop_path}" if backdrop_path else '',
            })
        return results[:8]  # top 8 most relevant matches
    except Exception as e:
        print(f"TMDb search error: {e}")
        return []


def get_tmdb_details(tmdb_id, media_type='movie'):
    """
    Fetch comprehensive details for a specific movie or series.
    """
    api_key = get_api_key()
    if not api_key:
        return None

    endpoint_type = 'tv' if media_type == 'series' else 'movie'
    endpoint = f"{TMDB_BASE_URL}/{endpoint_type}/{tmdb_id}"
    params = {
        'api_key': api_key,
        'language': 'en-US',
    }

    try:
        resp = requests.get(endpoint, params=params, timeout=5)
        if resp.status_code != 200:
            return None

        data = resp.json()
        title = data.get('title') or data.get('name') or ''
        release_date = data.get('release_date') or data.get('first_air_date') or ''
        year = release_date.split('-')[0] if release_date else ''
        genres = [g.get('name') for g in data.get('genres', []) if g.get('name')]

        duration = ''
        if endpoint_type == 'movie':
            runtime = data.get('runtime')
            if runtime:
                hrs = runtime // 60
                mins = runtime % 60
                duration = f"{hrs}h {mins}m" if hrs else f"{mins}m"
        else:
            seasons = data.get('number_of_seasons', 1)
            episodes = data.get('number_of_episodes', 0)
            duration = f"{seasons} Season{'s' if seasons > 1 else ''}"
            if episodes:
                duration += f" ({episodes} eps)"

        poster_path = data.get('poster_path')
        backdrop_path = data.get('backdrop_path')

        return {
            'tmdb_id': data.get('id'),
            'title': title,
            'media_type': 'series' if endpoint_type == 'tv' else 'movie',
            'category_or_sport': ', '.join(genres),
            'release_year': int(year) if year.isdigit() else None,
            'duration': duration,
            'rating': round(data.get('vote_average', 8.5), 1),
            'description': data.get('overview', ''),
            'poster_url': f"{TMDB_IMAGE_BASE_W500}{poster_path}" if poster_path else '',
            'backdrop_url': f"{TMDB_IMAGE_BASE_ORIGINAL}{backdrop_path}" if backdrop_path else '',
        }
    except Exception as e:
        print(f"TMDb details error: {e}")
        return None

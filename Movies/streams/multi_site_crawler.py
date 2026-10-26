import requests
import urllib3
import re
import time
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import quote_plus, urljoin

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}
TIMEOUT = 3.5

def clean_title(title):
    if not title:
        return ""
    t = re.sub(r'^(Download|Watch|Free\s+Download|Full\s+Movie)\s*', '', title, flags=re.I)
    t = re.sub(r'[\r\n\t]+', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def parse_html_for_movies(html, base_url, provider_name, query):
    """
    Universal movie card parser that extracts title, direct page URL, and poster image
    from WordPress (Dooplay, PsyPlay, ToroPlay, etc.) and custom CMS streaming sites.
    """
    soup = BeautifulSoup(html, 'html.parser')
    results = []
    q_words = [w.lower() for w in query.strip().split() if len(w) > 1]
    if not q_words:
        return []

    seen_urls = set()

    # Strategy 1: Look for movie post/card/item containers
    cards = soup.find_all(['article', 'div'], class_=lambda c: c and any(k in str(c).lower() for k in [
        'post', 'movie', 'card', 'item', 'result', 'film', 'thumb', 'entry', 'video', 'flw-item'
    ]))

    for card in cards:
        # Skip site headers or navigation bars
        if any(skip in card.get('class', []) for skip in ['page-header', 'site-header', 'header', 'search-header', 'main-header']):
            continue

        link = card.find('a', href=True)
        if not link:
            continue
        href = link['href']
        if href in seen_urls or any(skip in href.lower() for skip in ['/category/', '/tag/', '/author/', '/page/', '#', 'javascript:', '/search']):
            continue

        # Extract title from h2/h3/h4/a
        h = card.find(['h1', 'h2', 'h3', 'h4', 'h5'])
        raw_title = h.text.strip() if h else (link.get('title') or link.text.strip())

        # Discard generic search text headers
        if any(bad in raw_title.lower() for bad in ['search results', 'results for', 'search for:', 'navigation']):
            sub_a = card.find('a', title=True)
            if sub_a:
                raw_title = sub_a['title'].strip()
            else:
                continue

        img = card.find('img')
        if (not raw_title or len(raw_title) < 3) and img and img.get('alt'):
            raw_title = img['alt'].strip()

        cleaned = clean_title(raw_title)
        if not cleaned or len(cleaned) < 3:
            continue

        cleaned_lower = cleaned.lower()
        if not any(w in cleaned_lower for w in q_words):
            continue

        # Extract poster image (handling lazy loading attributes)
        img_src = ''
        if img:
            img_src = (
                img.get('src') or 
                img.get('data-src') or 
                img.get('data-lazy-src') or 
                img.get('data-original') or 
                img.get('data-srcset') or ''
            )
            if ' ' in img_src:
                img_src = img_src.split(' ')[0]

        seen_urls.add(href)
        results.append({
            'site_name': provider_name,
            'title': cleaned,
            'page_url': urljoin(base_url, href),
            'poster_url': urljoin(base_url, img_src) if img_src else ''
        })

    # Strategy 2: Fallback to link tags if no structured cards found
    if not results:
        for a in soup.find_all('a', href=True):
            href = a['href']
            text = clean_title(a.text.strip() or a.get('title', ''))
            if href in seen_urls or len(text) < 4:
                continue
            if any(skip in href.lower() for skip in ['/category/', '/tag/', '/author/', '/page/', '#', 'javascript:', 'login', 'register', '/search']):
                continue
            if any(bad in text.lower() for bad in ['search results', 'results for', 'page']):
                continue
            t_lower = text.lower()
            if any(w in t_lower for w in q_words) and any(kw in t_lower or kw in href for kw in ['movie', 'season', 'series', '20', '1080p', '720p', '480p', 'bluray', 'hd', 'web-dl', 'hindi', 'english']):
                img = a.find('img') or (a.parent and a.parent.find('img'))
                img_src = ''
                if img:
                    img_src = img.get('src') or img.get('data-src') or img.get('data-lazy-src') or ''
                seen_urls.add(href)
                results.append({
                    'site_name': provider_name,
                    'title': text,
                    'page_url': urljoin(base_url, href),
                    'poster_url': urljoin(base_url, img_src) if img_src else ''
                })

    return results[:6]

NETMIRROR_COOKIES = {
    'cf_clearance': 'dJw87DqDGD1_Junto_C5YKukzR6n5Pp3ye0iyanQsQA-1792993007-1.2.1.1-cYm_1cE3LAe9oL9PaepSkNUpIa0gJ1nAKxLJGlAAECWb3mYKRalYKhFM3TWa4DWpfVXgD8kOGNp4oVVy.Y50USN.tz8s3o9EkYJq9zFL93H.2frjcVAlUd_zMlgOMsfRMX6zl_WKgVGVkNqLe2staDSpoUvqt4JOQ.Y3sie5rNU8H3yJiQwhYb62agCnSDo3ZSfwjpUP.u1Nz2unNzGNSvQpUfxZloLXxRYMS_84U5jigsEqnvKfNyufCr_BQKev8aoaJxZ8YixhezSZe_699e3XR8VCP8JWeMkIyykKX94q2fhUDmYMukP11bB2VSC.XS.cmEyvY.3GAn5aQB9qNRDrWMcDSUjESKMcSJlpa1N8daIW3GDonJ7i.HAYmgtpQo9a9sUE3P1r7zeUz6G3rJQBwcPRFWpdLhSwO1j1Pmc5hDRqai2MNXwCaMjkZGHr16XY_6NuywYC7dD1rISDxA',
    't_hash': '318d3afa3466fd9af4c6aff5579fb4a2::1792993515::ni',
    't_hash_p': '3968ce7b443464d59b0eb031958e6a88::15b44fbb44f457725fdf7000ee1f2f36::1792993006::ni::p',
    'user_token': '94beb5848569a3cf08e3b2fb45997822'
}

def crawl_netmirror(query):
    """
    Crawls NetMirror (https://net77.cc/home) via its high-speed search API with authenticated cookies.
    """
    results = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://net77.cc/home'
    }
    try:
        url = f"https://net77.cc/search.php?s={quote_plus(query)}"
        r = requests.get(url, headers=headers, cookies=NETMIRROR_COOKIES, timeout=TIMEOUT, verify=False)
        if r.status_code == 200:
            data = r.json()
            for item in data.get('searchResult', []):
                mid = item.get('id')
                raw_title = item.get('t', '').strip()
                if not raw_title:
                    continue
                results.append({
                    'site_name': 'NetMirror',
                    'badge_color': '#e50914',
                    'title': clean_title(raw_title),
                    'page_url': 'https://net77.cc/home',
                    'poster_url': f"https://occ-0-2773-2774.1.nflxso.net/dnm/api/v6/6gmvuMF9NjWKnQXBmoW7A22Q8TQ/{mid}.jpg?r=1" if mid else '',
                    'provider_url': 'https://net77.cc/home',
                    'netmirror_id': mid,
                })
    except Exception:
        pass
    return results[:8]

def crawl_cinejoy(query):
    """
    Crawls Cinejoy (https://cinejoy.pk) resolving titles with direct watch & search links.
    Cinejoy's search page: https://cinejoy.pk/search/{query}
    Movie watch page: https://cinejoy.pk/watch/movie/{tmdb_id}
    Series watch page: https://cinejoy.pk/watch/tv/{tmdb_id}/1/1
    """
    results = []
    headers = {'User-Agent': HEADERS['User-Agent']}
    search_web_url = f"https://cinejoy.pk/search/{quote_plus(query)}"
    
    # Use TMDb search multi resolver matching Cinejoy's client architecture
    api_url = f"https://api.themoviedb.org/3/search/multi?api_key=8476a7ab80ad76f0936744df0430e67c&query={quote_plus(query)}&language=en-US"
    try:
        r = requests.get(api_url, headers=headers, timeout=TIMEOUT)
        if r.status_code == 200:
            data = r.json()
            for item in data.get('results', [])[:6]:
                mtype = item.get('media_type', 'movie')
                if mtype not in ['movie', 'tv']:
                    continue
                mid = item.get('id')
                raw_title = item.get('title') or item.get('name') or ''
                if not raw_title:
                    continue
                release = item.get('release_date') or item.get('first_air_date') or ''
                year = f" ({release[:4]})" if release and len(release) >= 4 else ""
                full_title = f"{raw_title}{year}"
                
                poster_path = item.get('poster_path')
                poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else ''
                
                if mtype == 'movie':
                    watch_url = f"https://cinejoy.pk/watch/movie/{mid}"
                else:
                    watch_url = f"https://cinejoy.pk/watch/tv/{mid}/1/1"
                    
                results.append({
                    'site_name': 'Cinejoy',
                    'badge_color': '#95FF50',
                    'title': full_title,
                    'page_url': watch_url,
                    'search_url': search_web_url,
                    'poster_url': poster_url,
                    'provider_url': 'https://cinejoy.pk',
                    'tmdb_id': mid,
                    'media_type': mtype,
                })
    except Exception:
        # Fallback to direct search link if API call fails
        results.append({
            'site_name': 'Cinejoy',
            'badge_color': '#95FF50',
            'title': f"Search '{query}' on Cinejoy",
            'page_url': search_web_url,
            'search_url': search_web_url,
            'poster_url': '',
            'provider_url': 'https://cinejoy.pk',
        })
    return results[:6]

def crawl_provider(provider, query):
    """
    Crawls a single streaming provider with the user query.
    """
    base_url = provider.url.rstrip('/')

    # NetMirror has dedicated search API
    if 'net77.cc' in base_url or provider.name.lower() == 'netmirror':
        return crawl_netmirror(query)

    # Cinejoy has dedicated search & watch structure
    if 'cinejoy' in base_url or provider.name.lower() == 'cinejoy':
        return crawl_cinejoy(query)

    s_url = f"{base_url}/?s={quote_plus(query)}"
    
    # Specific URL structures for certain providers
    if 'tamilblasters' in base_url:
        s_url = f"{base_url}/index.php?/search/&q={quote_plus(query)}"
    elif 'flixto' in base_url or 'streameast' in base_url:
        # Handled separately by their dedicated services
        return []

    try:
        r = requests.get(s_url, headers=HEADERS, timeout=TIMEOUT, verify=False, allow_redirects=True)
        if r.status_code == 200:
            items = parse_html_for_movies(r.text, base_url, provider.name, query)
            for it in items:
                it['badge_color'] = provider.badge_color or '#ff2a54'
                it['provider_url'] = provider.url
            return items
    except Exception:
        pass
    return []

def search_all_domains_live(query):
    """
    Concurrently searches across ALL verified streaming domains in the database
    in parallel using a ThreadPoolExecutor.
    """
    query = query.strip()
    if not query:
        return {
            'results': [],
            'stats': {
                'searched_count': 0,
                'matched_sites': [],
                'site_counts': {},
                'elapsed_seconds': 0
            }
        }

    from .models import StreamingProvider
    providers = list(StreamingProvider.objects.filter(is_active=True).exclude(category='sports'))
    
    all_results = []
    matched_sites_set = set()
    site_counts = {}

    start_t = time.time()
    with ThreadPoolExecutor(max_workers=25) as executor:
        future_to_provider = {executor.submit(crawl_provider, p, query): p for p in providers}
        for future in as_completed(future_to_provider):
            p = future_to_provider[future]
            try:
                items = future.result()
                if items:
                    all_results.extend(items)
                    matched_sites_set.add(p.name)
                    site_counts[p.name] = len(items)
            except Exception:
                pass
    elapsed = round(time.time() - start_t, 2)

    # Deduplicate results by page_url
    seen = set()
    deduped = []
    for r in all_results:
        if r['page_url'] not in seen:
            seen.add(r['page_url'])
            deduped.append(r)

    stats = {
        'searched_count': len(providers),
        'matched_sites': sorted(list(matched_sites_set)),
        'site_counts': site_counts,
        'elapsed_seconds': elapsed
    }

    return {
        'results': deduped,
        'stats': stats
    }

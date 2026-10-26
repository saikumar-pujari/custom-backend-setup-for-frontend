import requests
import urllib3
from concurrent.futures import ThreadPoolExecutor, as_completed
from django.core.management.base import BaseCommand
from streams.models import StreamingProvider

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

URL = "https://raw.githubusercontent.com/MrXtron/CloudStream-Extension/refs/heads/main/Files/domains.json"

class Command(BaseCommand):
    help = "Test and sync working streaming domains from CloudStream repo"

    def handle(self, *args, **options):
        self.stdout.write("Fetching domains from CloudStream repository...")
        resp = requests.get(URL, timeout=8)
        if resp.status_code != 200:
            self.stdout.write(self.style.ERROR(f"Failed to fetch domains.json: HTTP {resp.status_code}"))
            return

        domains = resp.json()
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }

        def test_site(item):
            name, site_url = item
            if any(k in site_url for k in ['google.com', 'gofile.io', 'streamwish']):
                return None
            try:
                r = requests.get(site_url, headers=headers, timeout=3.5, verify=False, allow_redirects=True)
                if r.status_code in [200, 301, 302, 403]:
                    return {
                        'name': name.capitalize(),
                        'url': r.url or site_url,
                        'status': r.status_code,
                        'alive': True
                    }
                else:
                    return {'name': name.capitalize(), 'url': site_url, 'alive': False, 'reason': f"HTTP {r.status_code}"}
            except Exception as e:
                return {'name': name.capitalize(), 'url': site_url, 'alive': False, 'reason': type(e).__name__}

        self.stdout.write(f"Testing {len(domains)} domains concurrently...")
        working = []
        failed = []

        with ThreadPoolExecutor(max_workers=25) as executor:
            futures = [executor.submit(test_site, (name, url)) for name, url in domains.items()]
            for f in as_completed(futures):
                res = f.result()
                if not res:
                    continue
                if res['alive']:
                    working.append(res)
                else:
                    failed.append(res)

        for w in working:
            name = w['name']
            url = w['url']
            category = 'movies'
            badge_color = '#00e5ff'
            if any(k in name.lower() for k in ['sports', 'f1', 'race', 'cricket', 'east', 'live']):
                category = 'sports'
                badge_color = '#ff2a54'
            elif any(k in name.lower() for k in ['toon', 'anime']):
                category = 'movies'
                badge_color = '#ffb703'
            elif any(k in name.lower() for k in ['bolly', 'tamil', 'telugu', 'desi', 'hind']):
                category = 'movies'
                badge_color = '#9d4edd'

            StreamingProvider.objects.update_or_create(
                name=name,
                defaults={
                    'url': url,
                    'category': category,
                    'badge_color': badge_color,
                    'description': f"Auto-verified streaming provider from CloudStream ({name})",
                    'is_active': True
                }
            )

        self.stdout.write(self.style.SUCCESS(f"Finished! {len(working)} working domains active, {len(failed)} offline/blocked."))

// StreamHub Management Page Script

let allItems = [];

document.addEventListener('DOMContentLoaded', () => {
  loadManagementData();
  setupDedicatedForm();
  setupTableFilters();
  initTmdbPageAutocomplete();
});

async function loadManagementData() {
  try {
    const [mediaRes, statsRes] = await Promise.all([
      fetch('/api/media/'),
      fetch('/api/stats/')
    ]);

    allItems = await mediaRes.json();
    const stats = await statsRes.json();

    updateStats(stats);
    renderTable(allItems);
  } catch (err) {
    console.error('Error loading management data:', err);
    showToast('Failed to load management data', 'error');
  }
}

function updateStats(stats) {
  document.getElementById('statTotalMedia').textContent = stats.total || 0;
  document.getElementById('statMovies').textContent = stats.movies || 0;
  document.getElementById('statSeries').textContent = stats.series || 0;
  document.getElementById('statRaces').textContent = stats.races || 0;
  document.getElementById('statSources').textContent = stats.sources || 0;

  // Render verified streaming providers list
  const container = document.getElementById('providersListContainer');
  if (container && stats.providers && stats.providers.length > 0) {
    container.innerHTML = '';
    stats.providers.forEach(p => {
      const card = document.createElement('div');
      card.style.cssText = 'background: var(--bg-secondary); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-sm); padding: 0.85rem 1.1rem; display: flex; align-items: center; justify-content: space-between;';
      card.innerHTML = `
        <div style="min-width: 0; padding-right: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <strong style="color: #fff; font-size: 0.95rem;">${p.name}</strong>
            <span class="badge" style="background: ${p.badge_color || '#a855f7'}22; color: ${p.badge_color || '#a855f7'}; font-size: 0.65rem;">
              ${p.category === 'sports' ? 'SPORTS' : 'CINEMA'}
            </span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${p.url}
          </div>
        </div>
        <a href="${p.url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="white-space: nowrap; font-size: 0.78rem;">
          ↗ Open
        </a>
      `;
      container.appendChild(card);
    });
  }
}

function renderTable(items) {
  const tbody = document.getElementById('manageTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-dim);">
          No streams found matching current filters.
        </td>
      </tr>
    `;
    return;
  }

  items.forEach(item => {
    const tr = document.createElement('tr');

    const poster = item.poster_url || DEFAULT_POSTERS[item.media_type] || DEFAULT_POSTERS.movie;
    let badgeClass = 'badge-movie';
    if (item.media_type === 'series') badgeClass = 'badge-series';
    if (item.media_type === 'race') badgeClass = 'badge-f1';

    const sources = item.sources || [];
    const primarySource = sources.length > 0 ? sources[0] : null;

    let sourcesHtml = '';
    if (sources.length > 0) {
      const src = sources[0];
      let providerBadge = '';
      const sUrl = src.stream_url.toLowerCase();
      const sName = (src.server_name || '').toLowerCase();

      if (sUrl.includes('streameast') || sName.includes('streameast')) {
        providerBadge = '<span class="badge badge-live" style="font-size:0.65rem;padding:1px 5px;">StreamEast</span>';
      } else if (sUrl.includes('flixto') || sName.includes('flixto')) {
        providerBadge = '<span class="badge badge-movie" style="font-size:0.65rem;padding:1px 5px;">Flixto</span>';
      }

      sourcesHtml = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            ${providerBadge}
            <span style="font-weight: 600; color: #fff; font-size: 0.85rem;">${src.server_name}</span>
            <span style="font-size: 0.72rem; color: var(--text-dim);">(${truncateUrl(src.stream_url)})</span>
          </div>
          ${sources.length > 1 ? `<span style="font-size: 0.75rem; color: var(--accent-cyan);">+ ${sources.length - 1} more mirror server(s)</span>` : ''}
        </div>
      `;
    } else {
      sourcesHtml = '<span style="color: var(--text-dim); font-size: 0.82rem;">No streaming links added</span>';
    }

    tr.innerHTML = `
      <td>
        <img src="${poster}" alt="" class="thumb-preview" onerror="this.src='${DEFAULT_POSTERS[item.media_type]}'">
      </td>
      <td>
        <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">${item.title}</div>
        <div style="color: var(--text-dim); font-size: 0.8rem;">${item.category_or_sport || 'General'}</div>
      </td>
      <td>
        <span class="badge ${badgeClass}">${item.media_type_display || item.media_type}</span>
      </td>
      <td>
        <span style="color: var(--text-muted); font-size: 0.88rem;">${item.release_year || '—'}</span>
      </td>
      <td>
        <span class="badge badge-quality" style="font-size: 0.75rem;">${item.quality || '1080p'}</span>
      </td>
      <td>
        ${sourcesHtml}
      </td>
      <td style="text-align: right; white-space: nowrap;">
        <div style="display: inline-flex; gap: 0.4rem;">
          ${primarySource ? `
            <a href="${primarySource.stream_url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" title="Open directly on streaming website">
              ↗ Open Site
            </a>
          ` : ''}
          <button class="btn btn-secondary btn-sm" onclick="openWatchModal(${item.id})">
            Details & Mirrors
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteFromTable(${item.id})">
            Delete
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function setupTableFilters() {
  const searchInput = document.getElementById('manageSearchInput');
  const typeFilter = document.getElementById('manageTypeFilter');

  function filterItems() {
    const q = searchInput.value.toLowerCase().trim();
    const type = typeFilter.value;

    const filtered = allItems.filter(item => {
      const matchType = (type === 'all' || item.media_type === type);
      const matchQuery = !q || (
        item.title.toLowerCase().includes(q) ||
        (item.category_or_sport && item.category_or_sport.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
      return matchType && matchQuery;
    });

    renderTable(filtered);
  }

  if (searchInput) searchInput.addEventListener('input', filterItems);
  if (typeFilter) typeFilter.addEventListener('change', filterItems);
}

function setupDedicatedForm() {
  const container = document.getElementById('pageSourcesContainer');
  const addMoreBtn = document.getElementById('pageAddMoreSrcBtn');

  if (addMoreBtn && container) {
    addMoreBtn.addEventListener('click', () => {
      const idx = container.querySelectorAll('.source-row').length + 1;
      const row = document.createElement('div');
      row.className = 'source-row';
      row.style.cssText = 'display: grid; grid-template-columns: 180px 1fr 140px auto; gap: 0.75rem; margin-bottom: 0.75rem;';
      row.innerHTML = `
        <input type="text" class="form-control src-server" placeholder="Server Name" value="Mirror ${idx}" required>
        <input type="url" class="form-control src-url" placeholder="Paste website stream URL here" required>
        <input type="text" class="form-control src-notes" placeholder="Notes (e.g. 1080p 60fps)">
        <button type="button" class="btn btn-danger btn-sm remove-src-btn">✕</button>
      `;
      row.querySelector('.remove-src-btn').onclick = () => row.remove();
      container.appendChild(row);
    });
  }

  const form = document.getElementById('dedicatedAddForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('pageAddTitle').value.trim();
      const tmdbIdEl = document.getElementById('pageAddTmdbId');
      const tmdb_id = tmdbIdEl && tmdbIdEl.value ? parseInt(tmdbIdEl.value) : null;
      const media_type = document.getElementById('pageAddType').value;
      const category_or_sport = document.getElementById('pageAddCategory').value.trim();
      const release_year = parseInt(document.getElementById('pageAddYear').value) || null;
      const duration = document.getElementById('pageAddDuration').value.trim();
      const quality = document.getElementById('pageAddQuality').value;
      const poster_url = document.getElementById('pageAddPoster').value.trim();
      const rating = parseFloat(document.getElementById('pageAddRating').value) || 8.5;
      const description = document.getElementById('pageAddDesc').value.trim();

      // Collect sources
      const sourceRows = container.querySelectorAll('.source-row');
      const sources = [];
      sourceRows.forEach(row => {
        const sName = row.querySelector('.src-server').value.trim() || 'Server 1';
        const sUrl = row.querySelector('.src-url').value.trim();
        const sNotes = row.querySelector('.src-notes') ? row.querySelector('.src-notes').value.trim() : '';
        if (sUrl) {
          sources.push({
            server_name: sName,
            stream_url: sUrl,
            quality_label: quality,
            notes: sNotes,
            language: 'English'
          });
        }
      });

      const payload = {
        title,
        tmdb_id,
        media_type,
        category_or_sport,
        release_year,
        duration,
        quality,
        poster_url,
        rating,
        description,
        sources
      };

      try {
        const submitBtn = document.getElementById('pageSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const res = await fetch('/api/media/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(JSON.stringify(err));
        }

        showToast(`Successfully added "${title}"!`, 'success');
        form.reset();
        loadManagementData();
      } catch (err) {
        console.error(err);
        showToast('Error saving. Make sure title and valid URLs are provided.', 'error');
      } finally {
        const submitBtn = document.getElementById('pageSubmitBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Stream to Hub';
      }
    });
  }
}

// Preset helpers
function applyPreset(presetType) {
  const typeSelect = document.getElementById('pageAddType');
  const catInput = document.getElementById('pageAddCategory');
  const qualitySelect = document.getElementById('pageAddQuality');
  const durationInput = document.getElementById('pageAddDuration');
  const posterInput = document.getElementById('pageAddPoster');
  const titleInput = document.getElementById('pageAddTitle');
  const serverInput = document.querySelector('#pageSourcesContainer .src-server');
  const urlInput = document.querySelector('#pageSourcesContainer .src-url');
  const notesInput = document.querySelector('#pageSourcesContainer .src-notes');

  if (presetType === 'streameast_f1') {
    typeSelect.value = 'race';
    catInput.value = 'Formula 1, Motorsport';
    qualitySelect.value = '1080p 60FPS';
    durationInput.value = 'Race (~55 Laps)';
    posterInput.value = 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80';
    titleInput.placeholder = 'e.g. Formula 1 Italian Grand Prix 2026';
    if (serverInput) serverInput.value = 'StreamEast Live F1';
    if (urlInput) urlInput.value = 'https://streameasto.cx/';
    if (notesInput) notesInput.value = 'Live Race Stream';
    titleInput.focus();
    showToast('Applied StreamEast F1 Preset');
  } else if (presetType === 'streameast_motogp') {
    typeSelect.value = 'race';
    catInput.value = 'MotoGP, Motorcycle Racing';
    qualitySelect.value = '1080p 60FPS';
    durationInput.value = 'Race (~22 Laps)';
    posterInput.value = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80';
    titleInput.placeholder = 'e.g. MotoGP Mugello Grand Prix 2026';
    if (serverInput) serverInput.value = 'StreamEast Live MotoGP';
    if (urlInput) urlInput.value = 'https://streameasto.cx/';
    if (notesInput) notesInput.value = 'Live MotoGP Stream';
    titleInput.focus();
    showToast('Applied StreamEast MotoGP Preset');
  } else if (presetType === 'flixto_movie') {
    typeSelect.value = 'movie';
    catInput.value = 'Action, Sci-Fi';
    qualitySelect.value = '1080p FHD';
    durationInput.value = '2h 15m';
    posterInput.value = '';
    titleInput.placeholder = 'e.g. Gladiator II';
    if (serverInput) serverInput.value = 'Flixto Movies';
    if (urlInput) urlInput.value = 'http://flixto.watch/';
    if (notesInput) notesInput.value = 'Stream on Flixto';
    titleInput.focus();
    showToast('Applied Flixto Movie Preset');
  } else if (presetType === 'flixto_series') {
    typeSelect.value = 'series';
    catInput.value = 'Drama, Thriller';
    qualitySelect.value = '1080p FHD';
    durationInput.value = 'Season 1';
    posterInput.value = '';
    titleInput.placeholder = 'e.g. Stranger Things Season 5';
    if (serverInput) serverInput.value = 'Flixto Series';
    if (urlInput) urlInput.value = 'http://flixto.watch/';
    if (notesInput) notesInput.value = 'All Episodes on Flixto';
    titleInput.focus();
    showToast('Applied Flixto Series Preset');
  }
}

function handleTypeChange(val) {
  const catInput = document.getElementById('pageAddCategory');
  const qualitySelect = document.getElementById('pageAddQuality');
  const durationInput = document.getElementById('pageAddDuration');
  const serverInput = document.querySelector('#pageSourcesContainer .src-server');
  const urlInput = document.querySelector('#pageSourcesContainer .src-url');

  if (val === 'race') {
    catInput.value = 'Formula 1, Motorsport';
    qualitySelect.value = '1080p 60FPS';
    durationInput.value = 'Race (60 Laps)';
    if (serverInput) serverInput.value = 'StreamEast Live';
    if (urlInput && urlInput.value.includes('flixto')) urlInput.value = 'https://streameasto.cx/';
  } else if (val === 'movie') {
    catInput.value = 'Action, Adventure';
    qualitySelect.value = '1080p FHD';
    durationInput.value = '2h 10m';
    if (serverInput) serverInput.value = 'Flixto Movies';
    if (urlInput && urlInput.value.includes('streameast')) urlInput.value = 'http://flixto.watch/';
  } else if (val === 'series') {
    catInput.value = 'Drama, Mystery';
    qualitySelect.value = '1080p FHD';
    durationInput.value = 'Season 1 (8 eps)';
    if (serverInput) serverInput.value = 'Flixto Series';
    if (urlInput && urlInput.value.includes('streameast')) urlInput.value = 'http://flixto.watch/';
  }
}

function focusAddStreamForm() {
  const panel = document.getElementById('addStreamPanel');
  if (panel) {
    panel.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('pageAddTitle').focus();
  }
}

async function deleteFromTable(mediaId) {
  if (!confirm('Are you sure you want to delete this stream entry?')) return;

  try {
    const res = await fetch(`/api/media/${mediaId}/`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Stream removed successfully', 'success');
      loadManagementData();
    } else {
      throw new Error('Failed to delete');
    }
  } catch (err) {
    showToast('Failed to delete', 'error');
  }
}

// TMDb Autocomplete for Management Page
function initTmdbPageAutocomplete() {
  const input = document.getElementById('pageAddTitle');
  const dropdown = document.getElementById('pageTitleSuggestions');
  if (!input || !dropdown) return;

  let debounceTimer;
  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const q = e.target.value.trim();
    if (q.length < 2) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }

    debounceTimer = setTimeout(() => {
      fetchTmdbSuggestions(q, dropdown, fillPageFromTmdb);
    }, 350);
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

function searchTmdbPage() {
  const input = document.getElementById('pageAddTitle');
  const dropdown = document.getElementById('pageTitleSuggestions');
  if (!input || !dropdown) return;
  const q = input.value.trim();
  if (!q) {
    showToast('Enter a movie or series title first');
    return;
  }
  fetchTmdbSuggestions(q, dropdown, fillPageFromTmdb);
}

async function fillPageFromTmdb(item) {
  try {
    showToast(`Fetching info for "${item.title}"...`);
    const res = await fetch(`/api/tmdb/details/?id=${item.tmdb_id}&type=${item.media_type}`);
    const details = await res.json();

    document.getElementById('pageAddTitle').value = details.title || item.title;
    document.getElementById('pageAddType').value = details.media_type || item.media_type;
    if (details.category_or_sport) document.getElementById('pageAddCategory').value = details.category_or_sport;
    if (details.release_year) document.getElementById('pageAddYear').value = details.release_year;
    if (details.duration) document.getElementById('pageAddDuration').value = details.duration;
    if (details.poster_url) document.getElementById('pageAddPoster').value = details.poster_url;
    if (details.description) document.getElementById('pageAddDesc').value = details.description;

    const tmdbIdInput = document.getElementById('pageAddTmdbId');
    if (tmdbIdInput) tmdbIdInput.value = details.tmdb_id || item.tmdb_id || '';

    const serverInput = document.querySelector('#pageSourcesContainer .src-server');
    const urlInput = document.querySelector('#pageSourcesContainer .src-url');
    if (serverInput) serverInput.value = 'Flixto Movies';
    if (urlInput) urlInput.value = 'http://flixto.watch/';

    showToast(`✓ Auto-filled "${details.title}" from TMDb!`, 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to load full TMDb details', 'error');
  }
}


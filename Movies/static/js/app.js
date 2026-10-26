// StreamHub Main JavaScript
let currentMediaList = [];
let currentFilterType = 'all';
let currentFilterCategory = 'all';
let currentSearchTerm = '';
let activeMediaItem = null;

// Fallback images if user leaves poster blank
const DEFAULT_POSTERS = {
  movie: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80',
  series: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=500&q=80',
  race: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=500&q=80',
};

document.addEventListener('DOMContentLoaded', () => {
  initModals();
  initSearch();
  initTabs();
  initAddStreamModal();
  initTmdbModalAutocomplete();
  loadStats();
  loadMedia();
});

// Modern <dialog> setup with native showModal() and light-dismiss
function initModals() {
  const watchModal = document.getElementById('watchModal');
  const addModal = document.getElementById('addStreamModal');

  [watchModal, addModal].forEach((dialog) => {
    if (!dialog) return;
    // Light-dismiss: close when backdrop is clicked
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const inDialog = (
        rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width
      );
      if (!inDialog) {
        dialog.close();
      }
    });
  });
}

function openAddStreamModal() {
  const modal = document.getElementById('addStreamModal');
  if (modal) {
    modal.showModal();
  }
}

function closeAddStreamModal() {
  const modal = document.getElementById('addStreamModal');
  if (modal) {
    modal.close();
  }
}

function setModalProvider(key) {
  const typeSelect = document.getElementById('addMediaType');
  const catInput = document.getElementById('addCategory');
  const serverInput = document.querySelector('#sourcesContainer .src-server');
  const urlInput = document.querySelector('#sourcesContainer .src-url');
  const qualitySelect = document.getElementById('addQuality');

  if (key === 'streameast') {
    if (typeSelect) typeSelect.value = 'race';
    if (catInput) catInput.value = 'Formula 1, Motorsport';
    if (qualitySelect) qualitySelect.value = '1080p 60FPS';
    if (serverInput) serverInput.value = 'StreamEast Live';
    if (urlInput) urlInput.value = 'https://streameasto.cx/';
    showToast('Switched to StreamEast (Sports & Races) preset');
  } else if (key === 'flixto') {
    if (typeSelect) typeSelect.value = 'movie';
    if (catInput) catInput.value = 'Action, Sci-Fi';
    if (qualitySelect) qualitySelect.value = '1080p FHD';
    if (serverInput) serverInput.value = 'Flixto Stream';
    if (urlInput) urlInput.value = 'http://flixto.watch/';
    showToast('Switched to Flixto (Movies & Series) preset');
  }
}

function onModalTypeChange(val) {
  const serverInput = document.querySelector('#sourcesContainer .src-server');
  const urlInput = document.querySelector('#sourcesContainer .src-url');
  if (val === 'race') {
    if (serverInput) serverInput.value = 'StreamEast Live';
    if (urlInput && urlInput.value.includes('flixto')) urlInput.value = 'https://streameasto.cx/';
  } else {
    if (serverInput) serverInput.value = 'Flixto Stream';
    if (urlInput && urlInput.value.includes('streameast')) urlInput.value = 'http://flixto.watch/';
  }
}

function openCurrentProviderSite() {
  const typeSelect = document.getElementById('addMediaType');
  if (typeSelect && typeSelect.value === 'race') {
    window.open('https://streameasto.cx/', '_blank', 'noopener,noreferrer');
  } else {
    window.open('http://flixto.watch/', '_blank', 'noopener,noreferrer');
  }
}

function setupEmbedPlayer(embedBox, embedFrame, playerTabs, tmdbId, mediaType, sources, itemTitle) {
  if (!embedBox || !embedFrame) return;

  if (tmdbId) {
    const isTv = mediaType === 'series';
    let currentSeason = 1;
    let currentEpisode = 1;

    function getServers(season, ep) {
      const typePath = isTv ? 'tv' : 'movie';
      const suffix = isTv ? `/${season}/${ep}` : '';
      return [
        { name: 'VidSrc Cloud', url: `https://vidsrc.to/embed/${typePath}/${tmdbId}${suffix}` },
        { name: 'EmbedSU Ultra', url: `https://embed.su/embed/${typePath}/${tmdbId}${suffix}` },
        { name: 'MultiEmbed 4K', url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1` + (isTv ? `&s=${season}&e=${ep}` : '') },
        { name: 'VidSrc Pro', url: `https://vidsrc.xyz/embed/${typePath}/${tmdbId}${suffix}` },
        { name: 'AutoEmbed Fast', url: `https://player.autoembed.cc/embed/${typePath}/${tmdbId}${suffix}` },
        { name: 'SuperEmbed', url: `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1` },
      ];
    }

    let activeServerIdx = 0;

    function renderPlayerBar() {
      if (!playerTabs) return;
      playerTabs.innerHTML = '';

      const label = document.createElement('span');
      label.style.cssText = 'font-size: 0.78rem; color: var(--accent-cyan); font-weight: 700; margin-right: 0.25rem;';
      label.textContent = '📺 Direct Stream:';
      playerTabs.appendChild(label);

      const servers = getServers(currentSeason, currentEpisode);

      servers.forEach((srv, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `btn ${idx === activeServerIdx ? 'btn-primary' : 'btn-secondary'} btn-sm`;
        btn.style.cssText = 'padding: 2px 7px; font-size: 0.72rem;';
        btn.textContent = srv.name;
        btn.onclick = () => {
          activeServerIdx = idx;
          renderPlayerBar();
          embedFrame.src = srv.url;
        };
        playerTabs.appendChild(btn);
      });

      // If TV Series, add Season & Episode controls
      if (isTv) {
        const epWrap = document.createElement('div');
        epWrap.style.cssText = 'display: inline-flex; align-items: center; gap: 0.3rem; margin-left: 0.4rem; background: rgba(0,229,255,0.08); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(0,229,255,0.25);';

        const sSpan = document.createElement('span');
        sSpan.style.cssText = 'font-size: 0.72rem; color: var(--accent-cyan); font-weight: 700;';
        sSpan.textContent = 'S:';
        epWrap.appendChild(sSpan);

        const sSel = document.createElement('select');
        sSel.className = 'form-control';
        sSel.style.cssText = 'width: auto; padding: 1px 4px; font-size: 0.72rem; height: 22px; display: inline-block; background: var(--bg-card); color: #fff;';
        for (let s = 1; s <= 15; s++) {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = `S${s}`;
          if (s === currentSeason) opt.selected = true;
          sSel.appendChild(opt);
        }
        sSel.onchange = (e) => {
          currentSeason = parseInt(e.target.value, 10);
          const currentServers = getServers(currentSeason, currentEpisode);
          embedFrame.src = currentServers[activeServerIdx].url;
        };
        epWrap.appendChild(sSel);

        const eSpan = document.createElement('span');
        eSpan.style.cssText = 'font-size: 0.72rem; color: var(--accent-cyan); font-weight: 700;';
        eSpan.textContent = 'Ep:';
        epWrap.appendChild(eSpan);

        const eSel = document.createElement('select');
        eSel.className = 'form-control';
        eSel.style.cssText = 'width: auto; padding: 1px 4px; font-size: 0.72rem; height: 22px; display: inline-block; background: var(--bg-card); color: #fff;';
        for (let ep = 1; ep <= 30; ep++) {
          const opt = document.createElement('option');
          opt.value = ep;
          opt.textContent = `Ep ${ep}`;
          if (ep === currentEpisode) opt.selected = true;
          eSel.appendChild(opt);
        }
        eSel.onchange = (e) => {
          currentEpisode = parseInt(e.target.value, 10);
          const currentServers = getServers(currentSeason, currentEpisode);
          embedFrame.src = currentServers[activeServerIdx].url;
        };
        epWrap.appendChild(eSel);

        playerTabs.appendChild(epWrap);
      }
    }

    renderPlayerBar();
    embedBox.style.display = 'block';
    embedFrame.src = getServers(currentSeason, currentEpisode)[0].url;
  } else if (sources && sources.length > 0) {
    if (playerTabs) {
      playerTabs.innerHTML = '<span style="font-size: 0.78rem; color: #ff5252; font-weight: 700;">🏎️ Live Race / Stream:</span>';
      sources.forEach((s, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `btn ${idx === 0 ? 'btn-primary' : 'btn-secondary'} btn-sm`;
        btn.style.cssText = 'padding: 2px 7px; font-size: 0.72rem;';
        btn.textContent = s.server_name || `Server ${idx + 1}`;
        btn.onclick = () => {
          playerTabs.querySelectorAll('button').forEach(b => {
            b.className = 'btn btn-secondary btn-sm';
            b.style.cssText = 'padding: 2px 7px; font-size: 0.72rem;';
          });
          btn.className = 'btn btn-primary btn-sm';
          btn.style.cssText = 'padding: 2px 7px; font-size: 0.72rem;';
          embedFrame.src = s.stream_url;
        };
        playerTabs.appendChild(btn);
      });
    }
    embedBox.style.display = 'block';
    embedFrame.src = sources[0].stream_url;
  } else {
    embedBox.style.display = 'none';
  }
}

function openWatchModal(mediaId) {
  const item = currentMediaList.find(m => m.id === mediaId);
  if (!item) return;

  activeMediaItem = item;
  const modal = document.getElementById('watchModal');
  const modalHeader = document.getElementById('watchModalHeader');
  const modalTitle = document.getElementById('modalTitle');
  const modalBadges = document.getElementById('modalBadges');
  const modalMeta = document.getElementById('modalMeta');
  const modalDesc = document.getElementById('modalDesc');
  const serversList = document.getElementById('serversList');
  const sourceCount = document.getElementById('sourceCountSpan');
  const embedBox = document.getElementById('embedPlayerBox');
  const embedFrame = document.getElementById('embedFrame');
  const inlineForm = document.getElementById('inlineAddSourceForm');
  const playerTabs = document.getElementById('playerServerTabs');

  if (embedBox) embedBox.style.display = 'none';
  if (embedFrame) embedFrame.src = '';
  if (inlineForm) inlineForm.style.display = 'none';

  // Backdrop header image
  const bgImg = item.backdrop_url || item.poster_url || DEFAULT_POSTERS[item.media_type];
  modalHeader.style.backgroundImage = `url('${bgImg}')`;

  // Badges
  let typeBadgeClass = 'badge-movie';
  if (item.media_type === 'series') typeBadgeClass = 'badge-series';
  if (item.media_type === 'race') typeBadgeClass = 'badge-f1';

  modalBadges.innerHTML = `
    <span class="badge ${typeBadgeClass}">${item.media_type_display || item.media_type}</span>
    <span class="badge badge-quality">${item.quality || 'HD'}</span>
    <span class="badge badge-rating">★ ${item.rating || '8.5'}</span>
  `;

  modalTitle.textContent = item.title;
  modalMeta.textContent = `${item.category_or_sport || 'General'} • ${item.release_year || ''} • ${item.duration || ''}`;
  modalDesc.textContent = item.description || 'No description provided for this stream.';

  // Render sources
  renderModalSources(item);

  // Setup inline add server button
  const modalAddServerBtn = document.getElementById('modalAddServerBtn');
  if (modalAddServerBtn) {
    modalAddServerBtn.onclick = () => {
      inlineForm.style.display = inlineForm.style.display === 'none' ? 'block' : 'none';
    };
  }

  // Setup delete button
  const deleteBtn = document.getElementById('modalDeleteBtn');
  if (deleteBtn) {
    deleteBtn.onclick = () => deleteMediaItem(item.id);
  }

  // Launch In-Site Embedded Player
  setupEmbedPlayer(embedBox, embedFrame, playerTabs, item.tmdb_id, item.media_type, item.sources, item.title);

  modal.showModal();
}

function closePlayerBox() {
  const embedBox = document.getElementById('embedPlayerBox');
  const embedFrame = document.getElementById('embedFrame');
  if (embedBox) embedBox.style.display = 'none';
  if (embedFrame) embedFrame.src = '';
}

function closeWatchModal() {
  const modal = document.getElementById('watchModal');
  const embedFrame = document.getElementById('embedFrame');
  if (embedFrame) embedFrame.src = '';
  if (modal) modal.close();
}

function renderModalSources(item) {
  const serversList = document.getElementById('serversList');
  const sourceCount = document.getElementById('sourceCountSpan');
  serversList.innerHTML = '';

  const sources = item.sources || [];
  sourceCount.textContent = sources.length;

  if (sources.length === 0) {
    serversList.innerHTML = `
      <div style="text-align: center; padding: 1.5rem; color: var(--text-dim);">
        <p>No streaming links added yet for this title.</p>
        <button type="button" class="btn btn-secondary btn-sm" style="margin-top: 0.5rem;" onclick="document.getElementById('inlineAddSourceForm').style.display='block'">
          + Add Streaming Link
        </button>
      </div>
    `;
    return;
  }

  sources.forEach((src, idx) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'server-item';

    let providerTag = '';
    const sUrl = src.stream_url.toLowerCase();
    const sName = (src.server_name || '').toLowerCase();

    if (sUrl.includes('streameast') || sName.includes('streameast')) {
      providerTag = '<span class="badge badge-live" style="font-size:0.68rem;padding:2px 6px;">StreamEast</span>';
    } else if (sUrl.includes('flixto') || sName.includes('flixto')) {
      providerTag = '<span class="badge badge-movie" style="font-size:0.68rem;padding:2px 6px;">Flixto</span>';
    }

    itemEl.innerHTML = `
      <div class="server-info">
        <div class="server-name">
          <svg style="width:16px;height:16px;fill:var(--accent-cyan)" viewBox="0 0 24 24"><path d="M4 6.47v11.06c0 1.15 1.25 1.87 2.25 1.3l9.53-5.53c1-.58 1-2.02 0-2.6L6.25 5.17C5.25 4.6 4 5.32 4 6.47z"/></svg>
          <span>${src.server_name || `Server ${idx + 1}`}</span>
          ${providerTag}
          <span style="font-size: 0.72rem; background: rgba(0, 229, 255, 0.15); color: var(--accent-cyan); padding: 1px 6px; border-radius: 4px;">${src.quality_label || '1080p'}</span>
        </div>
        <div class="server-meta">
          ${src.notes ? `<span>${src.notes}</span> • ` : ''}
          <span style="font-family: monospace; color: var(--text-dim);">${truncateUrl(src.stream_url)}</span>
        </div>
      </div>
      <div class="server-actions">
        <button type="button" class="btn btn-secondary btn-sm" onclick="toggleEmbedPreview('${encodeURIComponent(src.stream_url)}')">
          📺 Embed Preview
        </button>
        <a href="${src.stream_url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
          <span>Open Stream Site</span>
          <svg style="width:14px;height:14px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
        </a>
      </div>
    `;
    serversList.appendChild(itemEl);
  });
}

function truncateUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname + (parsed.pathname.length > 25 ? parsed.pathname.substring(0, 25) + '...' : parsed.pathname);
  } catch (e) {
    return url.length > 30 ? url.substring(0, 30) + '...' : url;
  }
}

function toggleEmbedPreview(encodedUrl) {
  const url = decodeURIComponent(encodedUrl);
  const embedBox = document.getElementById('embedPlayerBox');
  const embedFrame = document.getElementById('embedFrame');
  if (!embedBox || !embedFrame) return;

  if (embedBox.style.display === 'block' && embedFrame.src === url) {
    embedBox.style.display = 'none';
    embedFrame.src = '';
  } else {
    embedBox.style.display = 'block';
    embedFrame.src = url;
    embedBox.scrollIntoView({ behavior: 'smooth' });
    showToast('Loading embed preview... (Click "Open Stream Site" if blocked by external site frame policy)');
  }
}

// Fetch & render media
async function loadMedia() {
  const grid = document.getElementById('mediaGrid');
  const emptyState = document.getElementById('emptyState');
  if (!grid) return;

  let url = `/api/media/?type=${currentFilterType}`;
  if (currentFilterCategory && currentFilterCategory !== 'all') {
    url += `&category=${encodeURIComponent(currentFilterCategory)}`;
  }
  if (currentSearchTerm) {
    url += `&q=${encodeURIComponent(currentSearchTerm)}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    currentMediaList = data;

    renderHero(data);
    renderGrid(data);

    if (data.length === 0) {
      grid.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
    } else {
      grid.style.display = 'grid';
      if (emptyState) emptyState.style.display = 'none';
    }
  } catch (err) {
    console.error('Failed to load media:', err);
    showToast('Failed to load media items', 'error');
  }
}

// Render Hero Billboard
function renderHero(items) {
  const hero = document.getElementById('heroSection');
  if (!hero || items.length === 0) {
    if (hero) hero.style.display = 'none';
    return;
  }

  const featured = items.find(i => i.featured) || items[0];
  hero.style.display = 'flex';

  const heroBg = featured.backdrop_url || featured.poster_url || DEFAULT_POSTERS[featured.media_type];
  hero.style.backgroundImage = `url('${heroBg}')`;

  const typeBadge = document.getElementById('heroTypeBadge');
  const qualityBadge = document.getElementById('heroQualityBadge');
  const ratingBadge = document.getElementById('heroRatingBadge');
  const titleEl = document.getElementById('heroTitle');
  const metaEl = document.getElementById('heroMeta');
  const descEl = document.getElementById('heroDesc');
  const watchBtn = document.getElementById('heroWatchBtn');
  const sourcesBtn = document.getElementById('heroSourcesBtn');

  let typeBadgeClass = 'badge-movie';
  if (featured.media_type === 'series') typeBadgeClass = 'badge-series';
  if (featured.media_type === 'race') typeBadgeClass = 'badge-f1';

  typeBadge.className = `badge ${typeBadgeClass}`;
  typeBadge.textContent = featured.media_type_display || featured.media_type;

  qualityBadge.textContent = featured.quality || '1080p FHD';
  ratingBadge.textContent = `★ ${featured.rating || '9.0'}`;

  titleEl.textContent = featured.title;
  metaEl.innerHTML = `
    <span>${featured.category_or_sport || ''}</span>
    <span>•</span>
    <span>${featured.release_year || '2026'}</span>
    <span>•</span>
    <span>${featured.duration || ''}</span>
  `;
  descEl.textContent = featured.description || 'Watch now with high-speed streaming server links.';

  watchBtn.onclick = () => {
    openWatchModal(featured.id);
  };

  sourcesBtn.onclick = () => openWatchModal(featured.id);
}

// Render Grid Cards
function renderGrid(items) {
  const grid = document.getElementById('mediaGrid');
  if (!grid) return;
  grid.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('article');
    card.className = 'media-card';
    card.setAttribute('tabindex', '0');
    card.onclick = () => openWatchModal(item.id);
    card.onkeydown = (e) => {
      if (e.key === 'Enter') openWatchModal(item.id);
    };

    const poster = item.poster_url || DEFAULT_POSTERS[item.media_type] || DEFAULT_POSTERS.movie;

    let typeBadgeClass = 'badge-movie';
    if (item.media_type === 'series') typeBadgeClass = 'badge-series';
    if (item.media_type === 'race') typeBadgeClass = 'badge-f1';

    const sourceCount = (item.sources || []).length;

    // Detect site provider
    let siteBadge = '';
    if (item.sources && item.sources.length > 0) {
      const url0 = item.sources[0].stream_url.toLowerCase();
      if (url0.includes('net77') || url0.includes('netmirror')) {
        siteBadge = '<span style="font-size:0.7rem;color:#ff5252;background:rgba(229,9,20,0.2);padding:1px 6px;border-radius:3px;">NetMirror</span>';
      } else if (url0.includes('streameast')) {
        siteBadge = '<span style="font-size:0.7rem;color:#ff5252;background:rgba(225,6,0,0.2);padding:1px 6px;border-radius:3px;">StreamEast</span>';
      } else if (url0.includes('flixto')) {
        siteBadge = '<span style="font-size:0.7rem;color:#00e5ff;background:rgba(0,229,255,0.2);padding:1px 6px;border-radius:3px;">Flixto</span>';
      }
    }

    card.innerHTML = `
      <div class="poster-wrapper">
        <img src="${poster}" alt="${item.title}" class="poster-img" loading="lazy" onerror="this.src='${DEFAULT_POSTERS[item.media_type]}'">
        <div class="card-top-badges">
          <span class="badge ${typeBadgeClass}">${item.media_type_display || item.media_type}</span>
          <span class="badge badge-quality">${item.quality || 'HD'}</span>
        </div>
        <div class="poster-overlay">
          <div class="play-hover-btn">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <span style="font-size: 0.82rem; color: #fff; text-align: center; font-weight: 700;">▶ Stream In-Site</span>
        </div>
      </div>
      <div class="card-info">
        <h3 class="card-title" title="${item.title}">${item.title}</h3>
        <p class="card-genre">${item.category_or_sport || 'General'}</p>
        <div class="card-footer">
          <span class="badge badge-rating" style="padding: 1px 6px;">★ ${item.rating || '8.5'}</span>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            ${siteBadge}
            <button type="button" class="btn btn-primary btn-sm" style="padding: 2px 8px; font-size: 0.72rem; font-weight: 700;" onclick="event.stopPropagation(); openWatchModal(${item.id})">
              ▶ Stream
            </button>
          </div>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Category tabs & search
function initTabs() {
  const tabs = document.querySelectorAll('.type-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentFilterType = tab.getAttribute('data-type');
      loadMedia();
    });
  });
}

function initSearch() {
  const searchInput = document.getElementById('globalSearchInput');
  if (!searchInput) return;

  let timeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      currentSearchTerm = e.target.value.trim();
      const globalBox = document.getElementById('globalSearchResults');
      const hero = document.getElementById('heroSection');
      const status = document.getElementById('filterStatus');

      if (currentSearchTerm.length >= 2) {
        executeGlobalSearch(currentSearchTerm);
      } else {
        if (globalBox) {
          globalBox.style.display = 'none';
          globalBox.innerHTML = '';
        }
        if (status) status.style.display = 'none';
        if (hero) hero.style.display = 'flex';
        loadMedia();
      }
    }, 350);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function executeGlobalSearch(query) {
  const globalBox = document.getElementById('globalSearchResults');
  const mediaGrid = document.getElementById('mediaGrid');
  const emptyState = document.getElementById('emptyState');
  const heroSection = document.getElementById('heroSection');
  const filterStatus = document.getElementById('filterStatus');

  if (!globalBox) return;

  if (heroSection) heroSection.style.display = 'none';
  if (mediaGrid) mediaGrid.style.display = 'none';
  if (emptyState) emptyState.style.display = 'none';
  if (filterStatus) {
    filterStatus.style.display = 'block';
    filterStatus.innerHTML = `Multi-site search for "<strong>${escapeHtml(query)}</strong>" across <em>38+ Streaming Domains</em>, <em>Your Hub</em>, <em>Flixto</em>, <em>StreamEast</em> &amp; <em>TMDb</em>`;
  }

  globalBox.style.display = 'block';
  globalBox.innerHTML = `
    <div style="text-align: center; padding: 3rem 1rem; color: var(--text-dim);">
      <div style="width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--accent-cyan); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem;"></div>
      <div style="font-weight: 600; color: #fff; margin-bottom: 0.35rem;">Scanning 38+ connected streaming domains live...</div>
      <span style="font-size: 0.85rem; color: var(--text-muted);">Querying Bollyflix, Uhdmovies, Hindmoviez, MovieRulz, 4kHdHub, Hdmovie2, Dudefilms, M4ulinks, StreamEast, Flixto &amp; more simultaneously</span>
    </div>
  `;

  try {
    const res = await fetch(`/api/search/global/?q=${encodeURIComponent(query)}&type=${currentFilterType}`);
    const data = await res.json();
    renderGlobalSearchResults(data);
  } catch (err) {
    console.error('Global search error:', err);
    globalBox.innerHTML = '<div style="color: var(--accent-red); padding: 1.5rem;">Search failed across providers. Check network connection.</div>';
  }
}

// Global filter function for live scraped sites
window.filterLiveSitesByDomain = function(siteName) {
  const chips = document.querySelectorAll('.live-site-chip');
  chips.forEach(c => {
    if (c.getAttribute('data-site') === siteName) {
      c.classList.add('active');
    } else {
      c.classList.remove('active');
    }
  });

  const grid = document.getElementById('searchLiveSitesGrid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.media-card');
  cards.forEach(card => {
    const cardSite = card.getAttribute('data-site');
    if (siteName === 'all' || cardSite === siteName) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
};

function renderGlobalSearchResults(data) {
  const globalBox = document.getElementById('globalSearchResults');
  if (!globalBox) return;

  const totalLocal = (data.local_results || []).length;
  const totalLiveSites = (data.live_site_results || []).length;
  const totalTmdb = (data.tmdb_results || []).length;
  const totalLive = (data.live_sports || []).length;
  const stats = data.crawl_stats || {};
  const searchedCount = stats.searched_count || 38;
  const matchedSites = stats.matched_sites || [];
  const siteCounts = stats.site_counts || {};
  const elapsedSec = stats.elapsed_seconds || 3.5;
  const qEsc = escapeHtml(data.query);

  if (totalLocal === 0 && totalLiveSites === 0 && totalTmdb === 0 && totalLive === 0) {
    globalBox.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 2.5rem; text-align: center; margin-bottom: 2rem;">
        <h3 style="color: #fff; margin-bottom: 0.5rem;">No exact titles found for "${qEsc}"</h3>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Scanned ${searchedCount} streaming providers. You can try searching directly on our connected portals:</p>
        <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
          <a href="http://flixto.watch/search?q=${encodeURIComponent(data.query)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
            🍿 Search on Flixto ↗
          </a>
          <a href="https://streameasto.cx/?s=${encodeURIComponent(data.query)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
            🏎️ Search on StreamEast ↗
          </a>
          <button type="button" class="btn btn-primary" onclick="openAddStreamModal()">
            + Add Manual Stream
          </button>
        </div>
      </div>
    `;
    return;
  }

  let html = `
    <!-- Top Multi-Site Jump Bar -->
    <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.85rem 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 2rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
        <span style="font-size: 0.88rem; color: #fff; font-weight: 600;">Multi-Domain Live Search:</span>
        <span style="font-size: 0.8rem; color: var(--text-dim);">(Scanned ${searchedCount} domains in ${elapsedSec}s • Found ${totalLiveSites} direct links across ${matchedSites.length} sites, ${totalLocal} in Hub, ${totalTmdb} Web Titles, ${totalLive} Sports)</span>
      </div>
      <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; max-height: 80px; overflow-y: auto;" id="multiProviderButtonsBar">
        ${(data.provider_search_links || []).map(p => `
          <a href="${p.search_url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="border-color: ${p.color}55; color: ${p.color}; font-size: 0.75rem; padding: 2px 7px;">
            <span>${p.name} ↗</span>
          </a>
        `).join('')}
      </div>
    </div>
  `;

  // 1. Local Database Results
  if (totalLocal > 0) {
    html += `
      <div style="margin-bottom: 2.5rem;">
        <h3 style="color: #fff; font-size: 1.2rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span style="color: var(--accent-red);">📁</span> Saved in Your Hub (${totalLocal})
        </h3>
        <div class="media-grid" id="searchLocalGrid">
          <!-- Populated below -->
        </div>
      </div>
    `;
  }

  // 2. Live Scraped Results from Domain Network (Concurrently queried across all verified active domains)
  if (totalLiveSites > 0) {
    html += `
      <div style="margin-bottom: 2.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.4rem;">
          <h3 style="color: #fff; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem; margin: 0;">
            <span style="color: #10b981;">⚡</span> Live Results Scraped Directly Across All Streaming Domains (${totalLiveSites})
          </h3>
          <span style="font-size: 0.8rem; color: #10b981; font-weight: 600; background: rgba(16,185,129,0.12); padding: 3px 8px; border-radius: 12px; border: 1px solid rgba(16,185,129,0.3);">
            ✓ ${searchedCount} Domains Scanned in ${elapsedSec}s
          </span>
        </div>
        <p style="color: var(--text-dim); font-size: 0.85rem; margin-bottom: 0.85rem;">
          Direct movie &amp; series pages found live on: <strong>${matchedSites.join(', ')}</strong>
        </p>

        <!-- Dynamic Domain Filter Chips -->
        <div class="live-sites-filter-bar">
          <button type="button" class="live-site-chip active" data-site="all" onclick="filterLiveSitesByDomain('all')">
            🌐 All Sites (${totalLiveSites})
          </button>
          ${matchedSites.map(s => `
            <button type="button" class="live-site-chip" data-site="${escapeHtml(s)}" onclick="filterLiveSitesByDomain('${escapeHtml(s)}')">
              ${escapeHtml(s)} <span style="opacity: 0.7; font-size: 0.75rem;">(${siteCounts[s] || 0})</span>
            </button>
          `).join('')}
        </div>

        <div class="media-grid" id="searchLiveSitesGrid">
          <!-- Populated below -->
        </div>
      </div>
    `;
  }

  // 3. StreamEast Live Sports & Races
  if (totalLive > 0) {
    html += `
      <div style="margin-bottom: 2.5rem;">
        <h3 style="color: #fff; font-size: 1.2rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span style="color: #ff5252;">🏎️</span> Live Sports &amp; Races on StreamEast (${totalLive})
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
    `;
    data.live_sports.forEach(evt => {
      html += `
        <div style="background: var(--bg-card); border: 1px solid rgba(225,6,0,0.3); border-radius: var(--radius-sm); padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
              <span class="badge ${evt.is_live ? 'badge-live' : 'badge-quality'}">${evt.is_live ? 'LIVE NOW' : 'STREAM'}</span>
              <span style="font-size: 0.75rem; color: #ff5252; font-weight: 600;">StreamEast</span>
            </div>
            <h4 style="color: #fff; font-size: 0.95rem; line-height: 1.3;">${escapeHtml(evt.title)}</h4>
            <span style="font-size: 0.78rem; color: var(--text-dim);">${escapeHtml(evt.category)}</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <a href="${evt.stream_url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="flex: 1; background: linear-gradient(135deg, #e10600, #ff2a54);">
              Watch on StreamEast ↗
            </a>
            <button type="button" class="btn btn-secondary btn-sm" onclick="quickBookmarkLive('${escapeHtml(evt.title)}', '${escapeHtml(evt.stream_url)}', '${escapeHtml(evt.category)}')">
              + Bookmark
            </button>
          </div>
        </div>
      `;
    });
    html += `
        </div>
      </div>
    `;
  }

  // 4. Web Streaming Results (TMDb Catalog with direct stream embed)
  if (totalTmdb > 0) {
    html += `
      <div style="margin-bottom: 2.5rem;">
        <h3 style="color: #fff; font-size: 1.2rem; margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.5rem;">
          <span style="color: var(--accent-cyan);">🌐</span> In-Site Direct Streaming Players (${totalTmdb})
        </h3>
        <p style="color: var(--text-dim); font-size: 0.85rem; margin-bottom: 1.25rem;">
          Stream directly in our in-site video player or add to your hub:
        </p>
        <div class="media-grid" id="searchTmdbGrid">
          <!-- Populated below -->
        </div>
      </div>
    `;
  }

  globalBox.innerHTML = html;

  // Render Local Cards if any
  if (totalLocal > 0) {
    const localGrid = document.getElementById('searchLocalGrid');
    if (localGrid) {
      data.local_results.forEach(item => {
        const card = document.createElement('article');
        card.className = 'media-card';
        card.onclick = () => openWatchModal(item.id);
        const poster = item.poster_url || DEFAULT_POSTERS[item.media_type] || DEFAULT_POSTERS.movie;

        card.innerHTML = `
          <div class="poster-wrapper">
            <img src="${poster}" alt="" class="poster-img" loading="lazy" onerror="this.src='${DEFAULT_POSTERS[item.media_type]}'">
            <div class="card-top-badges">
              <span class="badge ${item.media_type === 'race' ? 'badge-f1' : (item.media_type === 'series' ? 'badge-series' : 'badge-movie')}">${item.media_type_display || item.media_type}</span>
              <span class="badge badge-quality">${item.quality || '1080p'}</span>
            </div>
            <div class="poster-overlay">
              <div class="play-hover-btn"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
              <span style="font-size: 0.8rem; color: #fff; text-align: center;">Click to Watch</span>
            </div>
          </div>
          <div class="card-info">
            <h3 class="card-title">${escapeHtml(item.title)}</h3>
            <p class="card-genre">${escapeHtml(item.category_or_sport || 'General')}</p>
            <div class="card-footer">
              <span class="badge badge-rating">★ ${item.rating || '8.5'}</span>
              <span style="font-size: 0.75rem; color: var(--accent-cyan);">${item.sources_count} stream link(s)</span>
            </div>
          </div>
        `;
        localGrid.appendChild(card);
      });
    }
  }

  // Render Live Sites Scraped Results
  if (totalLiveSites > 0) {
    const liveSitesGrid = document.getElementById('searchLiveSitesGrid');
    if (liveSitesGrid) {
      data.live_site_results.forEach(item => {
        const card = document.createElement('article');
        card.className = 'media-card';
        card.setAttribute('data-site', item.site_name);
        const poster = item.poster_url || DEFAULT_POSTERS.movie;

        card.onclick = () => streamLiveTitleInSite(item.title, item.site_name, item.page_url);

        card.innerHTML = `
          <div class="poster-wrapper">
            <img src="${poster}" alt="" class="poster-img" loading="lazy" onerror="this.src='${DEFAULT_POSTERS.movie}'">
            <div class="card-top-badges">
              <span class="badge" style="background: ${item.badge_color || '#ff2a54'}22; color: ${item.badge_color || '#ff2a54'}; border: 1px solid ${item.badge_color || '#ff2a54'}55;">
                ${escapeHtml(item.site_name)}
              </span>
              <span class="badge badge-quality">LIVE</span>
            </div>
            <div class="poster-overlay">
              <div class="play-hover-btn"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
              <span style="font-size: 0.8rem; color: #fff; text-align: center; font-weight: 700;">▶ Stream In-Site</span>
            </div>
          </div>
          <div class="card-info">
            <h3 class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
            <p class="card-genre" style="color: ${item.badge_color || '#ff2a54'}; font-weight: 600;">Found on ${escapeHtml(item.site_name)}</p>
            <div style="margin-top: auto; display: flex; flex-direction: column; gap: 0.4rem; padding-top: 0.5rem;">
              <button type="button" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #00b4d8, #0077b6); font-weight: 700;" onclick="event.stopPropagation(); streamLiveTitleInSite('${escapeHtml(item.title)}', '${escapeHtml(item.site_name)}', '${escapeHtml(item.page_url)}')">
                ▶ Stream In-Site
              </button>
              <div style="display: flex; gap: 0.35rem;">
                <a href="${item.page_url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="flex: 1; border-color: ${item.badge_color || '#ff2a54'}55; color: ${item.badge_color || '#ff2a54'}; font-size: 0.72rem; padding: 2px 4px; text-align: center;">
                  ↗ ${escapeHtml(item.site_name)}
                </a>
                <button type="button" class="btn btn-secondary btn-sm" style="flex: 1; font-size: 0.72rem; padding: 2px 4px;" onclick="event.stopPropagation(); quickBookmarkFromLiveSite('${escapeHtml(item.site_name)}', '${escapeHtml(item.title)}', '${escapeHtml(item.page_url)}', '${escapeHtml(item.poster_url)}')">
                  + Save Hub
                </button>
              </div>
            </div>
          </div>
        `;
        liveSitesGrid.appendChild(card);
      });
    }
  }

  // Render TMDb / Multi-Provider Cards
  if (totalTmdb > 0) {
    const tmdbGrid = document.getElementById('searchTmdbGrid');
    if (tmdbGrid) {
      data.tmdb_results.forEach(item => {
        const card = document.createElement('article');
        card.className = 'media-card';
        const poster = item.poster_url || DEFAULT_POSTERS[item.media_type] || DEFAULT_POSTERS.movie;

        card.innerHTML = `
          <div class="poster-wrapper">
            <img src="${poster}" alt="" class="poster-img" loading="lazy" onerror="this.src='${DEFAULT_POSTERS[item.media_type]}'">
            <div class="card-top-badges">
              <span class="badge ${item.media_type === 'series' ? 'badge-series' : 'badge-movie'}">${item.media_type === 'series' ? 'TV Series' : 'Movie'}</span>
              ${item.rating ? `<span class="badge badge-rating">★ ${item.rating}</span>` : ''}
            </div>
            <div class="poster-overlay">
              <div class="play-hover-btn"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
              <span style="font-size: 0.8rem; color: #fff; text-align: center;">Stream Now (In-Site)</span>
            </div>
          </div>
          <div class="card-info">
            <h3 class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
            <p class="card-genre">${item.release_year || 'Web Title'}</p>
            <div style="margin-top: auto; display: flex; flex-direction: column; gap: 0.4rem; padding-top: 0.5rem;">
              <button type="button" class="btn btn-primary btn-sm" onclick="streamTmdbItemDirectly(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                ▶ Stream In-Site
              </button>
              <div style="display: flex; gap: 0.35rem;">
                <button type="button" class="btn btn-secondary btn-sm" style="flex: 1; font-size: 0.75rem; padding: 2px 4px;" onclick="quickSaveTmdbToHub(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                  ${item.is_saved_locally ? '✓ In Hub' : '+ Add to Hub'}
                </button>
                <a href="${item.flixto_url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 2px 6px;" title="Search on Flixto">
                  Flixto ↗
                </a>
              </div>
            </div>
          </div>
        `;
        tmdbGrid.appendChild(card);
      });
    }
  }
}

async function quickBookmarkFromLiveSite(siteName, title, pageUrl, posterUrl) {
  try {
    showToast(`Saving "${title}" to your hub...`);
    const isSeries = title.toLowerCase().includes('season') || title.toLowerCase().includes('series') || title.toLowerCase().includes('ep ');
    const payload = {
      title,
      media_type: isSeries ? 'series' : 'movie',
      category_or_sport: 'Movies & Series',
      release_year: 2024,
      quality: '1080p FHD',
      poster_url: posterUrl || '',
      rating: 8.8,
      description: `Stream found on ${siteName}: ${title}`,
      sources: [
        {
          server_name: `${siteName} Source`,
          stream_url: pageUrl,
          quality_label: '1080p FHD',
          language: 'Dual Audio / English',
          notes: `Stream on ${siteName}`
        }
      ]
    };

    const res = await fetch('/api/media/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast(`✓ Saved "${title}" to your library!`, 'success');
      loadStats();
    } else {
      throw new Error('Save failed');
    }
  } catch (e) {
    showToast('Failed to save to hub', 'error');
  }
}

// 1-Click Stream Now for any title found on the web without needing to add it first!
function streamTmdbItemDirectly(item) {
  const modal = document.getElementById('watchModal');
  const modalHeader = document.getElementById('watchModalHeader');
  const modalTitle = document.getElementById('modalTitle');
  const modalBadges = document.getElementById('modalBadges');
  const modalMeta = document.getElementById('modalMeta');
  const modalDesc = document.getElementById('modalDesc');
  const serversList = document.getElementById('serversList');
  const sourceCount = document.getElementById('sourceCountSpan');
  const embedBox = document.getElementById('embedPlayerBox');
  const embedFrame = document.getElementById('embedFrame');
  const inlineForm = document.getElementById('inlineAddSourceForm');
  const playerTabs = document.getElementById('playerServerTabs');

  if (inlineForm) inlineForm.style.display = 'none';

  const bgImg = item.backdrop_url || item.poster_url || DEFAULT_POSTERS[item.media_type];
  modalHeader.style.backgroundImage = `url('${bgImg}')`;

  modalBadges.innerHTML = `
    <span class="badge ${item.media_type === 'series' ? 'badge-series' : 'badge-movie'}">${item.media_type === 'series' ? 'TV Series' : 'Movie'}</span>
    <span class="badge badge-quality">1080p FHD</span>
    ${item.rating ? `<span class="badge badge-rating">★ ${item.rating}</span>` : ''}
  `;

  modalTitle.textContent = item.title;
  modalMeta.textContent = `${item.media_type === 'series' ? 'TV Series' : 'Movie'} • ${item.release_year || 'Latest'}`;
  modalDesc.textContent = item.overview || 'Streaming via direct embedded web player.';

  // Launch In-Site Embedded Player with all servers
  setupEmbedPlayer(embedBox, embedFrame, playerTabs, item.tmdb_id, item.media_type, null, item.title);

  // External Links (NetMirror, Flixto)
  const qTitle = encodeURIComponent(item.title);
  serversList.innerHTML = `
    <div class="server-item">
      <div class="server-info">
        <div class="server-name">
          <span>NetMirror OTT Portal</span>
          <span class="badge" style="background:rgba(229,9,20,0.2);color:#ff5252;font-size:0.68rem;padding:2px 6px;">NetMirror</span>
        </div>
        <div class="server-meta">Search on NetMirror library (net77.cc)</div>
      </div>
      <div class="server-actions">
        <a href="https://net77.cc/home" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="background:#e50914;">
          <span>Open NetMirror ↗</span>
        </a>
      </div>
    </div>
    <div class="server-item">
      <div class="server-info">
        <div class="server-name">
          <span>Flixto Streaming Portal</span>
          <span class="badge badge-movie" style="font-size:0.68rem;padding:2px 6px;">Flixto</span>
        </div>
        <div class="server-meta">Search &amp; watch this title directly on Flixto</div>
      </div>
      <div class="server-actions">
        <a href="${item.flixto_url || `http://flixto.watch/search?q=${qTitle}`}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
          <span>Open on Flixto ↗</span>
        </a>
      </div>
    </div>
  `;
  sourceCount.textContent = '6 In-Site Players + 2 External Mirrors';

  // Hide delete button for on-the-fly preview
  const deleteBtn = document.getElementById('modalDeleteBtn');
  if (deleteBtn) deleteBtn.style.display = 'none';

  modal.showModal();
}

// Global function: Stream ANY title found from live site crawlers directly in-site
window.streamLiveTitleInSite = async function(rawTitle, siteName, fallbackUrl) {
  showToast(`Resolving in-site player for "${rawTitle}"...`);

  // Clean title by stripping resolution, tags, audio info, year
  let cleanTitle = rawTitle
    .replace(/\b(19\d\d|20\d\d)\b/g, '')
    .replace(/\b(480p|720p|1080p|2160p|4k|uhd|bluray|web-dl|hevc|x264|10bit|dual\s+audio|hindi|org|esub|complete|season\s*\d+|ep\s*\d+)\b/gi, '')
    .replace(/[\(\)\[\]\{\}\-\–\—\:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  try {
    const res = await fetch(`/api/tmdb/search/?q=${encodeURIComponent(cleanTitle || rawTitle)}`);
    const data = await res.json();
    if (data && data.length > 0) {
      const match = data[0];
      match.title = rawTitle; // preserve user title
      streamTmdbItemDirectly(match);
      showToast(`▶ Now streaming in cinema player!`, 'success');
      return;
    }
  } catch (err) {
    console.warn('TMDb resolution error:', err);
  }

  // If not matched via TMDb, open fallback URL
  if (fallbackUrl) {
    window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
  }
};

// 1-Click Quick Add to Hub from Search Results
async function quickSaveTmdbToHub(item) {
  try {
    showToast(`Adding "${item.title}" to your hub...`);
    // Fetch full details
    const detRes = await fetch(`/api/tmdb/details/?id=${item.tmdb_id}&type=${item.media_type}`);
    const details = await detRes.json();

    const payload = {
      title: details.title || item.title,
      tmdb_id: details.tmdb_id || item.tmdb_id,
      media_type: details.media_type || item.media_type,
      category_or_sport: details.category_or_sport || 'General',
      release_year: details.release_year || item.release_year,
      duration: details.duration || '',
      quality: '1080p FHD',
      poster_url: details.poster_url || item.poster_url,
      backdrop_url: details.backdrop_url || item.backdrop_url,
      rating: details.rating || item.rating || 8.5,
      description: details.description || item.overview || '',
      sources: [
        {
          server_name: 'Flixto Stream',
          stream_url: `http://flixto.watch/search?q=${encodeURIComponent(details.title || item.title)}`,
          quality_label: '1080p FHD',
          language: 'English',
          notes: 'Stream on Flixto'
        }
      ]
    };

    const res = await fetch('/api/media/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast(`✓ Added "${item.title}" to your library!`, 'success');
      loadStats();
    } else {
      throw new Error('Save failed');
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to add title to hub', 'error');
  }
}

// 1-Click Quick Bookmark Live Sports
async function quickBookmarkLive(title, streamUrl, category) {
  try {
    showToast(`Bookmarking "${title}"...`);
    const payload = {
      title,
      media_type: 'race',
      category_or_sport: category || 'Motorsport / Race',
      release_year: 2026,
      duration: 'Live Session',
      quality: '1080p 60FPS',
      rating: 9.0,
      description: `Live streaming broadcast on StreamEast: ${title}`,
      sources: [
        {
          server_name: 'StreamEast Live',
          stream_url: streamUrl,
          quality_label: '1080p 60fps',
          language: 'English',
          notes: 'Live Stream'
        }
      ]
    };

    const res = await fetch('/api/media/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast(`✓ Bookmarked "${title}" from StreamEast!`, 'success');
      loadStats();
    }
  } catch (e) {
    showToast('Failed to bookmark', 'error');
  }
}

// Stats & Category chips
async function loadStats() {
  try {
    const res = await fetch('/api/stats/');
    const data = await res.json();

    const countAll = document.getElementById('countAll');
    const countMovies = document.getElementById('countMovies');
    const countSeries = document.getElementById('countSeries');
    const countRaces = document.getElementById('countRaces');

    if (countAll) countAll.textContent = data.total;
    if (countMovies) countMovies.textContent = data.movies;
    if (countSeries) countSeries.textContent = data.series;
    if (countRaces) countRaces.textContent = data.races;

    const chipsBar = document.getElementById('genreChipsBar');
    if (chipsBar && data.available_categories) {
      chipsBar.innerHTML = '<button class="genre-chip active" data-cat="all">All Genres</button>';
      data.available_categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'genre-chip';
        btn.setAttribute('data-cat', cat);
        btn.textContent = cat;
        btn.onclick = () => {
          document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
          btn.classList.add('active');
          currentFilterCategory = cat;
          loadMedia();
        };
        chipsBar.appendChild(btn);
      });

      const allBtn = chipsBar.querySelector('[data-cat="all"]');
      if (allBtn) {
        allBtn.onclick = () => {
          document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
          allBtn.classList.add('active');
          currentFilterCategory = 'all';
          loadMedia();
        };
      }
    }

    if (data.providers) {
      populateProviderDropdowns(data.providers);
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function populateProviderDropdowns(providers) {
  const select = document.getElementById('modalProviderSelect');
  if (select && providers && providers.length > 0) {
    select.innerHTML = '<option value="">-- Choose From 30+ Verified Streaming Sites --</option>';
    providers.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.url;
      opt.setAttribute('data-name', p.name);
      opt.setAttribute('data-category', p.category);
      opt.textContent = `${p.name} (${p.url})`;
      select.appendChild(opt);
    });
    select.onchange = () => {
      const selected = select.options[select.selectedIndex];
      if (select.value) {
        const sName = selected.getAttribute('data-name');
        const sCat = selected.getAttribute('data-category');
        const serverInput = document.querySelector('#sourcesContainer .src-server');
        const urlInput = document.querySelector('#sourcesContainer .src-url');
        const typeSelect = document.getElementById('addMediaType');
        if (serverInput) serverInput.value = `${sName} Stream`;
        if (urlInput) urlInput.value = select.value;
        if (typeSelect && sCat === 'sports') typeSelect.value = 'race';
        showToast(`Selected ${sName} as streaming provider`);
      }
    };
  }
}

// Add Stream Modal & Form
function initAddStreamModal() {
  const openBtn = document.getElementById('openAddStreamBtn');
  if (openBtn) {
    openBtn.addEventListener('click', openAddStreamModal);
  }

  const addMoreBtn = document.getElementById('addMoreSourceBtn');
  const container = document.getElementById('sourcesContainer');
  if (addMoreBtn && container) {
    addMoreBtn.addEventListener('click', () => {
      const idx = container.querySelectorAll('.source-row').length + 1;
      const row = document.createElement('div');
      row.className = 'source-row';
      row.style.cssText = 'display: grid; grid-template-columns: 160px 1fr auto; gap: 0.6rem; margin-bottom: 0.6rem;';
      row.innerHTML = `
        <input type="text" class="form-control src-server" placeholder="Server Name" value="Mirror ${idx}">
        <input type="url" class="form-control src-url" placeholder="Paste website stream URL here" required>
        <button type="button" class="btn btn-danger btn-sm remove-src-btn">✕</button>
      `;
      row.querySelector('.remove-src-btn').onclick = () => row.remove();
      container.appendChild(row);
    });
  }

  const addForm = document.getElementById('addStreamForm');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('addTitle').value.trim();
      const tmdbIdEl = document.getElementById('addTmdbId');
      const tmdb_id = tmdbIdEl && tmdbIdEl.value ? parseInt(tmdbIdEl.value) : null;
      const media_type = document.getElementById('addMediaType').value;
      const category_or_sport = document.getElementById('addCategory').value.trim();
      const release_year = parseInt(document.getElementById('addYear').value) || null;
      const quality = document.getElementById('addQuality').value;
      const poster_url = document.getElementById('addPoster').value.trim();
      const duration = document.getElementById('addDuration').value.trim();
      const description = document.getElementById('addDescription').value.trim();

      // Collect sources
      const sourceRows = container.querySelectorAll('.source-row');
      const sources = [];
      sourceRows.forEach(row => {
        const sName = row.querySelector('.src-server').value.trim() || 'Server 1';
        const sUrl = row.querySelector('.src-url').value.trim();
        if (sUrl) {
          sources.push({
            server_name: sName,
            stream_url: sUrl,
            quality_label: quality,
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
        quality,
        poster_url,
        duration,
        description,
        sources
      };

      try {
        const submitBtn = document.getElementById('saveStreamSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const res = await fetch('/api/media/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(JSON.stringify(errData));
        }

        showToast(`Successfully added "${title}"!`, 'success');
        addForm.reset();
        closeAddStreamModal();
        loadStats();
        loadMedia();
      } catch (err) {
        console.error(err);
        showToast('Error saving stream. Check fields and URL format.', 'error');
      } finally {
        const submitBtn = document.getElementById('saveStreamSubmitBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save & Add to Hub';
      }
    });
  }

  // Inline Add Source Form inside Watch Modal
  const inlineForm = document.getElementById('inlineAddSourceForm');
  if (inlineForm) {
    inlineForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeMediaItem) return;

      const server_name = document.getElementById('inlineServerName').value.trim();
      const stream_url = document.getElementById('inlineStreamUrl').value.trim();
      const quality_label = document.getElementById('inlineQuality').value.trim();

      try {
        const res = await fetch(`/api/media/${activeMediaItem.id}/add-source/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            server_name,
            stream_url,
            quality_label
          })
        });

        if (!res.ok) throw new Error('Failed to add source');

        const updatedItem = await res.json();
        activeMediaItem = updatedItem;
        renderModalSources(updatedItem);

        const idx = currentMediaList.findIndex(m => m.id === updatedItem.id);
        if (idx !== -1) currentMediaList[idx] = updatedItem;
        renderGrid(currentMediaList);

        showToast('New stream source link added!', 'success');
        inlineForm.reset();
        inlineForm.style.display = 'none';
        loadStats();
      } catch (err) {
        showToast('Failed to add source link', 'error');
      }
    });
  }
}

// Delete media item
async function deleteMediaItem(mediaId) {
  if (!confirm('Are you sure you want to delete this stream from your hub?')) {
    return;
  }

  try {
    const res = await fetch(`/api/media/${mediaId}/`, {
      method: 'DELETE'
    });

    if (res.ok) {
      showToast('Stream removed from hub', 'success');
      closeWatchModal();
      loadStats();
      loadMedia();
    } else {
      throw new Error('Failed to delete');
    }
  } catch (err) {
    showToast('Failed to delete stream', 'error');
  }
}

// TMDb Autocomplete for Quick Add Modal
function initTmdbModalAutocomplete() {
  const input = document.getElementById('addTitle');
  const dropdown = document.getElementById('addTitleSuggestions');
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
      fetchTmdbSuggestions(q, dropdown, fillModalFromTmdb);
    }, 350);
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

function searchTmdbModal() {
  const input = document.getElementById('addTitle');
  const dropdown = document.getElementById('addTitleSuggestions');
  if (!input || !dropdown) return;
  const q = input.value.trim();
  if (!q) {
    showToast('Enter a movie or series title first');
    return;
  }
  fetchTmdbSuggestions(q, dropdown, fillModalFromTmdb);
}

async function fetchTmdbSuggestions(query, dropdownEl, onSelectCallback) {
  try {
    const res = await fetch(`/api/tmdb/search/?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const results = data.results || [];

    if (results.length === 0) {
      dropdownEl.innerHTML = '<div style="padding: 0.75rem; color: var(--text-dim); font-size: 0.82rem;">No TMDb matches found</div>';
      dropdownEl.style.display = 'block';
      return;
    }

    dropdownEl.innerHTML = '';
    results.forEach(item => {
      const el = document.createElement('div');
      el.className = 'tmdb-suggestion-item';
      const poster = item.poster_url || DEFAULT_POSTERS[item.media_type] || DEFAULT_POSTERS.movie;
      el.innerHTML = `
        <img src="${poster}" class="tmdb-thumb" alt="" onerror="this.src='${DEFAULT_POSTERS.movie}'">
        <div style="flex: 1; min-width: 0;">
          <div class="tmdb-info-title">${item.title}</div>
          <div class="tmdb-info-meta">
            <span>${item.media_type === 'series' ? 'TV Series' : 'Movie'}</span>
            ${item.release_year ? `<span> • ${item.release_year}</span>` : ''}
            ${item.rating ? `<span style="color: var(--accent-gold);"> ★ ${item.rating}</span>` : ''}
          </div>
        </div>
      `;
      el.onclick = () => {
        dropdownEl.style.display = 'none';
        onSelectCallback(item);
      };
      dropdownEl.appendChild(el);
    });
    dropdownEl.style.display = 'block';
  } catch (err) {
    console.error('TMDb search failed:', err);
  }
}

async function fillModalFromTmdb(item) {
  try {
    showToast(`Fetching info for "${item.title}"...`);
    const res = await fetch(`/api/tmdb/details/?id=${item.tmdb_id}&type=${item.media_type}`);
    const details = await res.json();

    document.getElementById('addTitle').value = details.title || item.title;
    document.getElementById('addMediaType').value = details.media_type || item.media_type;
    if (details.category_or_sport) document.getElementById('addCategory').value = details.category_or_sport;
    if (details.release_year) document.getElementById('addYear').value = details.release_year;
    if (details.duration) document.getElementById('addDuration').value = details.duration;
    if (details.poster_url) document.getElementById('addPoster').value = details.poster_url;
    if (details.description) document.getElementById('addDescription').value = details.description;

    const tmdbIdInput = document.getElementById('addTmdbId');
    if (tmdbIdInput) tmdbIdInput.value = details.tmdb_id || item.tmdb_id || '';

    const serverInput = document.querySelector('#sourcesContainer .src-server');
    const urlInput = document.querySelector('#sourcesContainer .src-url');
    if (serverInput) serverInput.value = 'Flixto Stream';
    if (urlInput) urlInput.value = 'http://flixto.watch/';

    showToast(`✓ Auto-filled "${details.title}" from TMDb!`, 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to load full TMDb details', 'error');
  }
}

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : ''}`;
  toast.innerHTML = `
    <span style="font-weight: 700;">${type === 'success' ? '✓' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

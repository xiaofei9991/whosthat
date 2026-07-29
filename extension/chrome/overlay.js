// Who's That Browser Extension - Real-time X-Ray Overlay
// Runs on Netflix, Disney+, HBO etc. web players

console.log('Who's That real-time overlay initialized');

class Overlay {
  constructor() {
    this.isNetflix = window.location.hostname.includes('netflix');
    this.isDisney = window.location.hostname.includes('disneyplus');
    this.player = null;
    this.currentTitle = null;
    this.currentTime = 0;
    this.overlay = null;

    this.init();
  }

  init() {
    this.findPlayer();
    this.detectPlayerInfo();
    this.observePlayer();
    this.createOverlay();
    this.startMonitoring();
    this.initMessageListener();
  }

  initMessageListener() {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleOverlay') {
        this.toggleOverlay();
      } else if (request.action === 'showOverlay') {
        this.showOverlay();
      }
    });
  }

  findPlayer() {
    // Common selectors for Netflix player
    this.player = document.querySelector('#player') || 
                 document.querySelector('[data-testid="player"]') ||
                 document.querySelector('.player') ||
                 document.querySelector('video') ||
                 null;
    
    if (this.player) {
      console.log('Found player:', this.player);
    }
  }

  detectPlayerInfo() {
    if (!this.player) return;

    let titleText = '';
    let mediaType = 'movie';
    let titleId = 0;
    let season = null;
    let episode = null;

    if (this.isNetflix) {
      // Netflix title selector
      const titleEl = document.querySelector('[data-uia="player-metadata-title"]') || 
                      document.querySelector('.player-metadata-title') ||
                      document.querySelector('h1') ||
                      document.querySelector('[aria-label*="title"]');
      if (titleEl) titleText = titleEl.textContent.trim();
    } else if (this.isDisney) {
      // Disney+ title selector
      const titleEl = document.querySelector('h1') || 
                      document.querySelector('.title') ||
                      document.querySelector('[data-testid="title"]');
      if (titleEl) titleText = titleEl.textContent.trim();
    } else if (this.isHBO) {
      const titleEl = document.querySelector('h1') || 
                      document.querySelector('[class*="title"]') ||
                      document.title.split(' - ')[0];
      if (titleEl) titleText = titleEl.textContent.trim();
    }

    // Parse season/episode from URL (Netflix, Disney+ use ?season= ?episode= )
    const url = new URL(window.location.href);
    const seasonMatch = url.searchParams.get('season');
    if (seasonMatch) season = parseInt(seasonMatch, 10);
    const episodeMatch = url.searchParams.get('episode');
    if (episodeMatch) episode = parseInt(episodeMatch, 10);

    // Parse ID from URL (Netflix /watch/ID etc.)
    const path = url.pathname;
    const idMatch = path.match(/\/(watch|title)\/(\d+)/);
    if (idMatch) {
      titleId = parseInt(idMatch[2], 10);
      mediaType = path.includes('tv') || path.includes('series') ? 'tv' : 'movie';
    }

    this.currentTime = this.player.currentTime || 0;

    if (titleText) {
      this.currentTitle = { 
        name: titleText, 
        media_type: mediaType, 
        id: titleId,
        season,
        episode
      };
    }
  }

  observePlayer() {
    if (!this.player) return;

    // Proper player observation: call detect on events and DOM changes
    const observer = new MutationObserver(() => {
      this.detectPlayerInfo();
    });
    observer.observe(this.player, { 
      attributes: true, 
      childList: true, 
      subtree: true,
      characterData: true 
    });

    this.player.addEventListener('timeupdate', () => this.detectPlayerInfo());
    this.player.addEventListener('play', () => this.detectPlayerInfo());
    this.player.addEventListener('pause', () => this.detectPlayerInfo());
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      background: rgba(0, 0, 0, 0.95);
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 16px;
      z-index: 99999;
      color: white;
      font-family: system-ui, sans-serif;
      box-shadow: 0 0 30px rgba(245, 158, 11, 0.5);
      display: none;
    `;
    document.body.appendChild(this.overlay);
  }

  toggleOverlay() {
    const isHidden = this.overlay.style.display === 'none';
    if (isHidden) {
      this.showOverlay();
    } else {
      this.hideOverlay();
    }
  }

  showOverlay() {
    if (!this.overlay) return;
    this.overlay.style.display = 'block';
    this.updateOverlay();
  }

  hideOverlay() {
    if (!this.overlay) return;
    this.overlay.style.display = 'none';
  }

  updateTime() {
    if (!this.player) return;

    this.currentTime = this.player.currentTime || 0;
    this.detectPlayerInfo();
  }

  async updateOverlay() {
    if (!this.currentTitle || !this.currentTitle.id) return;

    try {
      const SITE_ORIGIN = 'https://whosthatcast.com';
      const response = await fetch(`${SITE_ORIGIN}/who-plays/${this.currentTitle.media_type || 'movie'}/${this.currentTitle.id}/${Math.floor(this.currentTime / 60)}`);
      const data = await response.json();

      if (data.characters && data.characters.length > 0) {
        const progressText = this.currentTitle.season ? `S${this.currentTitle.season}${this.currentTitle.episode ? `E${this.currentTitle.episode}` : ''}` : '';
        this.overlay.innerHTML = `
          <h3 style="color: #f59e0b; margin: 0 0 12px 0; font-size: 18px;">Who's That?</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${data.characters.slice(0, 10).map(c => `
              <div style="text-align: center; min-width: 70px;">
                <img src="${c.poster_path ? 'https://image.tmdb.org/t/p/w92' + c.poster_path : 'https://via.placeholder.com/70x100?text=No+Image'}" 
                     style="width: 70px; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid #f59e0b; box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);">
                <div style="font-size: 12px; margin-top: 6px; font-weight: 600; line-height: 1.2;">${c.character}</div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top: 12px; font-size: 12px; opacity: 0.8;">
            Up to ${Math.floor(this.currentTime / 60)} min • ${this.currentTitle.name || 'Unknown'} ${progressText}
          </div>
        `;
        this.overlay.style.display = 'block';
      } else {
        this.overlay.style.display = 'none';
      }
    } catch (e) {
      this.overlay.style.display = 'none';
    }
  }

  startMonitoring() {
    setInterval(() => {
      this.updateTime();
    }, 5000);
  }
}

new Overlay();

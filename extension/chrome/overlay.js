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
    this.currentEpisode = null;
    this.currentSeason = null;
    this.overlay = null;

    this.init();
  }

  init() {
    this.findPlayer();
    this.observePlayer();
    this.createOverlay();
    this.startMonitoring();
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

  observePlayer() {
    if (!this.player) return;

    // Observe for time updates
    if (this.player.addEventListener) {
      this.player.addEventListener('timeupdate', () => this.updateTime());
      this.player.addEventListener('play', () => this.updateTime());
    }
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

  updateTime() {
    if (!this.player) return;

    this.currentTime = this.player.currentTime || 0;
    this.updateOverlay();
  }

  async updateOverlay() {
    if (!this.currentTitle) return;

    try {
      const response = await fetch(`/who-plays/${this.currentTitle.media_type || 'movie'}/${this.currentTitle.id}/${Math.floor(this.currentTime / 60)}`);
      const data = await response.json();

      if (data.characters && data.characters.length > 0) {
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
            Up to ${Math.floor(this.currentTime / 60)} min • ${this.currentTitle.name || 'Unknown'}
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

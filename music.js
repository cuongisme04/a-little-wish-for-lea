(() => {
  'use strict';
  const config = window.BIRTHDAY_CONFIG?.music || {};
  const $ = id => document.getElementById(id);
  const audio = $('theme-audio');
  const status = $('music-status');
  let wanted = true, scene = 'candles', loadedTheme, ducked = false;
  let volume = Math.max(0, Math.min(100, Number(config.volume ?? 30)));
  const mode = () => scene === 'candles' ? 'piano' : 'song';
  const isPlaying = () => !audio.paused && !audio.ended;
  const titles = {
    piano: 'Happy Birthday · soft piano',
    song: (config.title || 'Dành Cho Em') + ' · ' + (config.artist || 'Hoàng Tôn')
  };

  function sync() {
    const title = titles[mode()];
    const playing = isPlaying();
    $('sound-button').title = title;
    $('sound-button').setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + title);
    $('sound-button').setAttribute('aria-pressed', String(playing));
    status.dataset.theme = mode();
    status.dataset.playback = playing ? 'playing' : 'paused';
    const message = (playing ? 'Now playing: ' : 'Music: ') + title;
    if (status.textContent !== message) status.textContent = message;
    $('audio-unlock').hidden = !wanted || playing || mode() !== 'piano';
  }

  function updateGain() {
    audio.volume = volume / 100 * (ducked ? .13 : 1);
    audio.muted = volume === 0;
    $('volume-value').dataset.actualVolume = String(Math.round(audio.volume * 100));
  }

  function selectTrack() {
    const next = mode();
    if (loadedTheme === next) return;
    audio.pause();
    loadedTheme = next;
    audio.autoplay = wanted;
    audio.src = next === 'piano'
      ? 'assets/piano/happy-birthday-soft.mp3'
      : config.src || 'assets/danh-cho-em.mp3';
    audio.load();
    updateGain();
  }

  function resumeAuto() {
    if (!wanted || document.hidden) return;
    selectTrack();
    if (!audio.paused) return;
    // Keep play() synchronous with the page click, including on Safari/iPhone.
    // Reusing this element also retains its permission from the candle page.
    const track = loadedTheme;
    audio.play().then(sync).catch(error => {
      if (track !== loadedTheme || error.name === 'AbortError') return;
      sync();
      if (error.name !== 'NotAllowedError') status.textContent = 'The birthday music could not load.';
    });
  }

  function pauseTransient() { audio.pause(); sync(); }

  function setScene(next) {
    const previous = mode();
    scene = next;
    if (mode() !== previous) {
      selectTrack();
      resumeAuto();
    }
    sync();
  }

  function updateVolume() {
    volume = Number($('music-volume').value);
    $('music-volume').style.setProperty('--volume', volume + '%');
    $('music-volume').setAttribute('aria-valuetext', volume + ' percent');
    $('volume-value').textContent = volume + '%';
    updateGain();
  }

  audio.loop = true;
  audio.preload = 'auto';
  audio.addEventListener('playing', () => {
    if (!wanted || document.hidden) { audio.pause(); return; }
    sync();
  });
  audio.addEventListener('pause', sync);
  audio.addEventListener('timeupdate', () => {
    if (loadedTheme === 'piano') status.dataset.pianoPosition = String(audio.currentTime);
    else status.dataset.positionMs = String(Math.round(audio.currentTime * 1000));
  });
  audio.addEventListener('error', () => {
    sync();
    status.textContent = 'The birthday music could not load.';
  });

  function unlock(event) {
    if (!wanted || event.target.closest?.('#sound-button,#audio-unlock,#music-volume')) return;
    if (!isPlaying()) resumeAuto();
  }
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });
  $('sound-button').addEventListener('click', () => {
    if (isPlaying()) { wanted = false; audio.autoplay = false; pauseTransient(); }
    else { wanted = true; resumeAuto(); }
    sync();
  });
  $('audio-unlock').addEventListener('click', () => { wanted = true; resumeAuto(); });
  $('music-volume').value = String(volume);
  $('music-volume').addEventListener('input', updateVolume);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseTransient(); else resumeAuto();
  });
  window.addEventListener('pagehide', pauseTransient);
  window.addEventListener('pageshow', resumeAuto);
  window.birthdayMusic = {
    get wanted() { return wanted; }, setScene, resumeAuto, pauseTransient,
    duck(value) { ducked = value; updateGain(); },
    reset() {
      setScene('candles');
      audio.currentTime = 0;
      resumeAuto();
    }
  };
  updateVolume();
  selectTrack();
  resumeAuto();
  sync();
})();

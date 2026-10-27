(() => {
  'use strict';
  const config = window.BIRTHDAY_CONFIG || {};
  const name = config.name || 'Lea';
  const candleTotal = Math.min(60, Math.max(1, Number(config.candles) || 23));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);
  const announce = (message) => { $('announcement').textContent = message; };
  const sceneOrder = ['candles', 'flowers', 'letter', 'date'];
  let scene = 'candles';
  let unlocked = 0;
  let candleState = 'ready';
  let lightingTimer;
  let blowTimers = [];
  let flowerTimers = [];
  let flowerOpened = false;
  let flowersBusy = false;
  let micStream;
  let micContext;
  let micFrame;
  let micGeneration = 0;
  let micPending = false;
  let noAttempts = 0;
  let noMotionFrame;
  let noLastTime = 0;
  let noEscaping = false;
  let noPosition = null;
  let noVelocity = { x: 0, y: 0 };
  let noPanicUntil = 0;
  let noPointer = null;
  let noGeometry;
  let confettiTimer;
  let wishTwinkleTimer;
  document.querySelectorAll('[data-name]').forEach((element) => {
    element.textContent = element.tagName === 'EM' ? name + '.' : name;
  });
  document.title = 'A little wish for ' + name;
  $('signature').textContent = config.signature || $('signature').textContent;
  $('date-question').textContent = config.dateQuestion || $('date-question').textContent;
  $('date-detail').textContent = config.dateDetail || $('date-detail').textContent;
  if (Array.isArray(config.messageParagraphs) && config.messageParagraphs.length) {
    $('birthday-message').replaceChildren(...config.messageParagraphs.map((text) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    }));
  }

  function unlock(target) {
    unlocked = Math.max(unlocked, sceneOrder.indexOf(target));
    document.querySelectorAll('.journey button').forEach((button, index) => {
      button.disabled = index > unlocked;
    });
  }

  function showScene(target) {
    if (scene !== target) stopMic();
    stopNoRun();
    scene = target;
    document.querySelectorAll('.scene').forEach((element) => {
      const active = element.id === 'scene-' + target;
      element.hidden = !active;
      element.classList.toggle('active', active);
    });
    document.querySelectorAll('.journey button').forEach((button) => {
      if (button.dataset.scene === target || (target === 'yes' && button.dataset.scene === 'date')) {
        button.setAttribute('aria-current', 'step');
      } else button.removeAttribute('aria-current');
    });
    const heading = $('scene-' + target).querySelector('h1');
    heading.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' });
    if (target === 'date') startNoRun();
    window.birthdayMusic.setScene(target);
  }

  function makeCandles() {
    const rows = [3, 5, 6, 5, 4];
    let count = 0;
    rows.forEach((number, row) => {
      for (let column = 0; column < number && count < candleTotal; column += 1) {
        const candle = document.createElement('div');
        candle.className = 'candle';
        const rowWidth = [95, 155, 194, 162, 110][row];
        candle.style.left = 125 - rowWidth / 2 + (number > 1 ? rowWidth * column / (number - 1) : 0) + 'px';
        candle.style.top = 17 + row * 12 + 'px';
        candle.style.zIndex = String(row + 1);
        const flame = document.createElement('span');
        flame.className = 'flame';
        candle.appendChild(flame);
        $('candles').appendChild(candle);
        count += 1;
      }
    });
    for (; count < candleTotal; count += 1) {
      const candle = document.createElement('div');
      candle.className = 'candle';
      const angle = count * 2.4;
      candle.style.left = 125 + Math.cos(angle) * 83 + 'px';
      candle.style.top = 43 + Math.sin(angle) * 23 + 'px';
      candle.innerHTML = '<span class="flame"></span>';
      $('candles').appendChild(candle);
    }
  }
  makeCandles();
  const candles = [...$('candles').children];

  function prepareCandles() {
    clearTimeout(lightingTimer);
    blowTimers.forEach(clearTimeout);
    blowTimers = [];
    stopMic();
    candleState = 'ready';
    candles.forEach((candle) => candle.classList.remove('lit', 'extinguished'));
    $('scene-candles').classList.remove('out');
    $('countdown').hidden = true;
    $('remaining').textContent = String(candleTotal);
    $('countdown-label').textContent = 'candles left to light';
    $('lighting-progress').hidden = true;
    $('lighting-bar').style.width = '0%';
    $('wish-instruction').textContent = 'Ready for a little birthday magic?';
    $('start-candles').hidden = false;
    $('start-candles').disabled = false;
    $('mic-button').hidden = true;
    $('mic-button').disabled = true;
    $('mic-label').textContent = 'Lighting your candles…';
    $('tap-blow-button').hidden = true;
    $('tap-blow-button').disabled = true;
    $('to-flowers').hidden = true;
    $('micro-note').textContent = 'Tap to light your candles and start the music.';
    announce('Your ' + candleTotal + ' birthday candles are ready. Tap Light my candles to begin.');
  }

  function startLighting() {
    if (candleState !== 'ready') return;
    candleState = 'lighting';
    $('start-candles').hidden = true;
    $('start-candles').disabled = true;
    $('countdown').hidden = false;
    $('lighting-progress').hidden = false;
    $('wish-instruction').textContent = 'One little light for every lovely year.';
    $('mic-button').hidden = false;
    $('tap-blow-button').hidden = false;
    $('micro-note').textContent = 'No rush. This moment is yours.';
    window.birthdayMusic.start();
    announce(candleTotal + ' birthday candles are lighting one by one for ' + name + '.');
    let lit = 0;
    function lightNext() {
      candles[lit].classList.add('lit');
      lit += 1;
      $('remaining').textContent = String(candleTotal - lit);
      $('lighting-bar').style.width = (lit / candleTotal * 100) + '%';
      if (lit < candleTotal) {
        lightingTimer = setTimeout(lightNext, Math.max(90, config.lightingIntervalMs || 330));
      } else {
        candleState = 'lit';
        $('remaining').textContent = String(candleTotal);
        $('countdown-label').textContent = 'birthday wishes, all aglow';
        $('wish-instruction').textContent = 'Close your eyes, make a wish, and blow.';
        $('mic-button').disabled = false;
        $('tap-blow-button').disabled = false;
        $('mic-label').textContent = 'Blow out the candles';
        $('micro-note').textContent = 'Use your microphone, or tap to blow them out.';
        announce('All ' + candleTotal + ' candles are lit. Make a wish. Use your microphone or the tap button to blow them out.');
      }
    }
    lightingTimer = setTimeout(lightNext, 650);
  }

  function finishWish() {
    if (candleState !== 'lit') return;
    candleState = 'blowing';
    stopMic();
    $('mic-button').disabled = true;
    $('tap-blow-button').disabled = true;
    const stagger = reducedMotion ? 0 : 29;
    candles.forEach((candle, index) => {
      blowTimers.push(setTimeout(() => {
        candle.classList.remove('lit');
        candle.classList.add('extinguished');
      }, index * stagger));
    });
    blowTimers.push(setTimeout(() => {
      candleState = 'out';
      $('scene-candles').classList.add('out');
      $('countdown').hidden = true;
      $('lighting-progress').hidden = true;
      $('wish-instruction').textContent = 'May every little wish find its way to you. ♡';
      $('mic-button').hidden = true;
      $('tap-blow-button').hidden = true;
      $('to-flowers').hidden = false;
      $('micro-note').textContent = 'There’s something pink waiting for you.';
      unlock('flowers');
      announce('Your candles are out. Happy birthday, ' + name + '! Your flower surprise is ready.');
      wishTwinkles();
      if (window.birthdayMusic.wanted) startMusic();
    }, candles.length * stagger + 200));
  }

  function stopMic() {
    micGeneration += 1;
    micPending = false;
    if (micFrame) cancelAnimationFrame(micFrame);
    micFrame = undefined;
    if (micStream) micStream.getTracks().forEach((track) => track.stop());
    micStream = undefined;
    if (micContext && micContext.state !== 'closed') micContext.close().catch(() => {});
    micContext = undefined;
    $('mic-button').removeAttribute('aria-busy');
    duckMusic(false);
    if (candleState === 'lit') {
      $('mic-label').textContent = 'Blow out the candles';
      $('mic-button').disabled = false;
    }
  }

  async function listenForBlow() {
    if (candleState !== 'lit' || micPending || micStream) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      $('micro-note').textContent = 'A tap works beautifully too — use the wish button.';
      return;
    }
    micPending = true;
    const generation = ++micGeneration;
    $('mic-button').setAttribute('aria-busy', 'true');
    $('mic-button').disabled = true;
    $('mic-label').textContent = 'Allow your microphone…';
    duckMusic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      if (generation !== micGeneration || scene !== 'candles' || candleState !== 'lit') {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      micPending = false;
      micStream = stream;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      micContext = new AudioContext();
      await micContext.resume();
      if (generation !== micGeneration) return;
      const analyser = micContext.createAnalyser();
      analyser.fftSize = 1024;
      const source = micContext.createMediaStreamSource(stream);
      source.connect(analyser); // Local analysis only. Never connected to speakers or sent anywhere.
      const waveform = new Uint8Array(analyser.fftSize);
      const spectrum = new Uint8Array(analyser.frequencyBinCount);
      const start = performance.now();
      let noiseSum = 0;
      let noiseFrames = 0;
      let noiseFloor = 0.012;
      let blowSince = 0;
      let calibrated = false;
      $('mic-label').textContent = 'A tiny moment of quiet…';
      $('micro-note').textContent = 'Checking the room, then it’s time for your wish.';
      function detect(now) {
        if (!micStream || generation !== micGeneration || candleState !== 'lit') return;
        analyser.getByteTimeDomainData(waveform);
        let sum = 0;
        for (const sample of waveform) sum += ((sample - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / waveform.length);
        if (now - start < 850) {
          noiseSum += rms;
          noiseFrames += 1;
        } else {
          if (!calibrated) {
            noiseFloor = Math.max(.005, noiseSum / Math.max(1, noiseFrames));
            calibrated = true;
            $('mic-label').textContent = 'Listening… make your wish';
            $('micro-note').textContent = 'Blow gently toward your microphone. Audio stays on this device.';
            announce('Ready. Blow toward your microphone, or use the tap button.');
          }
          analyser.getByteFrequencyData(spectrum);
          let geometric = 0;
          let arithmetic = 0;
          const end = Math.min(100, spectrum.length);
          for (let i = 2; i < end; i += 1) {
            const amplitude = Math.max(1, spectrum[i]);
            geometric += Math.log(amplitude);
            arithmetic += amplitude;
          }
          const flatness = Math.exp(geometric / (end - 2)) / (arithmetic / (end - 2) || 1);
          const breath = rms > Math.max(.045, noiseFloor * 2.4) && (flatness > .22 || rms > .2);
          if (breath) {
            if (!blowSince) blowSince = now;
            if (now - blowSince > 220) { finishWish(); return; }
          } else blowSince = 0;
          if (now - start > 30000) {
            stopMic();
            $('micro-note').textContent = 'Try once more, or tap to blow out your candles.';
            if (window.birthdayMusic.wanted) startMusic();
            return;
          }
        }
        micFrame = requestAnimationFrame(detect);
      }
      micFrame = requestAnimationFrame(detect);
    } catch (error) {
      if (generation !== micGeneration) return;
      stopMic();
      $('micro-note').textContent = 'No microphone? No problem. Tap to make your wish. ♡';
      announce('You can use the tap button to blow out your candles.');
      if (window.birthdayMusic.wanted) startMusic();
    }
  }

  const flowerTypes = ['peony', 'rose', 'hydrangea', 'cosmos'];
  const bloomPositions = [
    ['hydrangea', 105, 0, 112, -12], ['rose', 41, 23, 107, -16],
    ['peony', 177, 29, 109, 18], ['cosmos', 12, 84, 91, -12],
    ['hydrangea', 211, 104, 99, 23], ['peony', 68, 75, 123, 4],
    ['rose', 151, 93, 108, -9], ['cosmos', 226, 49, 78, 23],
    ['rose', 32, 142, 101, 19], ['hydrangea', 110, 154, 91, -14],
    ['cosmos', 191, 171, 77, 25], ['peony', 160, 149, 96, -14],
    ['cosmos', 84, 124, 78, -30]
  ];
  bloomPositions.forEach(([type, left, top, size, rotate], index) => {
    const img = document.createElement('img');
    img.src = `assets/${type}.webp`; img.alt = ''; img.width = size; img.height = size;
    img.className = 'bloom-' + type;
    img.style.cssText = `left:${left}px;top:${top}px;width:${size}px;height:${size}px;--bloom-turn:${rotate}deg;--bloom-delay:${index * .13}s`;
    $('bouquet-blooms').appendChild(img);
  });

  function flyFlowers() {
    if (flowersBusy) return;
    flowersBusy = true;
    $('replay-flowers').disabled = true;
    flowerTimers.forEach(clearTimeout);
    flowerTimers = [];
    const flight = $('flower-flight');
    flight.replaceChildren();
    $('bouquet').hidden = true;
    $('flower-bottom').hidden = true;
    const total = window.innerWidth < 700 ? 23 : 31;
    const duration = 9.0;
    const stagger = .035;
    const finishAt = reducedMotion ? 30 : (duration + (total - 1) * stagger) * 1000 + 120;
    if (!reducedMotion) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const size = Math.min(520, Math.max(width, height) * .46);
      for (let i = 0; i < total; i += 1) {
        const img = document.createElement('img');
        img.src = `assets/${flowerTypes[i % flowerTypes.length]}.webp`; img.alt = ''; img.className = 'living-bloom';
        const angle = i * 2.39996;
        const radius = Math.sqrt((i + .6) / total);
        const midX = Math.cos(angle) * width * .61 * radius;
        const midY = Math.sin(angle) * height * .63 * radius;
        const properties = {
          '--size': size * (.65 + (i % 5) * .12) + 'px',
          '--from-x': midX * .06 + 'px', '--from-y': 38 + midY * .08 + 'px',
          '--mid-x': midX + 'px', '--mid-y': midY + 'px',
          '--to-x': midX * 1.65 + 'px', '--to-y': midY * 1.65 + 'px',
          '--rotation': (i * 71 % 360) + 'deg', '--delay': (stagger * i) + 's', '--duration': duration + 's'
        };
        Object.entries(properties).forEach(([key, value]) => img.style.setProperty(key, value));
        flight.appendChild(img);
      }
      flight.classList.add('running');
    }
    flowerTimers.push(setTimeout(() => {
      $('envelope-scene').hidden = true;
      $('bouquet').hidden = false;
      flowerOpened = true;
    }, reducedMotion ? 0 : 3300));
    flowerTimers.push(setTimeout(() => {
      flight.classList.remove('running');
      flight.replaceChildren();
      flowersBusy = false;
      $('replay-flowers').disabled = false;
      $('flower-bottom').hidden = false;
      unlock('letter');
      announce('A pastel bouquet of peonies, roses, hydrangeas and cosmos, just for ' + name + '. Your birthday note is ready.');
    }, finishAt));
  }

  function openFlowers() {
    if (flowersBusy || flowerOpened) return;
    $('open-envelope').disabled = true;
    $('open-envelope').classList.add('opening');
    flowerTimers.push(setTimeout(flyFlowers, reducedMotion ? 0 : 900));
  }

  function stopNoRun() {
    if (noMotionFrame) cancelAnimationFrame(noMotionFrame);
    noMotionFrame = undefined;
    noLastTime = 0;
  }

  function measureNoArea() {
    const arena = $('answer-arena').getBoundingClientRect();
    const yes = $('yes-button').getBoundingClientRect();
    const button = $('no-button');
    const width = button.offsetWidth, height = button.offsetHeight, gap = 12;
    return { arena, width, height, minX: 8, minY: 8,
      maxX: Math.max(8, arena.width - width - 8), maxY: Math.max(8, arena.height - height - 8),
      obstacle: { left: yes.left - arena.left - width - gap, right: yes.right - arena.left + gap,
        top: yes.top - arena.top - height - gap, bottom: yes.bottom - arena.top + gap } };
  }

  function noOverlapsYes(position, area) {
    const r = area.obstacle;
    return position.x > r.left && position.x < r.right && position.y > r.top && position.y < r.bottom;
  }

  function containNo(position, area) {
    position.x = Math.min(area.maxX, Math.max(area.minX, position.x));
    position.y = Math.min(area.maxY, Math.max(area.minY, position.y));
    if (noOverlapsYes(position, area)) {
      const r = area.obstacle;
      const options = [{ x: r.left, y: position.y }, { x: r.right, y: position.y },
        { x: position.x, y: r.top }, { x: position.x, y: r.bottom }]
        .filter(p => p.x >= area.minX && p.x <= area.maxX && p.y >= area.minY && p.y <= area.maxY);
      options.sort((a, b) => Math.hypot(a.x-position.x,a.y-position.y)-Math.hypot(b.x-position.x,b.y-position.y));
      if (options[0]) { position.x = options[0].x; position.y = options[0].y; }
    }
  }

  function drawNo() {
    const button = $('no-button');
    button.style.left = '0px'; button.style.top = '0px';
    button.style.transform = `translate3d(${noPosition.x.toFixed(2)}px,${noPosition.y.toFixed(2)}px,0)`;
  }

  function startNoRun() {
    stopNoRun();
    if (!noEscaping || scene !== 'date' || document.hidden) return;
    noGeometry = measureNoArea();
    containNo(noPosition, noGeometry);
    drawNo();
    function move(now) {
      if (!noEscaping || scene !== 'date' || document.hidden) { stopNoRun(); return; }
      const dt = noLastTime ? Math.min((now-noLastTime)/1000, .04) : 0;
      noLastTime = now;
      const area = measureNoArea();
      const cx = area.arena.left + noPosition.x + area.width/2;
      const cy = area.arena.top + noPosition.y + area.height/2;
      const dx = noPointer ? cx-noPointer.x : 0, dy = noPointer ? cy-noPointer.y : 0;
      const distance = noPointer ? Math.hypot(dx,dy) : Infinity;
      const proximity = Math.max(0,1-distance/260);
      let desiredX = 0, desiredY = 0;
      if (proximity > 0 || now < noPanicUntil) {
        let fx = dx/Math.max(1,distance), fy = dy/Math.max(1,distance);
        if (Math.abs(fx)+Math.abs(fy)<.1) { fx = .7; fy = .7; }
        const margin = 45;
        fx += Math.max(0,1-(noPosition.x-area.minX)/margin)*1.5;
        fx -= Math.max(0,1-(area.maxX-noPosition.x)/margin)*1.5;
        fy += Math.max(0,1-(noPosition.y-area.minY)/margin)*1.5;
        fy -= Math.max(0,1-(area.maxY-noPosition.y)/margin)*1.5;
        const r=area.obstacle;
        const nx=Math.min(r.right,Math.max(r.left,noPosition.x));
        const ny=Math.min(r.bottom,Math.max(r.top,noPosition.y));
        const obstacleDistance=Math.hypot(noPosition.x-nx,noPosition.y-ny);
        if(obstacleDistance<45 && obstacleDistance>0) {
          fx+=(noPosition.x-nx)/obstacleDistance*(1-obstacleDistance/45)*2;
          fy+=(noPosition.y-ny)/obstacleDistance*(1-obstacleDistance/45)*2;
        }
        const force=Math.hypot(fx,fy);
        if(force<.15) { fx=-dy/Math.max(1,distance); fy=dx/Math.max(1,distance); }
        const speed=Math.min(reducedMotion?45:280,44+190*proximity**1.2+Math.min(1000,noPointer?.speed||0)*.07+(now<noPanicUntil?45:0));
        const length=Math.max(.1,Math.hypot(fx,fy));
        desiredX=fx/length*speed; desiredY=fy/length*speed;
      }
      const ease=Math.min(1,dt*8.2);
      noVelocity.x+=(desiredX-noVelocity.x)*ease;
      noVelocity.y+=(desiredY-noVelocity.y)*ease;
      noPosition.x+=noVelocity.x*dt; noPosition.y+=noVelocity.y*dt;
      containNo(noPosition,area);
      if(noPointer) noPointer.speed=(noPointer.speed||0)*Math.exp(-dt*4);
      drawNo();
      noMotionFrame=requestAnimationFrame(move);
    }
    noMotionFrame=requestAnimationFrame(move);
  }

  function trackNoPointer(event) {
    if(scene!=='date' || !noEscaping) return;
    const time=event.timeStamp;
    const elapsed=noPointer ? (time-noPointer.time)/1000 : 0;
    const speed=elapsed>.001 && elapsed<.3 ? Math.hypot(event.clientX-noPointer.x,event.clientY-noPointer.y)/elapsed : 0;
    noPointer={ x:event.clientX,y:event.clientY,time,speed };
  }

  function teaseNo(event) {
    event.preventDefault();
    const area=measureNoArea();
    const current=$('no-button').getBoundingClientRect();
    const px=event.detail===0?current.left+current.width/2:event.clientX;
    const py=event.detail===0?current.top+current.height/2:event.clientY;
    noPointer={x:px,y:py,time:event.timeStamp,speed:0};
    if(!noEscaping) {
      noEscaping=true;
      let best=null;
      for(let i=0;i<60;i++) {
        const point={x:area.minX+Math.random()*(area.maxX-area.minX),y:area.minY+Math.random()*(area.maxY-area.minY)};
        if(noOverlapsYes(point,area)) continue;
        const score=Math.hypot(area.arena.left+point.x+area.width/2-px,area.arena.top+point.y+area.height/2-py);
        if(!best || score>best.score) best={...point,score};
      }
      noPosition=best||{x:area.maxX,y:area.maxY};
      containNo(noPosition,area);
      noVelocity={x:0,y:0};
      drawNo();
      $('no-button').dataset.escapeState='escaped';
      $('playful-caption').textContent='Oh… catch me if you can. ♡';
      startNoRun();
      return;
    }
    noPanicUntil=performance.now()+650;
    noAttempts+=1;
    const captions=['A little closer… a little quicker. ♡','Still a little shy.','The “yes” is much easier to catch.'];
    $('playful-caption').textContent=captions[(noAttempts-1)%captions.length];
  }

  function wishTwinkles() {
    clearTimeout(wishTwinkleTimer);
    document.querySelector('.wish-twinkles')?.remove();
    if(reducedMotion) return;
    const layer=document.createElement('div'); layer.className='wish-twinkles'; layer.setAttribute('aria-hidden','true');
    for(let i=0;i<14;i++) {
      const star=document.createElement('span'); star.className='wish-twinkle'; star.textContent=i%3?'✧':'✦';
      const angle=i*2.39996;
      star.style.cssText=`left:${50+Math.cos(angle)*34}%;top:${46+Math.sin(angle)*32}%;font-size:${10+i%4*2}px;--twinkle-delay:${i*.14}s`;
      layer.appendChild(star);
    }
    document.querySelector('.cake-stage').appendChild(layer);
    wishTwinkleTimer=setTimeout(()=>layer.remove(),4200);
  }

  function confetti(count = 65) {
    if (reducedMotion) return;
    clearTimeout(confettiTimer);
    const container = $('confetti-layer');
    container.replaceChildren();
    const colors = ['#d695a9', '#b86a84', '#eac2cc', '#d0ac77', '#b2baa3', '#f1d5bb'];
    for (let i = 0; i < count; i += 1) {
      const piece = document.createElement('i');
      piece.className = 'confetti-piece';
      const values = { '--x': Math.random() * 100 + '%', '--w': 3 + Math.random() * 5 + 'px', '--h': 5 + Math.random() * 9 + 'px', '--color': colors[i % colors.length], '--duration': 2.8 + Math.random() * 2 + 's', '--delay': Math.random() * .7 + 's', '--drift': Math.random() * 200 - 100 + 'px', '--spin': Math.random() * 900 - 450 + 'deg' };
      Object.entries(values).forEach(([key, value]) => piece.style.setProperty(key, value));
      container.appendChild(piece);
    }
    confettiTimer = setTimeout(() => container.replaceChildren(), 5600);
  }

  function stopMusic() { window.birthdayMusic.pauseTransient(); }
  function startMusic() { window.birthdayMusic.resumeAuto(); }
  function duckMusic(value) { window.birthdayMusic.duck(value); }

  function restart() {
    flowerTimers.forEach(clearTimeout);
    flowerTimers = [];
    flowersBusy = false;
    flowerOpened = false;
    unlocked = 0;
    $('flower-flight').classList.remove('running');
    $('flower-flight').replaceChildren();
    $('envelope-scene').hidden = false;
    $('bouquet').hidden = true;
    $('flower-bottom').hidden = true;
    $('open-envelope').disabled = false;
    $('open-envelope').classList.remove('opening');
    $('replay-flowers').disabled = false;
    stopNoRun();
    $('no-button').style.removeProperty('transform');
    $('no-button').style.removeProperty('left');
    $('no-button').style.removeProperty('top');
    $('no-button').dataset.escapeState='waiting';
    noEscaping=false; noPosition=null; noVelocity={x:0,y:0}; noPanicUntil=0;
    document.querySelector('.wish-twinkles')?.remove();
    window.birthdayMusic.reset();
    noPointer = null;
    noAttempts = 0;
    $('playful-caption').textContent = 'My last little birthday wish. ♡';
    unlock('candles');
    showScene('candles');
    prepareCandles();
  }

  $('start-candles').addEventListener('click', startLighting);
  $('mic-button').addEventListener('click', listenForBlow);
  $('tap-blow-button').addEventListener('click', finishWish);
  $('to-flowers').addEventListener('click', () => showScene('flowers'));
  $('open-envelope').addEventListener('click', openFlowers);
  $('replay-flowers').addEventListener('click', flyFlowers);
  $('to-letter').addEventListener('click', () => showScene('letter'));
  $('to-date').addEventListener('click', () => { unlock('date'); showScene('date'); });
  $('no-button').addEventListener('click',teaseNo);
  $('no-button').addEventListener('pointerdown',event=>{if(noEscaping)teaseNo(event);});
  document.addEventListener('pointermove',trackNoPointer,{passive:true});
  document.addEventListener('pointerdown',event=>{if(noEscaping)trackNoPointer(event);},{passive:true});
  document.addEventListener('pointerup',event=>{if(event.pointerType==='touch')noPointer=null;},{passive:true});
  document.addEventListener('pointerleave',()=>{noPointer=null;});
  $('yes-button').addEventListener('click', () => { showScene('yes'); confetti(85); announce('It’s a date! You can share your yes or send a screenshot.'); });
  $('restart-button').addEventListener('click', restart);
  document.querySelector('.wordmark').addEventListener('click', (event) => { event.preventDefault(); restart(); });
  document.querySelectorAll('.journey button').forEach((button) => button.addEventListener('click', () => showScene(button.dataset.scene)));
  let replyId;
  let sendingReply = false;
  $('share-yes').addEventListener('click', () => {
    if (!$('reply-message').value) $('reply-message').value = config.yesReply || '';
    $('reply-error').hidden = true;
    $('reply-dialog').showModal();
    $('reply-message').focus();
  });
  $('cancel-reply').addEventListener('click', () => {
    if (!sendingReply) $('reply-dialog').close();
  });
  $('reply-dialog').addEventListener('cancel', event => {
    if (sendingReply) event.preventDefault();
  });
  $('reply-message').addEventListener('input', () => { if (!sendingReply) replyId = undefined; });
  $('reply-form').addEventListener('submit', async event => {
    event.preventDefault();
    const message = $('reply-message').value.trim();
    if (sendingReply || !message) return;
    sendingReply = true;
    replyId ||= crypto.randomUUID();
    $('send-reply').disabled = true;
    $('cancel-reply').disabled = true;
    $('reply-message').disabled = true;
    $('send-reply').textContent = 'Đang gửi…';
    $('reply-error').hidden = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const endpoint = config.replyEndpoint;
      if (!endpoint) throw new Error('Reply service unavailable');
      const tokenUrl = new URL('reply-token', endpoint);
      tokenUrl.searchParams.set('id', replyId);
      const tokenResponse = await fetch(tokenUrl, { credentials: 'omit', signal: controller.signal });
      if (!tokenResponse.ok) throw new Error('Could not prepare message');
      const { token } = await tokenResponse.json();
      const response = await fetch(endpoint, {
        method: 'POST', credentials: 'omit', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: replyId, token, message })
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true || result.id !== replyId) throw new Error('Message not saved');
      $('reply-dialog').close();
      $('share-yes').disabled = true;
      $('share-yes').textContent = 'Đã gửi lời nhắn ♡';
      $('share-feedback').textContent = 'Lời nhắn của chị đã được gửi rồi. Hẹn chị nhé! ♡';
      announce('Your message was saved and sent privately.');
    } catch {
      $('reply-error').textContent = 'Chưa gửi được lời nhắn. Nội dung vẫn ở đây, chị thử lại nhé.';
      $('reply-error').hidden = false;
    } finally {
      clearTimeout(timeout);
      sendingReply = false;
      $('send-reply').disabled = false;
      $('cancel-reply').disabled = false;
      $('reply-message').disabled = false;
      $('send-reply').textContent = 'Gửi lời nhắn ♡';
    }
  });
  window.addEventListener('resize', () => {
    if (scene === 'date') startNoRun();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopMic(); stopNoRun(); }
    else { if (scene === 'date') startNoRun(); }
  });
  window.addEventListener('pagehide', () => { stopMic(); stopNoRun(); });
  prepareCandles();
})();

(() => {
  'use strict';
  const config=window.BIRTHDAY_CONFIG?.music||{};
  const $=id=>document.getElementById(id);
  let wanted=true, scene='candles', volume=Number(config.volume??30), ducked=false;
  const pianoAudio=$('birthday-piano');
  let pianoPlaying=false;
  let widget, widgetReady=false, widgetPromise, sdkPromise, songPlaying=false, songStarted=false, internalPause=false;
  const mode=()=>scene==='candles'?'piano':'song';
  const isPlaying=()=>mode()==='piano'?pianoPlaying:songPlaying;

  function sync() {
    const title=mode()==='piano'?'Happy Birthday · soft piano':'Dành Cho Em · Hoàng Tôn';
    $('sound-button').title=title;
    $('sound-button').setAttribute('aria-label',(isPlaying()?'Pause ':'Play ')+title);
    $('sound-button').setAttribute('aria-pressed',String(isPlaying()));
    $('sound-button').setAttribute('aria-expanded',String(!$('music-panel').hidden));
    $('music-status').dataset.theme=mode();
    $('music-status').dataset.playback=isPlaying()?'playing':'paused';
    $('audio-unlock').hidden=!wanted||isPlaying()||mode()!=='piano';
  }

  function updatePianoGain() { pianoAudio.volume=Math.min(1,volume/100*(ducked ? .13 : 1)); }

  function stopPiano() { pianoAudio.pause();pianoPlaying=false; }

  function startPiano() {
    if(pianoPlaying||!wanted||mode()!=='piano'||document.hidden) return;
    updatePianoGain();
    pianoAudio.play().then(()=>sync()).catch(()=>sync());
  }

  pianoAudio.addEventListener('playing',()=>{
    if(!wanted||mode()!=='piano'||document.hidden){pianoAudio.pause();return;}
    pianoPlaying=true;$('music-status').textContent='Happy Birthday — a little soft piano. ♡';sync();
  });
  pianoAudio.addEventListener('pause',()=>{pianoPlaying=false;sync();});
  pianoAudio.addEventListener('timeupdate',()=>{$('music-status').dataset.pianoPosition=String(pianoAudio.currentTime);});
  updatePianoGain();
  pianoAudio.src='assets/piano/happy-birthday-soft.mp3';
  pianoAudio.autoplay=true;pianoAudio.loop=true;pianoAudio.preload='auto';

  function pauseSong() {
    if(widgetReady) {internalPause=true;widget.pause();}
    songPlaying=false;
  }

  function loadSdk() {
    if(window.SC?.Widget) return Promise.resolve(window.SC);
    if(sdkPromise) return sdkPromise;
    sdkPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://w.soundcloud.com/player/api.js';
      script.onload=()=>resolve(window.SC);script.onerror=()=>{sdkPromise=undefined;reject(new Error('Music unavailable'));};
      document.head.appendChild(script);
    });
    return sdkPromise;
  }

  function getWidget() {
    if(widgetReady) return Promise.resolve(widget);
    if(widgetPromise) return widgetPromise;
    widgetPromise=loadSdk().then(SC=>new Promise((resolve,reject)=>{
      const frame=document.createElement('iframe');frame.id='song-player-frame';
      frame.title='Dành Cho Em — Hoàng Tôn on SoundCloud';frame.width='100%';frame.height='166';frame.allow='autoplay';
      frame.referrerPolicy='strict-origin-when-cross-origin';
      const params=new URLSearchParams({url:config.trackUrl||'https://soundcloud.com/nhoangton/danh-cho-em-full',
        auto_play:'false',color:'#ab526c',show_artwork:'true',show_user:'true',show_comments:'false',
        show_reposts:'false',show_playcount:'false',buying:'false',sharing:'false',download:'false',visual:'false'});
      frame.src='https://w.soundcloud.com/player/?'+params;
      $('song-player').replaceChildren(frame);widget=SC.Widget(frame);
      widget.bind(SC.Widget.Events.READY,()=>{widgetReady=true;widget.setVolume(volume);resolve(widget);});
      widget.bind(SC.Widget.Events.PLAY,()=>{
        if(mode()==='piano'||document.hidden||$('music-panel').hidden){pauseSong();return;}
        wanted=true;internalPause=false;songPlaying=true;
        $('music-status').textContent='Dành Cho Em — a little love song for you. ♡';sync();
      });
      widget.bind(SC.Widget.Events.PAUSE,()=>{
        if(!internalPause&&mode()==='song') wanted=false;
        internalPause=false;songPlaying=false;sync();
      });
      widget.bind(SC.Widget.Events.PLAY_PROGRESS,event=>{$('music-status').dataset.positionMs=String(Math.round(event.currentPosition));});
      widget.bind(SC.Widget.Events.FINISH,()=>{
        songPlaying=false;
        if(wanted&&mode()==='song'){widget.seekTo(0);if(!document.hidden)widget.play();}
        sync();
      });
      widget.bind(SC.Widget.Events.ERROR,()=>{
        songPlaying=false;
        if(mode()==='song')$('music-status').textContent='Tap Listen on SoundCloud below to open your song.';
        sync();reject(new Error('Song unavailable'));
      });
    }));
    return widgetPromise;
  }

  function playSong() {
    if(!wanted||mode()!=='song'||document.hidden) return;
    $('music-panel').hidden=false;
    $('music-title').textContent='Dành Cho Em';
    const play=player=>{
      if(!wanted||mode()!=='song'||document.hidden) return;
      player.setVolume(volume);
      if(!songStarted){player.seekTo(0);songStarted=true;}
      player.play();
      setTimeout(()=>{if(wanted&&!songPlaying&&mode()==='song')$('music-status').textContent='Tap play for your song. ♡';},1800);
    };
    if(widgetReady) play(widget);
    else getWidget().then(play).catch(()=>{$('music-status').textContent='Listen on SoundCloud below to open your song.';});
    sync();
  }

  function resumeAuto() {
    if(!wanted||document.hidden) return;
    if(mode()==='piano') startPiano();else playSong();
  }

  function pauseTransient() {stopPiano();pauseSong();sync();}

  function setScene(next) {
    const previous=mode();scene=next;
    if(mode()!==previous){
      stopPiano();pauseSong();
      if(mode()==='piano'){ $('music-panel').hidden=true;pianoAudio.currentTime=0; }
      resumeAuto();
    }
    sync();
  }

  function updateVolume() {
    volume=Number($('music-volume').value);
    $('music-volume').style.setProperty('--volume',volume+'%');
    $('music-volume').setAttribute('aria-valuetext',volume+' percent');
    $('volume-value').textContent=volume+'%';updatePianoGain();
    if(widgetReady){widget.setVolume(volume);widget.getVolume(v=>{$('volume-value').dataset.actualVolume=String(v);});}
  }

  function unlock(event) {
    if(!wanted||event.target.closest?.('#sound-button,#audio-unlock,#close-music,#music-volume')) return;
    if(!isPlaying()) resumeAuto();
  }
  document.addEventListener('pointerdown',unlock,{capture:true});
  document.addEventListener('keydown',unlock,{capture:true});
  $('sound-button').addEventListener('click',()=>{
    if(isPlaying()){wanted=false;pauseTransient();}else{wanted=true;resumeAuto();}sync();
  });
  $('audio-unlock').addEventListener('click',()=>{wanted=true;resumeAuto();});
  $('close-music').addEventListener('click',()=>{wanted=false;pauseTransient();$('music-panel').hidden=true;sync();});
  $('music-volume').value=String(volume);updateVolume();
  $('music-volume').addEventListener('input',updateVolume);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseTransient();else resumeAuto();});
  window.addEventListener('pagehide',pauseTransient);
  window.addEventListener('pageshow',resumeAuto);
  window.birthdayMusic={get wanted(){return wanted;},setScene,resumeAuto,pauseTransient,
    duck(value){ducked=value;updatePianoGain();},
    reset(){pianoAudio.currentTime=0;songStarted=false;if(widgetReady)widget.seekTo(0);setScene('candles');}};
  // Preload the second theme without playing it, so the flower-page click can start it immediately.
  getWidget().catch(()=>{});
  resumeAuto();sync();
})();

/* Configuration — swap before going live */
const VIDEO_SRC = "p0oj0-z6LmE";
const APPS_SCRIPT_URL =
  "PASTE_YOUR_DEPLOYED_APPS_SCRIPT_WEB_APP_URL_HERE";
const GATE_TIME_SECONDS = 90;

const els = {
  cover: document.getElementById("videoCover"),
  shield: document.getElementById("clickShield"),
  mount: document.getElementById("playerMount"),
  gateOverlay: document.getElementById("gateOverlay"),
  endOverlay: document.getElementById("endOverlay"),
  form: document.getElementById("gateForm"),
  submitBtn: document.getElementById("gateSubmit"),
  formError: document.getElementById("formError"),
  watchAgain: document.getElementById("watchAgain"),
  unmute: document.getElementById("unmuteBar"),
};

let unlocked = false;
let gateShown = false;
let started = false;
let pendingPlay = false;

function parseYouTubeId(src) {
  if (/^[\w-]{11}$/.test(src)) return src;
  const m = src.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  return m ? m[1] : null;
}

const YT_ID = parseYouTubeId(VIDEO_SRC);
const IS_YOUTUBE = !!YT_ID;

let player = null;

function onGateTime() {
  if (unlocked || gateShown) return;
  gateShown = true;
  player.pause();
  showOverlay(els.gateOverlay);
  setTimeout(() => document.getElementById("leadName").focus(), 500);
}

function onVideoEnd() {
  showOverlay(els.endOverlay);
}

function showOverlay(el) {
  el.classList.add("visible");
  el.setAttribute("aria-hidden", "false");
}

function hideOverlay(el) {
  el.classList.remove("visible");
  el.setAttribute("aria-hidden", "true");
}

function lockVideo() {
  document.body.classList.add("video-locked");
  els.shield.classList.add("active");
}

function unlockVideo() {
  document.body.classList.remove("video-locked");
  els.shield.classList.remove("active");
}

function wrapYouTube(yt) {
  return {
    play: () => yt.playVideo(),
    pause: () => yt.pauseVideo(),
    seek: (s) => yt.seekTo(s, true),
    currentTime: () => (yt.getCurrentTime ? yt.getCurrentTime() : 0),
    state: () => (yt.getPlayerState ? yt.getPlayerState() : -1),
    mute: () => {
      if (yt.mute) yt.mute();
    },
    unmute: () => {
      if (yt.unMute) yt.unMute();
    },
    enableControls: () => {},
  };
}

function createUnlockedYouTubePlayer(resumeAt) {
  els.mount.innerHTML = '<div id="ytTarget"></div>';
  let yt2 = null;
  yt2 = new YT.Player("ytTarget", {
    videoId: YT_ID,
    playerVars: {
      autoplay: 1,
      controls: 1,
      fs: 1,
      disablekb: 0,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      start: Math.floor(resumeAt),
    },
    events: {
      onReady: (e) => {
        e.target.seekTo(resumeAt, true);
        e.target.playVideo();
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.ENDED) onVideoEnd();
      },
    },
  });
  player = wrapYouTube(yt2);
}

function createYouTubePlayer() {
  els.mount.innerHTML = '<div id="ytTarget"></div>';
  let ready = false;
  const yt = new YT.Player("ytTarget", {
    videoId: YT_ID,
    playerVars: {
      autoplay: 0,
      controls: 0,
      fs: 0,
      disablekb: 1,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
    },
    events: {
      onReady: () => {
        ready = true;
        if (pendingPlay) {
          pendingPlay = false;
          yt.playVideo();
        } else if (!started) {
          attemptAutoplay();
        }
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.ENDED) onVideoEnd();
        if (
          !unlocked &&
          !gateShown &&
          e.data === YT.PlayerState.PAUSED
        ) {
          yt.playVideo();
        }
      },
    },
  });

  const poll = setInterval(() => {
    if (unlocked || gateShown) return;
    try {
      if (yt.getCurrentTime && yt.getCurrentTime() >= GATE_TIME_SECONDS) {
        onGateTime();
      }
    } catch (_) {
      /* player not ready yet */
    }
  }, 250);

  return {
    play: () => {
      if (ready) yt.playVideo();
      else pendingPlay = true;
    },
    pause: () => yt.pauseVideo(),
    seek: (s) => yt.seekTo(s, true),
    currentTime: () => (yt.getCurrentTime ? yt.getCurrentTime() : 0),
    state: () => (yt.getPlayerState ? yt.getPlayerState() : -1),
    mute: () => {
      if (yt.mute) yt.mute();
    },
    unmute: () => {
      if (yt.unMute) yt.unMute();
    },
    enableControls: () => {
      clearInterval(poll);
      const resumeAt = yt.getCurrentTime ? yt.getCurrentTime() : 0;
      yt.destroy();
      createUnlockedYouTubePlayer(resumeAt);
    },
  };
}

function createHtml5Player() {
  const v = document.createElement("video");
  v.src = VIDEO_SRC;
  v.playsInline = true;
  v.preload = "auto";
  v.controls = false;
  els.mount.appendChild(v);

  v.addEventListener("timeupdate", () => {
    if (!unlocked && !gateShown && v.currentTime >= GATE_TIME_SECONDS) {
      onGateTime();
    }
  });
  v.addEventListener("seeking", () => {
    if (!unlocked && v.currentTime > GATE_TIME_SECONDS) {
      v.currentTime = GATE_TIME_SECONDS;
    }
  });
  v.addEventListener("ended", onVideoEnd);

  return {
    play: () => v.play().catch(() => {}),
    pause: () => v.pause(),
    seek: (s) => {
      v.currentTime = s;
    },
    currentTime: () => v.currentTime,
    state: () => (v.ended ? 0 : v.paused ? 2 : 1),
    mute: () => {
      v.muted = true;
    },
    unmute: () => {
      v.muted = false;
    },
    enableControls: () => {
      v.controls = true;
    },
  };
}

function attemptAutoplay() {
  player.mute();
  player.play();
  setTimeout(() => {
    if (started) return;
    const s = player.state();
    if (s === 1 || s === 3) {
      started = true;
      els.cover.classList.add("hidden");
      lockVideo();
      els.unmute.classList.add("visible");
    } else {
      player.pause();
      player.unmute();
    }
  }, 1200);
}

function resumePlayback() {
  let attempts = 0;
  player.play();
  const tick = setInterval(() => {
    const s = player.state();
    if (s === 1 || s === 3 || s === 0) {
      clearInterval(tick);
      return;
    }
    if (++attempts > 6) {
      clearInterval(tick);
      els.cover.classList.remove("hidden");
      return;
    }
    player.play();
  }, 400);
}

function startVideo() {
  if (started) return;
  started = true;
  els.cover.classList.add("hidden");
  lockVideo();

  if (player) {
    player.unmute();
    player.play();
  } else pendingPlay = true;
}

function coverTapped() {
  if (!started) {
    startVideo();
    return;
  }
  els.cover.classList.add("hidden");
  if (player) player.play();
}

els.cover.addEventListener("click", coverTapped);
els.cover.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    coverTapped();
  }
});

els.shield.addEventListener("click", () => {
  if (!gateShown && !unlocked && player) player.play();
});

if (IS_YOUTUBE) {
  els.cover.style.backgroundImage = `url("https://i.ytimg.com/vi/${YT_ID}/maxresdefault.jpg"), url("https://i.ytimg.com/vi/${YT_ID}/hqdefault.jpg")`;
}

if (IS_YOUTUBE) {
  window.onYouTubeIframeAPIReady = () => {
    player = createYouTubePlayer();
  };
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
} else {
  player = createHtml5Player();
  attemptAutoplay();
}

els.unmute.addEventListener("click", () => {
  els.unmute.classList.remove("visible");
  player.unmute();
  if (!gateShown) player.seek(0);
  player.play();
});

function sendLead(lead) {
  if (
    !APPS_SCRIPT_URL ||
    APPS_SCRIPT_URL === "PASTE_YOUR_DEPLOYED_APPS_SCRIPT_WEB_APP_URL_HERE"
  ) {
    console.warn("Rockae: APPS_SCRIPT_URL not configured - lead not sent:", lead);
    return Promise.resolve();
  }

  return fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(lead),
  }).catch((err) => console.error("Rockae: Apps Script submission failed", err));
}

els.form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("leadName").value.trim();
  const email = document.getElementById("leadEmail").value.trim();
  const whatsapp = document.getElementById("leadWhatsapp").value.trim();

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneOk = /^[+\d][\d\s\-()]{6,}$/.test(whatsapp);

  if (!name || !emailOk || !phoneOk) {
    els.formError.classList.add("visible");
    return;
  }
  els.formError.classList.remove("visible");
  els.submitBtn.disabled = true;
  els.submitBtn.textContent = "Unlocking…";

  sendLead({
    name,
    email,
    whatsapp,
    source: "rockae-video-landing",
    gated_at_seconds: GATE_TIME_SECONDS,
    submitted_at: new Date().toISOString(),
    page_url: location.href,
  });

  unlocked = true;
  hideOverlay(els.gateOverlay);
  unlockVideo();
  player.enableControls();
});

els.watchAgain.addEventListener("click", () => {
  hideOverlay(els.endOverlay);
  player.seek(0);
  player.play();
});

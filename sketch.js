// ========================================
// LOCALIZATION
// currentLang is read once at script load, from whatever the person
// picked last time on the #langPicker screen (defaults to English).
// Every image and audio file is loaded through the helpers below, which
// look for a "_<lang>" suffixed version of the same filename and fall
// back to the plain English file if it doesn't exist — so a language can
// be added just by dropping in translated asset files, no code changes.
// ========================================
let currentLang = "en";
try {
  currentLang = localStorage.getItem("cprLang") || "en";
} catch (e) { /* localStorage unavailable, default to English */ }

// Turns "filename.ext" into "filename_<lang>.ext" (unchanged for English).
function localizedPath(filename) {
  if (currentLang === "en") return filename;
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return filename;
  return filename.slice(0, dot) + "_" + currentLang + filename.slice(dot);
}

// Loads a sound through the current language's asset naming convention.
// If the translated file is missing, logs a warning but doesn't crash —
// that specific clip just won't play until the asset is supplied.
function loadLocalizedSound(filename) {
  return loadSound(localizedPath(filename), null, function () {
    console.warn("Missing localized audio (falling back to silence):", localizedPath(filename));
  });
}

// Rewrites every <img src> and <audio src> on the page to its "_<lang>"
// version. Falls back to the original English file automatically if a
// translated version 404s, so a partially-translated asset pack never
// breaks the UI or leaves a scene silent.
function localizeStaticAssets() {
  if (currentLang === "en") return;
  document.querySelectorAll("img[src], audio[src]").forEach(function (el) {
    if (el.dataset.i18nApplied) return;
    el.dataset.i18nApplied = "1";
    const orig = el.getAttribute("src");
    const localized = localizedPath(orig);
    if (localized === orig) return;
    el.onerror = function () {
      el.onerror = null;
      el.src = orig; // translated asset missing — fall back to English
      if (el.tagName === "AUDIO") el.load();
    };
    el.src = localized;
    if (el.tagName === "AUDIO") el.load(); // audio elements need an explicit reload after changing src
  });
}

let userName = "";        // learner's name, used to track their progress
let scoreLoggedForAttempt = false;  // guards against logging the same attempt multiple times
const CHART_WINDOW_SIZE = 7;        // number of attempts shown in "recent" (zoomed-in) mode
let chartMode = "recent";           // "recent" | "all" — toggled by the chart's view buttons
let genderState = null;   // 1 = Raja, 0 = Rani

// ========================================
// BREATHING SCENARIO CYCLING
// Instead of picking a random breathing scenario each session (which can
// repeat the same one several times in a row, or skip one for a while by
// chance), this guarantees balanced coverage: no breathing -> abnormal
// breathing -> normal breathing -> repeats, persisted across sessions
// (and page reloads) via localStorage so the sequence keeps advancing
// correctly for the same learner over time.
// ========================================
const BREATH_SCENARIOS = ["none", "abnormal", "normal"];
function nextBreathScenario() {
  let idx = 0;
  try {
    idx = parseInt(localStorage.getItem("cprBreathScenarioIndex") || "0", 10);
    if (isNaN(idx) || idx < 0) idx = 0;
  } catch (e) { /* localStorage unavailable, just start from "none" each time */ }
  const scenario = BREATH_SCENARIOS[idx % BREATH_SCENARIOS.length];
  try {
    localStorage.setItem("cprBreathScenarioIndex", String(idx + 1));
  } catch (e) { /* ignore */ }
  return scenario;
}
// pre question answers
let preAnswers = {
    q1: "",
    q2: "",
    q3: "",
    q4: "",
    q5: "",
    q6: ""
};

let postAnswers = {
    q1: "",
    q2: "",
    q3: "",
    q4: "",
    q5: "",
    q6: "",
    q7: ""
};
let postQ7Photo = null;
let photoBase64 = "";
let mic;
let listeningForResponse = false;
let responseTimeout = null;
let breathScenario = "none"; // "none" | "abnormal" | "normal" — set by nextBreathScenario()
let breathTimerInterval = null; // holds the setInterval id for the checkbreathing countdown badge
let dialedNumber = ''; // <-- Dial Pad Variable
let t1, t2, t3, t4, t5,t6;
let tOkOk, tHmHm; // timers for the "ok ok" / "hm hm" filler audio after pressing speaker
let canvas;
let canvasActive = false;
let count=0;
let currentState = "blank";
let gameOutcome = "";
let compression_count = 0;
let now,interval;
let lastTouchTime = 0;
// play screen
let cheekOpacity = 40;
let lipOpacity = 120;
let play_start_time,play_elapsed = 0;
// for active blood fill
let goodfillRate = 100;
let badfillRate = 50;
let progress = 0;
//bpm meter
let angle = 0;
let bpm = 0; 
let bpmSum = 0;         // running total of every instantaneous BPM reading this session, for the average
let bpmSampleCount = 0; // how many readings have gone into bpmSum
let numberToDisplay;
let decayRate = 10;
let decay_normal = 90;
// compressions 
let maxTotalCompressions = 0;
let task_time;
let timeleft;
let good_compression = 0;
let diffGoal = 0;
let fastcount =0;
let slowcount = 0;
// track inactivity
let pressed_time = 0 ;
let lastTouchElapsed = 0;
// 
let breathc = 0;
let couldobserveb;
// log data google app script
const scriptURL = "https://script.google.com/macros/s/AKfycbynsGNNdynT2YybEsUAMbjIG1xfg-N7-Nd-WznZ5luTkEka9ox59BJl7aRzGr1r-eyc/exec";
let sessionLogged = false;
// play screen
let playimg,heartimg,meterimg,arrowimg;
function preload(){
  // play screen
  playimg = loadImage("eyes+ (2).png");
  heartimg = loadImage("heart.png");
  meterimg = loadImage("bpm meter86.png");
  arrowimg = loadImage("arrow2.png");
  //sound
  respondedaud = loadLocalizedSound("ElevenLabs_2025-06-I am .mp3");
  respondednextaud = loadLocalizedSound("ElevenLabs_2025-06-16T10_02_51_Alice_pre_sp100_s50_sb75_v3.mp3");
  promisertaud = loadLocalizedSound("ElevenLabs_2025-11-04T11_56_30_Alice_pre_sp100_s50_sb75_v3.mp3");
  //
  gasp_aud = loadSound("gasping.m4a");
  normal_breath_aud = loadSound("breathing-6811.mp3");
  couldobserveb = loadLocalizedSound("could_you_see_breathing.mp3");
  ifbreathnormalaud = loadLocalizedSound("ElevenLabs_2025-06-17T23_01_53_Alice_pre_sp100_s50_sb75_v3.mp3");
  promisebtaud = loadLocalizedSound("ElevenLabs_2025-11-04T11_55_06_Alice_pre_sp100_s50_sb75_v3.mp3");
  
  
  ring = loadSound("mixkit-office-telephone-ring-1350.wav");
  dial = loadSound("9aud.mp3");
  addspeakeraud = loadLocalizedSound("ElevenLabs_2025-11-04T12_00_41_Alice_pre_sp100_s50_sb75_v3.mp3");
  victimaud = loadLocalizedSound("ElevenLabs_2025-11-04T17_32_18_Alice_pre_sp100_s50_sb75_v3.mp3");
  okokaud = loadLocalizedSound("ok_ok.mp3");   // filler audio: dispatcher says "ok ok" — rename if your file differs
  hmhmaud = loadLocalizedSound("hm_hm.mp3");   // filler audio: dispatcher says "hm hm" — rename if your file differs

  cprC1aud = loadLocalizedSound("ElevenLabs_2025-06-28T05_17_33_Alice_pre_sp100_s50_sb75_v3.mp3");
  cprC2aud = loadLocalizedSound("ElevenLabs_2025-06-25T03_15_33_Alice_pre_sp100_s50_sb75_v3.mp3");
  cprC3aud = loadLocalizedSound("ElevenLabs_2025-06-16T00_04_57_Alice_pre_sp100_s50_sb75_v3.mp3");
  cprC4aud = loadLocalizedSound("ElevenLabs_2025-06-25T03_12_37_Alice_pre_sp100_s50_sb75_v3.mp3");
  cprBeginaud = loadLocalizedSound("ElevenLabs_2025-11-05T03_21_18_Alice_pre_sp100_s50_sb75_v3.mp3");

  press_music = loadSound("mixkit-message-pop-alert-2354.mp3");
  winaud = loadSound("mixkit-fairy-arcade-sparkle-866.wav");
  aedaud = loadLocalizedSound("ElevenLabs_2025-06-16T12_58_21_Alice_pre_sp100_s50_sb75_v3.mp3");
  ambaud = loadSound("ambulance-312230.mp3");
  lateaud = loadSound("negative_beeps-6008.mp3");
  promisewtaud = loadLocalizedSound("ElevenLabs_2025-11-05T06_53_28_Alice_pre_sp100_s50_sb75_v3.mp3");
  promiseiltaud = loadLocalizedSound("ElevenLabs_2025-12-10T02_39_25_Alice_pre_sp100_s50_sb75_v3.mp3");
  promisefltaud = loadLocalizedSound("ElevenLabs_2025-12-10T02_40_37_Alice_pre_sp100_s50_sb75_v3.mp3");
  promisesltaud = loadLocalizedSound("ElevenLabs_2025-12-10T02_41_38_Alice_pre_sp100_s50_sb75_v3.mp3");
}

function setup() {
  breathScenario = nextBreathScenario();
  console.log(breathScenario);
  maxTotalCompressions = floor(random(30, 130));
  task_time = 600 * maxTotalCompressions+3000;
  mic = new p5.AudioIn();
  //mic.start();
  imageMode(CENTER);
}

// =====================================================
// COMPRESSION SCORE BADGE HELPER
// Calculates score from good_compression / maxTotalCompressions
// and updates ALL badge elements at once.
// Color: green (#038660) for diff <= 10, red (#FF5058) for diff > 10
// =====================================================
function showCompressionScore() {
  // 1. Calculate absolute difference from the target goal
  let diff = Math.abs(maxTotalCompressions - good_compression);

  // 2. Set color based on difference (consistent across ALL outcomes)
  let badgeColor = (diff <= 10) ? "#038660" : "#FF5058";

  // 3. Array of all badge element IDs across your web app
  const allBadges = [
    // Late screens
    { badge: "lateScoreBadge",  value: "lateScoreValue",  denom: "lateScoreDenom"  },
    { badge: "lateScoreBadge2", value: "lateScoreValue2", denom: "lateScoreDenom2" },
    { badge: "lateScoreBadge3", value: "lateScoreValue3", denom: "lateScoreDenom3" },
    { badge: "lateScoreBadge4", value: "lateScoreValue4", denom: "lateScoreDenom4" },
    { badge: "lateScoreBadge5", value: "lateScoreValue5", denom: "lateScoreDenom5" },
    { badge: "lateScoreBadge6", value: "lateScoreValue6", denom: "lateScoreDenom6" },
    { badge: "lateScoreBadge7", value: "lateScoreValue7", denom: "lateScoreDenom7" },
    { badge: "lateScoreBadge8", value: "lateScoreValue8", denom: "lateScoreDenom8" },
    
    // Win / Amb / AED screens
    { badge: "winRajaScoreBadge", value: "winRajaScoreValue", denom: "winRajaScoreDenom" },
    { badge: "winRaniScoreBadge", value: "winRaniScoreValue", denom: "winRaniScoreDenom" },
    { badge: "ambRajaScoreBadge", value: "ambRajaScoreValue", denom: "ambRajaScoreDenom" },
    { badge: "ambRaniScoreBadge", value: "ambRaniScoreValue", denom: "ambRaniScoreDenom" },
    { badge: "aedRajaScoreBadge", value: "aedRajaScoreValue", denom: "aedRajaScoreDenom" },
    { badge: "aedRaniScoreBadge", value: "aedRaniScoreValue", denom: "aedRaniScoreDenom" }
  ];

  // 4. Update every badge that exists on the page
  allBadges.forEach(item => {
    let badgeEl = document.getElementById(item.badge);
    let valueEl = document.getElementById(item.value);
    let denomEl = document.getElementById(item.denom);

    if (badgeEl) {
      badgeEl.style.backgroundColor = badgeColor;
    }
    if (valueEl) {
      valueEl.textContent = good_compression;
    }
    if (denomEl) {
      denomEl.textContent = "/" + maxTotalCompressions;
    }
  });

  // 5. Save this attempt to the learner's progress history — only once,
  //    even though this whole function keeps getting called every frame
  //    for as long as the outcome screen stays on screen.
  if (!scoreLoggedForAttempt) {
    logProgress();
    scoreLoggedForAttempt = true;
  }
}

// =====================================================
// PROGRESS TRACKING
// Saves every attempt's compression score (per learner
// name) to localStorage so it can be graphed later.
// =====================================================
function logProgress() {
  try {
    const record = {
      name: userName || "Friend",
      score: good_compression,
      max: maxTotalCompressions,
      percent: maxTotalCompressions > 0
        ? Math.round((good_compression / maxTotalCompressions) * 100)
        : 0,
      avgBpm: bpmSampleCount > 0 ? Math.round(bpmSum / bpmSampleCount) : 0,
      date: new Date().toISOString()
    };
    const log = JSON.parse(localStorage.getItem("cprProgressLog") || "[]");
    log.push(record);
    localStorage.setItem("cprProgressLog", JSON.stringify(log));
  } catch (e) {
    console.error("Could not save progress:", e);
  }
}

function getUserProgress() {
  try {
    const log = JSON.parse(localStorage.getItem("cprProgressLog") || "[]");
    return log.filter(r => r.name === (userName || "Friend"));
  } catch (e) {
    return [];
  }
}

// Relative label shown above each point ("Today", "Yesterday", "3 days ago"...)
function formatRelativeLabel(dateStr) {
  const d = new Date(dateStr);
  const startOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return diffDays + " days ago";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Full date/time shown in the tooltip when a point is tapped
function formatFullDateTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const CHART_BASELINE_OFFSET = 20; // px reserved below the baseline for attempt numbers
const CHART_TOP_PADDING = 16;     // px reserved above the 100% line for the topmost point's radius
const CHART_GUTTER_WIDTH = 46;    // px reserved on the left for the axis title + number column

// Builds a line chart of each attempt's compression accuracy as a
// percentage (good_compression / maxTotalCompressions * 100) plotted
// against a fixed 0–100 axis with gridlines, using plain positioned DOM
// elements (not canvas) so it scrolls, sizes, and hit-tests reliably
// across devices. Attempts are spaced at a fixed width so points never
// overlap — the track just grows wider and becomes horizontally
// scrollable instead, while the y-axis numbers stay fixed.
function renderProgressChart() {
  const allRecords = getUserProgress();
  const track = document.getElementById("progressChartTrack");
  const scrollWrap = document.getElementById("progressChartScroll");
  const chartWrap = document.getElementById("progressChartWrap");
  const noDataEl = document.getElementById("progressNoData");
  const latestScoreEl = document.getElementById("progressLatestScore");
  const latestDenomEl = document.getElementById("progressLatestDenom");
  const latestValueEl = document.getElementById("progressLatestValue");
  const latestBpmEl = document.getElementById("progressLatestBpm");
  const latestBpmValueEl = document.getElementById("progressLatestBpmValue");
  const arrowLeft = document.getElementById("progressChartArrowLeft");
  const arrowRight = document.getElementById("progressChartArrowRight");
  const tooltip = document.getElementById("progressTooltip");
  const yLabel = document.querySelector(".progressChartYLabel");
  const xLabel = document.querySelector(".progressChartXLabel");
  const axisNums = document.getElementById("progressChartAxisNums");

  if (tooltip) tooltip.style.display = "none";

  // Latest score card always reflects the most recent attempt — shown as
  // the actual good compressions out of that session's target, and
  // colored to match the same pass/fail logic as the chart points and
  // badges (green within 10 of target, red otherwise) instead of a
  // fixed color.
  if (latestScoreEl) {
    const latest = allRecords.length ? allRecords[allRecords.length - 1] : null;
    latestScoreEl.textContent = latest ? latest.score : 0;
    if (latestDenomEl) latestDenomEl.textContent = "/" + (latest ? latest.max : 0);
    if (latestValueEl) {
      const latestDiff = latest ? Math.abs(latest.max - latest.score) : 0;
      latestValueEl.style.color = (!latest || latestDiff <= 10) ? "#038660" : "#FF5058";
    }
    if (latestBpmEl) {
      const avgBpm = latest ? (latest.avgBpm || 0) : 0;
      latestBpmEl.textContent = avgBpm;
      if (latestBpmValueEl) {
        // Green when the average sits in the standard 100-120 CPR target
        // range (same range handle_live() treats as "good"), red otherwise.
        const bpmInRange = avgBpm >= 100 && avgBpm <= 120;
        latestBpmValueEl.style.color = (!latest || bpmInRange) ? "#038660" : "#FF5058";
      }
    }
  }

  if (!track || !scrollWrap || !chartWrap) return;
  track.innerHTML = "";
  if (axisNums) axisNums.innerHTML = "";

  if (allRecords.length === 0) {
    scrollWrap.style.display = "none";
    if (yLabel) yLabel.style.display = "none";
    if (xLabel) xLabel.style.display = "none";
    if (axisNums) axisNums.style.display = "none";
    if (arrowLeft) arrowLeft.style.display = "none";
    if (arrowRight) arrowRight.style.display = "none";
    if (noDataEl) noDataEl.style.display = "block";
    return;
  }
  scrollWrap.style.display = "block";
  if (yLabel) yLabel.style.display = "flex";
  if (xLabel) xLabel.style.display = "block";
  if (axisNums) axisNums.style.display = "block";
  if (noDataEl) noDataEl.style.display = "none";

  // "recent" (zoomed in) always shows just the latest CHART_WINDOW_SIZE
  // attempts. "all" (zoomed out) shows literally every attempt, spread
  // evenly across the same width — points naturally get closer together
  // as more attempts accumulate, so the whole history is always visible
  // at a glance with no paging or scrolling needed.
  let displayRecords, indexOffset;
  if (chartMode === "recent") {
    displayRecords = allRecords.slice(-CHART_WINDOW_SIZE);
    indexOffset = allRecords.length - displayRecords.length;
  } else {
    displayRecords = allRecords;
    indexOffset = 0;
  }

  const wrapRect = chartWrap.getBoundingClientRect();
  const trackHeight = Math.max(Math.round(wrapRect.height) - CHART_BASELINE_OFFSET, 140);
  const scrollVisibleWidth = Math.round(wrapRect.width) - CHART_GUTTER_WIDTH;
  const step = displayRecords.length > 0 ? scrollVisibleWidth / displayRecords.length : scrollVisibleWidth;

  track.style.width = scrollVisibleWidth + "px";
  track.style.height = trackHeight + "px";
  scrollWrap.scrollLeft = 0; // content always fits exactly now — nothing to scroll

  const baseline = document.createElement("div");
  baseline.className = "chartBaseline";
  baseline.style.bottom = CHART_BASELINE_OFFSET + "px";
  track.appendChild(baseline);

  const axisV = document.createElement("div");
  axisV.className = "chartAxisVertical";
  axisV.style.bottom = CHART_BASELINE_OFFSET + "px";
  axisV.style.top = "0px";
  track.appendChild(axisV);

  // usableHeight spans the full 0–100% range on the fixed axis: from the
  // baseline (0%) up to CHART_TOP_PADDING below the track's top edge,
  // which leaves just enough room for a point sitting exactly at 100%
  // not to get clipped by the track's own bounds.
  const usableHeight = Math.max(trackHeight - CHART_BASELINE_OFFSET - CHART_TOP_PADDING, 40);

  // Gridlines + their matching fixed y-axis numbers, every 10%. axisNums
  // shares the exact same top/bottom box as the track, so a number's
  // "bottom" offset lines up with its gridline.
  for (let k = 0; k <= 10; k++) {
    const bottomPx = CHART_BASELINE_OFFSET + (k / 10) * usableHeight;

    const gridline = document.createElement("div");
    gridline.className = "chartGridLine";
    gridline.style.bottom = bottomPx + "px";
    track.appendChild(gridline);

    if (axisNums) {
      const num = document.createElement("div");
      num.className = "chartAxisNumber";
      num.style.bottom = bottomPx + "px";
      num.textContent = k * 10;
      axisNums.appendChild(num);
    }
  }

  // Precompute each point's position — "bottom" (for the point/gridline
  // coordinate system) and "top" (for the line-segment angle math below,
  // where standard rotate() degrees assume a top-left origin).
  const points = displayRecords.map((r, i) => {
    const x = step * i + step / 2;
    const pct = Math.min(Math.max(r.percent, 0), 100);
    const bottomPx = CHART_BASELINE_OFFSET + (pct / 100) * usableHeight;
    return { x, bottomPx, topPx: trackHeight - bottomPx, record: r };
  });

  // Connecting line segments, drawn first so the points sit on top of them.
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i], p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.topPx - p1.topPx;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const seg = document.createElement("div");
    seg.className = "chartLineSeg";
    seg.style.left = p1.x + "px";
    seg.style.top = p1.topPx + "px";
    seg.style.width = length + "px";
    seg.style.transform = "rotate(" + angle + "deg)";
    track.appendChild(seg);
  }

  // As more attempts get packed into the same width, shrink the dots so
  // neighbors don't overlap, down to a small legible floor. Below a
  // certain spacing, per-point attempt numbers would just overlap into
  // noise, so they're dropped — tapping a point still reveals its exact
  // attempt via the tooltip.
  const pointSize = Math.max(6, Math.min(16, Math.round(step - 6)));
  const showLabels = step >= 20;

  points.forEach((p, i) => {
    const r = p.record;
    const diff = Math.abs(r.max - r.score);
    const color = diff <= 10 ? "#038660" : "#FF5058";

    const point = document.createElement("div");
    point.className = "chartPoint";
    point.style.left = p.x + "px";
    point.style.bottom = p.bottomPx + "px";
    point.style.width = pointSize + "px";
    point.style.height = pointSize + "px";
    point.style.borderWidth = (pointSize <= 9 ? 1 : 2) + "px";
    point.style.background = color;
    const onTap = (e) => { e.preventDefault(); showChartTooltip(point, r); };
    point.addEventListener("click", onTap);
    point.addEventListener("touchend", onTap);
    track.appendChild(point);

    if (showLabels) {
      const attemptLabel = document.createElement("div");
      attemptLabel.className = "chartAttemptLabel";
      attemptLabel.style.left = p.x + "px";
      attemptLabel.style.bottom = "2px";
      attemptLabel.textContent = indexOffset + i + 1; // real attempt number, not reset per view
      track.appendChild(attemptLabel);
    }
  });

  // "All" mode always fits every attempt within the visible width (points
  // just get smaller/closer as history grows), so there's never anything
  // left to page through — the arrows stay hidden.
  if (arrowLeft) arrowLeft.style.display = "none";
  if (arrowRight) arrowRight.style.display = "none";
}

// Shows a small tooltip with the exact date/time above a tapped point
function showChartTooltip(pointEl, record) {
  const tooltip = document.getElementById("progressTooltip");
  const chartWrap = document.getElementById("progressChartWrap");
  if (!tooltip || !chartWrap) return;
  const pointRect = pointEl.getBoundingClientRect();
  const wrapRect = chartWrap.getBoundingClientRect();
  tooltip.textContent = formatFullDateTime(record.date) + " · " + record.score + "/" + record.max;
  tooltip.style.left = (pointRect.left - wrapRect.left + pointRect.width / 2) + "px";
  tooltip.style.top = (pointRect.top - wrapRect.top) + "px";
  tooltip.style.display = "block";
}
// setup question function 
function setupQuestion(config) {

    const input = document.getElementById(config.inputId);
    const notSure = document.getElementById(config.notSureId);
    const nextBtn = document.getElementById(config.nextBtnId);
    const currentScreen = document.getElementById(config.currentScreenId);
    const nextScreen = document.getElementById(config.nextScreenId);

    // User types
    input.addEventListener("input", function () {

        if (input.value.trim() !== "") {

            input.classList.add("selected");
            notSure.classList.remove("selected");

        } else {

            input.classList.remove("selected");

        }

    });

    // Not Sure
    function handleNotSure() {

        config.answerObject[config.questionKey] = "Not sure";

        input.value = "";

        input.classList.remove("selected");

        notSure.classList.add("selected");

    }

    notSure.addEventListener("click", handleNotSure);
    notSure.addEventListener("touchstart", handleNotSure);

    // Next
    function handleNext() {

        config.answerObject[config.questionKey] = input.value.trim();

    if (notSure.classList.contains("selected")) {
        config.answerObject[config.questionKey] = "Not sure";
    }

    currentScreen.style.display = "none";
    nextScreen.style.display = "flex";

    }

    nextBtn.addEventListener("click", handleNext);
    nextBtn.addEventListener("touchstart", handleNext);

}
window.onload = () => {
    // Rewrite any <img>/<audio> src to the chosen language's version, if
    // one exists (falls back to English automatically otherwise).
    localizeStaticAssets();

    // --- Screen Element Definitions ---
   const langPicker = document.getElementById("langPicker");
   const consent = document.getElementById("consent"); 
  const nameEntry = document.getElementById("nameEntry");
  const nameInput = document.getElementById("nameInput");
  const nameNext = document.getElementById("nameNext");
  const progressScreen = document.getElementById("progressScreen");
  const checkProgressBtnRaja = document.getElementById("checkProgressBtnRaja");
  const checkProgressBtnRani = document.getElementById("checkProgressBtnRani");
  const progressBackBtn = document.getElementById("progressBackBtn");
  const progressClearBtn = document.getElementById("progressClearBtn");
  const progressChartScroll = document.getElementById("progressChartScroll");
  const progressChartArrowLeft = document.getElementById("progressChartArrowLeft");
  const progressChartArrowRight = document.getElementById("progressChartArrowRight");
  const progressChartModeRecent = document.getElementById("progressChartModeRecent");
  const progressChartModeAll = document.getElementById("progressChartModeAll");
  const progressTooltip = document.getElementById("progressTooltip");
  const preq1 = document.getElementById("preq1");
  const preq1input = document.getElementById("preq1input");
  const preq1Next = document.getElementById("preq1Next");
 const preq1NotSure = document.getElementById("preq1NotSure");
 const preq2 = document.getElementById("preq2");
const preq3 = document.getElementById("preq3");
    const preq4 = document.getElementById("preq4");
    const preq5 = document.getElementById("preq5");
    const preq6 = document.getElementById("preq6");
    // postq
    const postq1 = document.getElementById("postq1");
    const postq2 = document.getElementById("postq2");
    const postq3 = document.getElementById("postq3");
    const postq4 = document.getElementById("postq4");
    const postq5 = document.getElementById("postq5");
    const postq6 = document.getElementById("postq6");
    const postq7 = document.getElementById("postq7");
    const postq7CameraBtn = document.getElementById("postq7CameraBtn");
    const postq7CameraInput = document.getElementById("postq7CameraInput");
    const postq7Input = document.getElementById("postq7input");
   const postq7Preview = document.getElementById("postq7Preview");
const photoPlaceholder = document.getElementById("photoPlaceholder");
const postq7Next = document.getElementById("postq7Next");
    postq7CameraBtn.onclick = () => {

    postq7CameraInput.click();

};
    
    const begin1 = document.getElementById("begin1");
    const gender = document.getElementById("gender");
    const intro = document.getElementById("intro");
    const checkdanger = document.getElementById("checkdanger");
    checkresponse = document.getElementById("checkresponse");
    checkresponseq = document.getElementById("checkresponseq");
    checkbreathing = document.getElementById("checkbreathing");
    awake = document.getElementById("awake");
    checkbreathingq = document.getElementById("checkbreathingq");
    checkbreathingtypeq = document.getElementById("checkbreathingtypeq");
    normalbreathing = document.getElementById("normalbreathing");
    dnotsafeq = document.getElementById("dnotsafeq");
    dcantsafe = document.getElementById("dcantsafe");
    promisedraja = document.getElementById("promisedraja");
    promisedrajapress = document.getElementById("promisedrajapress");
    promisesealedraja = document.getElementById("promisesealedraja");
    promisedrani = document.getElementById("promisedrani");
    promisedranipress = document.getElementById("promisedranipress");
    promisesealedrani = document.getElementById("promisesealedrani");
    responded = document.getElementById("responded");
    promiserrani = document.getElementById("promiserrani");
    promiserranipress = document.getElementById("promiserranipress");
    promiserraja = document.getElementById("promiserraja");
    promiserrajapress = document.getElementById("promiserrajapress");
    promisebraja = document.getElementById("promisebraja");
    promisebrajapress = document.getElementById("promisebrajapress");
    promisebrani = document.getElementById("promisebrani");
    promisebranipress = document.getElementById("promisebranipress");
    requestaed = document.getElementById("requestaed");
    dial112blank = document.getElementById("dial112blank");
    dial112 = document.getElementById("dial112");
    addspeaker = document.getElementById("addspeaker");
    addedspeaker = document.getElementById("addedspeaker");
    victiminca = document.getElementById("victiminca");
    cpr1 = document.getElementById("cpr1");
    cpr2 = document.getElementById("cpr2");
    cpr3 = document.getElementById("cpr3");
    cpr4 = document.getElementById("cpr4");
    cpr5 = document.getElementById("cpr5");
    p5Screen = document.getElementById("p5Screen");
    win = document.getElementById("win");
    promisewraja = document.getElementById("promisewraja");
    promisewrajapress = document.getElementById("promisewrajapress");
    promisewrani = document.getElementById("promisewrani");
    promisewranipress = document.getElementById("promisewranipress");
    latefast = document.getElementById("latefast");
    lateslow = document.getElementById("lateslow");
    lateinactive = document.getElementById("lateinactive");
    aed = document.getElementById("aed");
    promiseaedraja = document.getElementById("promiseaedraja");
    promiseaedrajapress = document.getElementById("promiseaedrajapress");
    promiseaedrani = document.getElementById("promiseaedrani");
    promiseaedranipress = document.getElementById("promiseaedranipress");
    amb = document.getElementById("amb");
    promiseambraja = document.getElementById("promiseambraja");
    promiseambrajapress = document.getElementById("promiseambrajapress");
    promiseambrani = document.getElementById("promiseambrani");
    promiseambranipress = document.getElementById("promiseambranipress");
    promiselateinactiveraja = document.getElementById("promiselateinactiveraja");
    promiselateinactiverajapress = document.getElementById("promiselateinactiverajapress");
    promiselateinactiverani = document.getElementById("promiselateinactiverani");
    promiselateinactiveranipress = document.getElementById("promiselateinactiveranipress");
    promiselatefastraja = document.getElementById("promiselatefastraja");
    promiselatefastrajapress = document.getElementById("promiselatefastrajapress");
    promiselatefastrani = document.getElementById("promiselatefastrani");
    promiselatefastranipress = document.getElementById("promiselatefastranipress");
    promiselateslowraja = document.getElementById("promiselateslowraja");
    promiselateslowrajapress = document.getElementById("promiselateslowrajapress");
    promiselateslowrani = document.getElementById("promiselateslowrani");
    promiselateslowranipress = document.getElementById("promiselateslowranipress");
    // setup quesions
    //setup function call2
    setupQuestion({
    inputId: "preq2input",
    notSureId: "preq2NotSure",
    nextBtnId: "preq2Next",
    currentScreenId: "preq2",
    nextScreenId: "preq3",
    answerObject: preAnswers,
    questionKey: "q2"
});
    // sq3
    setupQuestion({
    inputId: "preq3input",
    notSureId: "preq3NotSure",
    nextBtnId: "preq3Next",
    currentScreenId: "preq3",
    nextScreenId: "preq4",
    answerObject: preAnswers,
    questionKey: "q3"
});
    //sq4
    setupQuestion({
    inputId: "preq4input",
    notSureId: "preq4NotSure",
    nextBtnId: "preq4Next",
    currentScreenId: "preq4",
    nextScreenId: "preq5",
    answerObject: preAnswers,
    questionKey: "q4"
});
    //sq5
    setupQuestion({
    inputId: "preq5input",
    notSureId: "preq5NotSure",
    nextBtnId: "preq5Next",
    currentScreenId: "preq5",
    nextScreenId: "preq6",
    answerObject: preAnswers,
    questionKey: "q5"
});
    //sq6
    setupQuestion({
    inputId: "preq6input",
    notSureId: "preq6NotSure",
    nextBtnId: "preq6Next",
    currentScreenId: "preq6",
    nextScreenId: "begin1",
    answerObject: preAnswers,
    questionKey: "q6"
});
    // postq setup questions
    //setup function postq1
    setupQuestion({
    inputId: "postq1input",
    notSureId: "postq1NotSure",
    nextBtnId: "postq1Next",
    currentScreenId: "postq1",
    nextScreenId: "postq2",
    answerObject: postAnswers,
    questionKey: "q1"
});
    //postq2
    setupQuestion({
    inputId: "postq2input",
    notSureId: "postq2NotSure",
    nextBtnId: "postq2Next",
    currentScreenId: "postq2",
    nextScreenId: "postq3",
    answerObject: postAnswers,
    questionKey: "q2"
});
    //postq3
    setupQuestion({
    inputId: "postq3input",
    notSureId: "postq3NotSure",
    nextBtnId: "postq3Next",
    currentScreenId: "postq3",
    nextScreenId: "postq4",
    answerObject: postAnswers,
    questionKey: "q3"
});
    //postq4
    setupQuestion({
    inputId: "postq4input",
    notSureId: "postq4NotSure",
    nextBtnId: "postq4Next",
    currentScreenId: "postq4",
    nextScreenId: "postq5",
    answerObject: postAnswers,
    questionKey: "q4"
});
    //postq5
    setupQuestion({
    inputId: "postq5input",
    notSureId: "postq5NotSure",
    nextBtnId: "postq5Next",
    currentScreenId: "postq5",
    nextScreenId: "postq6",
    answerObject: postAnswers,
    questionKey: "q5"
});
    //postq6
    setupQuestion({
    inputId: "postq6input",
    notSureId: "postq6NotSure",
    nextBtnId: "postq6Next",
    currentScreenId: "postq6",
    nextScreenId: "postq7",
    answerObject: postAnswers,
    questionKey: "q6"
});
   

    // --- Button Element Definitions ---
    const consentBtn = document.getElementById("consentBtn");
    const beginBtn = document.getElementById("beginBtn");
    const beginBubBtn = document.getElementById("beginBubBtn");
    const rajaBtn = document.getElementById("rajaBtn");
    const raniBtn = document.getElementById("raniBtn");
    const startBtn = document.getElementById("startBtn");
    const dyesBtn = document.getElementById("dyesBtn");
    const dnoBtn = document.getElementById("dnoBtn");
    const ryesBtn = document.getElementById("ryesBtn");
    const rnoBtn = document.getElementById("rnoBtn");
    const byesBtn = document.getElementById("byesBtn");
    const bnoBtn = document.getElementById("bnoBtn");
    const normalBtn = document.getElementById("normalBtn");
    const abnormalBtn = document.getElementById("abnormalBtn");
    const nowsafeBtn = document.getElementById("nowsafeBtn");
    const cantsafeBtn = document.getElementById("cantsafeBtn");
    const nextpBtn = document.getElementById("nextpBtn");
    const dpromisepress = document.getElementById("dpromisepress");
    const dranipromisepress = document.getElementById("dranipromisepress");
    const rranipromisepress = document.getElementById("rranipromisepress");
    const rrajapromisepress = document.getElementById("rrajapromisepress");
    const nextBtn = document.getElementById("nextBtn");
    const nextprBtn = document.getElementById("nextprBtn");
    const nextvBtn = document.getElementById("nextvBtn");
    const branipromisepress = document.getElementById("branipromisepress");
    const bpromisepress = document.getElementById("bpromisepress");
    const nextaBtn = document.getElementById("nextaBtn");
    const callBtn = document.getElementById("callBtn");
    const speakerbtn = document.getElementById("speakerbtn");
    const nextc1 = document.getElementById("nextc1");
    const nextc2 = document.getElementById("nextc2");
    const nextc3 = document.getElementById("nextc3");
    const nextc4 = document.getElementById("nextc4");
    const startcpr = document.getElementById("startcpr");
    const nextwinBtn = document.getElementById("nextwinBtn");
    const nextaedBtn = document.getElementById("nextaedBtn");
    const nextambBtn = document.getElementById("nextambBtn");
    const nextlateinactiveBtn = document.getElementById("nextlateinactiveBtn");
    const nextlateslowBtn = document.getElementById("nextlateslowBtn");
    const nextlatefastBtn = document.getElementById("nextlatefastBtn");
    const practiceagainbtnraja = document.getElementById("practiceagainbtnraja");
    const practiceagainbtnrani = document.getElementById("practiceagainbtnrani");
    const wpromisepress = document.getElementById("wpromisepress");
    const wranipromisepress = document.getElementById("wranipromisepress");

    // ========================================
    // DIAL PAD LOGIC
    // ========================================
    const dialDisplay = document.getElementById("dialDisplay"); 
    const dialBtn0 = document.getElementById("dialBtn0");
    const dialBtn1 = document.getElementById("dialBtn1");
    const dialBtn2 = document.getElementById("dialBtn2");
    const dialBtn3 = document.getElementById("dialBtn3");
    const dialBtn4 = document.getElementById("dialBtn4");
    const dialBtn5 = document.getElementById("dialBtn5");
    const dialBtn6 = document.getElementById("dialBtn6");
    const dialBtn7 = document.getElementById("dialBtn7");
    const dialBtn8 = document.getElementById("dialBtn8");
    const dialBtn9 = document.getElementById("dialBtn9");
    const deleteBtnDial = document.getElementById("deleteBtnDial"); 

    const checkCallButtonState = () => {
    if (dialedNumber === "112" || dialedNumber === "108") {
        callBtn.disabled = false;
        callBtn.style.opacity = 1.0;
    } else {
        callBtn.disabled = true;
        callBtn.style.opacity = 0.5;
    }
};

    const addDigit = (digit) => {
        dial.play();
        if (dialedNumber.length < 3) { 
            dialedNumber += digit;
            dialDisplay.textContent = dialedNumber;
            dialDisplay.classList.remove("empty"); 
            checkCallButtonState(); 
        }
    };

    const deleteDigit = (e) => {
        if (e) e.preventDefault();
        dialedNumber = dialedNumber.slice(0, -1);
        if (dialedNumber.length === 0) {
            dialDisplay.textContent = "112/108";
            dialDisplay.classList.add("empty"); 
        } else {
            dialDisplay.textContent = dialedNumber;
        }
        checkCallButtonState(); 
    };

    const setupDialButton = (btnElement, digit) => {
        if (!btnElement) return;
        const handler = (e) => {
            if (e) e.preventDefault();
            addDigit(digit);
        };
        btnElement.addEventListener('click', handler);
        btnElement.addEventListener('touchstart', handler);
    };

    setupDialButton(dialBtn0, '0');
    setupDialButton(dialBtn1, '1');
    setupDialButton(dialBtn2, '2');
    setupDialButton(dialBtn3, '3');
    setupDialButton(dialBtn4, '4');
    setupDialButton(dialBtn5, '5');
    setupDialButton(dialBtn6, '6');
    setupDialButton(dialBtn7, '7');
    setupDialButton(dialBtn8, '8');
    setupDialButton(dialBtn9, '9');

    deleteBtnDial.addEventListener('click', deleteDigit);
    deleteBtnDial.addEventListener('touchstart', deleteDigit);

    checkCallButtonState();
    dialDisplay.textContent = "112/108";
    dialDisplay.classList.add("empty"); 

    // ========================================
    // P5.js Canvas Functions
    // ========================================
    function startCanvas() {
        if (!canvasActive) {
            canvas = createCanvas(windowWidth, windowHeight);
            canvas.parent("p5Screen");
            canvasActive = true;
        }
    }

    function removeCanvas() {
        if (canvasActive) {
            canvas.remove();
            canvasActive = false;
        }
    }

    // --- Event Listeners ---

    // Language picker: reselecting the language already active this load
    // just proceeds straight to consent; picking a different language
    // saves it and reloads, so preload() picks up the right audio files
    // from the very start (p5's preload runs before any UI interaction
    // could otherwise tell it which language was chosen).
    document.querySelectorAll(".langOption").forEach((btn) => {
        const choose = (e) => {
            if (e) e.preventDefault();
            const lang = btn.getAttribute("data-lang");
            try { localStorage.setItem("cprLang", lang); } catch (err) { /* ignore */ }
            if (lang === currentLang) {
                langPicker.style.display = "none";
                consent.style.display = "flex";
            } else {
                window.location.reload();
            }
        };
        btn.addEventListener('click', choose);
        btn.addEventListener('touchstart', choose);
    });

   const handleConsent = () => {
        consent.style.display = "none";
        nameEntry.style.display = "flex";
        //begin1.style.display = "flex";
      //logSession();
    };
    consentBtn.onclick = handleConsent;
    consentBtn.addEventListener('touchstart', handleConsent);

    // Prefill with last-used name, if any
    try {
        const savedName = localStorage.getItem("cprUserName");
        if (savedName) nameInput.value = savedName;
    } catch (e) { /* localStorage unavailable, ignore */ }

    const handleNameNext = () => {
        const typed = nameInput.value.trim();
        userName = typed !== "" ? typed : "Friend";
        try {
            localStorage.setItem("cprUserName", userName);
        } catch (e) { /* localStorage unavailable, ignore */ }

        nameEntry.style.display = "none";
        preq1.style.display = "flex";
    };
    nameNext.onclick = handleNameNext;
    nameNext.addEventListener('touchstart', handleNameNext);
    preq1input.addEventListener("input", function () {

    if (preq1input.value.trim() !== "") {

        preq1input.classList.add("selected");
        preq1NotSure.classList.remove("selected");

    } else {

        preq1input.classList.remove("selected");

    }

});


  const handlePreQ1Next = () => {

    if (preq1input.value.trim() !== "") {
        preAnswers.q1 = preq1input.value;
    }

    preq1.style.display = "none";
    preq2.style.display = "flex";

    console.log(preAnswers.q1);
};
  preq1Next.onclick = handlePreQ1Next;
  preq1Next.addEventListener('touchstart', handlePreQ1Next);
const handlePreQ1NotSure = () => {

    // save answer
    preAnswers.q1 = "Not sure";

    // clear input
    preq1input.value = "";
    preq1input.classList.remove("selected");

    // highlight button
    preq1NotSure.classList.add("selected");
};


preq1NotSure.addEventListener("click", handlePreQ1NotSure);
preq1NotSure.addEventListener("touchstart", handlePreQ1NotSure);

postq7CameraInput.addEventListener("change", (event) => {

    const file = event.target.files[0];

    if (!file) return;

    // Save the photo
    postQ7Photo = file;

    const reader = new FileReader();

    reader.onload = function(e){

    // Save the image for uploading later
    photoBase64 = e.target.result;

    // Show preview
    postq7Preview.src = photoBase64;
    postq7Preview.style.display = "block";

    photoPlaceholder.style.display = "none";

    console.log("Photo size:", photoBase64.length);
};

    reader.readAsDataURL(file);

});

    const handlePostQ7Next = () => {

    postAnswers.q7 = postq7Input.value;

    logSession();

    showPromiseScreen();
};
postq7Next.onclick = handlePostQ7Next;
postq7Next.addEventListener("touchstart", handlePostQ7Next);
    
  const handleBegin = () => {
        userStartAudio();
        mic.start();
        begin1.style.display = "none";
        gender.style.display = "flex";
      //logSession();
    };
    beginBtn.onclick = handleBegin;
    beginBtn.addEventListener('touchstart', handleBegin);

    const handleBubbleShortcut = () => {
        userStartAudio();
        [t1, t2, t3, t4, t5, t6, tOkOk, tHmHm].forEach(t => clearTimeout(t));
        begin1.style.display = "none";
        intro.style.display = "none";
        cpr4.style.display = "none";
        cpr5.style.display = "flex";
        introAudio.pause();
        introAudio.currentTime = 0;
        cprC4aud.stop();
        cprBeginaud.play();
    };
    beginBubBtn.onclick = handleBubbleShortcut;
    beginBubBtn.addEventListener('touchstart', handleBubbleShortcut);

    const handleRaja = () => {
        genderState = 1;
        console.log("Gender:", genderState);
        introAudio.play();
        gender.style.display = "none";
        intro.style.display = "flex";
    };
    rajaBtn.onclick = handleRaja;
    rajaBtn.addEventListener('touchstart', handleRaja);

    const handleRani = () => {
        genderState = 0;
        console.log("Gender:", genderState);
        introAudio.play();
        gender.style.display = "none";
        intro.style.display = "flex";
    };
    raniBtn.onclick = handleRani;
    raniBtn.addEventListener('touchstart', handleRani);

    const handleStart = () => {
        intro.style.display = "none";
        checkdanger.style.display = "flex";
        introAudio.pause();
        introAudio.currentTime = 0;
        checkdAudio.play();
    };
    startBtn.onclick = handleStart;
    startBtn.addEventListener('touchstart', handleStart);

    const handleDyes = () => {
        checkdAudio.pause();
        checkdAudio.currentTime = 0;
        checkrAudio.play();
        checkdanger.style.display = "none";
        checkresponse.style.display = "flex";
        listeningForResponse = true;
        responseTimeout = setTimeout(() => {
            listeningForResponse = false;
            checkresponse.style.display = "none";
            checkresponseq.style.display = "flex";
            checkrAudio.pause();
            checkrAudio.currentTime = 0;
            did_spongy_respond.play();
        }, 8000);
    };
    dyesBtn.onclick = handleDyes;
    dyesBtn.addEventListener('touchstart', handleDyes);

    const handleDno = () => {
        checkdAudio.pause();
        checkdAudio.currentTime = 0;
        dnotsafeAudio.play();
        checkdanger.style.display = "none";
        dnotsafeq.style.display = "flex";
      logSession();
    };
    dnoBtn.onclick = handleDno;
    dnoBtn.addEventListener('touchstart', handleDno);

    const handleNowSafe = () => {
        dnotsafeAudio.pause();
        dnotsafeAudio.currentTime = 0;
        checkrAudio.play();
        dnotsafeq.style.display = "none";
        checkresponse.style.display = "flex";
        listeningForResponse = true;
        responseTimeout = setTimeout(() => {
            listeningForResponse = false;
            checkresponse.style.display = "none";
            checkresponseq.style.display = "flex";
            did_spongy_respond.play();
        }, 8000);
    };
    nowsafeBtn.onclick = handleNowSafe;
    nowsafeBtn.addEventListener('touchstart', handleNowSafe);

    const handleCantSafe = () => {
        dnotsafeAudio.pause();
        dnotsafeAudio.currentTime = 0;
        cantdsafe.play();
        dnotsafeq.style.display = "none";
        dcantsafe.style.display = "flex";
    };
    cantsafeBtn.onclick = handleCantSafe;
    cantsafeBtn.addEventListener('touchstart', handleCantSafe);

    const handleNextP = () => {
        cantdsafe.pause();
        cantdsafe.currentTime = 0;
        promisedaud.play();
        dcantsafe.style.display = "none";
        if (genderState === 1) {
            promisedraja.style.display = "flex";
            setTimeout(() => {
                promisedraja.style.display = "none";
                promisedrajapress.style.display = "flex";
            }, 2000);
        } else if (genderState === 0) {
            promisedrani.style.display = "flex";
            setTimeout(() => {
                promisedrani.style.display = "none";
                promisedranipress.style.display = "flex";
            }, 2000);
        }
    };
    nextpBtn.onclick = handleNextP;
    nextpBtn.addEventListener('touchstart', handleNextP);

    const handleDPromisePress = () => {
        promisedaud.pause();
        promisedaud.currentTime = 0;
        promisejingle.play();
        test.play();
        promisedrajapress.style.display = "none";
        promisesealedraja.style.display = "flex";
    };
    dpromisepress.onclick = handleDPromisePress;
    dpromisepress.addEventListener('touchstart', handleDPromisePress);

    const handleDRaniPromisePress = () => {
        promisedaud.pause();
        promisedaud.currentTime = 0;
        promisejingle.play();
        test.play();
        promisedranipress.style.display = "none";
        promisesealedrani.style.display = "flex";
    };
    dranipromisepress.onclick = handleDRaniPromisePress;
    dranipromisepress.addEventListener('touchstart', handleDRaniPromisePress);

    const handleNext = () => {
        respondednextaud.play();
        awake.style.display = "none";
        responded.style.display = "flex";
    };
    nextBtn.onclick = handleNext;
    nextBtn.addEventListener('touchstart', handleNext);

    const handleNextPR = () => {
        responded.style.display = "none";
        promisertaud.play();
        respondednextaud.stop();
        if (genderState === 1) {
            promiserraja.style.display = "flex";
            setTimeout(() => {
                promiserraja.style.display = "none";
                promiserrajapress.style.display = "flex";
            }, 2000);
        } else if (genderState === 0) {
            promiserrani.style.display = "flex";
            setTimeout(() => {
                promiserrani.style.display = "none";
                promiserranipress.style.display = "flex";
            }, 2000);
        }
    };
    nextprBtn.onclick = handleNextPR;
    nextprBtn.addEventListener('touchstart', handleNextPR);

    const handleRRaniPromisePress = () => {
        promisejingle.play();
        test.play();
        promisertaud.stop();
        promiserranipress.style.display = "none";
        promisesealedrani.style.display = "flex";
    };
    rranipromisepress.onclick = handleRRaniPromisePress;
    rranipromisepress.addEventListener('touchstart', handleRRaniPromisePress);

    const handleRRajaPromisePress = () => {
        promisejingle.play();
        test.play();
        promisertaud.stop();
        promiserrajapress.style.display = "none";
        promisesealedraja.style.display = "flex";
    };
    rrajapromisepress.onclick = handleRRajaPromisePress;
    rrajapromisepress.addEventListener('touchstart', handleRRajaPromisePress);

    const handleRno = () => {
        userStartAudio();
        did_spongy_respond.pause();
        did_spongy_respond.currentTime = 0;
        check_if_breathing.play();
        checkresponseq.style.display = "none";
        awake.style.display = "none";
        checkbreathing.style.display = "flex";
        console.log(breathScenario);
        const breathFaceImg = document.getElementById("breathFaceImg");
        const breathTimerEl = document.getElementById("breathTimerNumber");
        let breathTimerCount = 10;
        if (breathTimerEl) breathTimerEl.textContent = breathTimerCount;
        clearInterval(breathTimerInterval);
        breathTimerInterval = setInterval(() => {
            breathTimerCount -= 1;
            if (breathTimerEl) breathTimerEl.textContent = Math.max(breathTimerCount, 0);
            if (breathTimerCount <= 0) clearInterval(breathTimerInterval);
        }, 1000);
        if (breathScenario === "abnormal") {
            gasp_aud.play();
            if (breathFaceImg) breathFaceImg.src = "gasping.gif";
        } else if (breathScenario === "normal") {
            normal_breath_aud.play();
            if (breathFaceImg) breathFaceImg.src = "faceonly.png";
        } else {
            if (breathFaceImg) breathFaceImg.src = "faceonly.png";
        }
        setTimeout(() => {
            checkbreathing.style.display = "none";
            checkbreathingq.style.display = "flex";
            couldobserveb.play();
            gasp_aud.stop();
            normal_breath_aud.stop();
            if (breathFaceImg) breathFaceImg.src = "faceonly.png";
            clearInterval(breathTimerInterval);
        }, 10000);
      
    };
    rnoBtn.onclick = handleRno;
    rnoBtn.addEventListener('touchstart', handleRno);

    const handleBno = () => {
        requestaedaud.play();
        could_you_see_breathing.pause();
        could_you_see_breathing.currentTime = 0;
        checkbreathingq.style.display = "none";
        requestaed.style.display = "flex";
      
    };
    bnoBtn.onclick = handleBno;
    bnoBtn.addEventListener('touchstart', handleBno);

    const handleByes = () => {
        breathingtype.play();
        could_you_see_breathing.pause();
        could_you_see_breathing.currentTime = 0;
        checkbreathingq.style.display = "none";
        checkbreathingtypeq.style.display = "flex";
      logSession();
    };
    byesBtn.onclick = handleByes;
    byesBtn.addEventListener('touchstart', handleByes);

    const handleNormal = () => {
        breathingtype.pause();
        breathingtype.currentTime = 0;
        ifbreathnormalaud.play();
        checkbreathingtypeq.style.display = "none";
        normalbreathing.style.display = "flex";
    };
    normalBtn.onclick = handleNormal;
    normalBtn.addEventListener('touchstart', handleNormal);

    const handleAbnormal = () => {
        breathingtype.pause();
        breathingtype.currentTime = 0;
        requestaedaud.play();
        checkbreathingtypeq.style.display = "none";
        requestaed.style.display = "flex";
    };
    abnormalBtn.onclick = handleAbnormal;
    abnormalBtn.addEventListener('touchstart', handleAbnormal);

    const handleNextV = () => {
        ifbreathnormalaud.stop();
        promisebtaud.play();
        normalbreathing.style.display = "none";
        if (genderState === 1) {
            promisebraja.style.display = "flex";
            setTimeout(() => {
                promisebraja.style.display = "none";
                promisebrajapress.style.display = "flex";
            }, 2000);
        } else if (genderState === 0) {
            promisebrani.style.display = "flex";
            setTimeout(() => {
                promisebrani.style.display = "none";
                promisebranipress.style.display = "flex";
            }, 2000);
        }
    };
    nextvBtn.onclick = handleNextV;
    nextvBtn.addEventListener('touchstart', handleNextV);

    const handleBRaniPromisePress = () => {
        promisebtaud.stop();
        promisejingle.play();
        test.play();
        promisebranipress.style.display = "none";
        promisesealedrani.style.display = "flex";
    };
    branipromisepress.onclick = handleBRaniPromisePress;
    branipromisepress.addEventListener('touchstart', handleBRaniPromisePress);

    const handleBrajaPromisePress = () => {
        promisejingle.play();
        test.play();
        promisebtaud.stop();
        promisebrajapress.style.display = "none";
        promisesealedraja.style.display = "flex";
    };
    bpromisepress.onclick = handleBrajaPromisePress;
    bpromisepress.addEventListener('touchstart', handleBrajaPromisePress);

    const handleNextA = () => {
        call112.play();
        requestaedaud.pause();
        requestaedaud.currentTime = 0;
        requestaed.style.display = "none";
        dial112.style.display = "flex";
    };
    nextaBtn.onclick = handleNextA;
    nextaBtn.addEventListener('touchstart', handleNextA);

    const handleCall = () => {
        if (callBtn.disabled) return;
        call112.pause();
        call112.currentTime = 0;
        ring.play();
        addspeakeraud.play();
        dial112.style.display = "none";
        addspeaker.style.display = "flex";
    };
    callBtn.onclick = handleCall;
    callBtn.addEventListener('touchstart', handleCall);

    const handleSpeaker = () => {
        call112.pause();
        call112.currentTime = 0;
        addspeaker.style.display = "none";
        addedspeaker.style.display = "flex";

        // Fill the quiet gap before the victim-info line with two short
        // acknowledgement sounds from the dispatcher, so it doesn't feel
        // like the call has gone silent.
        tOkOk = setTimeout(() => {
            okokaud.play();
        }, 5000);
        tHmHm = setTimeout(() => {
            hmhmaud.play();
        }, 7000);

        t1 = setTimeout(() => {
            addedspeaker.style.display = "none";
            victiminca.style.display = "flex";
            victimaud.play();
            addspeakeraud.stop();

            t2 = setTimeout(() => {
                victiminca.style.display = "none";
                cpr1.style.display = "flex";
                cprC1aud.play();

                t3 = setTimeout(() => {
                    cpr1.style.display = "none";
                    cpr2.style.display = "flex";
                    cprC2aud.play();
                    cprC1aud.stop();

                    t4 = setTimeout(() => {
                        cpr2.style.display = "none";
                        cpr3.style.display = "flex";
                        cprC3aud.play();
                        cprC2aud.stop();

                        t5 = setTimeout(() => {
                            cpr3.style.display = "none";
                            cpr4.style.display = "flex";
                            cprC4aud.play();
                            cprC3aud.stop();

                            t6 = setTimeout(() => {
                                cpr4.style.display = "none";
                                cpr5.style.display = "flex";
                                cprBeginaud.play();
                                cprC4aud.stop();
                            }, 8000);
                        }, 8000);
                    }, 8000);
                }, 8000);
            }, 8000);
        }, 15000);
    };
    speakerbtn.onclick = handleSpeaker;
    speakerbtn.addEventListener('touchstart', handleSpeaker);

    const stopAllCPRAudio = () => {
        victimaud.stop();
        addspeakeraud.stop();
        okokaud.stop();
        hmhmaud.stop();
        cprC1aud.stop();
        cprC2aud.stop();
        cprC3aud.stop();
        cprC4aud.stop();
        [t1, t2, t3, t4, t5, t6, tOkOk, tHmHm].forEach(t => clearTimeout(t));
    };

    const handleNextC1 = () => {
        clearTimeout(t1);
        stopAllCPRAudio();
        cprC2aud.play();
        cpr1.style.display = "none";
        cpr2.style.display = "flex";
    };
    nextc1.onclick = handleNextC1;
    nextc1.addEventListener('touchstart', handleNextC1);

    const handleNextC2 = () => {
        clearTimeout(t1); clearTimeout(t2);
        stopAllCPRAudio();
        cprC3aud.play();
        cpr2.style.display = "none";
        cpr3.style.display = "flex";
    };
    nextc2.onclick = handleNextC2;
    nextc2.addEventListener('touchstart', handleNextC2);

    const handleNextC3 = () => {
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
        stopAllCPRAudio();
        cprC4aud.play();
        cpr3.style.display = "none";
        cpr4.style.display = "flex";
    };
    nextc3.onclick = handleNextC3;
    nextc3.addEventListener('touchstart', handleNextC3);

    const handleNextC4 = () => {
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
        stopAllCPRAudio();
        cprBeginaud.play();
        cpr4.style.display = "none";
        cpr5.style.display = "flex";
    };
    nextc4.onclick = handleNextC4;
    nextc4.addEventListener('touchstart', handleNextC4);

    const handleStartCPR = () => {
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
        clearTimeout(t4); clearTimeout(t5);
        cpr5.style.display = "none";
        p5Screen.style.display = "flex";
        startCanvas();
        currentState = "play";
        play_start_time = millis();
    };
    startcpr.onclick = handleStartCPR;
    startcpr.addEventListener('touchstart', handleStartCPR);

    // --- End Screen Buttons ---

    
    const handleNextWin = () => {

    win.style.display = "none";

    postq1.style.display = "flex";

};
    nextwinBtn.onclick = handleNextWin;
    nextwinBtn.addEventListener('touchstart', handleNextWin);

    const handleWRaniPromisePress = () => {
        promisewtaud.stop();
        promisejingle.play();
        test.play();
        promisewranipress.style.display = "none";
        promisesealedrani.style.display = "flex";
    };
    wranipromisepress.onclick = handleWRaniPromisePress;
    wranipromisepress.addEventListener('touchstart', handleWRaniPromisePress);

    const handleWPromisePress = () => {
        promisewtaud.stop();
        promisejingle.play();
        test.play();
        promisewrajapress.style.display = "none";
        promisesealedraja.style.display = "flex";
    };
    wpromisepress.onclick = handleWPromisePress;
    wpromisepress.addEventListener('touchstart', handleWPromisePress);

    const handlePracticeAgainRaja = () => {
        console.log("raja.....");
        promisesealedraja.style.display = "none";
        begin1.style.display = "flex";
        reset();
        dialDisplay.textContent = "995";
        dialDisplay.classList.add("empty");
        callBtn.disabled = true;
        callBtn.style.opacity = 0.5;
    };
    practiceagainbtnraja.onclick = handlePracticeAgainRaja;
    practiceagainbtnraja.addEventListener('touchstart', handlePracticeAgainRaja);

    const handlePracticeAgainRani = () => {
        console.log("rani.....");
        promisesealedrani.style.display = "none";
        begin1.style.display = "flex";
        reset();
        dialDisplay.textContent = "995";
        dialDisplay.classList.add("empty");
        callBtn.disabled = true;
        callBtn.style.opacity = 0.5;
    };
    practiceagainbtnrani.onclick = handlePracticeAgainRani;
    practiceagainbtnrani.addEventListener('touchstart', handlePracticeAgainRani);

    // ========================================
    // CHECK PROGRESS BUTTON
    // ========================================

    // Defensively hides every full-screen view (and stops the p5 canvas)
    // before showing the progress screen, so nothing from a previous
    // practice session can visually bleed through behind the chart.
    const hideAllScreens = () => {
        document.querySelectorAll('.screen, .skinscreen, .blueskinscreen').forEach(el => {
            if (el.id !== 'progressScreen') el.style.display = 'none';
        });
        removeCanvas();
    };

    const openProgress = (fromScreen) => {
        hideAllScreens();
        progressScreen.style.display = "flex";
        // Always start on the "recent" (zoomed-in) view for a predictable
        // default each time the screen opens.
        chartMode = "recent";
        if (progressChartModeRecent) progressChartModeRecent.classList.add("active");
        if (progressChartModeAll) progressChartModeAll.classList.remove("active");
        // Defer to the next frame so the browser has definitely laid out
        // the now-visible screen before we measure it for the chart.
        requestAnimationFrame(() => renderProgressChart());
    };

    const setChartMode = (mode) => {
        chartMode = mode;
        if (progressChartModeRecent) progressChartModeRecent.classList.toggle("active", mode === "recent");
        if (progressChartModeAll) progressChartModeAll.classList.toggle("active", mode === "all");
        renderProgressChart();
    };
    if (progressChartModeRecent) {
        progressChartModeRecent.addEventListener('click', () => setChartMode("recent"));
        progressChartModeRecent.addEventListener('touchstart', () => setChartMode("recent"));
    }
    if (progressChartModeAll) {
        progressChartModeAll.addEventListener('click', () => setChartMode("all"));
        progressChartModeAll.addEventListener('touchstart', () => setChartMode("all"));
    }

    if (checkProgressBtnRaja) {
        checkProgressBtnRaja.addEventListener('click', () => openProgress(promisesealedraja));
        checkProgressBtnRaja.addEventListener('touchstart', () => openProgress(promisesealedraja));
    }
    if (checkProgressBtnRani) {
        checkProgressBtnRani.addEventListener('click', () => openProgress(promisesealedrani));
        checkProgressBtnRani.addEventListener('touchstart', () => openProgress(promisesealedrani));
    }
    if (progressBackBtn) {
        const closeProgress = () => {
            progressScreen.style.display = "none";
            if (genderState === 1) {
                promisesealedraja.style.display = "flex";
            } else {
                promisesealedrani.style.display = "flex";
            }
        };
        progressBackBtn.addEventListener('click', closeProgress);
        progressBackBtn.addEventListener('touchstart', closeProgress);
    }

    if (progressClearBtn) {
        const clearProgress = (e) => {
            if (e) e.preventDefault();
            const ok = window.confirm("Clear all saved progress for " + (userName || "Friend") + "? This can't be undone.");
            if (!ok) return;
            try {
                const log = JSON.parse(localStorage.getItem("cprProgressLog") || "[]");
                const remaining = log.filter(r => r.name !== (userName || "Friend"));
                localStorage.setItem("cprProgressLog", JSON.stringify(remaining));
            } catch (err) {
                console.error("Could not clear progress:", err);
            }
            renderProgressChart();
        };
        progressClearBtn.addEventListener('click', clearProgress);
        progressClearBtn.addEventListener('touchstart', clearProgress);
    }



    const handleNextAmb = () => {

    amb.style.display = "none";

    postq1.style.display = "flex";

};
    
    nextambBtn.onclick = handleNextAmb;
    nextambBtn.addEventListener('touchstart', handleNextAmb);

    const handleAmbRaniPromisePress = () => {
        test.play();
        promisejingle.play();
        promisewtaud.stop();
        promiseambranipress.style.display = "none";
        promisesealedrani.style.display = "flex";
    };
    promiseambranipress.onclick = handleAmbRaniPromisePress;
    promiseambranipress.addEventListener('touchstart', handleAmbRaniPromisePress);

    const handleAmbRajaPromisePress = () => {
        test.play();
        promisejingle.play();
        promisewtaud.stop();
        promiseambrajapress.style.display = "none";
        promisesealedraja.style.display = "flex";
    };
    promiseambrajapress.onclick = handleAmbRajaPromisePress;
    promiseambrajapress.addEventListener('touchstart', handleAmbRajaPromisePress);


    const handleNextAed = () => {

    aed.style.display = "none";

    postq1.style.display = "flex";

};
    nextaedBtn.onclick = handleNextAed;
    nextaedBtn.addEventListener('touchstart', handleNextAed);

    const handleAedRaniPromisePress = () => {
        promisewtaud.stop();
        promisejingle.play();
        test.play();
        promiseaedranipress.style.display = "none";
        promisesealedrani.style.display = "flex";
    };
    promiseaedranipress.onclick = handleAedRaniPromisePress;
    promiseaedranipress.addEventListener('touchstart', handleAedRaniPromisePress);

    const handleAedRajaPromisePress = () => {
        promisewtaud.stop();
        promisejingle.play();
        test.play();
        promiseaedrajapress.style.display = "none";
        promisesealedraja.style.display = "flex";
    };
    promiseaedrajapress.onclick = handleAedRajaPromisePress;
    promiseaedrajapress.addEventListener('touchstart', handleAedRajaPromisePress);


    const handleNextLateInactive = () => {

    lateinactive.style.display = "none";

    postq1.style.display = "flex";

};
    nextlateinactiveBtn.onclick = handleNextLateInactive;
    nextlateinactiveBtn.addEventListener('touchstart', handleNextLateInactive);

    const handleLateInactiveRaniPromisePress = () => {
        promiseiltaud.stop();
        promisejingle.play();
        test.play();
        promiselateinactiveranipress.style.display = "none";
        promisesealedrani.style.display = "flex";
    };
    promiselateinactiveranipress.onclick = handleLateInactiveRaniPromisePress;
    promiselateinactiveranipress.addEventListener('touchstart', handleLateInactiveRaniPromisePress);

    const handleLateInactiveRajaPromisePress = () => {
        promisejingle.play();
        test.play();
        promiseiltaud.stop();
        promiselateinactiverajapress.style.display = "none";
        promisesealedraja.style.display = "flex";
    };
    promiselateinactiverajapress.onclick = handleLateInactiveRajaPromisePress;
    promiselateinactiverajapress.addEventListener('touchstart', handleLateInactiveRajaPromisePress);

    // NOTE: showCompressionScore() is now called inside handle_performance()
    // so these button handlers no longer need to call it themselves.


    const handleNextLateFast = () => {

    latefast.style.display = "none";

    postq1.style.display = "flex";

};
    nextlatefastBtn.onclick = handleNextLateFast;
    nextlatefastBtn.addEventListener('touchstart', handleNextLateFast);

    const handleLateFastRaniPromisePress = () => {
        promisejingle.play();
        test.play();
        promisefltaud.stop();
        promiselatefastranipress.style.display = "none";
        promisesealedrani.style.display = "flex";
    };
    promiselatefastranipress.onclick = handleLateFastRaniPromisePress;
    promiselatefastranipress.addEventListener('touchstart', handleLateFastRaniPromisePress);

    const handleLateFastRajaPromisePress = () => {
        promisejingle.play();
        test.play();
        promisefltaud.stop();
        promiselatefastrajapress.style.display = "none";
        promisesealedraja.style.display = "flex";
    };
    promiselatefastrajapress.onclick = handleLateFastRajaPromisePress;
    promiselatefastrajapress.addEventListener('touchstart', handleLateFastRajaPromisePress);


    const handleNextLateSlow = () => {

    lateslow.style.display = "none";

    postq1.style.display = "flex";

};
    nextlateslowBtn.onclick = handleNextLateSlow;
    nextlateslowBtn.addEventListener('touchstart', handleNextLateSlow);

    const handleLateslowRajaPromisePress = () => {
        promisejingle.play();
        test.play();
        promisesltaud.stop();
        promiselateslowrajapress.style.display = "none";
        promisesealedraja.style.display = "flex";
    };
    promiselateslowrajapress.onclick = handleLateslowRajaPromisePress;
    promiselateslowrajapress.addEventListener('touchstart', handleLateslowRajaPromisePress);

    const handleLateslowRaniPromisePress = () => {
        promisejingle.play();
        test.play();
        promisesltaud.stop();
        promiselateslowranipress.style.display = "none";
        promisesealedrani.style.display = "flex";
    };
    promiselateslowranipress.onclick = handleLateslowRaniPromisePress;
    promiselateslowranipress.addEventListener('touchstart', handleLateslowRaniPromisePress);

}; // End of window.onload


function draw() {
    if (listeningForResponse) {
        let vol = mic.getLevel();
        console.log("Volume:", vol);

        if (vol > 0.3) {
            console.log("hi");
            listeningForResponse = false;
            clearTimeout(responseTimeout);
            responseTimeout = null;
            document.dispatchEvent(new Event("voiceDetected"));
            checkresponse.style.display = "none";
            awake.style.display = "flex";
            respondedaud.play();
            checkrAudio.pause();
            checkrAudio.currentTime = 0;
          logSession();
        }
    }

    if (!canvasActive) return;

    if (currentState === "play") {
        play_elapsed = millis() - play_start_time;
        diffGoal = maxTotalCompressions - good_compression;
        if (play_elapsed >= task_time) {
            handle_performance();
            return;
        }
    }

    background("#FFC5B7");
    textAlign(CENTER, CENTER);
    textSize(32);
    fill(255);

    if (currentState === "play") {
        playScreen();
    }
}

function mousePressed() {
    userStartAudio();
    pressed_time = millis();

    if (currentState == "play") {
        press_music.play();
        compression_count += 1;
        console.log(compression_count);
        now = millis();
        if (lastTouchTime !== 0) {
            interval = now - lastTouchTime;
            let calculatedBPM = 60000 / interval;
            bpm = calculatedBPM;
            console.log(bpm);
            bpmSum += calculatedBPM;
            bpmSampleCount += 1;
        }
        lastTouchTime = now;
        handle_live();
    }
}

function playScreen() {
    image(playimg, width / 2, height / 2);
    //image(heartimg, width * 0.9, height * 0.08);

    push();
    noStroke();
    fill("#EEEEEE");
    rect(122, 44, 200, 11, 11);
    pop();

    push();
    imageMode(CENTER);
    image(meterimg, 78, 48);
    pop();

    push();
    angleMode(RADIANS);
    translate(20, 48);
    rotate(-HALF_PI);
    textAlign(CENTER, TOP);
    textSize(23);
    fill(250, 50, 60);
    text(round(bpm), 0, 0);
    pop();

    push();
    angleMode(RADIANS);
    translate(30, 335);
    rotate(-HALF_PI);
    textAlign(CENTER, TOP);
    textSize(23);
    fill(0);
    let numberToDisplay;
    if (compression_count === 0) {
        numberToDisplay = 0;
    } else if (compression_count % 5 === 0) {
        numberToDisplay = compression_count;
    } else {
        numberToDisplay = compression_count % 5;
    }
    text(numberToDisplay + " AND", 0, 0);
    pop();

    push();
    translate(83, 47);
    imageMode(CENTER);
    angleMode(DEGREES);
    rotate(angle);
    image(arrowimg, 0, 0);
    pop();

    push();
    angleMode(RADIANS);
    translate(106, 50);
    rotate(-HALF_PI);
    textAlign(CENTER, TOP);
    textSize(11);
    textStyle(BOLD);
    fill(0);
    text("BPM", 0, 0);
    textStyle(NORMAL);
    pop();

    progress -= 1;
    console.log(progress);
    progress = constrain(progress, 6, 200);

    push();
    noStroke();
    fill("#FF5058");
    rect(332, 44, -progress, 11, 11);
    pop();

    push();
    angleMode(RADIANS);
    translate(346, 50);
    rotate(-HALF_PI);
    textAlign(CENTER, TOP);
    textSize(11);
    textStyle(BOLD);
    fill(0);
    text("Blood flow", 0, 0);
    textStyle(NORMAL);
    pop();

    cheekOpacity = map(progress, 6, 210, 40, 255);
    lipOpacity = map(progress, 6, 210, 120, 255);

    push();
    noStroke();
    fill(253, 175, 179, cheekOpacity);
    circle(width * 0.7, height * 0.2, 132);
    pop();

    push();
    noStroke();
    fill(253, 175, 179, cheekOpacity);
    circle(width * 0.7, height * 0.8, 132);
    pop();

    push();
    noStroke();
    fill(255, 124, 130, lipOpacity);
    ellipse(width * 0.82, height * 0.5, 42, 120);

    console.log(diffGoal);

    push();
    angleMode(RADIANS);
    translate(30, 520);
    rotate(-HALF_PI);
    textAlign(CENTER, TOP);
    textSize(20);
    fill(0);
    timeleft = task_time - play_elapsed;
    if (timeleft < 0) { timeleft = 0; }
    text(round((timeleft / 1000), 0) + "s", 0, 0);
    pop();

    push();
    angleMode(RADIANS);
    translate(52, 520);
    rotate(-HALF_PI);
    textAlign(CENTER, TOP);
    textSize(18);
    fill(0);
    text("Time left", 0, 0);
    pop();

    lastTouchElapsed = (millis() - pressed_time);
    console.log(lastTouchElapsed);
    handle_inactivity();
}

function handle_inactivity() {
    if (lastTouchElapsed > 4000) {
        currentState = "lateinactive";
        p5Screen.style.display = "none";
        lateinactive.style.display = "flex";
        lateaud.play();
      //logSession();
    }
}

function handle_live() {
    if (bpm <= 120 && bpm >= 100) {
        progress += goodfillRate;
        if (good_compression < maxTotalCompressions) {
            good_compression++;
        }

        angle = 0;
    } else if (bpm > 121) {
        angle = 60;
        progress -= badfillRate;
        fastcount = fastcount + 1;
    } else if (bpm < 100) {
        angle = -60;
        progress -= badfillRate;
        slowcount = slowcount + 1;
    }
}

// =====================================================
// UPDATED handle_performance()
// showCompressionScore() is called ONCE here, covering
// ALL outcomes (win, aed, amb, latefast, lateslow).
// This ensures badges always show the correct score and
// the same green/red color logic everywhere.
// =====================================================
function handle_performance() {
    if (play_elapsed >= task_time) {

        showCompressionScore(); // ← called once for ALL outcomes

        if (diffGoal <= 5) {
            currentState = "win";
            gameOutcome = "win";
            p5Screen.style.display = "none";
            win.style.display = "flex";
            winaud.play();

        } else if (diffGoal <= 8) {
            currentState = "aed";
            gameOutcome = "aed";
            p5Screen.style.display = "none";
            aed.style.display = "flex";
            aedaud.play();
            winaud.play();

        } else if (diffGoal <= 10) {
            currentState = "amb";
            gameOutcome = "amb";
            p5Screen.style.display = "none";
            amb.style.display = "flex";
            ambaud.play();
            winaud.play();

        } else {
            if (fastcount > slowcount) {
                currentState = "latefast";
                gameOutcome = "latefast";
                p5Screen.style.display = "none";
                latefast.style.display = "flex";
                lateaud.play();
            } else {
                currentState = "lateslow";
                gameOutcome = "lateslow";
                p5Screen.style.display = "none";
                lateslow.style.display = "flex";
                lateaud.play();
            }
        }
    }
  //logSession();
}
function showWinPromise() {

    promisewtaud.play();

    if (genderState === 1) {

        promisewraja.style.display = "flex";

        setTimeout(() => {
            promisewraja.style.display = "none";
            promisewrajapress.style.display = "flex";
        }, 2000);

    } else {

        promisewrani.style.display = "flex";

        setTimeout(() => {
            promisewrani.style.display = "none";
            promisewranipress.style.display = "flex";
        }, 2000);

    }
}

function showAedPromise() {

    promisewtaud.play();

    if (genderState === 1) {

        promiseaedraja.style.display = "flex";

        setTimeout(() => {
            promiseaedraja.style.display = "none";
            promiseaedrajapress.style.display = "flex";
        }, 2000);

    } else {

        promiseaedrani.style.display = "flex";

        setTimeout(() => {
            promiseaedrani.style.display = "none";
            promiseaedranipress.style.display = "flex";
        }, 2000);

    }
}

function showAmbPromise() {

    promisewtaud.play();

    if (genderState === 1) {

        promiseambraja.style.display = "flex";

        setTimeout(() => {
            promiseambraja.style.display = "none";
            promiseambrajapress.style.display = "flex";
        }, 2000);

    } else {

        promiseambrani.style.display = "flex";

        setTimeout(() => {
            promiseambrani.style.display = "none";
            promiseambranipress.style.display = "flex";
        }, 2000);

    }
}

function showLateInactivePromise() {

    promiseiltaud.play();

    if (genderState === 1) {

        promiselateinactiveraja.style.display = "flex";

        setTimeout(() => {
            promiselateinactiveraja.style.display = "none";
            promiselateinactiverajapress.style.display = "flex";
        }, 2000);

    } else {

        promiselateinactiverani.style.display = "flex";

        setTimeout(() => {
            promiselateinactiverani.style.display = "none";
            promiselateinactiveranipress.style.display = "flex";
        }, 2000);

    }
}

function showLateFastPromise() {

    promisefltaud.play();

    if (genderState === 1) {

        promiselatefastraja.style.display = "flex";

        setTimeout(() => {
            promiselatefastraja.style.display = "none";
            promiselatefastrajapress.style.display = "flex";
        }, 2000);

    } else {

        promiselatefastrani.style.display = "flex";

        setTimeout(() => {
            promiselatefastrani.style.display = "none";
            promiselatefastranipress.style.display = "flex";
        }, 2000);

    }
}

function showLateSlowPromise() {

    promisesltaud.play();

    if (genderState === 1) {

        promiselateslowraja.style.display = "flex";

        setTimeout(() => {
            promiselateslowraja.style.display = "none";
            promiselateslowrajapress.style.display = "flex";
        }, 2000);

    } else {

        promiselateslowrani.style.display = "flex";

        setTimeout(() => {
            promiselateslowrani.style.display = "none";
            promiselateslowranipress.style.display = "flex";
        }, 2000);

    }
}

function showPromiseScreen() {

    document.getElementById("postq7").style.display = "none";

    switch (currentState) {

        case "win":
            showWinPromise();
            break;

        case "aed":
            showAedPromise();
            break;

        case "amb":
            showAmbPromise();
            break;

        case "lateinactive":
            showLateInactivePromise();
            break;

        case "latefast":
            showLateFastPromise();
            break;

        case "lateslow":
            showLateSlowPromise();
            break;

        default:
            console.log("Unknown outcome:", currentState);
    }
}
// log session in google sheets
async function logSession() {

    if (sessionLogged) return;
    sessionLogged = true;

    const now = new Date();

    let country = "Unknown";
    let state = "Unknown";
    let city = "Unknown";

    try {

        const response = await fetch("https://ipapi.co/json/");
        const location = await response.json();

        country = location.country_name || "Unknown";
        state = location.region || "Unknown";
        city = location.city || "Unknown";

    } catch (error) {

        console.log("Couldn't get location");

    }

    const data = {

    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),

    country: country,
    state: state,
    city: city,

    gender: genderState === 1 ? "Raja" : "Rani",

    goodCompressions: good_compression,
    targetCompressions: maxTotalCompressions,

    // PRE QUESTIONS
    preQ1: preAnswers.q1,
    preQ2: preAnswers.q2,
    preQ3: preAnswers.q3,
    preQ4: preAnswers.q4,
    preQ5: preAnswers.q5,
    preQ6: preAnswers.q6,

    // POST QUESTIONS
    postQ1: postAnswers.q1,
    postQ2: postAnswers.q2,
    postQ3: postAnswers.q3,
    postQ4: postAnswers.q4,
    postQ5: postAnswers.q5,
    postQ6: postAnswers.q6,
    postQ7: postAnswers.q7,

    // PHOTO
    photo: photoBase64
};

    console.log("Logging:", data);

    try {
        console.log(data.photo.substring(0,80));
        const response = await fetch(scriptURL, {
            method: "POST",
            body: JSON.stringify(data)
        });

        const result = await response.text();

        console.log(result);

    } catch (error) {

        console.error(error);

    }

}
function reset() {

    play_start_time = millis();
    good_compression = 0;
    compression_count = 0;
    progress = 0;
    angle = 0;
    bpm = 0;
    bpmSum = 0;
    bpmSampleCount = 0;
    lastTouchTime = 0;
    lastTouchElapsed = 0;
    pressed_time = 0;
    interval = 0;
    response_time = 0;
    breathe_time = 0;
    cprtime = 0;
    cprtpass = 0;
    call_time = 0;
    fastcount = 0;
    slowcount = 0;
    diffGoal = 0;
    play_elapsed = 0;
    scoreLoggedForAttempt = false;
    breathScenario = nextBreathScenario();
    dialedNumber = '';

    maxTotalCompressions = floor(random(30, 50));
    task_time = 600 * maxTotalCompressions + 3000;

    currentState = "blank";

    sessionLogged = false;

    // -------------------------
    // Reset pre-question answers
    // -------------------------
    preAnswers = {
        q1: "",
        q2: "",
        q3: "",
        q4: "",
        q5: "",
        q6: ""
    };

    // -------------------------
    // Reset post-question answers
    // -------------------------
    postAnswers = {
        q1: "",
        q2: "",
        q3: "",
        q4: "",
        q5: "",
        q6: "",
        q7: ""
    };

    // -------------------------
    // Reset photo
    // -------------------------
    photoBase64 = "";
    postQ7Photo = null;

    // -------------------------
    // Clear UI
    // -------------------------
    postq7Input.value = "";

    postq7Preview.src = "";
    postq7Preview.style.display = "none";

    photoPlaceholder.style.display = "flex";
    
}
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function touchStarted() {
    mousePressed();
    
    // Only block default behavior if the p5 game screen is actively running
    if (currentState === "play") {
        return false;
    }
}

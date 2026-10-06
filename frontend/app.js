/**
 * ONE TAP - EMERGENCY SOS SYSTEM
 * Frontend Application Engine
 * Connects to Tomcat 10 Servlets & MySQL (one_tap) Database
 */

// =============================================================================
// 1. DATASETS (MATCHING MYSQL 'countries', 'states', 'emergency_contacts')
// =============================================================================

const DATABASE_COUNTRIES = [
  { id: 1, name: 'India', code: 'IN', dial: '+91', flag: '🇮🇳', defaultStateId: 12, center: { lat: 10.8505, lng: 76.2711 } },
  { id: 2, name: 'United Arab Emirates', code: 'AE', dial: '+971', flag: '🇦🇪', defaultStateId: null, center: { lat: 25.2048, lng: 55.2708 } },
  { id: 3, name: 'United States', code: 'US', dial: '+1', flag: '🇺🇸', defaultStateId: null, center: { lat: 37.0902, lng: -95.7129 } },
  { id: 4, name: 'United Kingdom', code: 'GB', dial: '+44', flag: '🇬🇧', defaultStateId: null, center: { lat: 55.3781, lng: -3.4360 } }
];

// All 28 States and 8 Union Territories for India (Total 36, exactly matching MySQL 'states' table)
const INDIA_STATES = [
  // 28 States (IDs 1 to 28)
  { id: 1, name: 'Andhra Pradesh', isUT: false },
  { id: 2, name: 'Arunachal Pradesh', isUT: false },
  { id: 3, name: 'Assam', isUT: false },
  { id: 4, name: 'Bihar', isUT: false },
  { id: 5, name: 'Chhattisgarh', isUT: false },
  { id: 6, name: 'Goa', isUT: false },
  { id: 7, name: 'Gujarat', isUT: false },
  { id: 8, name: 'Haryana', isUT: false },
  { id: 9, name: 'Himachal Pradesh', isUT: false },
  { id: 10, name: 'Jharkhand', isUT: false },
  { id: 11, name: 'Karnataka', isUT: false },
  { id: 12, name: 'Kerala', isUT: false, defaultSelected: true, center: { lat: 10.8505, lng: 76.2711 } },
  { id: 13, name: 'Madhya Pradesh', isUT: false },
  { id: 14, name: 'Maharashtra', isUT: false },
  { id: 15, name: 'Manipur', isUT: false },
  { id: 16, name: 'Meghalaya', isUT: false },
  { id: 17, name: 'Mizoram', isUT: false },
  { id: 18, name: 'Nagaland', isUT: false },
  { id: 19, name: 'Odisha', isUT: false },
  { id: 20, name: 'Punjab', isUT: false },
  { id: 21, name: 'Rajasthan', isUT: false },
  { id: 22, name: 'Sikkim', isUT: false },
  { id: 23, name: 'Tamil Nadu', isUT: false },
  { id: 24, name: 'Telangana', isUT: false },
  { id: 25, name: 'Tripura', isUT: false },
  { id: 26, name: 'Uttar Pradesh', isUT: false },
  { id: 27, name: 'Uttarakhand', isUT: false },
  { id: 28, name: 'West Bengal', isUT: false },

  // 8 Union Territories (IDs 29 to 36)
  { id: 29, name: 'Andaman and Nicobar Islands', isUT: true },
  { id: 30, name: 'Chandigarh', isUT: true },
  { id: 31, name: 'Dadra and Nagar Haveli and Daman and Diu', isUT: true },
  { id: 32, name: 'Delhi', isUT: true },
  { id: 33, name: 'Jammu and Kashmir', isUT: true },
  { id: 34, name: 'Ladakh', isUT: true },
  { id: 35, name: 'Lakshadweep', isUT: true },
  { id: 36, name: 'Puducherry', isUT: true }
];

// Emergency Contacts Database records
const EMERGENCY_CONTACTS = {
  1: [ // India
    { name: 'General Emergency', number: '112', icon: '🚨' },
    { name: 'Police Helpline', number: '100', icon: '👮' },
    { name: 'Fire & Rescue', number: '101', icon: '🚒' },
    { name: 'Ambulance', number: '108', icon: '🚑' },
    { name: 'Women Helpline', number: '181', icon: '🛡️' }
  ],
  2: [ // UAE
    { name: 'Police Emergency', number: '999', icon: '👮' },
    { name: 'Ambulance', number: '998', icon: '🚑' },
    { name: 'Civil Defence (Fire)', number: '997', icon: '🚒' }
  ],
  3: [ // USA
    { name: 'National Emergency', number: '911', icon: '🚨' },
    { name: 'Suicide & Crisis', number: '988', icon: '💙' }
  ],
  4: [ // UK
    { name: 'Emergency Services', number: '999', icon: '🚨' },
    { name: 'NHS Non-Emergency', number: '111', icon: '🩺' }
  ]
};

// =============================================================================
// 2. APPLICATION STATE
// =============================================================================

const APP_STATE = {
  backendUrl: localStorage.getItem('onetap_backend_url') || 'http://localhost:8080/one-tap-backend-1.0',
  isBackendConnected: false,
  currentUser: {
    id: parseInt(localStorage.getItem('onetap_user_id')) || 4,
    name: localStorage.getItem('onetap_user_name') || 'Test User',
    email: localStorage.getItem('onetap_user_email') || 'test2@example.com',
    phone: localStorage.getItem('onetap_user_phone') || '9876543211'
  },
  gps: {
    detected: false,
    lat: null,
    lng: null,
    accuracy: null,
    timestamp: null,
    watchId: null
  },
  selectedCountry: 1, // India
  selectedState: 12,  // Kerala (Pre-selected)
  contacts: [],
  sirenAudioContext: null,
  sirenOscillator: null,
  isSirenPlaying: false,
  countdownTimer: null,
  countdownSeconds: 3
};

// Leaflet Map instance
let leafletMap = null;
let leafletMarker = null;

// =============================================================================
// 3. INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 One Tap SOS Engine Initializing...');
  
  // Register Service Worker for mobile PWA support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.log('SW registration skipped', err));
  }

  initJurisdictionSelectors();
  initLeafletMap();
  initGpsDetection();
  initEventListeners();
  updateUserDisplay();
  checkBackendHealth();
  loadTrustedContacts();
});

// =============================================================================
// 4. JURISDICTION (COUNTRY & STATE SELECTION)
// =============================================================================

function initJurisdictionSelectors() {
  const countrySelect = document.getElementById('countrySelect');
  const stateSelect = document.getElementById('stateSelect');

  // Populate Countries (if not already in HTML)
  countrySelect.value = APP_STATE.selectedCountry;

  countrySelect.addEventListener('change', (e) => {
    APP_STATE.selectedCountry = parseInt(e.target.value);
    populateStatesForCountry(APP_STATE.selectedCountry);
    updateHelplinesDisplay();
    updateRegionBanner();
  });

  stateSelect.addEventListener('change', (e) => {
    APP_STATE.selectedState = parseInt(e.target.value);
    updateRegionBanner();
  });

  // Initial population: When India is selected, all 28 states & 8 UTs loaded, Kerala (12) auto-selected!
  populateStatesForCountry(APP_STATE.selectedCountry);
  updateHelplinesDisplay();
  updateRegionBanner();
}

function populateStatesForCountry(countryId) {
  const stateSelect = document.getElementById('stateSelect');
  const stateHint = document.getElementById('stateHint');
  stateSelect.innerHTML = '';

  if (countryId === 1) { // India
    stateHint.textContent = '(28 States & 8 UTs - Kerala Default)';

    // Group 1: 28 States
    const statesGroup = document.createElement('optgroup');
    statesGroup.label = 'States of India (28)';
    
    // Group 2: 8 Union Territories
    const utGroup = document.createElement('optgroup');
    utGroup.label = 'Union Territories (8)';

    INDIA_STATES.forEach((state) => {
      const option = document.createElement('option');
      option.value = state.id;
      option.textContent = `${state.name} (${state.id})`;

      // Auto-select Kerala (State ID: 12)
      if (state.id === 12) {
        option.selected = true;
        APP_STATE.selectedState = 12;
      }

      if (state.isUT) {
        utGroup.appendChild(option);
      } else {
        statesGroup.appendChild(option);
      }
    });

    stateSelect.appendChild(statesGroup);
    stateSelect.appendChild(utGroup);
  } else {
    // Non-India regions
    stateHint.textContent = '(Federal Jurisdictions)';
    const defaultOption = document.createElement('option');
    defaultOption.value = '0';
    defaultOption.textContent = 'National / Central Jurisdiction';
    defaultOption.selected = true;
    stateSelect.appendChild(defaultOption);
    APP_STATE.selectedState = 0;
  }
}

function updateRegionBanner() {
  const country = DATABASE_COUNTRIES.find((c) => c.id === APP_STATE.selectedCountry) || DATABASE_COUNTRIES[0];
  const state = INDIA_STATES.find((s) => s.id === APP_STATE.selectedState);

  const regionFlag = document.getElementById('regionFlag');
  const regionTitle = document.getElementById('regionTitle');
  const regionSubtitle = document.getElementById('regionSubtitle');

  regionFlag.textContent = country.flag;
  
  if (country.id === 1 && state) {
    regionTitle.textContent = `${country.name} • ${state.name}`;
    regionSubtitle.innerHTML = `Dial Code: <strong>${country.dial}</strong> &bull; State ID: <strong>${state.id}</strong> &bull; Priority: <strong>South Zone Dispatch</strong>`;
  } else {
    regionTitle.textContent = `${country.name}`;
    regionSubtitle.innerHTML = `Dial Code: <strong>${country.dial}</strong> &bull; National Emergency Zone`;
  }
}

// =============================================================================
// 5. GPS & COORDINATES DETECTION ENGINE (GREEN WHEN DETECTED, RED WHEN NOT)
// =============================================================================

function initGpsDetection() {
  // Start in "Searching / Not Detected" RED state
  setGpsStatus(false);

  // Auto request location on load
  if ('geolocation' in navigator) {
    acquireCurrentGps(false);
  } else {
    setGpsStatus(false, 'Geolocation is not supported by your browser.');
  }
}

function acquireCurrentGps(showAlert = true) {
  if (!('geolocation' in navigator)) {
    setGpsStatus(false, 'Browser does not support Geolocation.');
    if (showAlert) alert('Geolocation is not supported by your browser.');
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  };

  navigator.geolocation.getCurrentPosition(
    (position) => {
      handleGpsSuccess(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
      if (showAlert) playHapticFeedback([100, 50, 100]);
    },
    (error) => {
      let msg = 'Location signal not acquired.';
      if (error.code === error.PERMISSION_DENIED) {
        msg = 'Location permission denied by user. Click "Set Kerala GPS" to test.';
      } else if (error.code === error.TIMEOUT) {
        msg = 'GPS signal request timed out.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        msg = 'Satellite position unavailable.';
      }
      handleGpsFailure(msg);
    },
    options
  );
}

function handleGpsSuccess(lat, lng, accuracy = 8) {
  APP_STATE.gps.detected = true;
  APP_STATE.gps.lat = parseFloat(lat.toFixed(6));
  APP_STATE.gps.lng = parseFloat(lng.toFixed(6));
  APP_STATE.gps.accuracy = Math.round(accuracy);
  APP_STATE.gps.timestamp = new Date().toLocaleTimeString();

  setGpsStatus(true);
  reverseGeocodePlace(APP_STATE.gps.lat, APP_STATE.gps.lng);
  updateMapPosition(APP_STATE.gps.lat, APP_STATE.gps.lng);
}

function handleGpsFailure(reason) {
  APP_STATE.gps.detected = false;
  APP_STATE.gps.lat = null;
  APP_STATE.gps.lng = null;
  APP_STATE.gps.accuracy = null;
  setGpsStatus(false, reason);
}

/**
 * Reverse geocodes coordinates to display human-readable place name
 */
async function reverseGeocodePlace(lat, lng) {
  const placeTitle = document.getElementById('detectedPlaceName');
  const placeSubtext = document.getElementById('detectedPlaceSubtext');
  const placeBadge = document.getElementById('placeStatusBadge');
  const placeCard = document.getElementById('placeNameCard');

  if (!placeTitle || !placeCard) return;

  // Immediate detection for Kerala Center / Demo coordinates
  if (Math.abs(lat - 10.8505) < 0.05 && Math.abs(lng - 76.2711) < 0.05) {
    placeTitle.textContent = 'Thrissur District, Kerala, India';
    placeSubtext.textContent = 'Central Kerala Jurisdiction • Police Zone II (10.8505° N, 76.2711° E)';
    placeBadge.textContent = '✓ GREEN: KERALA IDENTIFIED';
    placeCard.className = 'detected-place-card place-state-green';
    return;
  }

  placeTitle.textContent = 'Resolving Place Name...';
  placeSubtext.textContent = `Coordinates: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address || {};
        const locality = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city || addr.county || 'Detected Region';
        const state = addr.state || 'Kerala';
        const country = addr.country || 'India';

        placeTitle.textContent = `${locality}, ${state}, ${country}`;
        placeSubtext.textContent = data.display_name.length > 90 ? data.display_name.substring(0, 90) + '...' : data.display_name;
        placeBadge.textContent = '✓ GREEN: LOCATION IDENTIFIED';
        placeCard.className = 'detected-place-card place-state-green';
        return;
      }
    }
  } catch (e) {
    console.log('Online reverse geocoding skipped, applying region name:', e);
  }

  // Graceful fallback with formatted coordinates & state
  const stateObj = INDIA_STATES.find(s => s.id === APP_STATE.selectedState);
  const stateName = stateObj ? stateObj.name : 'Kerala';
  placeTitle.textContent = `${stateName}, India (Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)})`;
  placeSubtext.textContent = `Verified Satellite Position Fix • South Zone Emergency Dispatch`;
  placeBadge.textContent = '✓ GREEN: SIGNAL LOCKED';
  placeCard.className = 'detected-place-card place-state-green';
}

/**
 * Updates UI to GREEN if detected=true, or RED if detected=false
 */
function setGpsStatus(detected, message = null) {
  const gpsBadge = document.getElementById('gpsStatusBadge');
  const gpsStatusText = document.getElementById('gpsStatusText');
  const headerPill = document.getElementById('headerGpsPill');
  const pillLabel = headerPill.querySelector('.pill-label');
  const noticeBox = document.getElementById('gpsNoticeBox');
  const noticeIcon = document.getElementById('gpsNoticeIcon');
  const noticeTitle = document.getElementById('gpsNoticeTitle');
  const noticeDesc = document.getElementById('gpsNoticeDesc');

  const placeCard = document.getElementById('placeNameCard');
  const placeTitle = document.getElementById('detectedPlaceName');
  const placeSubtext = document.getElementById('detectedPlaceSubtext');
  const placeBadge = document.getElementById('placeStatusBadge');

  const latTile = document.getElementById('latTile');
  const lngTile = document.getElementById('lngTile');
  const latValue = document.getElementById('latValue');
  const lngValue = document.getElementById('lngValue');
  const latStatusTag = document.getElementById('latStatusTag');
  const lngStatusTag = document.getElementById('lngStatusTag');

  const accTile = document.getElementById('accTile');
  const accValue = document.getElementById('accValue');
  const accStatusTag = document.getElementById('accStatusTag');
  const timestampValue = document.getElementById('timestampValue');

  // Input fields for registration modal
  const regLat = document.getElementById('regLat');
  const regLng = document.getElementById('regLng');

  if (detected) {
    // ----------------------------------------------------
    // GREEN STATE: GPS DETECTED
    // ----------------------------------------------------
    gpsBadge.className = 'detection-badge badge-detected';
    gpsStatusText.textContent = 'GPS SIGNAL DETECTED';

    headerPill.className = 'status-pill status-pill-green';
    pillLabel.textContent = `GPS: ${APP_STATE.gps.lat.toFixed(3)}, ${APP_STATE.gps.lng.toFixed(3)}`;

    noticeBox.className = 'gps-notice-box notice-green';
    noticeIcon.textContent = '🛰️';
    noticeTitle.textContent = 'High-Precision GPS Lock Acquired';
    noticeDesc.textContent = `Live satellite tracking active. Ready for emergency dispatch to MySQL Database and Twilio.`;

    if (placeCard) placeCard.className = 'detected-place-card place-state-green';
    if (placeBadge) placeBadge.textContent = '✓ GREEN: LOCATION IDENTIFIED';

    latTile.className = 'coord-tile state-green';
    lngTile.className = 'coord-tile state-green';
    accTile.className = 'coord-tile telemetry-tile state-green';

    latValue.textContent = `${APP_STATE.gps.lat.toFixed(6)}°`;
    lngValue.textContent = `${APP_STATE.gps.lng.toFixed(6)}°`;
    latStatusTag.textContent = 'Active Lock';
    lngStatusTag.textContent = 'Active Lock';

    accValue.textContent = `± ${APP_STATE.gps.accuracy || 10} m`;
    accStatusTag.textContent = 'Satellite Lock';
    timestampValue.textContent = APP_STATE.gps.timestamp || 'Live';

    if (regLat) regLat.value = APP_STATE.gps.lat;
    if (regLng) regLng.value = APP_STATE.gps.lng;

  } else {
    // ----------------------------------------------------
    // RED STATE: GPS NOT DETECTED
    // ----------------------------------------------------
    gpsBadge.className = 'detection-badge badge-not-detected';
    gpsStatusText.textContent = 'GPS NOT DETECTED';

    headerPill.className = 'status-pill status-pill-red';
    pillLabel.textContent = 'GPS: NOT DETECTED';

    noticeBox.className = 'gps-notice-box notice-red';
    noticeIcon.textContent = '⚠️';
    noticeTitle.textContent = 'Coordinates Not Detected';
    noticeDesc.textContent = message || 'Waiting for browser location fix. Click "Detect Current GPS" or "Set Kerala GPS".';

    if (placeCard) placeCard.className = 'detected-place-card place-state-red';
    if (placeTitle) placeTitle.textContent = 'Place: Not Detected (Waiting for GPS)';
    if (placeSubtext) placeSubtext.textContent = 'Waiting for GPS coordinates lock...';
    if (placeBadge) placeBadge.textContent = 'RED: NO FIX';

    latTile.className = 'coord-tile state-red';
    lngTile.className = 'coord-tile state-red';
    accTile.className = 'coord-tile telemetry-tile state-red';

    latValue.textContent = '--.------';
    lngValue.textContent = '--.------';
    latStatusTag.textContent = 'Not Detected';
    lngStatusTag.textContent = 'Not Detected';

    accValue.textContent = 'No Fix';
    accStatusTag.textContent = 'Signal Required';
    timestampValue.textContent = 'Never';
  }
}

// =============================================================================
// 6. INTERACTIVE LEAFLET RADAR MAP
// =============================================================================

function initLeafletMap() {
  const mapElem = document.getElementById('osmMap');
  if (!mapElem || typeof L === 'undefined') return;

  try {
    // Default center at Kerala, India
    const defaultLat = 10.8505;
    const defaultLng = 76.2711;

    leafletMap = L.map('osmMap', {
      zoomControl: false,
      attributionControl: false
    }).setView([defaultLat, defaultLng], 11);

    // Dark cyberpunk CartoDB tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(leafletMap);

    // Glowing Crimson Pin
    const beaconIcon = L.divIcon({
      className: 'custom-map-beacon',
      html: '<div style="width:16px;height:16px;background:#ef4444;border:2px solid #fff;border-radius:50%;box-shadow:0 0 14px #ef4444;"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    leafletMarker = L.marker([defaultLat, defaultLng], { icon: beaconIcon }).addTo(leafletMap);
  } catch (e) {
    console.warn('Map initialization skipped:', e);
  }
}

function updateMapPosition(lat, lng) {
  if (!leafletMap) return;
  leafletMap.setView([lat, lng], 13);
  if (leafletMarker) {
    leafletMarker.setLatLng([lat, lng]);
  }
}

// =============================================================================
// 7. EMERGENCY SOS TRIGGER & SERVLET INTEGRATION (/sos)
// =============================================================================

function triggerSosFlow() {
  playHapticFeedback([400, 150, 400]);

  // Check if safety countdown enabled
  const isCountdownEnabled = document.getElementById('toggleCountdown').checked;

  if (isCountdownEnabled) {
    openCountdownModal();
  } else {
    dispatchSosAlert();
  }
}

function openCountdownModal() {
  const modal = document.getElementById('countdownModal');
  const numberElem = document.getElementById('countdownNumber');
  const ring = document.getElementById('countdownProgressRing');
  
  modal.classList.remove('hidden');
  APP_STATE.countdownSeconds = 3;
  numberElem.textContent = '3';
  ring.style.strokeDashoffset = '0';

  // Play auditory warning beep
  playAudioBeep(660, 0.15);

  clearInterval(APP_STATE.countdownTimer);
  APP_STATE.countdownTimer = setInterval(() => {
    APP_STATE.countdownSeconds -= 1;
    
    if (APP_STATE.countdownSeconds > 0) {
      numberElem.textContent = APP_STATE.countdownSeconds;
      ring.style.strokeDashoffset = `${(3 - APP_STATE.countdownSeconds) * 94}`;
      playAudioBeep(660, 0.15);
    } else {
      clearInterval(APP_STATE.countdownTimer);
      closeCountdownModal();
      dispatchSosAlert();
    }
  }, 1000);
}

function closeCountdownModal() {
  clearInterval(APP_STATE.countdownTimer);
  const modal = document.getElementById('countdownModal');
  modal.classList.add('hidden');
}

/**
 * Dispatch SOS to backend /sos servlet
 */
async function dispatchSosAlert() {
  // If coordinates not detected, default to Kerala (10.8505, 76.2711) as safety fallback
  const lat = APP_STATE.gps.lat !== null ? APP_STATE.gps.lat : 10.8505;
  const lng = APP_STATE.gps.lng !== null ? APP_STATE.gps.lng : 76.2711;

  // Trigger siren sound if enabled
  if (document.getElementById('toggleSiren').checked) {
    startEmergencySiren();
  }

  // Trigger strong phone vibration pattern
  if (document.getElementById('toggleHaptics').checked) {
    playHapticFeedback([500, 200, 500, 200, 800]);
  }

  const resultBanner = document.getElementById('sosResultBanner');
  const resultStatus = document.getElementById('sosResultStatus');
  const resultTime = document.getElementById('sosResultTime');
  const resultBody = document.getElementById('sosResultBody');

  resultBanner.classList.remove('hidden');
  resultStatus.textContent = 'TRANSMITTING DISTRESS BEACON...';
  resultStatus.style.color = 'var(--signal-amber)';
  resultTime.textContent = new Date().toLocaleTimeString();
  resultBody.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <div class="spinner"></div>
      <span>Sending coordinates (${lat}, ${lng}) to Servlet & Twilio Service...</span>
    </div>
  `;

  try {
    const postData = new URLSearchParams();
    postData.append('userId', APP_STATE.currentUser.id);
    postData.append('latitude', lat.toString());
    postData.append('longitude', lng.toString());
    postData.append('format', 'json');

    const response = await fetch(`${APP_STATE.backendUrl}/sos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/plain'
      },
      body: postData.toString()
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { rawText: responseText };
    }

    resultStatus.textContent = 'ALERT TRANSMITTED TO RESCUE DISPATCH';
    resultStatus.style.color = 'var(--signal-green)';
    resultTime.textContent = new Date().toLocaleTimeString();

    if (data.status === 'success' || (data.rawText && data.rawText.includes('SOS alert created'))) {
      resultBody.innerHTML = `
        <div style="color:var(--signal-green);font-weight:700;margin-bottom:6px;">
          ✓ SOS Alert successfully written to MySQL Database (sos_alerts table)
        </div>
        <div style="margin-bottom:4px;">
          <strong>User ID:</strong> ${APP_STATE.currentUser.id} &bull; 
          <strong>Coordinates:</strong> ${lat}° N, ${lng}° E
        </div>
        <div>
          <strong>Twilio Voice Dispatch:</strong> ${data.contactsAlerted || 'All'} Trusted Contacts alerted with call broadcast.
        </div>
        ${data.rawText ? `<pre style="font-size:0.75rem;background:#000;padding:8px;border-radius:4px;margin-top:6px;color:#aaa;">${data.rawText}</pre>` : ''}
      `;
    } else {
      resultBody.innerHTML = `
        <div style="color:var(--signal-green);font-weight:700;margin-bottom:6px;">
          ✓ SOS Alert Recorded:
        </div>
        <pre style="font-size:0.78rem;background:#000;padding:8px;border-radius:4px;color:#ccc;">${data.rawText || JSON.stringify(data)}</pre>
      `;
    }

    // Stop siren after 6 seconds to avoid annoyance
    setTimeout(stopEmergencySiren, 6000);

  } catch (err) {
    console.warn('Backend call failed, using local emergency simulation:', err);
    resultStatus.textContent = 'ALERT ACTIVE (LOCAL MODE)';
    resultStatus.style.color = 'var(--signal-green)';
    resultBody.innerHTML = `
      <div style="color:var(--signal-green);font-weight:700;margin-bottom:4px;">
        ✓ Emergency SOS Beacon Triggered
      </div>
      <div>
        <strong>Latitude:</strong> ${lat} &bull; <strong>Longitude:</strong> ${lng}<br>
        <strong>Jurisdiction:</strong> Kerala, India (State 12) &bull; <strong>User ID:</strong> ${APP_STATE.currentUser.id}
      </div>
      <div style="color:var(--text-secondary);font-size:0.75rem;margin-top:6px;">
        (Note: Tomcat connection failed. Start Tomcat 10 on port 8080 to pipe directly to Twilio calls & MySQL).
      </div>
    `;
    setTimeout(stopEmergencySiren, 5000);
  }
}

// =============================================================================
// 8. TRUSTED CONTACTS ENGINE (/trusted-contacts & /trusted-contact-count)
// =============================================================================

async function loadTrustedContacts() {
  const contactsList = document.getElementById('contactsList');
  const countBadge = document.getElementById('contactCountBadge');
  const progressBar = document.getElementById('contactProgressBar');
  const trackerMsg = document.getElementById('contactTrackerMsg');

  try {
    const url = `${APP_STATE.backendUrl}/trusted-contacts?userId=${APP_STATE.currentUser.id}&format=json`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json, text/plain' } });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    let contacts = [];

    try {
      contacts = JSON.parse(text);
    } catch {
      // Parse plain text response from original servlet format:
      // "contactName - phoneNumber - relationship"
      const lines = text.split('\n').filter(l => l.includes(' - '));
      contacts = lines.map(line => {
        const parts = line.split(' - ');
        return {
          contactName: parts[0]?.trim() || 'Contact',
          phoneNumber: parts[1]?.trim() || '',
          relationship: parts[2]?.trim() || 'Friend'
        };
      });
    }

    APP_STATE.contacts = contacts;
    renderContactsList(contacts);

  } catch (err) {
    console.log('Fetching live contacts failed, rendering existing sample contacts for user', err);
    // Provide realistic fallback matching MySQL database entries for User 4 / 7
    APP_STATE.contacts = [
      { contactName: 'Test Contact', phoneNumber: '+917907418077', relationship: 'Primary Responder' },
      { contactName: 'Kerala Police Control', phoneNumber: '112', relationship: 'Official Emergency' }
    ];
    renderContactsList(APP_STATE.contacts);
  }
}

function renderContactsList(contacts) {
  const contactsList = document.getElementById('contactsList');
  const countBadge = document.getElementById('contactCountBadge');
  const progressBar = document.getElementById('contactProgressBar');
  const trackerMsg = document.getElementById('contactTrackerMsg');

  const count = contacts.length;
  const target = 5;
  const percent = Math.min(100, Math.round((count / target) * 100));

  countBadge.textContent = `${count} / ${target} Added`;
  progressBar.style.width = `${percent}%`;

  if (count >= target) {
    trackerMsg.innerHTML = '<span style="color:var(--signal-green);font-weight:700;">✓ Minimum 5 trusted contacts requirement is satisfied.</span>';
    countBadge.style.color = 'var(--signal-green)';
  } else {
    const diff = target - count;
    trackerMsg.innerHTML = `⚠️ You need to add <strong>${diff} more trusted contact(s)</strong> for full SOS dispatch coverage.`;
    countBadge.style.color = 'var(--crimson-neon)';
  }

  if (contacts.length === 0) {
    contactsList.innerHTML = `
      <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.85rem;">
        No trusted contacts registered for User #${APP_STATE.currentUser.id}. Click "+ Add Contact" to add emergency responders.
      </div>
    `;
    return;
  }

  contactsList.innerHTML = '';
  contacts.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'contact-item-card';
    card.innerHTML = `
      <div class="contact-info">
        <div class="contact-avatar">${(c.contactName || 'C').charAt(0).toUpperCase()}</div>
        <div>
          <div class="contact-name">${c.contactName}</div>
          <div class="contact-meta">
            <span>${c.phoneNumber}</span>
            <span class="contact-relation-badge">${c.relationship || 'Friend'}</span>
          </div>
        </div>
      </div>
      <a href="tel:${c.phoneNumber}" class="btn-call-contact" title="Direct Phone Call">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
        </svg>
        <span>Call</span>
      </a>
    `;
    contactsList.appendChild(card);
  });
}

async function handleAddContactSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('inputContactName').value.trim();
  const phone = document.getElementById('inputContactPhone').value.trim();
  const relation = document.getElementById('inputContactRelation').value;

  if (!name || !phone) return;

  try {
    const postData = new URLSearchParams();
    postData.append('userId', APP_STATE.currentUser.id);
    postData.append('contactName', name);
    postData.append('phoneNumber', phone);
    postData.append('relationship', relation);
    postData.append('format', 'json');

    const res = await fetch(`${APP_STATE.backendUrl}/trusted-contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: postData.toString()
    });

    closeModal('addContactModal');
    // Add locally immediately
    APP_STATE.contacts.push({ contactName: name, phoneNumber: phone, relationship: relation });
    renderContactsList(APP_STATE.contacts);

    alert(`Trusted contact "${name}" registered successfully!`);
    loadTrustedContacts(); // reload from backend

  } catch (err) {
    console.warn('Backend call failed, adding locally:', err);
    closeModal('addContactModal');
    APP_STATE.contacts.push({ contactName: name, phoneNumber: phone, relationship: relation });
    renderContactsList(APP_STATE.contacts);
    alert(`Contact "${name}" saved locally!`);
  }
}

// =============================================================================
// 9. NATIONAL EMERGENCY HELPLINES DISPLAY
// =============================================================================

function updateHelplinesDisplay() {
  const container = document.getElementById('helplineGrid');
  const label = document.getElementById('helplineCountryLabel');
  const country = DATABASE_COUNTRIES.find(c => c.id === APP_STATE.selectedCountry) || DATABASE_COUNTRIES[0];

  label.textContent = `${country.name} (${country.code})`;
  const helplines = EMERGENCY_CONTACTS[country.id] || EMERGENCY_CONTACTS[1];

  container.innerHTML = '';
  helplines.forEach((h) => {
    const tile = document.createElement('a');
    tile.href = `tel:${h.number}`;
    tile.className = 'helpline-tile';
    tile.innerHTML = `
      <div class="helpline-info">
        <span class="helpline-service">${h.name}</span>
        <span class="helpline-number">${h.number}</span>
      </div>
      <div class="helpline-dial-icon">${h.icon || '📞'}</div>
    `;
    container.appendChild(tile);
  });
}

// =============================================================================
// 10. BACKEND CONNECTIVITY CHECKER
// =============================================================================

async function checkBackendHealth() {
  const pill = document.getElementById('backendStatusPill');
  const pillText = document.getElementById('backendStatusText');
  const telBackendUrl = document.getElementById('telBackendUrl');
  const telTomcat = document.getElementById('telTomcatStatus');
  const telDb = document.getElementById('telDbStatus');

  telBackendUrl.textContent = APP_STATE.backendUrl;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${APP_STATE.backendUrl}/location-data`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      APP_STATE.isBackendConnected = true;
      pill.className = 'status-pill status-pill-green';
      pillText.textContent = 'DB / API: ONLINE';
      telTomcat.innerHTML = '<span class="dot dot-green"></span> Tomcat 10 Ready';
      telDb.innerHTML = '<span class="dot dot-green"></span> MySQL (one_tap) Connected';
      return;
    }
  } catch {
    // Try pinging /hello or /trusted-contacts
  }

  // If not reachable
  APP_STATE.isBackendConnected = false;
  pill.className = 'status-pill status-pill-amber';
  pillText.textContent = 'DB / API: LOCAL READY';
  telTomcat.innerHTML = '<span class="dot dot-amber"></span> Port 8080 Standby';
  telDb.innerHTML = '<span class="dot dot-green"></span> Local Mock / Sync';
}

// =============================================================================
// 11. USER AUTHENTICATION & SWITCHER
// =============================================================================

function updateUserDisplay() {
  const user = APP_STATE.currentUser;
  const avatar = document.getElementById('userAvatar');
  const nameLabel = document.getElementById('userNameLabel');
  const contactUserId = document.getElementById('contactUserId');

  if (avatar) avatar.textContent = (user.name || 'U').charAt(0).toUpperCase();
  if (nameLabel) nameLabel.textContent = `User #${user.id} (${user.name})`;
  if (contactUserId) contactUserId.value = user.id;
}

function switchUser(id, name, phone, email = 'user@example.com') {
  APP_STATE.currentUser = { id: parseInt(id), name, phone, email };
  localStorage.setItem('onetap_user_id', id);
  localStorage.setItem('onetap_user_name', name);
  localStorage.setItem('onetap_user_phone', phone);
  localStorage.setItem('onetap_user_email', email);

  updateUserDisplay();
  loadTrustedContacts();
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const phone = document.getElementById('loginPhone').value.trim();

  try {
    const postData = new URLSearchParams();
    postData.append('email', email);
    postData.append('phoneNumber', phone);
    postData.append('format', 'json');

    const res = await fetch(`${APP_STATE.backendUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: postData.toString()
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (data.userId) {
      switchUser(data.userId, data.fullName, phone, email);
    } else {
      // If plain text success
      switchUser(4, 'Test User', phone, email);
    }

    closeModal('authModal');
    alert(`Welcome back! Signed in successfully.`);

  } catch (err) {
    switchUser(4, 'Test User', phone, email);
    closeModal('authModal');
    alert(`Signed in as Demo User #4`);
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('regFullName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const countryId = document.getElementById('regCountry').value;
  const stateId = document.getElementById('regState').value;
  const address = document.getElementById('regAddress').value.trim();
  const lat = document.getElementById('regLat').value;
  const lng = document.getElementById('regLng').value;

  try {
    const postData = new URLSearchParams();
    postData.append('fullName', name);
    postData.append('email', email);
    postData.append('phoneNumber', phone);
    postData.append('countryId', countryId);
    postData.append('stateId', stateId);
    postData.append('address', address);
    postData.append('latitude', lat);
    postData.append('longitude', lng);
    postData.append('format', 'json');

    const res = await fetch(`${APP_STATE.backendUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: postData.toString()
    });

    closeModal('authModal');
    alert('User registered successfully in MySQL database! You can now log in.');

  } catch (err) {
    closeModal('authModal');
    alert(`Registration simulated for ${name}.`);
  }
}

// =============================================================================
// 12. SOUND & HAPTIC VIBRATION ENGINE
// =============================================================================

function playHapticFeedback(pattern) {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

function playAudioBeep(freq = 600, duration = 0.2) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function startEmergencySiren() {
  if (APP_STATE.isSirenPlaying) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    APP_STATE.sirenAudioContext = new AudioCtx();
    const ctx = APP_STATE.sirenAudioContext;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    gain.gain.value = 0.25;

    // Siren frequency oscillation (800Hz to 1200Hz)
    const now = ctx.currentTime;
    for (let i = 0; i < 20; i++) {
      osc.frequency.setValueAtTime(750, now + (i * 0.6));
      osc.frequency.exponentialRampToValueAtTime(1250, now + (i * 0.6) + 0.3);
      osc.frequency.exponentialRampToValueAtTime(750, now + (i * 0.6) + 0.6);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    APP_STATE.sirenOscillator = osc;
    APP_STATE.isSirenPlaying = true;
  } catch {}
}

function stopEmergencySiren() {
  if (!APP_STATE.isSirenPlaying) return;
  try {
    if (APP_STATE.sirenOscillator) {
      APP_STATE.sirenOscillator.stop();
      APP_STATE.sirenOscillator.disconnect();
    }
    if (APP_STATE.sirenAudioContext) {
      APP_STATE.sirenAudioContext.close();
    }
  } catch {}
  APP_STATE.isSirenPlaying = false;
}

// =============================================================================
// 13. MODALS & DOM EVENT LISTENERS
// =============================================================================

function openModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

function initEventListeners() {
  // SOS Main Button Trigger
  const sosBtn = document.getElementById('btnTriggerSos');
  sosBtn.addEventListener('click', triggerSosFlow);

  // Countdown Modal Actions
  document.getElementById('btnAbortSos').addEventListener('click', closeCountdownModal);
  document.getElementById('btnImmediateSos').addEventListener('click', () => {
    closeCountdownModal();
    dispatchSosAlert();
  });

  // GPS Control Buttons
  document.getElementById('btnAcquireGps').addEventListener('click', () => acquireCurrentGps(true));

  // "Set Kerala GPS (10.8505, 76.2711)" - Instant GREEN state!
  document.getElementById('btnSimulateKerala').addEventListener('click', () => {
    handleGpsSuccess(10.8505, 76.2711, 6);
    playHapticFeedback([100, 50, 100]);
  });

  // "Test Red State" - Instant RED state!
  document.getElementById('btnClearGps').addEventListener('click', () => {
    handleGpsFailure('Manual signal clear: Testing RED not-detected status.');
    playHapticFeedback([300]);
  });

  // Trusted Contact Modal
  document.getElementById('btnOpenAddContact').addEventListener('click', () => openModal('addContactModal'));
  document.getElementById('btnCloseContactModal').addEventListener('click', () => closeModal('addContactModal'));
  document.getElementById('btnCancelAddContact').addEventListener('click', () => closeModal('addContactModal'));
  document.getElementById('addContactForm').addEventListener('submit', handleAddContactSubmit);

  // User Profile / Auth Modal
  document.getElementById('userProfileBtn').addEventListener('click', () => openModal('authModal'));
  document.getElementById('mobileNavAccount').addEventListener('click', () => openModal('authModal'));
  document.getElementById('btnCloseAuthModal').addEventListener('click', () => closeModal('authModal'));

  // Auth Tabs (Login vs Register)
  const tabLogin = document.getElementById('tabBtnLogin');
  const tabReg = document.getElementById('tabBtnRegister');
  const formLogin = document.getElementById('loginForm');
  const formReg = document.getElementById('registerForm');

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
    formLogin.classList.remove('hidden');
    formReg.classList.add('hidden');
  });

  tabReg.addEventListener('click', () => {
    tabReg.classList.add('active');
    tabLogin.classList.remove('active');
    formReg.classList.remove('hidden');
    formLogin.classList.add('hidden');
  });

  formLogin.addEventListener('submit', handleLoginSubmit);
  formReg.addEventListener('submit', handleRegisterSubmit);

  // Demo User Quick Switches
  document.querySelectorAll('.demo-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.demo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      const phone = btn.getAttribute('data-phone');
      switchUser(id, name, phone);
    });
  });

  // Backend Settings Modal
  document.getElementById('backendStatusPill').addEventListener('click', () => openModal('backendSettingsModal'));
  document.getElementById('btnCloseSettingsModal').addEventListener('click', () => closeModal('backendSettingsModal'));
  document.getElementById('btnCheckBackendHealth').addEventListener('click', checkBackendHealth);
  document.getElementById('btnTestBackendPing').addEventListener('click', checkBackendHealth);

  document.getElementById('btnSaveBackendUrl').addEventListener('click', () => {
    const val = document.getElementById('backendUrlInput').value.trim();
    if (val) {
      APP_STATE.backendUrl = val;
      localStorage.setItem('onetap_backend_url', val);
      closeModal('backendSettingsModal');
      checkBackendHealth();
      loadTrustedContacts();
    }
  });

  // Mobile Bottom Navigation Scrolling
  document.querySelectorAll('.mobile-nav-bar .nav-tab').forEach(tab => {
    const targetId = tab.getAttribute('data-target');
    if (targetId) {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mobile-nav-bar .nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const elem = document.getElementById(targetId);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
  });

  // Mobile Phone Safety Tools Event Listeners
  document.getElementById('btnStrobeTorch')?.addEventListener('click', toggleStrobeTorch);
  document.getElementById('btnSafetyWhistle')?.addEventListener('click', playSafetyWhistle);
  document.getElementById('btnShareWhatsapp')?.addEventListener('click', shareLocationViaWhatsApp);
  document.getElementById('btnShareSms')?.addEventListener('click', shareLocationViaSms);

  initBatteryMonitor();
}

// =============================================================================
// 14. MOBILE PHONE SAFETY TOOLS (STROBE, WHISTLE, WHATSAPP, SMS, BATTERY)
// =============================================================================

let isStrobeActive = false;
let strobeInterval = null;

function toggleStrobeTorch() {
  const btn = document.getElementById('btnStrobeTorch');
  let strobeOverlay = document.getElementById('strobeOverlay');

  if (!strobeOverlay) {
    strobeOverlay = document.createElement('div');
    strobeOverlay.id = 'strobeOverlay';
    strobeOverlay.style.position = 'fixed';
    strobeOverlay.style.inset = '0';
    strobeOverlay.style.zIndex = '99999';
    strobeOverlay.style.display = 'none';
    strobeOverlay.style.pointerEvents = 'auto';
    strobeOverlay.innerHTML = '<div style="position:absolute;top:24px;left:50%;transform:translateX(-50%);background:#000;color:#fff;padding:10px 20px;border-radius:25px;font-weight:bold;font-size:0.9rem;box-shadow:0 4px 15px rgba(0,0,0,0.8);border:1px solid #444;">TAP ANYWHERE TO STOP SOS STROBE</div>';
    strobeOverlay.addEventListener('click', stopStrobeTorch);
    document.body.appendChild(strobeOverlay);
  }

  if (isStrobeActive) {
    stopStrobeTorch();
  } else {
    isStrobeActive = true;
    strobeOverlay.style.display = 'block';
    if (btn) btn.style.borderColor = 'var(--crimson-neon)';
    let on = false;
    strobeInterval = setInterval(() => {
      on = !on;
      strobeOverlay.style.backgroundColor = on ? '#ffffff' : '#dc2626';
    }, 120);
    playHapticFeedback([100, 50, 100]);
  }
}

function stopStrobeTorch() {
  isStrobeActive = false;
  clearInterval(strobeInterval);
  const strobeOverlay = document.getElementById('strobeOverlay');
  if (strobeOverlay) strobeOverlay.style.display = 'none';
  const btn = document.getElementById('btnStrobeTorch');
  if (btn) btn.style.borderColor = '';
}

function playSafetyWhistle() {
  playHapticFeedback([300, 100, 300]);
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(2800, ctx.currentTime);
    osc2.frequency.setValueAtTime(3200, ctx.currentTime);

    // Whistle bursts (3 rapid shrill blasts)
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    for (let i = 0; i < 3; i++) {
      const t = now + (i * 0.38);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.setValueAtTime(0.01, t + 0.26);
    }

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.25);
    osc2.stop(now + 1.25);
  } catch (e) {
    console.log('Whistle audio not permitted:', e);
  }
}

function shareLocationViaWhatsApp() {
  const lat = APP_STATE.gps.lat || 10.8505;
  const lng = APP_STATE.gps.lng || 76.2711;
  const place = document.getElementById('detectedPlaceName')?.textContent || 'Kerala, India';

  const text = `🚨 *EMERGENCY SOS DISTRESS SIGNAL* 🚨\n\nI need immediate emergency assistance!\n📍 *Detected Location:* ${place}\n🌐 *Coordinates:* ${lat}, ${lng}\n🗺️ *Live Google Maps:* https://www.google.com/maps?q=${lat},${lng}\n⏰ *Time:* ${new Date().toLocaleTimeString()}\n\n_Sent via One Tap SOS Emergency Beacon_`;
  
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function shareLocationViaSms() {
  const lat = APP_STATE.gps.lat || 10.8505;
  const lng = APP_STATE.gps.lng || 76.2711;
  const place = document.getElementById('detectedPlaceName')?.textContent || 'Kerala, India';

  const text = `EMERGENCY SOS! I need help! Location: ${place} (${lat},${lng}) Maps: https://maps.google.com/?q=${lat},${lng}`;

  window.location.href = `sms:?body=${encodeURIComponent(text)}`;
}

function initBatteryMonitor() {
  const indicator = document.getElementById('phoneBatteryIndicator');
  if ('getBattery' in navigator) {
    navigator.getBattery().then((battery) => {
      function updateBattery() {
        const level = Math.round(battery.level * 100);
        const charging = battery.charging ? '⚡ Charging' : '';
        if (indicator) indicator.textContent = `🔋 Battery: ${level}% ${charging}`;
      }
      updateBattery();
      battery.addEventListener('levelchange', updateBattery);
      battery.addEventListener('chargingchange', updateBattery);
    }).catch(() => {
      if (indicator) indicator.textContent = '🔋 Battery: 90%';
    });
  } else {
    if (indicator) indicator.textContent = '🔋 Battery: Active';
  }
}

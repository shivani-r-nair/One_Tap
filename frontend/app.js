(() => {
  'use strict';
  const pageHost = location.hostname || 'localhost';
  const isLocalDevServer = ['5500', '5501', '5173', '3000'].includes(location.port) || location.protocol === 'file:';
  const defaultApi = isLocalDevServer
    ? `http://${pageHost}:8080/one-tap-backend-1.0`
    : `${location.origin}/one-tap-backend-1.0`;
  const configuredApi = localStorage.getItem('oneTapApi');
  // Live Server must use the local One Tap backend even if an old API override
  // was saved in this browser. Hosted frontends may still use that override.
  const API = ((isLocalDevServer ? defaultApi : configuredApi || defaultApi)).replace(/\/$/, '');
  const app = document.querySelector('#app');
  let user = null, profile = null, contacts = [], geo = null, geoObtainedAt = null, timer = null, geoWatchId = null, sosTrackingCleanup = null, sosMapFix = null, sosTrackingStart = null, sosTrackingStop = null, sosModeActive = false, sosFacilityStart = null, sosFacilityUpdate = null, sosFacilityUnavailable = null, sosFacilityStop = null, sosFacilitySetOnMap = null, sosFacilityClearMap = null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = m => { const el=document.querySelector('#toast'); el.textContent=m; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),3500); };
  const formData = data => new URLSearchParams(Object.entries(data).filter(([,v])=>v!==undefined&&v!==null).map(([k,v])=>[k,String(v)]));
  async function request(path, data, method='POST') {
    const opts={method,credentials:'include',headers:{Accept:'application/json'}};
    if(data) { opts.headers['Content-Type']='application/x-www-form-urlencoded;charset=UTF-8'; opts.body=formData(data); }
    let res; try { res=await fetch(`${API}/${path}`,opts); } catch { throw Error(`Cannot reach backend at ${API}. Check that Tomcat is running, the backend is deployed, and the frontend origin is allowed by CORS.`); }
    let body; try { body=await res.json(); } catch { body={}; }
    if(!res.ok) { const error=Error(body.message || `Request failed (${res.status}).`); error.status=res.status; throw error; }
    return body;
  }
  function shell(content, back='') { app.innerHTML=`<div class="page"><header class="top"><button class="back ${back?'':'hidden'}" data-back aria-label="Go back">←</button><a class="brand" href="#" aria-label="OneTap home"><img class="brand-logo" src="onetap-logo.png" alt="OneTap shield, handprint and wordmark: Help, One Tap Away"></a><div class="location-indicator" id="locationTrackingIndicator" role="status" aria-live="polite"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-6.4 7-13a7 7 0 1 0-14 0c0 6.6 7 13 7 13Zm0-10.2a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6Z"/></svg><span>Location tracking is off</span></div></header>${content}</div>`; app.querySelector('[data-back]')?.addEventListener('click',()=>navigate(back)); }
  function setTrackingIndicator(active){const indicator=document.querySelector('#locationTrackingIndicator');if(!indicator)return;indicator.classList.toggle('is-tracking',Boolean(active));indicator.querySelector('span').textContent=active?'Your location is being tracked':'Location tracking is off';}
  function navigate(page) { if(page!=='profile')stopGeoTracking(); if(page!=='sos')stopSosTracking('page-left'); location.hash=page; render(); }
  function stopGeoTracking(){if(geoWatchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(geoWatchId);geoWatchId=null;setTrackingIndicator(false);}
  function stopSosTracking(reason='stopped') { if(sosTrackingCleanup){const cleanup=sosTrackingCleanup;sosTrackingCleanup=null;cleanup(reason);} }
  function message(id,text){const e=document.getElementById(id);if(e)e.textContent=text;}
  function welcome(){shell(`<section class="welcome"><img class="welcome-logo" src="onetap-logo.png" alt="OneTap official shield and handprint logo with Help, One Tap Away tagline"><p class="eyebrow">PERSONAL SAFETY, ONE TAP AWAY</p><div class="actions"><button class="primary" data-page="login">Login</button><button class="secondary" data-page="register">Create an account</button></div></section>`);}
  function authPage(mode){const reg=mode==='register';shell(`<section class="panel narrow"><p class="eyebrow">${reg?'STEP 1: USER IDENTIFICATION':'WELCOME BACK'}</p><h1>${reg?'Create your account':'Login'}</h1><form id="authForm" novalidate>${reg?'<label>Full name<input name="fullName" autocomplete="name" required minlength="2"></label>':''}<label>Email address<input name="email" type="email" autocomplete="email" required></label>${reg?'<label>Phone number<input name="phoneNumber" type="tel" autocomplete="tel" required pattern="[+0-9 ()-]{8,20}"></label>':''}<label>Password<div class="password"><input name="password" type="password" autocomplete="${reg?'new-password':'current-password'}" required minlength="10"><button type="button" data-eye aria-label="Show password">Show</button></div></label>${reg?'<label>Confirm password<input name="confirmPassword" type="password" autocomplete="new-password" required></label>':''}<p class="error" id="authError" role="alert"></p><button class="primary" type="submit">${reg?'Create account':'Login'}</button></form><button class="text-button" data-page="${reg?'login':'register'}">${reg?'Already have an account? Login':'Register a new account'}</button></section>`, 'welcome');
    document.querySelector('[data-eye]').onclick=e=>{const input=e.currentTarget.previousElementSibling;input.type=input.type==='password'?'text':'password';e.currentTarget.textContent=input.type==='password'?'Show':'Hide';};
    document.querySelector('#authForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));const error=document.querySelector('#authError');error.textContent='';if(!e.currentTarget.reportValidity())return;if(reg&&(f.password.length<10||!/[A-Za-z]/.test(f.password)||!/[0-9]/.test(f.password))){error.textContent='Use at least 10 characters, including a letter and a number.';return;}if(reg&&f.password!==f.confirmPassword){error.textContent='Passwords do not match.';return;}const btn=e.currentTarget.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Please wait…';try{if(reg){const result=await request('register',{fullName:f.fullName,email:f.email,phoneNumber:f.phoneNumber,password:f.password});user=result.user;toast('Account created. Complete your profile.');navigate('profile');}else{const result=await request('login',{email:f.email,password:f.password});user=result.user;await routeAfterLogin();}}catch(err){error.textContent=err.message;}finally{btn.disabled=false;btn.textContent=reg?'Create account':'Login';}};
  }
  async function routeAfterLogin(){try{profile=await request('profile',null,'GET');const c=await request('trusted-contacts',null,'GET');contacts=c.contacts||[];navigate(!profile.profileComplete?'profile':contacts.length<3?'contacts':'sos');}catch(e){toast(e.message);navigate(user?'profile':'login');}}
  async function profilePage(){
    if(!profile){try{profile=await request('profile',null,'GET');}catch(e){if(e.status===401){navigate('welcome');return;}shell(`<section class="panel narrow"><p class="eyebrow">PROFILE</p><h1>Your profile could not be loaded</h1><p class="error" role="alert">${esc(e.message)}</p><p class="muted">Check that the backend is running and the profile database migrations are applied.</p><button class="primary" id="retryProfile">Retry</button></section>`,'welcome');document.querySelector('#retryProfile').onclick=()=>{profile=null;profilePage();};return;}}
    let locations;
    try { locations=await request('location-data',null,'GET'); }
    catch(e) { locations={countries:[],states:[]}; toast(e.message); }
    const countries=locations.countries||[], states=locations.states||[];
    if(!countries.length) toast('Country data is unavailable. Apply migration_002_profile_geography.sql.');
    const countryOptions=countries.map(x=>`<option value="${x.countryId}">${esc(x.countryName)}</option>`).join('');
    shell(`<section class="panel"><p class="eyebrow">STEP 2: PROFILE COMPLETION</p><h1>Your profile</h1><form id="profileForm" class="form-grid">
      <label>Full name<input name="fullName" autocomplete="name" required value="${esc(profile?.fullName||user?.fullName)}"></label>
      <label>Email address<input name="email" type="email" autocomplete="email" required value="${esc(profile?.email||user?.email)}"></label>
      <label>Phone number<input name="phoneNumber" type="tel" autocomplete="tel" required value="${esc(profile?.phoneNumber||user?.phoneNumber)}"></label>
      <label>Country<select name="countryId" required><option value="">Select country</option>${countryOptions}</select></label>
      <label>State / Union Territory / Region<select name="stateId" required disabled><option value="">Select country first</option></select></label>
      <label>District<select name="districtId" id="districtId" required><option value="">Select state / UT first</option></select><span id="districtStatus" class="field-status muted" role="status" aria-live="polite">Choose a State / UT to load its districts.</span></label>
      <label>Place / Locality<input name="locality" autocomplete="address-level3" required maxlength="120" value="${esc(profile?.locality||'')}"></label>
      <label class="full">Street Address<input name="address" autocomplete="street-address" required maxlength="255" value="${esc(profile?.address||'')}"></label>
      <fieldset class="location full"><legend>Device location</legend><p class="muted">Your location helps One Tap show your position and include it with an SOS alert. Browser permission is required. Coordinates are sent to OpenStreetMap for address lookup. Tracking runs only while this profile page is open and stops when you leave it.</p>
        <div id="profileMap" role="region" aria-label="Interactive map showing your device location"></div>
        <div class="map-actions"><button type="button" class="secondary" id="detectGps">Detect My Location</button><button type="button" class="secondary" id="startTracking">Start Live Tracking</button><button type="button" class="secondary" id="stopTracking" disabled>Stop Tracking</button><button type="button" class="secondary" id="recenterMap">Recenter Map</button></div>
        <p id="gpsStatus" class="muted" role="status" aria-live="polite">${profile?.latitude!=null?`Saved GPS location: ${esc(profile.latitude)}, ${esc(profile.longitude)}${profile?.accuracy!=null?` accuracy ${esc(profile.accuracy)} metres`:''}`:'Location permission will be requested automatically.'}</p>
        <p class="muted">Address lookup © OpenStreetMap contributors.</p>
        <input type="hidden" name="latitude" value="${esc(profile?.latitude??'')}"><input type="hidden" name="longitude" value="${esc(profile?.longitude??'')}"><input type="hidden" name="accuracy" value="${esc(profile?.accuracy??'')}">
      </fieldset>
      <p class="error full" id="profileError" role="alert"></p><button class="primary full" type="submit">Save Profile</button></form></section>`, 'welcome');
    const form=document.querySelector('#profileForm'), country=form.elements.countryId, state=form.elements.stateId, district=form.elements.districtId;
    const mapStatus=document.querySelector('#gpsStatus');
    let map=null, marker=null;
    if(window.L){
      map=L.map('profileMap',{zoomControl:true}).fitWorld();
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'}).addTo(map);
      map.on('tileerror',()=>{mapStatus.textContent='Map tiles could not be loaded. GPS detection is still available.';mapStatus.className='error';});
      if(profile?.latitude!=null&&profile?.longitude!=null){const saved={latitude:Number(profile.latitude),longitude:Number(profile.longitude)};if(Number.isFinite(saved.latitude)&&Number.isFinite(saved.longitude)){marker=L.marker([saved.latitude,saved.longitude]).addTo(map).bindPopup('Last saved device location');map.setView([saved.latitude,saved.longitude],17);}}
      setTimeout(()=>map.invalidateSize(),0);
    }else{mapStatus.textContent='The interactive map library could not load. Check your connection; GPS detection can still be used.';mapStatus.className='error';}
    const showMapPosition=(coords,follow=true)=>{if(!map||!Number.isFinite(Number(coords.latitude))||!Number.isFinite(Number(coords.longitude)))return;const point=[Number(coords.latitude),Number(coords.longitude)];if(marker)marker.setLatLng(point);else marker=L.marker(point).addTo(map);marker.bindPopup('Your device location');if(follow)map.setView(point,Math.max(map.getZoom(),17));};
    const statesForCountry=()=>states.filter(x=>String(x.countryId)===country.value);
    let districtRequestVersion=0;
    const districtStatus=document.querySelector('#districtStatus');
    const fillDistricts=async(selected='')=>{
      const stateId=String(state.value||''), requestVersion=++districtRequestVersion;
      district.replaceChildren(new Option(stateId?'Loading districts...':'Select state / UT first',''));
      district.disabled=false;
      district.required=Boolean(stateId);
      districtStatus.textContent=stateId?'Loading districts from the database...':'Choose a State / UT to load its districts.';
      districtStatus.className='field-status muted';
      if(!stateId)return [];
      try {
        const result=await request(`districts?stateId=${encodeURIComponent(stateId)}`,null,'GET');
        if(requestVersion!==districtRequestVersion||state.value!==stateId)return;
        if(!Array.isArray(result.districts))throw new Error('The backend response did not contain a districts list.');
        const rows=result.districts;
        district.replaceChildren(new Option(rows.length?'Select district':'No districts available for this State / UT',''));
        for(const item of rows){
          if(item.districtId==null||item.districtName==null)continue;
          district.add(new Option(String(item.districtName),String(item.districtId)));
        }
        districtStatus.textContent=rows.length?`${rows.length} districts loaded.`:'No districts were returned for this State / UT.';
        districtStatus.className=rows.length?'field-status success':'field-status error';
        if(selected)district.value=String(selected);
        return rows;
      } catch(e) {
        if(requestVersion!==districtRequestVersion||state.value!==stateId)return;
        district.replaceChildren(new Option('Districts could not be loaded',''));
        districtStatus.textContent=`Could not load districts: ${e.message} Check the backend URL, CORS, and browser console.`;
        districtStatus.className='field-status error';
        console.error(`District request failed for stateId=${stateId}`,e);
        return [];
      }
    };
    const fillStates=(selected='')=>{const rows=statesForCountry();state.disabled=!rows.length;state.innerHTML=`<option value="">${rows.length?'Select state / region':'No maintained region data for this country'}</option>`+[...new Set(rows.map(x=>x.regionType||'Region'))].map(type=>`<optgroup label="${esc(type==='State'?'States':type==='Union Territory'?'Union Territories':type+'s')}">${rows.filter(x=>(x.regionType||'Region')===type).map(x=>`<option value="${x.stateId}">${esc(x.stateName)}</option>`).join('')}</optgroup>`).join('');if(selected)state.value=String(selected);return fillDistricts(profile?.districtId||'');};
    if(profile?.countryId)country.value=String(profile.countryId);
    fillStates(profile?.stateId||'');
    country.addEventListener('change',()=>{state.value='';fillStates();});
    state.addEventListener('change',()=>fillDistricts());
    const gpsButton=document.querySelector('#detectGps'), gpsStatus=document.querySelector('#gpsStatus');
    const normalizeGeoName=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
      .replace(/^(national capital territory of|nct of)\s+/,'').replace(/\b(district|dist)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
    const applyAddressDetails=async result=>{
      const address=result?.address||{};
      const countryCode=String(address.country_code||'').toUpperCase();
      const countryName=normalizeGeoName(address.country);
      const countryRow=countries.find(x=>String(x.countryCode||'').toUpperCase()===countryCode||normalizeGeoName(x.countryName)===countryName);
      const locality=address.neighbourhood||address.suburb||address.quarter||address.city_district||address.village||address.town||address.city||address.municipality||address.hamlet;
      const street=[address.house_number,address.road||address.pedestrian||address.residential].filter(Boolean).join(' ');
      if(locality)form.elements.locality.value=locality;
      if(street||result?.display_name)form.elements.address.value=street||result.display_name;
      if(countryRow){
        country.value=String(countryRow.countryId);
        const stateCandidates=[address.state,address.region,address.province].map(normalizeGeoName).filter(Boolean);
        const stateRow=statesForCountry().find(x=>stateCandidates.includes(normalizeGeoName(x.stateName)));
        const districtRows=await fillStates(stateRow?.stateId||'');
        if(stateRow){
          const districtCandidates=[address.state_district,address.county,address.district,address.city_district,address.city].map(normalizeGeoName).filter(Boolean);
          const districtRow=(districtRows||[]).find(x=>districtCandidates.includes(normalizeGeoName(x.districtName)));
          if(districtRow)district.value=String(districtRow.districtId);
        }
      }
      return {country:address.country||'',state:address.state||address.region||'',district:address.state_district||address.county||address.district||''};
    };
    const detectDeviceLocation=async automatic=>{
      const status=gpsStatus;
      if(!navigator.geolocation){status.textContent='This browser does not support device location. Enter your address and choose the State/UT and district manually.';status.className='error';return;}
      gpsButton.disabled=true;gpsButton.textContent='Detecting location...';status.textContent='Requesting device location permission...';status.className='muted';
      try {
        const coords=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(pos=>resolve(pos.coords),reject,{enableHighAccuracy:true,timeout:20000,maximumAge:60000}));
        geo=coords;
        for(const [name,value] of [['latitude',coords.latitude],['longitude',coords.longitude],['accuracy',coords.accuracy]])form.elements[name].value=value??'';
        showMapPosition(coords);
        status.textContent=`Coordinates detected (${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}). Looking up the address...`;
        const url=new URL('https://nominatim.openstreetmap.org/reverse');
        url.search=new URLSearchParams({format:'jsonv2',addressdetails:'1',lat:String(coords.latitude),lon:String(coords.longitude),zoom:'18'}).toString();
        try {
          const response=await fetch(url,{headers:{Accept:'application/json'},credentials:'omit'});
          if(!response.ok)throw new Error(`Address lookup returned HTTP ${response.status}.`);
          const result=await response.json();
          const details=await applyAddressDetails(result);
          const missing=[];
          if(!country.value)missing.push('country');
          if(!state.value)missing.push('State/UT');
          if(!district.value)missing.push('district');
          if(!form.elements.locality.value)missing.push('locality');
          if(!form.elements.address.value)missing.push('street address');
          status.textContent=`Location detected${details.state?` near ${details.state}`:''}. ${missing.length?`Review or enter ${missing.join(', ')} manually.`:'Address fields were filled; review them before saving.'} Save Profile to store these details. Address lookup © OpenStreetMap contributors.`;
          status.className=missing.length?'error':'success';
        } catch(error) {
          console.error('Reverse geocoding failed; coordinates are available for manual address entry.',error);
          status.textContent=`Coordinates detected, but address lookup failed (${error.message}). Enter or select your address manually, then save your profile.`;
          status.className='error';
        }
      } catch(error) {
        const message=error?.code===1?'Location permission was denied. Allow it in browser settings, retry, or enter your address manually.':error?.code===2?'The device could not determine its location. Check device location services or enter your address manually.':error?.code===3?'Location detection timed out. Retry or enter your address manually.':`Location detection failed: ${error.message||'unknown error'}. Enter your address manually.`;
        status.textContent=message;status.className='error';
      } finally {gpsButton.disabled=false;gpsButton.textContent=automatic?'Retry Location Detection':'Refresh My Location';}
    };
    gpsButton.addEventListener('click',()=>detectDeviceLocation(false));
    document.querySelector('#recenterMap').addEventListener('click',()=>{if(geo)showMapPosition(geo);else detectDeviceLocation(false);});
    const startTrackingButton=document.querySelector('#startTracking'), stopTrackingButton=document.querySelector('#stopTracking');
    startTrackingButton.addEventListener('click',()=>{
      if(!navigator.geolocation){gpsStatus.textContent='This browser does not support location tracking. Use Detect My Location or enter your address manually.';gpsStatus.className='error';return;}
      if(geoWatchId!==null)return;
      gpsStatus.textContent='Requesting permission to track your location while this page remains open...';gpsStatus.className='muted';
      geoWatchId=navigator.geolocation.watchPosition(pos=>{geo=pos.coords;setTrackingIndicator(true);for(const [name,value] of [['latitude',geo.latitude],['longitude',geo.longitude],['accuracy',geo.accuracy]])form.elements[name].value=value??'';showMapPosition(geo);gpsStatus.textContent=`Live tracking is on while this page is open. Current accuracy: ${Math.round(geo.accuracy)} m. Save Profile to store the latest coordinates.`;gpsStatus.className='success';startTrackingButton.disabled=true;stopTrackingButton.disabled=false;},error=>{stopGeoTracking();startTrackingButton.disabled=false;stopTrackingButton.disabled=true;gpsStatus.textContent=error.code===1?'Location permission was denied. Allow location in browser settings, or enter your address manually.':error.code===2?'Device location is unavailable. Check location services and retry.':'Location tracking timed out. Retry while this page is open.';gpsStatus.className='error';},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
      startTrackingButton.disabled=true;stopTrackingButton.disabled=false;
    });
    stopTrackingButton.addEventListener('click',()=>{stopGeoTracking();startTrackingButton.disabled=false;stopTrackingButton.disabled=true;gpsStatus.textContent=geo?'Live tracking stopped. The last successfully obtained fix is retained. Save Profile to store it.':'Live tracking stopped.';gpsStatus.className='muted';});
    form.addEventListener('submit',async e=>{
      e.preventDefault();const error=document.querySelector('#profileError');error.textContent='';
      if(!form.reportValidity())return;
      const data=Object.fromEntries(new FormData(form));const button=form.querySelector('[type=submit]');button.disabled=true;button.textContent='Saving...';
      try {
        const saved=await request('profile',data);
        if(saved.status!=='success')throw new Error(saved.message||'The backend did not confirm saving the profile.');
        profile=saved;
        const hasCoordinates=data.latitude!==''&&data.longitude!=='';
        toast(hasCoordinates?'Profile and detected location saved.':'Profile saved with your manually entered location.');
        navigate('contacts-setup');
      }
      catch(err){error.textContent=err.message;}
      finally{button.disabled=false;button.textContent='Save Profile';}
    });
    const needsLocation=!profile||profile.latitude==null||profile.longitude==null||!profile.countryId||!profile.stateId||!profile.districtId||!profile.locality||!profile.address;
    if(needsLocation)detectDeviceLocation(true);
  }
  function contactPage(){const rows=contacts.length?contacts.map((c,i)=>`<div class="contact-row"><label>Name<input data-c="name" data-i="${i}" value="${esc(c.contactName)}" required></label><label>Phone<input data-c="phone" data-i="${i}" value="${esc(c.phoneNumber)}" required pattern="[+0-9 ()-]{8,20}"></label><label>Relationship<input data-c="relationship" data-i="${i}" value="${esc(c.relationship)}" required></label><button class="remove" data-remove="${i}" type="button" aria-label="Remove contact">Remove</button></div>`).join(''):'<p class="muted">No emergency contacts have been saved.</p>';
    shell(`<section class="panel"><p class="eyebrow">STEP 3 · EMERGENCY CONTACT SETUP</p><h1>Trusted Contacts</h1><p class="muted">Choose the people who should receive your emergency alerts.</p><div id="contactList">${rows}</div><div class="actions"><button class="secondary" id="addContact">Add contact</button><button class="primary" id="saveContacts">Save contacts</button></div><p class="muted">Add at least three trusted contacts to finish setup.</p><p class="error" id="contactError" role="alert"></p></section>`, 'profile');
    document.querySelector('#addContact').onclick=()=>{contacts.push({contactName:'',phoneNumber:'',relationship:''});contactPage();};document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{contacts.splice(Number(b.dataset.remove),1);contactPage();});
    document.querySelector('#saveContacts').onclick=async()=>{const error=document.querySelector('#contactError');error.textContent='';contacts=contacts.map((c,i)=>({contactName:document.querySelector(`[data-i="${i}"][data-c="name"]`)?.value.trim()||'',phoneNumber:document.querySelector(`[data-i="${i}"][data-c="phone"]`)?.value.trim()||'',relationship:document.querySelector(`[data-i="${i}"][data-c="relationship"]`)?.value.trim()||''}));if(contacts.length<3||contacts.some(c=>!c.contactName||!/^\+?[0-9 ()-]{8,20}$/.test(c.phoneNumber)||!c.relationship)){error.textContent='Enter at least three valid contacts with name, phone, and relationship.';return;}const b=document.querySelector('#saveContacts');b.disabled=true;try{await request('trusted-contacts',{contacts:JSON.stringify(contacts)});toast('Contacts saved.');navigate('sos');}catch(e){error.textContent=e.message;}finally{b.disabled=false;}};
  }
  function tabbar(active){return `<nav class="tabs" aria-label="Main navigation"><button data-tab="sos" class="${active==='sos'?'active':''}"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 18h12l-1.2-7a4.9 4.9 0 0 0-9.6 0L6 18Zm-2 3h16M12 3V1M5 6 3.5 4.5m15.5 1.5 1.5-1.5M3 12H1m22 0h-2"/></svg></span>SOS</button><button data-tab="contacts" class="${active==='contacts'?'active':''}"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20m5.5-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-6.7a3.5 3.5 0 0 1 0 6.8M21 20v-1.5a4 4 0 0 0-3-3.9"/></svg></span>Contacts</button><button data-tab="account" class="${active==='account'?'active':''}"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0m8-11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg></span>Account</button></nav>`;}
  async function loadShared(){if(!user){await request('session',null,'GET').then(r=>user=r.user).catch(()=>{});}if(user){profile=await request('profile',null,'GET');const r=await request('trusted-contacts',null,'GET');contacts=r.contacts||[];}}
  async function dashboard(which){try{await loadShared();}catch(e){toast(e.message);navigate('login');return;}if(which==='contacts'){contactScreen();return;}if(which==='account'){accountScreen();return;}sosScreen();}
  function contactScreen(){const rows=contacts.map(c=>`<article class="contact-card"><span class="contact-avatar" aria-hidden="true">${esc((c.contactName||'?').trim().charAt(0).toUpperCase())}</span><div class="contact-main"><b>${esc(c.contactName)}</b>${c.relationship?`<span>${esc(c.relationship)}</span>`:''}</div><a class="contact-call" href="tel:${encodeURIComponent(c.phoneNumber)}"><span aria-hidden="true">☎</span>${esc(c.phoneNumber)}</a></article>`).join('');shell(`<div class="dashboard"><h1>One Tap — <span class="accent">SOS Emergency Call</span></h1><section class="panel"><p class="eyebrow">YOUR SAFETY NETWORK</p><h2>Trusted Contacts</h2>${rows||'<p class="muted">No contacts saved yet.</p>'}<button class="secondary" data-edit-contacts>Edit contacts</button></section>${tabbar('contacts')}</div>`);tabs();document.querySelector('[data-edit-contacts]').onclick=()=>navigate('contacts-setup');}
  function accountScreen(){shell(`<div class="dashboard"><h1>One Tap — <span class="accent">SOS Emergency Call</span></h1><section class="panel"><p class="eyebrow">PERSONAL DETAILS</p><h2>Account</h2><dl>${[['Full name',profile?.fullName],['Email',profile?.email],['Phone',profile?.phoneNumber],['Country',profile?.countryName],['State / UT',profile?.stateName],['District',profile?.district],['Place',profile?.locality],['Address',profile?.address],['GPS latitude',profile?.latitude],['GPS longitude',profile?.longitude],['Accuracy',profile?.accuracy==null?'':`${profile.accuracy} m`]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v||'—')}</dd></div>`).join('')}</dl><div class="actions account-actions"><button class="secondary" data-edit-profile>Edit profile</button><button class="text-button" id="logout">Log out</button></div></section>${tabbar('account')}</div>`);tabs();document.querySelector('[data-edit-profile]').onclick=()=>navigate('profile');document.querySelector('#logout').onclick=async()=>{try{await request('session',{});}catch{}user=null;profile=null;contacts=[];navigate('welcome');};}
  function tabs(){document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>navigate(b.dataset.tab));}
  function sosScreen(){
    const savedRecipients=contacts.map(c=>`<li><b>${esc(c.contactName)}</b> · ${esc(c.phoneNumber)}</li>`).join('');
    shell(`<div class="dashboard"><h1>One Tap — <span class="accent">SOS Emergency Call</span></h1>
      <section class="sos-panel"><p class="eyebrow"><svg class="one-tap-bell" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4"/></svg>ONE TAP</p><p>Press SOS to send an automatic SMS to every saved trusted contact. A 3-second cancel window is provided.</p>
        <button class="sos-button" id="sos" aria-describedby="sosStatus">SOS</button><p id="sosStatus" role="status">No alert is being sent.</p><button class="secondary hidden" id="cancel">Cancel alert</button><button class="secondary hidden" id="retrySos" type="button">Retry failed trusted-contact SMS</button><p id="dispatchStatus" role="status" aria-live="polite"></p>
        <h2 class="section-title"><span class="section-icon" aria-hidden="true">♧</span>Automatic recipients: saved trusted contacts</h2><ul class="recipient-list">${savedRecipients||'<li class="muted">No trusted contacts are saved. Edit contacts to enable automatic SMS alerts.</li>'}</ul>
      </section>
      <section class="panel"><h2>Current device location</h2><p class="muted">Live tracking uses your device GPS while this page is open. Nearby emergency locations are searched in OpenStreetMap using your GPS position.</p><div id="sosMap" class="sos-map" role="region" aria-label="Interactive map showing your device location"><div id="sosScanLine" class="sos-scan-line" aria-hidden="true"></div></div><section class="detected-location" aria-live="polite"><p class="eyebrow">NEAREST EMERGENCY LOCATION</p><strong id="detectedLabel" class="detected-label hidden">DETECTED</strong><div id="nearestFacilityResult" role="status"><p class="muted">Press SOS to start GPS tracking and search nearby mapped emergency facilities.</p></div><p class="facility-disclaimer muted">Place data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>. Entries may be incomplete and do not confirm that a facility is open or that responders are dispatched. Distances are straight-line estimates.</p></section><div class="sos-map-actions"><button type="button" class="secondary" id="startSosTracking">Start live tracking</button><button type="button" class="secondary" id="stopSosTracking" disabled>Stop tracking</button><button type="button" class="secondary" id="recenterSosMap">Recenter</button></div><p id="sosLocationStatus" class="muted" role="status" aria-live="polite">Location has not been detected during this visit.</p><p id="sosLocationDetail" class="muted"></p></section>
      <section class="panel hidden"><h2>Send to additional contacts</h2><p class="muted">Choose temporary recipients to receive the same emergency alert. These contacts are not added to your trusted contacts.</p>
        <button type="button" class="secondary" id="pickDeviceContacts">Choose from device contacts</button><p id="contactPickerStatus" class="muted" role="status"></p>
        <div class="additional-entry"><label>Contact name<input id="extraName" maxlength="100" autocomplete="name"></label><label>Phone number (include country code)<input id="extraPhone" type="tel" maxlength="30" placeholder="+91…" autocomplete="tel"></label><button class="secondary" type="button" id="addExtra">Add for review</button></div>
        <h3>Review recipients</h3><div id="additionalReview"><p class="muted">No additional recipients selected.</p></div>
        <label>Optional message for these additional contacts<textarea id="additionalMessage" maxlength="500" rows="3" placeholder="Add short context, if useful"></textarea></label>
        <button class="primary" id="sendAdditional" type="button" disabled>Send to selected additional contacts</button><button class="secondary hidden" id="retryAdditional" type="button">Retry failed additional SMS</button><p id="additionalStatus" role="status" aria-live="polite"></p>
      </section>
      <section class="panel helplines-panel"><h2 class="section-title"><span class="section-icon phone-icon" aria-hidden="true">☎</span>Emergency Helplines</h2><label>Country<select id="helplineCountry" aria-label="Choose helpline country"><option>Loading countries…</option></select></label><div id="helplines" class="helplines" aria-live="polite"><p class="muted">Loading helplines…</p></div></section>
      <section class="panel"><h2 class="section-title"><span class="section-icon" aria-hidden="true">✦</span>Phone Safety Utilities</h2><p class="muted">Screen flashing is a visual fallback; web pages cannot control your phone's physical flashlight. Sound needs browser audio support.</p><div class="utility-grid">
        <button class="secondary safety-feature" id="strobe" type="button" aria-pressed="false" aria-label="Light strobe, inactive"><svg class="safety-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6v2H9zM8 5h8l2 5-4 4v5h-4v-5l-4-4 2-5Zm4 12v2m-7 1 2-2m12 2-2-2M3 13h3m12 0h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="safety-name">Light Strobe</span><span class="feature-state" aria-live="polite">INACTIVE</span></button>
        <button class="secondary safety-feature" id="whistle" type="button" aria-pressed="false" aria-label="Safety whistle, inactive"><svg class="safety-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h11a5 5 0 1 1-5 5v-1H3v-4Zm11 0V7a2 2 0 0 1 4 0v3m-9 4v2m4-2v2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="safety-name">Safety Whistle</span><span class="feature-state" aria-live="polite">INACTIVE</span></button>
        <button class="secondary safety-feature" id="siren" type="button" aria-pressed="false" aria-label="Emergency siren, inactive"><svg class="safety-icon siren-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17h14l-1.5-8a5.6 5.6 0 0 0-11 0L5 17Zm-2 3h18M12 2V0M4 5 2 3m18 2 2-2M2 11H0m24 0h-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="safety-name">Emergency Siren</span><span class="feature-state" aria-live="polite">INACTIVE</span></button>
        <button class="secondary" id="whatsapp"><svg class="whatsapp-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3.2A12.6 12.6 0 0 0 5.2 22.3L3.5 28.7l6.6-1.7A12.7 12.7 0 1 0 16 3.2Zm0 22.9c-1.9 0-3.7-.5-5.3-1.5l-.4-.2-3.9 1 1-3.8-.3-.4a10.2 10.2 0 1 1 8.9 4.9Zm5.6-7.6c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.4 8.4 0 0 1-2.5-1.6 9.4 9.4 0 0 1-1.7-2.1c-.2-.3 0-.5.2-.7l.5-.6.3-.5c.1-.2 0-.4 0-.6s-.7-1.8-1-2.4c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.2-1.2 2.8 1.2 3.2 1.4 3.4 2.4 3.7 5.8 5.1c.8.3 1.4.5 1.9.6.8.2 1.6.2 2.2.1.7-.1 1.9-.8 2.2-1.5s.3-1.4.2-1.5-.3-.2-.6-.4Z"/></svg><span>Share via WhatsApp</span></button><button class="secondary" id="sms">Open SMS composer</button><span id="battery" class="muted">Battery status unavailable</span></div></section>${tabbar('sos')}</div>`);
    tabs();wireSOS();
  }
  async function loadHelplines(){
    const host=document.querySelector('#helplines'), countrySelect=document.querySelector('#helplineCountry');
    host.innerHTML='<p class="muted">Loading emergency helplines…</p>';
    try{
      const data=await request('location-data',null,'GET');
      if(data.status!=='success')throw new Error(data.message||'Helpline data is unavailable.');
      const countries=Array.isArray(data.countries)?data.countries:[];
      if(!countries.length)throw new Error('No countries are available.');
      countrySelect.innerHTML=countries.map(c=>`<option value="${Number(c.countryId)}">${esc(c.countryName)}</option>`).join('');
      countrySelect.value=String(profile?.countryId||1);
      const all=Array.isArray(data.emergencyContacts)?data.emergencyContacts:[];
      const render=()=>{
        const rows=all.filter(x=>Number(x.countryId)===Number(countrySelect.value));
        if(!rows.length){host.innerHTML='<p class="muted">No emergency helplines are listed for this country.</p>';return;}
        host.innerHTML=rows.map(x=>{const raw=String(x.emergencyNumber||''), dialable=/^\+?[0-9 ()-]{3,30}$/.test(raw),service=String(x.serviceName||'').toLowerCase();const icon=/police/.test(service)?'🚓':/fire|rescue/.test(service)?'🔥':/ambulance|medical|health/.test(service)?'🚑':/women|woman|child/.test(service)?'♀':'🛡️';const sms=Boolean(x.supportsSms&&x.smsNumber&&/^\+?[0-9 ()-]{3,30}$/.test(String(x.smsNumber)));return `<article class="helpline-card"><span class="helpline-icon" aria-hidden="true">${icon}</span><div class="helpline-copy"><b>${esc(x.serviceName)}</b>${dialable?`<a class="helpline-number" href="tel:${encodeURIComponent(raw.replace(/[ ()-]/g,''))}">${esc(raw)} <span>· Call</span></a>`:`<span class="helpline-number">${esc(raw||'Number unavailable')}</span>`}${sms?`<a class="helpline-sms" href="sms:${encodeURIComponent(String(x.smsNumber).replace(/[ ()-]/g,''))}">SMS supported helpline</a>`:''}</div></article>`;}).join('');
      };
      countrySelect.addEventListener('change',render);render();
    }catch(e){host.innerHTML=`<p class="error">Emergency helplines could not be loaded: ${esc(e.message)}</p>`;}
  }
  async function wireSOS(){
    loadHelplines();
    initSosLocation();
    const status=document.querySelector('#sosStatus'),cancel=document.querySelector('#cancel'),button=document.querySelector('#sos');
    let cancelled=false,requestId=null,retrySame=false,lastSosRequestId=null;
    const newRequestId=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}-0000-4000-8000-000000000000`.slice(0,36);
    const detectedLabel=document.querySelector('#detectedLabel'),facilityHost=document.querySelector('#nearestFacilityResult');
    let facilityPlaces=[],facilityQueryPoint=null,facilityQueryTimer=null,facilityController=null,facilityRequestTimeout=null,facilityRequestId=0,lastGpsPoint=null,lastFacilityQueryAt=0,facilityAddressKey='',facilityAddressCache=new Map(),facilityAddressRequests=new Map(),facilityAddressQueue=Promise.resolve(),lastFacilityAddressRequestAt=0,facilitySearchCache=new Map();
    const validGps=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
    const distanceMetres=(aLat,aLng,bLat,bLng)=>{const rad=x=>x*Math.PI/180,R=6371000,dLat=rad(bLat-aLat),dLng=rad(bLng-aLng),q=Math.sin(dLat/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLng/2)**2;return 2*R*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));};
    const facilityCategory=tags=>{if(tags.emergency==='ambulance_station'||tags.emergency==='ambulance_service')return 'Ambulance service';if(tags.amenity==='hospital'||tags.healthcare==='hospital'||tags.healthcare==='emergency_unit')return 'Hospital';if(tags.amenity==='clinic'||tags.healthcare==='clinic'||tags.amenity==='doctors')return 'Clinic';if(tags.amenity==='police')return 'Police station';if(tags.amenity==='fire_station')return 'Fire station';return null;};
    function facilityAddressFromTags(tags={}){
      if(tags['addr:full'])return String(tags['addr:full']).trim();
      const street=[tags['addr:housenumber'],tags['addr:street']].filter(Boolean).join(' ');
      return [...new Set([tags['addr:housename'],street,tags['addr:place'],tags['addr:neighbourhood'],tags['addr:quarter'],tags['addr:suburb'],tags['addr:city_district'],tags['addr:district'],tags['addr:city']||tags['addr:town']||tags['addr:village'],tags['addr:county'],tags['addr:state'],tags['addr:postcode'],tags['addr:country']].filter(Boolean).map(value=>String(value).trim()))].join(', ');
    }
    function reverseFacilityAddress(place,fallback){
      const key=`${place.lat.toFixed(6)},${place.lng.toFixed(6)}`;
      if(facilityAddressCache.has(key))return Promise.resolve(facilityAddressCache.get(key));
      if(facilityAddressRequests.has(key))return facilityAddressRequests.get(key);
      const request=facilityAddressQueue.then(async()=>{
        const wait=Math.max(0,1100-(Date.now()-lastFacilityAddressRequestAt));if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
        lastFacilityAddressRequestAt=Date.now();
        const url=new URL('https://nominatim.openstreetmap.org/reverse');
        url.search=new URLSearchParams({format:'jsonv2',addressdetails:'1',lat:String(place.lat),lon:String(place.lng),zoom:'18'}).toString();
        const response=await fetch(url,{headers:{Accept:'application/json'},credentials:'omit'});
        if(!response.ok)throw new Error(`Address lookup returned HTTP ${response.status}.`);
        const result=await response.json(),a=result.address||{};
        const road=a.road||a.pedestrian||a.footway||a.path||a.residential;
        const street=[a.house_number,road].filter(Boolean).join(' ');
        const parts=[result.name,street,a.neighbourhood||a.quarter||a.suburb||a.city_district,a.city||a.town||a.village||a.municipality,a.county||a.state_district||a.district,a.state,a.postcode,a.country];
        const address=[...new Set(parts.filter(Boolean).map(value=>String(value).trim()))].join(', ')||result.display_name||fallback;
        facilityAddressCache.set(key,address);return address;
      });
      const result=request.catch(()=>{facilityAddressCache.set(key,fallback);return fallback;}).finally(()=>facilityAddressRequests.delete(key));
      facilityAddressQueue=result.then(()=>{},()=>{});facilityAddressRequests.set(key,result);return result;
    }
    function showFacilitySearching(){
      if(!detectedLabel.classList.contains('hidden')&&detectedLabel.textContent==='DETECTED'){
        let note=facilityHost.querySelector('.facility-refresh-note');
        if(!note){note=document.createElement('p');note.className='facility-refresh-note';facilityHost.append(note);}
        note.textContent='DETECTING LOCATION...';
      }else{
        detectedLabel.textContent='DETECTING LOCATION...';detectedLabel.classList.remove('hidden');
        facilityHost.innerHTML='<p class="muted">Waiting for GPS coordinates and checking named nearby facilities...</p>';
      }
    }
    function showNearestFacility(lat,lng){
      const nearest=facilityPlaces.map(place=>({...place,distance:distanceMetres(lat,lng,place.lat,place.lng)})).filter(place=>place.distance<=10000).sort((a,b)=>a.distance-b.distance)[0];
      if(!nearest){detectedLabel.textContent='NO NEARBY LOCATION FOUND';detectedLabel.classList.remove('hidden');facilityHost.innerHTML='<p class="muted">No named emergency facility was found within 10 km in the available OpenStreetMap data. Coverage may be incomplete.</p>';sosFacilityClearMap?.();return;}
      const distance=nearest.distance<1000?`${Math.round(nearest.distance)} m away`:`${(nearest.distance/1000).toFixed(1)} km away`;
      const address=facilityAddressFromTags(nearest.tags),name=nearest.name,addressKey=`${nearest.lat.toFixed(6)},${nearest.lng.toFixed(6)}`;facilityAddressKey=addressKey;
      detectedLabel.textContent='DETECTED';detectedLabel.classList.remove('hidden');facilityHost.innerHTML=`<h3>${esc(name)}</h3><p>${esc(nearest.category)} · ${esc(distance)}</p><p data-facility-address>Address: ${esc(facilityAddressCache.get(addressKey)||address||'Looking up address...')}</p><a class="facility-directions" href="https://www.google.com/maps/dir/?api=1&amp;destination=${nearest.lat},${nearest.lng}" target="_blank" rel="noopener">Directions</a>`;
      const hasFullAddress=Boolean(nearest.tags['addr:full']||(nearest.tags['addr:housenumber']&&nearest.tags['addr:street']));
      if(!hasFullAddress)void reverseFacilityAddress(nearest,address).then(resolved=>{if(facilityAddressKey===addressKey){const addressNode=facilityHost.querySelector('[data-facility-address]');if(addressNode)addressNode.textContent=`Address: ${resolved||'Address details could not be retrieved.'}`;}});
      sosFacilitySetOnMap?.(nearest);
    }
    function displayFacilityFailure(message){
      facilityPlaces=[];
      if(detectedLabel.textContent==='DETECTED'&&facilityHost.querySelector('h3')){
        let note=facilityHost.querySelector('.facility-refresh-note');if(!note){note=document.createElement('p');note.className='facility-refresh-note error';facilityHost.append(note);}note.textContent=`Update unavailable: ${message} Showing the last successful result.`;
      }else{
        detectedLabel.classList.add('hidden');facilityHost.innerHTML=`<p class="error">${esc(message)}</p>`;sosFacilityClearMap?.();
      }
      if(!facilityHost.querySelector('[data-retry-facility]')){const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.dataset.retryFacility='';retry.textContent='Retry nearby search';retry.addEventListener('click',()=>{if(lastGpsPoint)void queryNearestFacilities(lastGpsPoint.lat,lastGpsPoint.lng);});facilityHost.append(retry);}
    }
    sosFacilityStart=()=>{facilityPlaces=[];facilityQueryPoint=null;lastGpsPoint=null;lastFacilityQueryAt=0;detectedLabel.textContent='DETECTING LOCATION...';detectedLabel.classList.remove('hidden');facilityHost.innerHTML='<p class="muted">Waiting for a fresh GPS fix before searching nearby emergency facilities…</p>';sosFacilityClearMap?.();};
    function delayFacilityRequest(ms,signal){return new Promise((resolve,reject)=>{if(signal.aborted){reject(new DOMException('Aborted','AbortError'));return;}const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);signal.addEventListener('abort',abort,{once:true});});}
    async function fetchFacilityData(query,signal){
      const endpoints=[['https://overpass-api.de/api/interpreter','Overpass primary'],['https://overpass.private.coffee/api/interpreter','Overpass fallback'],['https://maps.mail.ru/osm/tools/overpass/api/interpreter','Overpass fallback']],failures=[];
      for(let endpointIndex=0;endpointIndex<endpoints.length;endpointIndex++){
        const [url,label]=endpoints[endpointIndex],attemptLimit=endpointIndex<2?2:1;
        for(let attempt=0;attempt<attemptLimit;attempt++){
          try{
            const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8',Accept:'application/json'},body:`data=${encodeURIComponent(query)}`,signal});
            if(!response.ok){const error=new Error(`${label} returned HTTP ${response.status}.`);error.status=response.status;throw error;}
            let data;try{data=await response.json();}catch{throw new Error(`${label} returned an unreadable response.`);}
            if(!Array.isArray(data.elements))throw new Error(`${label} returned an invalid nearby-place response.`);
            return data;
          }catch(error){
            if(signal.aborted)throw new DOMException('Aborted','AbortError');
            failures.push(error.message||`${label} request failed.`);
            if(error.status===406||error.status===429){if(attempt+1<attemptLimit){await delayFacilityRequest(30000,signal);continue;}if(endpointIndex<endpoints.length-1)await delayFacilityRequest(30000,signal);break;}
            if(error.status&&error.status<500)break;
            if(attempt+1<attemptLimit)await delayFacilityRequest(1200,signal);
          }
        }
      }
      throw new Error(failures.join(' '));
    }
    async function queryNearestFacilities(lat,lng){
      if(!sosModeActive||!validGps(lat,lng))return;
      if(facilityQueryTimer){clearTimeout(facilityQueryTimer);facilityQueryTimer=null;}
      facilityController?.abort();if(facilityRequestTimeout)clearTimeout(facilityRequestTimeout);const controller=new AbortController(),requestId=++facilityRequestId;facilityController=controller;facilityRequestTimeout=setTimeout(()=>controller.abort(),120000);facilityQueryPoint={lat,lng};lastFacilityQueryAt=Date.now();showFacilitySearching();
      const query=`[out:json][timeout:20];(nwr[amenity~"^(hospital|clinic|doctors|police|fire_station)$"](around:10000,${lat},${lng});nwr[emergency~"^(ambulance_station|ambulance_service)$"](around:10000,${lat},${lng});nwr[healthcare~"^(hospital|clinic|emergency_unit)$"](around:10000,${lat},${lng}););out center;`;
      try{
        const cacheKey=`${lat.toFixed(4)},${lng.toFixed(4)}`,cached=facilitySearchCache.get(cacheKey);
        if(cached&&Date.now()-cached.at<90000){facilityPlaces=cached.places;const point=lastGpsPoint||{lat,lng};showNearestFacility(point.lat,point.lng);return;}
        const data=await fetchFacilityData(query,controller.signal);if(requestId!==facilityRequestId)return;
        const seen=new Set();facilityPlaces=data.elements.flatMap(element=>{const tags=element.tags||{},category=facilityCategory(tags),name=tags.name||tags['name:en']||tags.official_name,point=element.type==='node'?element:element.center,key=`${element.type}/${element.id}`;if(!category||!name||!point||!validGps(Number(point.lat),Number(point.lon))||seen.has(key))return[];seen.add(key);return[{lat:Number(point.lat),lng:Number(point.lon),category,name,tags}];});
        facilitySearchCache.set(cacheKey,{at:Date.now(),places:facilityPlaces});for(const[key,value]of facilitySearchCache)if(Date.now()-value.at>=90000)facilitySearchCache.delete(key);while(facilitySearchCache.size>25)facilitySearchCache.delete(facilitySearchCache.keys().next().value);
        const point=lastGpsPoint||{lat,lng};showNearestFacility(point.lat,point.lng);
      }catch(error){if(requestId!==facilityRequestId)return;const message=error.name==='AbortError'?'Nearby emergency location search timed out after checking the available services. Try again in a moment.':error.message||'The nearby location services could not be reached. Check network access and try again.';displayFacilityFailure(message);}
      finally{if(requestId===facilityRequestId){if(facilityRequestTimeout)clearTimeout(facilityRequestTimeout);facilityRequestTimeout=null;facilityController=null;}}
    }
    sosFacilityUpdate=coords=>{
      if(!sosModeActive)return;const lat=Number(coords?.latitude),lng=Number(coords?.longitude);if(!validGps(lat,lng))return;lastGpsPoint={lat,lng};
      const moved=facilityQueryPoint?distanceMetres(facilityQueryPoint.lat,facilityQueryPoint.lng,lat,lng):Infinity;
      if(facilityPlaces.length)showNearestFacility(lat,lng);
      if(facilityQueryPoint&&moved<250)return;
      if(facilityQueryTimer)clearTimeout(facilityQueryTimer);const cooldown=moved>=5000?0:Math.max(0,30000-(Date.now()-lastFacilityQueryAt));facilityQueryTimer=setTimeout(()=>{facilityQueryTimer=null;void queryNearestFacilities(lat,lng);},Math.max(1200,cooldown));
    };
    sosFacilityUnavailable=message=>{if(sosModeActive)displayFacilityFailure(message);};
    sosFacilityStop=()=>{if(facilityQueryTimer){clearTimeout(facilityQueryTimer);facilityQueryTimer=null;}if(facilityRequestTimeout){clearTimeout(facilityRequestTimeout);facilityRequestTimeout=null;}facilityRequestId++;facilityController?.abort();facilityController=null;if(detectedLabel.textContent==='DETECTED'&&facilityHost.querySelector('h3')){const note=document.createElement('p');note.className='facility-stale-note muted';note.textContent='Tracking stopped; this result and distance use the last successful GPS reading.';facilityHost.append(note);}else{detectedLabel.classList.add('hidden');facilityHost.innerHTML='<p class="muted">SOS stopped before a nearby facility could be verified.</p>';}};
    let sosActive=false,dispatchInProgress=false,sosAudioContext=null,sosAudioNodes={},sosAudioTimers={};
    const featureButton=id=>document.querySelector(`#${id}`);
    function featureState(id,active,label){const el=featureButton(id);el.classList.toggle('is-active',active);el.setAttribute('aria-pressed',String(active));el.setAttribute('aria-label',`${id==='strobe'?'Light strobe':id==='whistle'?'Safety whistle':'Emergency siren'}, ${active?'active':'inactive'}`);el.querySelector('.feature-state').textContent=label||(active?'ACTIVE':'INACTIVE');}
    async function startTone(id){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Audio is not supported by this browser.');if(!sosAudioContext||sosAudioContext.state==='closed')sosAudioContext=new Audio();await sosAudioContext.resume();if(sosAudioContext.state!=='running')throw Error('Browser did not allow audio playback.');const oscillator=sosAudioContext.createOscillator(),gain=sosAudioContext.createGain();oscillator.type=id==='whistle'?'sine':'square';gain.gain.value=id==='whistle'?.075:.045;oscillator.frequency.value=id==='whistle'?2100:650;oscillator.connect(gain);gain.connect(sosAudioContext.destination);oscillator.start();sosAudioNodes[id]={oscillator,gain};let high=false;sosAudioTimers[id]=setInterval(()=>{high=!high;oscillator.frequency.setTargetAtTime(id==='whistle'?(high?2450:1850):(high?980:620),sosAudioContext.currentTime,.08);},id==='whistle'?180:420);featureState(id,true,'ACTIVE');return true;}catch(error){featureState(id,false,'UNAVAILABLE');toast(`${id==='whistle'?'Whistle':'Siren'} audio unavailable: ${error.message}`);return false;}}
    function stopTone(id){clearInterval(sosAudioTimers[id]);delete sosAudioTimers[id];const nodes=sosAudioNodes[id];if(nodes){try{nodes.oscillator.stop();nodes.oscillator.disconnect();nodes.gain.disconnect();}catch{}delete sosAudioNodes[id];}featureState(id,false);}
    async function startFeature(id){if(id==='strobe'){const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;document.body.classList.add('strobe');featureState(id,true,reduced?'ACTIVE · SCREEN ONLY':'ACTIVE');return true;}return startTone(id);}
    function stopFeature(id){if(id==='strobe'){document.body.classList.remove('strobe');featureState(id,false);return;}stopTone(id);}
    async function activateSosMode(){sosActive=true;sosModeActive=true;sosFacilityStart?.();button.textContent='STOP SOS';button.classList.add('is-active');button.setAttribute('aria-label','Stop SOS emergency mode');status.textContent='SOS mode active: starting GPS tracking, nearby place search, screen strobe, whistle, and siren.';if(typeof navigator.vibrate==='function'){try{navigator.vibrate([150,80,150]);}catch{/* Haptics are optional. */}}void startFeature('strobe');featureState('whistle',true,'STARTING');featureState('siren',true,'STARTING');void startFeature('whistle');void startFeature('siren');sosTrackingStart?.();}
    async function stopSosMode(message){if(timer){clearInterval(timer);timer=null;cancelled=true;requestId=null;cancel.classList.add('hidden');}sosActive=false;sosModeActive=false;sosFacilityStop?.();sosTrackingStop?.();stopFeature('strobe');stopFeature('whistle');stopFeature('siren');if(sosAudioContext&&sosAudioContext.state!=='closed'){try{await sosAudioContext.close();}catch{}sosAudioContext=null;}button.classList.remove('is-active');button.textContent=retrySame?'Check same alert result':'SOS';button.setAttribute('aria-label',retrySame?'Check same alert result':'Activate SOS emergency mode');if(message)status.textContent=message;}
    button.onclick=async()=>{if(sosActive){await stopSosMode(dispatchInProgress?'SOS effects stopped. The alert request is already being processed and cannot be withdrawn.':'SOS mode stopped. No further effects are running.');return;}if(timer||dispatchInProgress)return;if(retrySame){await dispatchSOS();return;}await activateSosMode();requestId=newRequestId();cancelled=false;let n=3;status.textContent=`SOS active. SMS alert to saved trusted contacts in ${n} seconds.`;cancel.classList.remove('hidden');timer=setInterval(()=>{n--;if(n>0){status.textContent=`SOS active. SMS alert to saved trusted contacts in ${n} seconds.`;return;}clearInterval(timer);timer=null;cancel.classList.add('hidden');if(!cancelled)dispatchSOS();},1000);};
    cancel.onclick=()=>{cancelled=true;void stopSosMode('Alert cancelled. No message was sent; SOS effects were stopped.');};
    async function dispatchSOS(){
      if(dispatchInProgress)return;dispatchInProgress=true;status.textContent='Recording SOS and sending SMS notifications…';
      let coords=geo||null,gpsError='';
      if(!coords&&navigator.geolocation)try{coords=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve(p.coords),reject,{enableHighAccuracy:true,timeout:10000,maximumAge:60000}));geo=coords;geoObtainedAt=Date.now();sosMapFix?.(coords);}catch(e){gpsError=e.code===1?'Location permission is denied.':e.code===2?'Device GPS is unavailable.': 'A current GPS fix could not be obtained.';}
      const valid=coords&&Number.isFinite(Number(coords.latitude))&&Number.isFinite(Number(coords.longitude));
      try{
        const result=await request('sos',{requestId,recipientMode:'TRUSTED',latitude:valid?coords.latitude:undefined,longitude:valid?coords.longitude:undefined,accuracy:valid?coords.accuracy:undefined});
        if(result.status!=='success')throw new Error(result.message||'The backend did not record the SOS.');
        const hasNotificationResults=Array.isArray(result.notifications),rows=hasNotificationResults?result.notifications:[];
        status.textContent=!hasNotificationResults?'SOS endpoint reported success but returned no per-recipient SMS results. Delivery is not confirmed.':rows.length===0&&contacts.length>0?`SOS endpoint returned no recipients, although ${contacts.length} trusted contacts were loaded for this page. Check that the deployed SOS backend uses the same login session and latest version; no SMS result is available.`:result.message;
        document.querySelector('#dispatchStatus').innerHTML=rows.length?`<h3>Trusted contact results</h3><ul class="delivery-list">${rows.map(n=>`<li><b>${esc(n.name)}</b> (${esc(n.phone)}): ${deliveryLabel(n.deliveryStatus,n.providerStatus,n.voiceStatus,n.status,n.reason)}</li>`).join('')}</ul>`:!hasNotificationResults?'<p class="error">The SOS API did not include a notifications array. No contact or delivery conclusion can be made from this response.</p>':contacts.length>0?`<p class="error">${contacts.length} trusted contacts are displayed, but the SOS backend returned no recipient records. No SMS outcome is available.</p>`:'<p class="error">No trusted contacts were returned for this SOS request. No SMS recipient was available.</p>';
        lastSosRequestId=requestId;document.querySelector('#retrySos').classList.toggle('hidden',!rows.some(n=>n.retryAvailable));
        if(result.locationSource==='PROFILE_SAVED')document.querySelector('#dispatchStatus').insertAdjacentHTML('afterbegin','<p class="error">Using saved profile GPS; it may be older than your current location.</p>');
        else if(!valid)document.querySelector('#dispatchStatus').insertAdjacentHTML('afterbegin',`<p class="error">${esc(gpsError||'Location unavailable')}. The alert did not include GPS coordinates.</p>`);
        retrySame=false;requestId=null;
      }catch(e){status.textContent=`SOS result is uncertain or failed: ${e.message}`;document.querySelector('#dispatchStatus').textContent='Check this same request to avoid duplicate messages. Accepted or uncertain sends will not be sent again automatically.';retrySame=true;}
      finally{dispatchInProgress=false;if(!sosActive){button.classList.remove('is-active');button.textContent=retrySame?'Check same alert result':'SOS';button.setAttribute('aria-label',retrySame?'Check same alert result':'Activate SOS emergency mode');}}
    }
    const retrySos=document.querySelector('#retrySos');retrySos.onclick=async()=>{if(!lastSosRequestId)return;retrySos.disabled=true;try{const result=await request('sos-retry',{requestId:lastSosRequestId});if(result.status!=='success')throw new Error(result.message||'Retry was not recorded.');status.textContent=result.message;const rows=result.notifications||[];document.querySelector('#dispatchStatus').innerHTML=`<ul class="delivery-list">${rows.map(n=>`<li><b>${esc(n.name)}</b> (${esc(n.phone)}): ${deliveryLabel(n.deliveryStatus,n.providerStatus,n.voiceStatus,n.status,n.reason)}</li>`).join('')}</ul>`;retrySos.classList.toggle('hidden',!rows.some(n=>n.retryAvailable));}catch(e){status.textContent=`Retry failed: ${e.message}`;}finally{retrySos.disabled=false;}};
    let additional=[];let additionalRequestId=null;
    const review=document.querySelector('#additionalReview'),sendAdditional=document.querySelector('#sendAdditional'),retryAdditional=document.querySelector('#retryAdditional');let lastAdditionalRequestId=null;
    const renderAdditional=()=>{review.innerHTML=additional.length?`<ul class="recipient-list">${additional.map((c,i)=>`<li><label class="recipient-choice"><input type="checkbox" data-extra-select="${i}" ${c.selected?'checked':''}><span><b>${esc(c.name)}</b> · ${esc(c.phone)}</span></label><button type="button" class="remove" data-extra-remove="${i}">Remove</button></li>`).join('')}</ul>`:'<p class="muted">No additional recipients selected.</p>';sendAdditional.disabled=!additional.some(c=>c.selected);review.querySelectorAll('[data-extra-select]').forEach(e=>e.onchange=()=>{additional[Number(e.dataset.extraSelect)].selected=e.checked;sendAdditional.disabled=!additional.some(c=>c.selected);});review.querySelectorAll('[data-extra-remove]').forEach(e=>e.onclick=()=>{additional.splice(Number(e.dataset.extraRemove),1);renderAdditional();});};
    const addExtra=(name,phone)=>{name=String(name||'').trim()||'Additional contact';phone=String(phone||'').trim().replace(/[ ()-]/g,'');if(!/^\+[1-9][0-9]{7,14}$/.test(phone)){document.querySelector('#additionalStatus').textContent='Enter an international number with + and country code, for example +91…';return false;}if(additional.some(c=>c.phone===phone)){document.querySelector('#additionalStatus').textContent='That recipient is already on the review list.';return false;}if(additional.length>=5){document.querySelector('#additionalStatus').textContent='Select up to five additional recipients at a time.';return false;}additional.push({name,phone,selected:true});additionalRequestId=null;document.querySelector('#additionalStatus').textContent='Recipient added for review; no message has been sent.';renderAdditional();return true;};
    document.querySelector('#addExtra').onclick=()=>{const name=document.querySelector('#extraName').value,phone=document.querySelector('#extraPhone').value;if(addExtra(name,phone)){document.querySelector('#extraName').value='';document.querySelector('#extraPhone').value='';}};
    const picker=document.querySelector('#pickDeviceContacts'),pickerStatus=document.querySelector('#contactPickerStatus');
    if(!navigator.contacts?.select){picker.disabled=true;pickerStatus.textContent='Device contact selection is not supported here. Add a phone number manually below.';}
    else picker.onclick=async()=>{try{const picked=await navigator.contacts.select(['name','tel'],{multiple:true});for(const c of picked||[]){const name=Array.isArray(c.name)?c.name[0]:c.name;const phones=Array.isArray(c.tel)?c.tel:[];for(const phone of phones)addExtra(name,phone);}pickerStatus.textContent='Review the selected contacts below before sending.';}catch(e){pickerStatus.textContent=e.name==='AbortError'?'Contact selection cancelled.':'Device contacts could not be opened; enter a number manually.';}};
    sendAdditional.onclick=async()=>{
      const selected=additional.filter(c=>c.selected);if(!selected.length)return;
      if(!confirm(`Send an emergency alert to ${selected.map(c=>c.name).join(', ')}? This does not add them to trusted contacts.`))return;
      sendAdditional.disabled=true;document.querySelector('#additionalStatus').textContent='Recording alert and sending to selected additional contacts…';
      let coords=geo||null;if(!coords&&navigator.geolocation)try{coords=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve(p.coords),reject,{enableHighAccuracy:true,timeout:10000,maximumAge:60000}));geo=coords;geoObtainedAt=Date.now();sosMapFix?.(coords);}catch{}
      const valid=coords&&Number.isFinite(Number(coords.latitude))&&Number.isFinite(Number(coords.longitude));additionalRequestId=additionalRequestId||newRequestId();
      try{const result=await request('sos',{requestId:additionalRequestId,recipientMode:'ADDITIONAL',additionalRecipients:JSON.stringify(selected.map(c=>({name:c.name,phone:c.phone}))),message:document.querySelector('#additionalMessage').value,latitude:valid?coords.latitude:undefined,longitude:valid?coords.longitude:undefined,accuracy:valid?coords.accuracy:undefined});if(result.status!=='success')throw new Error(result.message||'Backend did not record the request.');document.querySelector('#additionalStatus').textContent=result.message;const rows=result.notifications||[];document.querySelector('#additionalStatus').insertAdjacentHTML('beforeend',`<ul class="delivery-list">${rows.map(n=>`<li><b>${esc(n.name)}</b> (${esc(n.phone)}): ${deliveryLabel(n.deliveryStatus,n.providerStatus,n.voiceStatus,n.status,n.reason)}</li>`).join('')}</ul>`);if(result.locationSource==='PROFILE_SAVED')document.querySelector('#additionalStatus').insertAdjacentHTML('afterbegin','<p class="error">Using saved profile GPS; it may be older.</p>');lastAdditionalRequestId=additionalRequestId;retryAdditional.classList.toggle('hidden',!rows.some(n=>n.retryAvailable));additionalRequestId=null;sendAdditional.textContent='Send to selected additional contacts';}
      catch(e){document.querySelector('#additionalStatus').textContent=`Request result is uncertain: ${e.message}. Check the same request to avoid duplicate messages.`;sendAdditional.textContent='Check same additional alert';}
      finally{sendAdditional.disabled=!additional.some(c=>c.selected);}
    };
    retryAdditional.onclick=async()=>{if(!lastAdditionalRequestId)return;retryAdditional.disabled=true;try{const result=await request('sos-retry',{requestId:lastAdditionalRequestId});if(result.status!=='success')throw new Error(result.message||'Retry was not recorded.');document.querySelector('#additionalStatus').textContent=result.message;const rows=result.notifications||[];document.querySelector('#additionalStatus').insertAdjacentHTML('beforeend',`<ul class="delivery-list">${rows.map(n=>`<li><b>${esc(n.name)}</b> (${esc(n.phone)}): ${deliveryLabel(n.deliveryStatus,n.providerStatus,n.voiceStatus,n.status,n.reason)}</li>`).join('')}</ul>`);retryAdditional.classList.toggle('hidden',!rows.some(n=>n.retryAvailable));}catch(e){document.querySelector('#additionalStatus').textContent=`Retry failed: ${e.message}`;}finally{retryAdditional.disabled=false;}};
    document.querySelector('#strobe').onclick=()=>featureButton('strobe').classList.contains('is-active')?stopFeature('strobe'):startFeature('strobe');
    document.querySelector('#whistle').onclick=()=>sosAudioNodes.whistle?stopFeature('whistle'):startFeature('whistle');
    document.querySelector('#siren').onclick=()=>sosAudioNodes.siren?stopFeature('siren'):startFeature('siren');
    document.querySelector('#whatsapp').onclick=()=>{const text=makeAlertText();if(confirm('Open WhatsApp with this prepared alert? Review it and press Send in WhatsApp; One Tap will not send it automatically.'))window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank','noopener');};document.querySelector('#sms').onclick=()=>{location.href=`sms:?body=${encodeURIComponent(makeAlertText())}`;document.querySelector('#dispatchStatus').textContent='SMS composer opened; this message was not sent by One Tap.';};
    if(navigator.getBattery)navigator.getBattery().then(b=>{const show=()=>document.querySelector('#battery').textContent=`Battery ${Math.round(b.level*100)}%${b.charging?' · Charging':''}`;show();b.addEventListener('levelchange',show);b.addEventListener('chargingchange',show);}).catch(()=>{});
  }
  function initSosLocation(){
    const mapHost=document.querySelector('#sosMap'),status=document.querySelector('#sosLocationStatus'),detail=document.querySelector('#sosLocationDetail');
    const start=document.querySelector('#startSosTracking'),stop=document.querySelector('#stopSosTracking'),recenter=document.querySelector('#recenterSosMap');
    let map=null,marker=null,facilityMarker=null,watchId=null,watchOwner=null,firstFix=true,latestPoint=null;
    if(window.L&&mapHost){
      map=L.map(mapHost,{zoomControl:true}).fitWorld();
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'}).addTo(map);
      map.on('tileerror',()=>{status.textContent='Map tiles could not be loaded. Location tracking remains available.';status.className='error';});
      const initial=geo&&geoObtainedAt&&Number.isFinite(Number(geo.latitude))&&Number.isFinite(Number(geo.longitude))?{lat:Number(geo.latitude),lng:Number(geo.longitude),liveFixTime:geoObtainedAt}:profile?.latitude!=null&&profile?.longitude!=null?{lat:Number(profile.latitude),lng:Number(profile.longitude),liveFixTime:null}:null;
      if(initial&&Number.isFinite(initial.lat)&&Number.isFinite(initial.lng)&&Math.abs(initial.lat)<=90&&Math.abs(initial.lng)<=180){latestPoint=[initial.lat,initial.lng];marker=L.marker(latestPoint).addTo(map).bindPopup(initial.liveFixTime?'Last device GPS reading (tracking is off)':'Saved profile location (not live)');map.setView(latestPoint,initial.liveFixTime?17:15);if(initial.liveFixTime){status.textContent=`Last device GPS reading: ${new Date(initial.liveFixTime).toLocaleTimeString()}. Tracking is off.`;detail.textContent=`Last GPS fix: ${initial.lat.toFixed(6)}, ${initial.lng.toFixed(6)} · ${new Date(initial.liveFixTime).toLocaleTimeString()} (not live)`;}else{status.textContent='Showing the saved profile location; it may be older. Start live tracking to update it.';detail.textContent=`Saved coordinates: ${initial.lat.toFixed(5)}, ${initial.lng.toFixed(5)} (not a live GPS reading)`;}}
      setTimeout(()=>map.invalidateSize(),0);
    }else{status.textContent='The interactive map library could not load. GPS tracking may still be started.';status.className='error';}
    sosFacilityClearMap=()=>{if(facilityMarker&&map){map.removeLayer(facilityMarker);facilityMarker=null;}};
    sosFacilitySetOnMap=place=>{if(!map)return;const point=[place.lat,place.lng],popup=`<b>${esc(place.name)}</b><br>${esc(place.category)}`;if(facilityMarker){facilityMarker.setLatLng(point);facilityMarker.setPopupContent(popup);}else facilityMarker=L.marker(point,{icon:L.divIcon({className:'facility-map-marker',html:'<span></span>',iconSize:[18,18],iconAnchor:[9,9]})}).addTo(map).bindPopup(popup);};
    sosMapFix=coords=>{
      const lat=Number(coords?.latitude),lng=Number(coords?.longitude),accuracy=Number(coords?.accuracy);
      if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return;
      latestPoint=[lat,lng];if(map){if(marker)marker.setLatLng(latestPoint);else marker=L.marker(latestPoint).addTo(map);marker.bindPopup(watchId!==null?'Current device location':'Latest device GPS reading (tracking is off)');if(firstFix){map.setView(latestPoint,17);firstFix=false;}}
      detail.textContent=`Latest GPS fix: ${lat.toFixed(6)}, ${lng.toFixed(6)}${Number.isFinite(accuracy)?` · accuracy ${Math.round(accuracy)} m`:''} · ${new Date(geoObtainedAt||Date.now()).toLocaleTimeString()} (tracking is off)`;
      status.textContent=`Latest device GPS reading obtained at ${new Date(geoObtainedAt||Date.now()).toLocaleTimeString()}.${watchId!==null?' Live tracking is active.':' Live tracking is off.'}`;status.className=watchId!==null?'success':'muted';if(sosModeActive)sosFacilityUpdate?.(coords);
    };
    const stopWatch=(reason='stopped',onlyOwner=null)=>{
      if(onlyOwner&&watchOwner!==onlyOwner)return;
      if(watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId);watchId=null;watchOwner=null;
      mapHost?.classList.remove('sos-scan-active');start.classList.remove('is-active');start.disabled=false;stop.disabled=true;setTrackingIndicator(false);
      if(reason==='page-hidden')status.textContent='Tracking stopped because this page is hidden. The last GPS reading is retained.';
      else if(reason==='page-left')status.textContent='Tracking stopped because you left the SOS page. The last GPS reading is retained.';
      else if(reason==='stopped')status.textContent=geoObtainedAt?`Live tracking stopped. Last GPS reading: ${new Date(geoObtainedAt).toLocaleTimeString()}.`:'Live tracking stopped; no GPS reading was obtained.';
      status.className='muted';
    };
    function startWatch(owner='manual'){
      if(!navigator.geolocation){const error='This browser does not provide device location. Check support and permissions.';status.textContent=error;status.className='error';if(sosModeActive)sosFacilityUnavailable?.('GPS is unavailable in this browser; no emergency location was searched.');return false;}
      if(watchId!==null)return false;
      watchOwner=owner;start.disabled=true;stop.disabled=false;start.classList.add('is-active');firstFix=true;status.textContent=owner==='sos'?'SOS is requesting GPS permission and starting live tracking…':'Requesting device location permission and starting live tracking…';status.className='muted';mapHost?.classList.add('sos-scan-active');
      watchId=navigator.geolocation.watchPosition(pos=>{
        const coords=pos.coords,lat=Number(coords?.latitude),lng=Number(coords?.longitude),accuracy=Number(coords?.accuracy);
        if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){status.textContent='The device returned an invalid location reading. Waiting for a valid GPS fix.';status.className='error';return;}
        geo=coords;geoObtainedAt=Date.now();latestPoint=[lat,lng];setTrackingIndicator(true);
        if(map){if(marker)marker.setLatLng(latestPoint);else marker=L.marker(latestPoint).addTo(map);marker.bindPopup('Current device location');if(firstFix){map.setView(latestPoint,17);firstFix=false;}}
        detail.textContent=`Latest GPS fix: ${lat.toFixed(6)}, ${lng.toFixed(6)}${Number.isFinite(accuracy)?` · accuracy ${Math.round(accuracy)} m`:''} · ${new Date(geoObtainedAt).toLocaleTimeString()}`;
        status.textContent=`Live tracking is active while this page is open.${Number.isFinite(accuracy)?` GPS accuracy: about ${Math.round(accuracy)} m.`:''}`;status.className='success';
        if(sosModeActive)sosFacilityUpdate?.(coords);
      },error=>{
        const msg=error.code===1?'Location permission was denied. Allow it in browser settings and retry.':error.code===2?'Device GPS is unavailable. Check location services and retry.':'Location request timed out. Retry while this page is open.';
        stopWatch('error');status.textContent=msg;status.className='error';if(sosModeActive)sosFacilityUnavailable?.(`${msg} No nearby emergency location was searched.`);
      },{enableHighAccuracy:true,maximumAge:0,timeout:20000});
      return true;
    }
    sosTrackingStart=()=>startWatch('sos');sosTrackingStop=()=>stopWatch('stopped','sos');sosTrackingCleanup=reason=>stopWatch(reason);
    start.onclick=()=>startWatch('manual');
    stop.onclick=()=>stopWatch('stopped');
    recenter.onclick=()=>{if(map&&latestPoint)map.setView(latestPoint,Math.max(map.getZoom(),17));else if(latestPoint)status.textContent='Current coordinates are available, but the map could not be loaded.';else status.textContent='No device location has been obtained yet. Start live tracking first.';};
  }
  function deliveryLabel(delivery,provider,voice,status,reason){let text;if(status){const labels={accepted:'SMS accepted',delivered:'SMS delivered',failed:'SMS failed',not_attempted:'SMS not sent',pending:'SMS pending',unknown:'SMS outcome unknown'};text=`${labels[status]||'SMS status'}: ${reason||'No provider delivery confirmation.'}`;}else{text=delivery==='MOCKED'?'Mocked test; no SMS sent':delivery==='QUEUED'?'SMS accepted by provider; delivery not confirmed':delivery==='DELIVERED'?'SMS delivered (provider receipt)':delivery==='FAILED'?(provider==='INVALID_PHONE'?'SMS failed: use a valid +country code':provider==='REJECTED'?'SMS request rejected by provider':'SMS failed'):delivery==='PENDING'?'SMS pending; do not assume delivery':delivery==='NOT_SENT'?'SMS not sent; delivery is disabled':delivery==='UNKNOWN'?'Provider outcome unknown; do not resend automatically':String(delivery||provider||'Unknown');if(provider==='CONFIGURATION_ERROR')text='SMS not sent: Twilio configuration is incomplete';}if(voice&&voice!=='NOT_SENT')text+=voice==='TEST_MODE'?'; voice mocked (not placed)':['queued','accepted','initiated'].includes(String(voice).toLowerCase())?'; voice call accepted; completion not confirmed':`; voice ${String(voice).toLowerCase()}`;return esc(text);}
  function makeAlertText(){const c=geo||((profile?.latitude!=null)?{latitude:profile.latitude,longitude:profile.longitude}:null);return `Emergency alert from One Tap.${c?` Location: https://maps.google.com/?q=${c.latitude},${c.longitude}`:''}`;}
  async function render(){const page=location.hash.slice(1)||'welcome';if(page!=='profile')stopGeoTracking();if(page!=='sos')stopSosTracking('page-left');if(!user&&['profile','sos','contacts','account'].includes(page)){try{const r=await request('session',null,'GET');user=r.user;}catch{navigate('welcome');return;}}switch(page){case'login':authPage('login');break;case'register':authPage('register');break;case'profile':await profilePage();break;case'contacts-setup':try{await loadShared();contactPage();}catch(e){toast(e.message);navigate('login');}break;case'contacts':case'account':case'sos':await dashboard(page);break;case'welcome':default:welcome();}
    document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)navigate(b.dataset.page);});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(geoWatchId!==null){stopGeoTracking();const s=document.querySelector('#gpsStatus');if(s){s.textContent='Live tracking stopped because this page is no longer visible. The last successful fix is retained.';s.className='muted';}const start=document.querySelector('#startTracking'),stop=document.querySelector('#stopTracking');if(start)start.disabled=false;if(stop)stop.disabled=true;}if(sosTrackingCleanup)stopSosTracking('page-hidden');}});window.addEventListener('pagehide',()=>{stopGeoTracking();stopSosTracking('page-left');});window.addEventListener('hashchange',render);render();
})();

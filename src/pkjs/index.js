/**
 * Alien Clock — PebbleKit JS
 * Self-contained configuration page. No external dependencies.
 * Robust version with error logging and fallback message building.
 */

var DEFAULTS = {
  ShowSeconds:             true,
  ShowLabels:              true,
  BackgroundColor:         '000000',
  SingleHoursMinutesColor: '00dd00',
  FiveXHoursMinutesColor:  'dd2020',
  TenXMinutesColor:        'dddd00',
  SecondsColor:            'dd2020',
  LabelColor:              'aaaaaa'
};

function hexToInt(hex) {
  var val = parseInt((hex || '').replace('#', ''), 16);
  return isNaN(val) ? 0 : val;
}

function loadSaved() {
  try {
    var raw = localStorage.getItem('alien_clock_settings');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.log('localStorage error: ' + e.message);
    return {};
  }
}

function buildPage(current) {
  function checked(key) { return current[key] === true || current[key] === 'true' ? 'checked' : ''; }
  function colorVal(key) { return '#' + (current[key] || DEFAULTS[key]); }

  return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Alien Clock Settings</title>' +
    '<style>' +
      'body{font-family:sans-serif;background:#1a1a1a;color:#ddd;margin:0;padding:0}' +
      'h1{background:#222;color:#4c4;margin:0;padding:16px;font-size:18px;letter-spacing:2px}' +
      'h2{color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;' +
         'margin:20px 16px 8px;border-bottom:1px solid #333;padding-bottom:6px}' +
      '.row{display:flex;align-items:center;justify-content:space-between;' +
           'padding:12px 16px;border-bottom:1px solid #222}' +
      '.row-left{flex:1}' +
      '.row-left label{font-size:15px;display:block}' +
      '.row-left .desc{font-size:11px;color:#666;margin-top:3px}' +
      'input[type=checkbox]{width:44px;height:26px;cursor:pointer}' +
      'input[type=color]{width:44px;height:36px;border:none;border-radius:6px;' +
                        'background:none;cursor:pointer;padding:2px}' +
      'button{display:block;width:calc(100% - 32px);margin:24px 16px;' +
             'padding:14px;background:#4c4;color:#000;border:none;border-radius:8px;' +
             'font-size:16px;font-weight:bold;cursor:pointer;letter-spacing:1px}' +
      'button:active{background:#3a3}' +
    '</style></head><body>' +
    '<h1>&#x1F47D; ALIEN CLOCK</h1>' +

    '<h2>Display</h2>' +

    '<div class="row"><div class="row-left">' +
      '<label for="ShowSeconds">Show Seconds</label>' +
      '<span class="desc">Display the binary seconds row</span>' +
    '</div><input type="checkbox" id="ShowSeconds" ' + checked('ShowSeconds') + '></div>' +

    '<div class="row"><div class="row-left">' +
      '<label for="ShowLabels">Show Labels</label>' +
      '<span class="desc">Display HOURS, SECONDS and bit-value text</span>' +
    '</div><input type="checkbox" id="ShowLabels" ' + checked('ShowLabels') + '></div>' +

    '<h2>Colors</h2>' +

    '<div class="row"><div class="row-left">' +
      '<label for="BackgroundColor">Background</label>' +
    '</div><input type="color" id="BackgroundColor" value="' + colorVal('BackgroundColor') + '"></div>' +

    '<div class="row"><div class="row-left">' +
      '<label for="SingleHoursMinutesColor">Single Hours &amp; Minutes</label>' +
      '<span class="desc">LEDs worth &times;1</span>' +
    '</div><input type="color" id="SingleHoursMinutesColor" value="' + colorVal('SingleHoursMinutesColor') + '"></div>' +

    '<div class="row"><div class="row-left">' +
      '<label for="FiveXHoursMinutesColor">5&times; Hours &amp; Minutes</label>' +
      '<span class="desc">LEDs worth &times;5</span>' +
    '</div><input type="color" id="FiveXHoursMinutesColor" value="' + colorVal('FiveXHoursMinutesColor') + '"></div>' +

    '<div class="row"><div class="row-left">' +
      '<label for="TenXMinutesColor">10&times; Minutes</label>' +
      '<span class="desc">Minute corner &amp; overflow LEDs worth &times;10</span>' +
    '</div><input type="color" id="TenXMinutesColor" value="' + colorVal('TenXMinutesColor') + '"></div>' +

    '<div class="row"><div class="row-left">' +
      '<label for="SecondsColor">Seconds</label>' +
      '<span class="desc">Binary seconds dots</span>' +
    '</div><input type="color" id="SecondsColor" value="' + colorVal('SecondsColor') + '"></div>' +

    '<div class="row"><div class="row-left">' +
      '<label for="LabelColor">Label Text</label>' +
      '<span class="desc">HOURS, SECONDS and bit-value labels</span>' +
    '</div><input type="color" id="LabelColor" value="' + colorVal('LabelColor') + '"></div>' +

    '<button onclick="save()">Save Settings</button>' +

    '<script>' +
    'function save(){' +
      'var s={' +
        'ShowSeconds:document.getElementById("ShowSeconds").checked,' +
        'ShowLabels:document.getElementById("ShowLabels").checked,' +
        'BackgroundColor:document.getElementById("BackgroundColor").value.replace("#",""),' +
        'SingleHoursMinutesColor:document.getElementById("SingleHoursMinutesColor").value.replace("#",""),' +
        'FiveXHoursMinutesColor:document.getElementById("FiveXHoursMinutesColor").value.replace("#",""),' +
        'TenXMinutesColor:document.getElementById("TenXMinutesColor").value.replace("#",""),' +
        'SecondsColor:document.getElementById("SecondsColor").value.replace("#",""),' +
        'LabelColor:document.getElementById("LabelColor").value.replace("#","")' +
      '};' +
      'var qs=Object.keys(s).map(function(k){' +
        'return encodeURIComponent(k)+"="+encodeURIComponent(s[k]);' +
      '}).join("&");' +
      'location.href="pebblejs://close#"+qs;' +
    '}' +
    '<\/script></body></html>';
}

/* ── Pebble event handlers ───────────────────────────────────── */
Pebble.addEventListener('ready', function () {
  console.log('Alien Clock ready');
});

Pebble.addEventListener('showConfiguration', function () {
  var saved   = loadSaved();
  var current = {};
  Object.keys(DEFAULTS).forEach(function (k) {
    current[k] = (saved[k] !== undefined) ? saved[k] : DEFAULTS[k];
  });
  var page = buildPage(current);
  console.log('Opening settings page');
  Pebble.openURL('data:text/html,' + encodeURIComponent(page));
});

Pebble.addEventListener('webviewclosed', function (e) {
  console.log('webviewClosed event, response: ' + e.response);

  if (!e || !e.response || e.response === 'CANCELLED') {
    console.log('Settings cancelled by user');
    return;
  }

  /* e.response is already just the fragment content (key=val&key2=val2),
     not the full pebblejs://close#... URL — the runtime strips the rest. */
  var fragment = e.response;
  console.log('Fragment: ' + fragment);

  var settings = {};
  fragment.split('&').forEach(function (pair) {
    var eqIdx = pair.indexOf('=');
    if (eqIdx === -1) { return; }
    var key = decodeURIComponent(pair.substring(0, eqIdx));
    var val = decodeURIComponent(pair.substring(eqIdx + 1));
    settings[key] = val;
    console.log('Parsed: ' + key + ' = ' + val);
  });

  /* Persist locally */
  try {
    localStorage.setItem('alien_clock_settings', JSON.stringify(settings));
    console.log('Settings saved to localStorage');
  } catch (err) {
    console.log('localStorage error: ' + err);
  }

  /* CloudPebble assigns message-key integer IDs alphabetically by key name,
     not in package.json list order — hardcoded 0..7 indices silently land
     in the wrong fields. Use the generated message_keys module instead, which
     always matches the MESSAGE_KEY_* values compiled into the C header. */
  var keys = require('message_keys');
  var msg = {};

  /* Booleans */
  msg[keys.ShowSeconds] = settings.ShowSeconds === 'true' ? 1 : 0;
  msg[keys.ShowLabels]  = settings.ShowLabels  === 'true' ? 1 : 0;

  /* Colors (hex string → int) */
  msg[keys.BackgroundColor]         = hexToInt(settings.BackgroundColor);
  msg[keys.SingleHoursMinutesColor] = hexToInt(settings.SingleHoursMinutesColor);
  msg[keys.FiveXHoursMinutesColor]  = hexToInt(settings.FiveXHoursMinutesColor);
  msg[keys.TenXMinutesColor]        = hexToInt(settings.TenXMinutesColor);
  msg[keys.SecondsColor]            = hexToInt(settings.SecondsColor);
  msg[keys.LabelColor]              = hexToInt(settings.LabelColor);

  console.log('Message to send: ' + JSON.stringify(msg));

  Pebble.sendAppMessage(msg,
    function () {
      console.log('Settings sent successfully');
    },
    function (err) {
      console.log('sendAppMessage error: ' + JSON.stringify(err));
    }
  );
});
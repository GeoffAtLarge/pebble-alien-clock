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

/* Android WebView's native <input type=color> "custom" HSL dialog ignores
   the input's value and always opens at 0/0/0 — a known webview bug, not
   something fixable via markup. So colors are picked with our own R/G/B
   sliders instead, which we fully control and can pre-populate correctly. */
function hexToRgb(hex) {
  hex = (hex || '000000').replace('#', '');
  if (hex.length !== 6) { hex = '000000'; }
  return {
    r: parseInt(hex.substring(0, 2), 16) || 0,
    g: parseInt(hex.substring(2, 4), 16) || 0,
    b: parseInt(hex.substring(4, 6), 16) || 0
  };
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

/* Quick-pick palette shown for every color field. Picking one of these
   sets the color directly with no sliders shown; the sliders only appear
   when the user taps "Custom" to fine-tune. */
var PRESETS = ['000000', 'ffffff', 'dd2020', '00dd00', '2020dd',
               'dddd00', 'dd8800', '8800dd', '00dddd', '888888'];

function buildPage(current) {
  function checked(key) { return current[key] === true || current[key] === 'true' ? 'checked' : ''; }
  function colorVal(key) { return '#' + (current[key] || DEFAULTS[key]); }

  function sliderLine(key, channel, letter, val) {
    return '<div class="slider-line"><label>' + letter + '</label>' +
      '<input type="range" min="0" max="255" value="' + val + '" ' +
        'id="' + key + '_' + channel + '" oninput="updateSwatch(\'' + key + '\')">' +
    '</div>';
  }

  /* Renders a swatch, a row of preset swatches, and a "Custom" button
     that reveals three R/G/B sliders (pre-populated from the saved
     color) only when tapped — keeping the page compact by default. */
  function colorRow(key, label, desc) {
    var hex = colorVal(key).replace('#', '');
    var rgb = hexToRgb(hex);
    var presetsHtml = PRESETS.map(function (p) {
      return '<div class="preset-swatch" style="background:#' + p + '" ' +
        'onclick="pickPreset(\'' + key + '\',\'' + p + '\')"></div>';
    }).join('');
    return (
      '<div class="row color-row"><div class="row-left">' +
        '<label>' + label + '</label>' +
        (desc ? '<span class="desc">' + desc + '</span>' : '') +
      '</div><div class="swatch" id="' + key + '_swatch" style="background:#' + hex + '"></div></div>' +
      '<div class="presets">' + presetsHtml +
        '<div class="preset-swatch custom-swatch" onclick="toggleSliders(\'' + key + '\')">&#9998;</div>' +
      '</div>' +
      '<div class="rgb-sliders" id="' + key + '_sliders" style="display:none">' +
        sliderLine(key, 'r', 'R', rgb.r) +
        sliderLine(key, 'g', 'G', rgb.g) +
        sliderLine(key, 'b', 'B', rgb.b) +
      '</div>' +
      '<input type="hidden" id="' + key + '" value="#' + hex + '">'
    );
  }

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
      '.color-row{border-bottom:none;padding-bottom:4px}' +
      '.swatch{width:44px;height:36px;border-radius:6px;border:1px solid #333}' +
      '.presets{display:flex;flex-wrap:wrap;gap:8px;padding:0 16px 12px;border-bottom:1px solid #222}' +
      '.preset-swatch{width:26px;height:26px;border-radius:6px;border:1px solid #333;cursor:pointer}' +
      '.custom-swatch{background:#333;color:#ddd;display:flex;align-items:center;' +
                     'justify-content:center;font-size:14px;border:1px dashed #666}' +
      '.rgb-sliders{padding:10px 16px 14px;border-bottom:1px solid #222}' +
      '.rgb-sliders .slider-line{display:flex;align-items:center;gap:10px;margin:4px 0}' +
      '.rgb-sliders .slider-line label{width:12px;font-size:11px;color:#888}' +
      '.rgb-sliders input[type=range]{flex:1}' +
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

    colorRow('BackgroundColor', 'Background') +
    colorRow('SingleHoursMinutesColor', 'Single Hours &amp; Minutes', 'LEDs worth &times;1') +
    colorRow('FiveXHoursMinutesColor', '5&times; Hours &amp; Minutes', 'LEDs worth &times;5') +
    colorRow('TenXMinutesColor', '10&times; Minutes', 'Minute corner &amp; overflow LEDs worth &times;10') +
    colorRow('SecondsColor', 'Seconds', 'Binary seconds dots') +
    colorRow('LabelColor', 'Label Text', 'HOURS, SECONDS and bit-value labels') +

    '<button onclick="save()">Save Settings</button>' +

    '<script>' +
    'function toHex2(n){' +
      'n=Math.max(0,Math.min(255,parseInt(n,10)||0));' +
      'var h=n.toString(16);' +
      'return h.length<2?"0"+h:h;' +
    '}' +
    'function updateSwatch(key){' +
      'var r=document.getElementById(key+"_r").value;' +
      'var g=document.getElementById(key+"_g").value;' +
      'var b=document.getElementById(key+"_b").value;' +
      'var hex="#"+toHex2(r)+toHex2(g)+toHex2(b);' +
      'document.getElementById(key).value=hex;' +
      'document.getElementById(key+"_swatch").style.background=hex;' +
    '}' +
    'function toggleSliders(key){' +
      'var el=document.getElementById(key+"_sliders");' +
      'el.style.display=(el.style.display==="block")?"none":"block";' +
    '}' +
    'function pickPreset(key,hex){' +
      'document.getElementById(key).value="#"+hex;' +
      'document.getElementById(key+"_swatch").style.background="#"+hex;' +
      'document.getElementById(key+"_r").value=parseInt(hex.substring(0,2),16)||0;' +
      'document.getElementById(key+"_g").value=parseInt(hex.substring(2,4),16)||0;' +
      'document.getElementById(key+"_b").value=parseInt(hex.substring(4,6),16)||0;' +
      'document.getElementById(key+"_sliders").style.display="none";' +
    '}' +
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
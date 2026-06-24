/*
 * Alien Clock — Pebble Watchface
 * UUID: 2ecde17d-6cc3-430b-a6e9-4d0df5c5a2c2
 * ════════════════════════════════════════════════════════════════
 * Target platforms:
 *   emery  — Pebble Time 2    200 × 228 px  (rectangular)
 *   gabbro — Pebble Round 2   260 × 260 px  (circular)
 *
 * Follows rePebble C Watchface Tutorial parts 1–6:
 *   Part 1 : s_ prefix, init/deinit, window lifecycle
 *   Part 2 : custom canvas drawing
 *   Part 5 : UnobstructedArea / Timeline Quick View
 *   Part 6 : Settings via PebbleKit JS AppMessage
 *
 * Layout strategy
 * ───────────────
 * All coordinates are expressed as fractions of the 144×168 base
 * design (original SVG dimensions). At draw time they are scaled to
 * the actual canvas size with SX() / SY() macros.
 *
 * For gabbro (circular) a vertical offset (round_inset) keeps all
 * elements inside the clipping circle. PBL_IF_ROUND_ELSE() selects
 * the inset at compile time — zero cost on emery.
 *
 * HOURS layout (left → right):
 *   x=18  GREEN ×1  outer-left
 *   x=34  GREEN ×1  inner-left
 *   x=50  RED   ×5  left
 *   x=94  RED   ×5  right
 *   x=110 GREEN ×1  inner-right
 *   x=126 GREEN ×1  outer-right
 *
 *   Decompose hour into 2×RED(5) + 4×GREEN(1) — no yellows (diamonds
 *   were removed from the hours display in the final design).
 *   Greens fill centre-outward: gh[0]→inner-left, gh[1]→inner-right,
 *   gh[2]→outer-left, gh[3]→outer-right.
 *   Example: 12 = 5+5+1+1 → both REDs + inner greens lit, outers off.
 *   Example: 7  = 5+1+1   → left RED + both inner greens lit.
 *
 * MINUTES — centre column + rotated-rect corner LEDs
 *   1  ×5  circle    top-centre                  = 5
 *   4  ×10 rotated-rect corner LEDs              = 10 each
 *   4  ×1  circles, vertical column              = 1 each
 *   1  ×10 upright-rect LED, bottom-centre       = 10  (→ max 59)
 *
 * SECONDS — 6 binary dots: 32 16 8 4 2 1
 *
 * SETTINGS (PebbleKit JS AppMessage):
 *   ShowSeconds              — toggle seconds row
 *   ShowLabels               — toggle text labels
 *   BackgroundColor          — background colour
 *   SingleHoursMinutesColor  — ×1 LEDs
 *   FiveXHoursMinutesColor   — ×5 LEDs
 *   TenXMinutesColor         — ×10 LEDs
 *   SecondsColor             — seconds dots (default red)
 *   LabelColor               — label text
 * ════════════════════════════════════════════════════════════════
 */

#include <pebble.h>

/* ── Settings ────────────────────────────────────────────────── */
#define SETTINGS_KEY 1

typedef struct ClaySettings {
  bool   ShowSeconds;
  bool   ShowLabels;
  GColor BackgroundColor;
  GColor SingleHoursMinutesColor;
  GColor FiveXHoursMinutesColor;
  GColor TenXMinutesColor;
  GColor SecondsColor;
  GColor LabelColor;
} ClaySettings;

static ClaySettings s_settings;

static void prv_default_settings(void) {
  s_settings.ShowSeconds             = true;
  s_settings.ShowLabels              = true;
  s_settings.BackgroundColor         = GColorBlack;
  s_settings.SingleHoursMinutesColor = GColorGreen;
  s_settings.FiveXHoursMinutesColor  = GColorRed;
  s_settings.TenXMinutesColor        = GColorYellow;
  s_settings.SecondsColor            = GColorRed;
  s_settings.LabelColor              = GColorLightGray;
}

static void prv_save_settings(void) {
  persist_write_data(SETTINGS_KEY, &s_settings, sizeof(s_settings));
}

static void prv_load_settings(void) {
  prv_default_settings();
  persist_read_data(SETTINGS_KEY, &s_settings, sizeof(s_settings));
}

/* ── App state ──────────────────────────────────────────────── */
static Window   *s_main_window;
static Layer    *s_window_layer;
static Layer    *s_canvas;
static struct tm s_now;

/* ── Drawing helpers ─────────────────────────────────────────── */

static void prv_fill_dot(GContext *ctx, int cx, int cy, int r,
                          GColor col, bool lit) {
  graphics_context_set_fill_color(ctx, lit ? col : GColorDarkGray);
  graphics_fill_circle(ctx, GPoint(cx, cy), r);
  graphics_context_set_stroke_color(ctx, lit ? GColorWhite : GColorDarkGray);
  graphics_context_set_stroke_width(ctx, 1);
  graphics_draw_circle(ctx, GPoint(cx, cy), r);
}

static void prv_fill_rect_led(GContext *ctx, int cx, int cy, int hw, int hh,
                               GColor col, bool lit) {
  GRect r = GRect(cx - hw, cy - hh, hw * 2, hh * 2);
  graphics_context_set_fill_color(ctx, lit ? col : GColorDarkGray);
  graphics_fill_rect(ctx, r, 2, GCornersAll);
  graphics_context_set_stroke_color(ctx, lit ? GColorWhite : GColorDarkGray);
  graphics_context_set_stroke_width(ctx, 1);
  graphics_draw_round_rect(ctx, r, 2);
}

static void prv_fill_rot_rect(GContext *ctx,
                               GPoint p0, GPoint p1, GPoint p2, GPoint p3,
                               GColor col, bool lit) {
  GPoint pts[4] = {p0, p1, p2, p3};
  GPathInfo info = { .num_points = 4, .points = pts };
  GPath *path = gpath_create(&info);
  graphics_context_set_fill_color(ctx, lit ? col : GColorDarkGray);
  gpath_draw_filled(ctx, path);
  graphics_context_set_stroke_color(ctx, lit ? GColorWhite : GColorDarkGray);
  graphics_context_set_stroke_width(ctx, 1);
  gpath_draw_outline(ctx, path);
  gpath_destroy(path);
}

/* ── Decomposition ───────────────────────────────────────────── */
static void prv_decompose(int val,
                           bool *y, int ny,
                           bool *r, int nr,
                           bool *g, int ng) {
  for (int i = 0; i < ny; i++) { y[i] = (val >= 10); if (y[i]) val -= 10; }
  for (int i = 0; i < nr; i++) { r[i] = (val >= 5);  if (r[i]) val -= 5;  }
  for (int i = 0; i < ng; i++) { g[i] = (val >= 1);  if (g[i]) val -= 1;  }
}

/* ── Canvas draw ─────────────────────────────────────────────── */
static void canvas_update_proc(Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_bounds(layer);
  int W = bounds.size.w;
  int H = bounds.size.h;

  int sx_k = (W * 1000) / 144;
  int sy_k = (H * 1000) / 168;
  int round_inset = PBL_IF_ROUND_ELSE((H * 80) / 1000, 0);

  #define SX(v)  (((v) * sx_k) / 1000)
  #define SY(v)  (round_inset + (((v) * sy_k) / 1000))

  graphics_context_set_fill_color(ctx, s_settings.BackgroundColor);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  int hour12 = s_now.tm_hour % 12;
  if (hour12 == 0) hour12 = 12;
  int mins = s_now.tm_min;
  int secs = s_now.tm_sec;

  GColor cSingle = s_settings.SingleHoursMinutesColor;
  GColor cFiveX  = s_settings.FiveXHoursMinutesColor;
  GColor cTenX   = s_settings.TenXMinutesColor;
  GColor cSecs   = s_settings.SecondsColor;
  GColor cLabel  = s_settings.LabelColor;

  /* ══════════════════════════════════════════════════════════
   * HOURS
   *
   * No yellow (×10) slots — the hour diamonds were removed.
   * Decompose into 2×RED(5) + 4×GREEN(1) only.
   *
   * Greens fill centre-outward:
   *   gh[0] → inner-left  (x=34)
   *   gh[1] → inner-right (x=110)
   *   gh[2] → outer-left  (x=18)
   *   gh[3] → outer-right (x=126)
   *
   * Verification:
   *   12 = R+R+G+G → off  ON  ON  ON  ON  off  ✓
   *   11 = R+R+G   → off  ON  ON  ON  off off  ✓
   *    7 = R+G+G   → off  ON  ON  off ON  off  ✓
   *    5 = R       → off  off ON  off off off  ✓
   *    1 = G       → off  ON  off off off off  ✓
   * ══════════════════════════════════════════════════════════ */
  {
    bool rh[2], gh[4];
    prv_decompose(hour12, NULL, 0, rh, 2, gh, 4);

    int hy = SY(57);
    int hw = SX(4);
    int hh = SY(9) - SY(0);
    if (hw < 1) hw = 1;
    if (hh < 1) hh = 1;

    prv_fill_rect_led(ctx, SX(18),  hy, hw, hh, cSingle, gh[2]);  /* outer-left  */
    prv_fill_rect_led(ctx, SX(34),  hy, hw, hh, cSingle, gh[0]);  /* inner-left  */
    prv_fill_rect_led(ctx, SX(50),  hy, hw, hh, cFiveX,  rh[0]);  /* red-left    */
    prv_fill_rect_led(ctx, SX(94),  hy, hw, hh, cFiveX,  rh[1]);  /* red-right   */
    prv_fill_rect_led(ctx, SX(110), hy, hw, hh, cSingle, gh[1]);  /* inner-right */
    prv_fill_rect_led(ctx, SX(126), hy, hw, hh, cSingle, gh[3]);  /* outer-right */

    if (s_settings.ShowLabels) {
      GFont f = fonts_get_system_font(FONT_KEY_GOTHIC_09);
      graphics_context_set_text_color(ctx, cLabel);
      graphics_draw_text(ctx, "HOURS", f,
        GRect(SX(8),  SY(78), SX(52), 12),
        GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);
      graphics_draw_text(ctx, "HOURS", f,
        GRect(SX(84), SY(78), SX(52), 12),
        GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);
    }
  }

  /* ══════════════════════════════════════════════════════════
   * MINUTES
   * Upper-left  (34,27)(40,22)(52,35)(46,40)
   * Upper-right (110,27)(104,22)(92,35)(98,40)  — exact mirror
   * Lower-left  (40,98)(34,93)(46,80)(52,86)
   * Lower-right (104,98)(110,93)(98,80)(92,86)  — exact mirror
   * ══════════════════════════════════════════════════════════ */
  {
    bool ym[5], rm[1], gm[4];
    prv_decompose(mins, ym, 5, rm, 1, gm, 4);

    prv_fill_dot(ctx, SX(72), SY(12), SX(4), cFiveX, rm[0]);

    prv_fill_rot_rect(ctx,
      GPoint(SX(34), SY(27)), GPoint(SX(40), SY(22)),
      GPoint(SX(52), SY(35)), GPoint(SX(46), SY(40)),
      cTenX, ym[0]);

    prv_fill_rot_rect(ctx,
      GPoint(SX(110), SY(27)), GPoint(SX(104), SY(22)),
      GPoint(SX( 92), SY(35)), GPoint(SX( 98), SY(40)),
      cTenX, ym[1]);

    prv_fill_dot(ctx, SX(72), SY(37), SX(4), cSingle, gm[0]);
    prv_fill_dot(ctx, SX(72), SY(50), SX(4), cSingle, gm[1]);
    prv_fill_dot(ctx, SX(72), SY(63), SX(4), cSingle, gm[2]);
    prv_fill_dot(ctx, SX(72), SY(76), SX(4), cSingle, gm[3]);

    prv_fill_rot_rect(ctx,
      GPoint(SX(40), SY(98)), GPoint(SX(34), SY(93)),
      GPoint(SX(46), SY(80)), GPoint(SX(52), SY(86)),
      cTenX, ym[2]);

    prv_fill_rot_rect(ctx,
      GPoint(SX(104), SY(98)), GPoint(SX(110), SY(93)),
      GPoint(SX( 98), SY(80)), GPoint(SX( 92), SY(86)),
      cTenX, ym[3]);

    {
      int bh = (SY(118) - SY(100)) / 2;
      if (bh < 1) bh = 1;
      prv_fill_rect_led(ctx, SX(72), SY(109), SX(4), bh, cTenX, ym[4]);
    }
  }

  /* ══════════════════════════════════════════════════════════
   * DIVIDER
   * ══════════════════════════════════════════════════════════ */
  graphics_context_set_stroke_color(ctx, GColorDarkGray);
  graphics_context_set_stroke_width(ctx, 1);
  graphics_draw_line(ctx,
    GPoint(SX(8),   SY(122)),
    GPoint(SX(136), SY(122)));

  /* ══════════════════════════════════════════════════════════
   * SECONDS
   * ══════════════════════════════════════════════════════════ */
  if (s_settings.ShowSeconds) {
    static const int   SEC_BX[6]  = {22, 42,  62, 82, 102, 122};
    static const int   SEC_BV[6]  = {32, 16,   8,  4,   2,   1};
    static const char *SEC_LBL[6] = {"32","16","8","4", "2", "1"};

    int scy = SY(134);
    int sr  = SX(4);
    if (sr < 1) sr = 1;

    for (int i = 0; i < 6; i++) {
      prv_fill_dot(ctx, SX(SEC_BX[i]), scy, sr, cSecs,
                   !!(secs & SEC_BV[i]));
    }

    if (s_settings.ShowLabels) {
      GFont f = fonts_get_system_font(FONT_KEY_GOTHIC_09);
      graphics_context_set_text_color(ctx, cLabel);
      for (int i = 0; i < 6; i++) {
        graphics_draw_text(ctx, SEC_LBL[i], f,
          GRect(SX(SEC_BX[i]) - 8, SY(144), 16, 10),
          GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);
      }
      graphics_draw_text(ctx, "SECONDS", f,
        GRect(0, SY(155), W, 10),
        GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);
    }
  }

  #undef SX
  #undef SY
}

/* ── UnobstructedArea — Timeline Quick View (Part 5) ─────────── */
static void prv_resize_canvas(void) {
  GRect ub = layer_get_unobstructed_bounds(s_window_layer);
  layer_set_frame(s_canvas, ub);
  layer_mark_dirty(s_canvas);
}

static void prv_unobstructed_will_change(GRect final_area, void *ctx) {
  (void)final_area; (void)ctx;
}

static void prv_unobstructed_change(AnimationProgress progress, void *ctx) {
  (void)progress; (void)ctx;
  prv_resize_canvas();
}

static void prv_unobstructed_did_change(void *ctx) {
  (void)ctx;
  prv_resize_canvas();
}

/* ── Tick handler ────────────────────────────────────────────── */
static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  s_now = *tick_time;
  layer_mark_dirty(s_canvas);
}

/* ── Apply settings ──────────────────────────────────────────── */
static void prv_apply_settings(void) {
  window_set_background_color(s_main_window, s_settings.BackgroundColor);
  tick_timer_service_unsubscribe();
  tick_timer_service_subscribe(
    s_settings.ShowSeconds ? SECOND_UNIT : MINUTE_UNIT,
    tick_handler);
  layer_mark_dirty(s_canvas);
}

/* ── AppMessage inbox ────────────────────────────────────────── */
static void inbox_received_callback(DictionaryIterator *iter, void *context) {
  bool changed = false;
  Tuple *t;

  t = dict_find(iter, MESSAGE_KEY_ShowSeconds);
  if (t) { s_settings.ShowSeconds = (t->value->int32 == 1); changed = true; }

  t = dict_find(iter, MESSAGE_KEY_ShowLabels);
  if (t) { s_settings.ShowLabels  = (t->value->int32 == 1); changed = true; }

  t = dict_find(iter, MESSAGE_KEY_BackgroundColor);
  if (t) { s_settings.BackgroundColor = GColorFromHEX(t->value->int32); changed = true; }

  t = dict_find(iter, MESSAGE_KEY_SingleHoursMinutesColor);
  if (t) { s_settings.SingleHoursMinutesColor = GColorFromHEX(t->value->int32); changed = true; }

  t = dict_find(iter, MESSAGE_KEY_FiveXHoursMinutesColor);
  if (t) { s_settings.FiveXHoursMinutesColor = GColorFromHEX(t->value->int32); changed = true; }

  t = dict_find(iter, MESSAGE_KEY_TenXMinutesColor);
  if (t) { s_settings.TenXMinutesColor = GColorFromHEX(t->value->int32); changed = true; }

  t = dict_find(iter, MESSAGE_KEY_SecondsColor);
  if (t) { s_settings.SecondsColor = GColorFromHEX(t->value->int32); changed = true; }

  t = dict_find(iter, MESSAGE_KEY_LabelColor);
  if (t) { s_settings.LabelColor   = GColorFromHEX(t->value->int32); changed = true; }

  if (changed) {
    prv_save_settings();
    prv_apply_settings();
  }
}

static void inbox_dropped_callback(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_ERROR, "AppMessage dropped: %d", (int)reason);
}

/* ── Window lifecycle ────────────────────────────────────────── */
static void main_window_load(Window *window) {
  s_window_layer = window_get_root_layer(window);
  GRect bounds   = layer_get_bounds(s_window_layer);

  s_canvas = layer_create(bounds);
  layer_set_update_proc(s_canvas, canvas_update_proc);
  layer_add_child(s_window_layer, s_canvas);

  UnobstructedAreaHandlers ua = {
    .will_change = prv_unobstructed_will_change,
    .change      = prv_unobstructed_change,
    .did_change  = prv_unobstructed_did_change,
  };
  unobstructed_area_service_subscribe(ua, NULL);

  prv_unobstructed_change(0, NULL);
  prv_unobstructed_did_change(NULL);
}

static void main_window_unload(Window *window) {
  unobstructed_area_service_unsubscribe();
  layer_destroy(s_canvas);
}

/* ── init / deinit ───────────────────────────────────────────── */
static void init(void) {
  prv_load_settings();

  time_t now = time(NULL);
  s_now = *localtime(&now);

  s_main_window = window_create();
  window_set_background_color(s_main_window, s_settings.BackgroundColor);
  window_set_window_handlers(s_main_window, (WindowHandlers) {
    .load   = main_window_load,
    .unload = main_window_unload,
  });
  window_stack_push(s_main_window, true);

  prv_apply_settings();

  app_message_register_inbox_received(inbox_received_callback);
  app_message_register_inbox_dropped(inbox_dropped_callback);
  app_message_open(256, 64);
}

static void deinit(void) {
  tick_timer_service_unsubscribe();
  window_destroy(s_main_window);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
  return 0;
}

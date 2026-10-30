/*
 * Fountain ink geometry for the compiled Handwriting bundle.
 *
 * This file is intentionally self-contained. The bundle injector places it
 * after the existing canvas/SVG helpers, while the verification script can
 * execute it in a plain Node VM.
 */
var HandwritingFountainInk = (() => {
  const VERSION = "fountain-v1";
  const TAU = Math.PI * 2;
  const PROFILE = Object.freeze({
    pressureTimeMs: 12,
    minWidthFactor: 0.25,
    pressureExponent: 1.1,
    maxSpeedReduction: 0.15,
    speedK: 0.06,
    maxHalfWidthChangePerDistance: 0.25,
    cornerDegrees: 60,
    flatteningPx: 0.2,
    startFactor: 0.4,
    endFactor: 0.4,
  });

  const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smoothstep = value => {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  };
  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const samplePressure = sample => clamp(finite(sample?.pressure, 0.5), 0, 1);
  const sampleTime = (sample, index) => finite(sample?.t, index * 16);

  const isFountain = value => {
    const style = typeof value === "string" ? value : value?.inkStyle;
    return style === VERSION || style === "fountain";
  };

  const resolveOptions = (strokeOrStyle = {}, overrides = {}) => {
    const source = { ...strokeOrStyle, ...overrides };
    return {
      fountain: isFountain(source),
      width: Math.max(0.05, finite(source.width ?? source.baseWidth, 2.2)),
      pressure: source.pressureSensitivity !== "off" && source.pressureSensitivity !== false,
      smoothing: source.inkSmoothing !== "off" && source.inkSmoothing !== false,
      style: VERSION,
      renderScale: Math.max(1, finite(source.renderScale, 1)),
    };
  };

  const canonical = (sample, index) => ({
    x: finite(sample?.x, 0),
    y: finite(sample?.y, 0),
    pressure: samplePressure(sample),
    t: sampleTime(sample, index),
  });

  const filtered = (state, sample) => {
    const previous = state.lastSample;
    const dt = previous ? Math.max(0, sample.t - previous.t) : 0;
    const filterDt = clamp(dt || 16, 1, 32);
    const alpha = previous && state.options.smoothing
      ? 1 - Math.exp(-filterDt / PROFILE.pressureTimeMs)
      : 1;
    if (!previous) {
      state.pressure = sample.pressure;
      state.speed = 0;
    } else {
      state.pressure += alpha * (sample.pressure - state.pressure);
      const d = distance(previous, sample);
      const speed = dt > 0 ? d / dt : 0;
      state.speed += alpha * (speed - state.speed);
      state.length += d;
    }
    state.lastSample = sample;
    const pressureFactor = state.options.pressure
      ? (PROFILE.minWidthFactor + (1 - PROFILE.minWidthFactor) * Math.pow(state.pressure, PROFILE.pressureExponent))
      : 1;
    const speedFactor = state.options.pressure
      ? Math.max(1 - PROFILE.maxSpeedReduction, 1 / (1 + PROFILE.speedK * state.speed))
      : 1;
    const rawHalfWidth = state.options.width * pressureFactor * speedFactor / 2;
    const previousHalfWidth = state.lastHalfWidth || rawHalfWidth;
    const maxDelta = Math.max(0, (previous ? distance(previous, sample) : 0) * PROFILE.maxHalfWidthChangePerDistance);
    const halfWidth = previous ? clamp(rawHalfWidth, previousHalfWidth - maxDelta, previousHalfWidth + maxDelta) : rawHalfWidth;
    state.lastHalfWidth = Math.max(0.05, halfWidth);
    return { ...sample, hw: state.lastHalfWidth };
  };

  const cornerAt = (points, index) => {
    if (index <= 0 || index >= points.length - 1) return false;
    const a = points[index - 1], b = points[index], c = points[index + 1];
    const abx = b.x - a.x, aby = b.y - a.y;
    const bcx = c.x - b.x, bcy = c.y - b.y;
    const ab = Math.hypot(abx, aby), bc = Math.hypot(bcx, bcy);
    if (ab < 1e-6 || bc < 1e-6) return false;
    const cosine = clamp((abx * bcx + aby * bcy) / (ab * bc), -1, 1);
    return Math.acos(cosine) * 180 / Math.PI >= PROFILE.cornerDegrees;
  };

  const quadratic = (from, control, to, fromHw, toHw, renderScale) => {
    const curvature = Math.abs((control.x - from.x) * (to.y - from.y) - (control.y - from.y) * (to.x - from.x));
    const chord = Math.max(1e-6, distance(from, to));
    const physicalError = PROFILE.flatteningPx / Math.max(1, renderScale);
    const steps = clamp(Math.ceil(Math.sqrt(Math.max(0, curvature) / Math.max(physicalError, 0.05)) + chord / 8), 1, 48);
    const result = [];
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const one = 1 - t;
      result.push({
        x: one * one * from.x + 2 * one * t * control.x + t * t * to.x,
        y: one * one * from.y + 2 * one * t * control.y + t * t * to.y,
        hw: fromHw + (toHw - fromHw) * t,
      });
    }
    return result;
  };

  const append = (state, sample) => {
    const point = filtered(state, sample);
    const before = state.ribbon.length;
    if (!state.previous) {
      state.previous = point;
      state.firstHalfWidth = point.hw;
      const startHw = point.hw * PROFILE.startFactor;
      state.ribbon.push({ x: point.x, y: point.y, hw: startHw });
      return state.ribbon.slice(before);
    }
    if (distance(state.previous, point) < 1e-6) {
      state.previous = point;
      return [];
    }
    const nextMid = midpoint(state.previous, point);
    if (!state.lastMid) {
      state.lastMid = { x: state.previous.x, y: state.previous.y };
    }
    const start = state.lastMid;
    const startHw = state.ribbon[state.ribbon.length - 1]?.hw ?? state.previous.hw;
    const endHw = point.hw;
    const curve = state.options.smoothing
      ? quadratic(start, state.previous, nextMid, startHw, endHw, state.options.renderScale)
      : [{ x: point.x, y: point.y, hw: endHw }];
    state.ribbon.push(...curve);
    state.lastMid = nextMid;
    state.previous = point;
    return state.ribbon.slice(before);
  };

  const eligibleEndTaper = state => {
    if (!state.options.pressure || !state.options.smoothing || state.raw.length < 3 || state.length < state.options.width * 3) return false;
    const maximum = state.raw.reduce((value, point) => Math.max(value, point.pressure), 0);
    const tail = state.raw.slice(-3);
    return maximum > 0 && tail[tail.length - 1].pressure <= maximum * 0.65 && tail.some((point, index) => index > 0 && point.pressure < tail[index - 1].pressure);
  };

  const finish = state => {
    if (state.finished) return [];
    state.finished = true;
    const before = state.ribbon.length;
    if (state.previous && state.lastMid && distance(state.lastMid, state.previous) >= 1e-6) {
      const final = state.options.smoothing
        ? quadratic(state.lastMid, state.previous, state.previous, state.ribbon[state.ribbon.length - 1]?.hw ?? state.previous.hw, state.previous.hw, state.options.renderScale)
        : [{ x: state.previous.x, y: state.previous.y, hw: state.previous.hw }];
      state.ribbon.push(...final);
    }
    if (state.length < state.options.width * 3 && state.ribbon.length > 0) {
      state.ribbon[0].hw = state.firstHalfWidth || state.ribbon[0].hw;
    }
    if (eligibleEndTaper(state)) {
      const taperLength = Math.min(state.options.width * 1.5, state.length * 0.12);
      let travelled = 0;
      for (let i = state.ribbon.length - 1; i > 0 && travelled <= taperLength; i--) {
        const current = state.ribbon[i], prior = state.ribbon[i - 1];
        travelled += distance(prior, current);
        const factor = PROFILE.endFactor + (1 - PROFILE.endFactor) * smoothstep(Math.min(1, travelled / Math.max(1e-6, taperLength)));
        current.hw *= factor;
      }
    }
    return state.ribbon.slice(before);
  };

  const createState = (strokeOrStyle = {}, renderScale = 1) => ({
    options: resolveOptions(strokeOrStyle, { renderScale }),
    raw: [],
    ribbon: [],
    previous: null,
    lastMid: null,
    lastSample: null,
    pressure: 0.5,
    speed: 0,
    length: 0,
    lastHalfWidth: 0,
    firstHalfWidth: 0,
    finished: false,
  });

  const build = (stroke, renderScale = 1) => {
    const state = createState(stroke, renderScale);
    for (let index = 0; index < (stroke?.points?.length ?? 0); index++) {
      const point = canonical(stroke.points[index], index);
      state.raw.push(point);
      append(state, point);
    }
    finish(state);
    return state.ribbon;
  };

  const outline = ribbon => {
    const left = [], right = [];
    for (let index = 0; index < ribbon.length; index++) {
      const point = ribbon[index];
      const before = ribbon[Math.max(0, index - 1)];
      const after = ribbon[Math.min(ribbon.length - 1, index + 1)];
      let dx = after.x - before.x, dy = after.y - before.y;
      const length = Math.hypot(dx, dy) || 1;
      dx /= length; dy /= length;
      const nx = -dy * point.hw, ny = dx * point.hw;
      left.push({ x: point.x + nx, y: point.y + ny });
      right.push({ x: point.x - nx, y: point.y - ny });
    }
    return { left, right };
  };

  const circlePath = (point, radius) => {
    const r = Math.max(0.05, radius);
    return `M ${point.x - r} ${point.y} A ${r} ${r} 0 1 0 ${point.x + r} ${point.y} A ${r} ${r} 0 1 0 ${point.x - r} ${point.y} Z`;
  };

  const geometryFromRibbon = ribbon => {
    const sides = outline(ribbon);
    const discs = ribbon.length === 0 ? [] : [
      { x: ribbon[0].x, y: ribbon[0].y, r: ribbon[0].hw },
      { x: ribbon[ribbon.length - 1].x, y: ribbon[ribbon.length - 1].y, r: ribbon[ribbon.length - 1].hw },
      ...ribbon.slice(1, -1).filter((point, index) => {
        const before = ribbon[index], after = ribbon[index + 2];
        const ax = point.x - before.x, ay = point.y - before.y;
        const bx = after.x - point.x, by = after.y - point.y;
        const al = Math.hypot(ax, ay), bl = Math.hypot(bx, by);
        if (al < 1e-6 || bl < 1e-6) return false;
        return Math.acos(clamp((ax * bx + ay * by) / (al * bl), -1, 1)) * 180 / Math.PI >= PROFILE.cornerDegrees;
      }).map(point => ({ x: point.x, y: point.y, r: point.hw })),
    ];
    return { ribbon, ...sides, discs };
  };

  const pathFromRibbon = ribbon => {
    const shape = geometryFromRibbon(Array.isArray(ribbon) ? ribbon : []);
    if (shape.ribbon.length === 0) return "";
    if (shape.ribbon.length === 1) return circlePath(shape.ribbon[0], shape.ribbon[0].hw);
    let output = `M ${shape.left[0].x} ${shape.left[0].y}`;
    for (const point of shape.left.slice(1)) output += ` L ${point.x} ${point.y}`;
    for (const point of [...shape.right].reverse()) output += ` L ${point.x} ${point.y}`;
    output += " Z";
    for (const disc of shape.discs) output += circlePath(disc, disc.r);
    return output;
  };

  const geometry = (stroke, renderScale = 1) => geometryFromRibbon(build(stroke, renderScale));

  const path = (stroke, renderScale = 4) => pathFromRibbon(build(stroke, renderScale));

  const drawCanvas = (context, camera, stroke, _style, _settled = true) => {
    const ribbon = build(stroke, Math.max(1, camera?.zoom ?? 1));
    if (ribbon.length === 0) return;
    context.fillStyle = typeof it === "function" ? it(stroke) : (stroke.color ?? "#2f6de0");
    if (typeof mt === "function") mt(context, camera, ribbon, context.fillStyle, false);
  };

  const pdfGeometry = (stroke, renderScale = 4) => {
    const shape = geometry(stroke, renderScale);
    return { left: shape.left, right: shape.right, discs: shape.discs };
  };

  const recordRaw = (state, sample) => state.raw.push(canonical(sample, state.raw.length));
  const appendLive = (state, sample) => {
    recordRaw(state, sample);
    return append(state, canonical(sample, state.raw.length - 1));
  };

  const head = state => {
    const ribbon = state?.ribbon ?? [];
    if (ribbon.length === 0) return undefined;
    const from = ribbon[Math.max(0, ribbon.length - 2)];
    const to = ribbon[ribbon.length - 1];
    return {
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      pressure: state.pressure,
    };
  };

  return {
    VERSION,
    PROFILE,
    isFountain,
    resolveOptions,
    createState,
    append: appendLive,
    finish,
    build,
    geometry,
    path,
    pathFromRibbon,
    drawCanvas,
    pdfGeometry,
    head,
  };
})();

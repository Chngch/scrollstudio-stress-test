
(() => {
  const getActiveScrollyStepIndex = function getActiveScrollyStepIndex(
  cardBottoms,
  exitLine = 0,
  viewportHeight = 0,
  stepTransitions = []
) {
  let activeIndex = 0;
  for (let index = 1; index < cardBottoms.length; index += 1) {
    const incoming = stepTransitions[index];
    const halfTriggerDistance =
      incoming?.timing === "automatic"
        ? Math.max(0, Number(incoming.triggerDistanceVh) || 0) / 100 *
          Math.max(0, viewportHeight) / 2
        : 0;
    if (cardBottoms[index - 1] <= exitLine - halfTriggerDistance) {
      activeIndex = index;
    }
  }
  return activeIndex;
};
  const getSceneCheckpointFocusZone = function getSceneCheckpointFocusZone(
  viewportWidth,
  mobileBreakpoint = 700
) {
  return viewportWidth <= mobileBreakpoint
    ? { topRatio: 0.62, bottomRatio: 0.78 }
    : { topRatio: 0.45, bottomRatio: 0.65 };
};
  const getSceneIntervalTransition = function getSceneIntervalTransition(
  stepTransitions,
  intervalIndex,
  holdDistanceVh = 0,
  motionDistanceVh = 100,
  transitionTiming = "automatic"
) {
  const incoming = Array.isArray(stepTransitions)
    ? stepTransitions[intervalIndex + 1]
    : null;
  return {
    type: ["cut", "fade", "pan-zoom"].includes(incoming?.type)
      ? incoming.type
      : "fade",
    timing:
      incoming?.timing === "scroll-linked"
        ? "scroll-linked"
        : incoming?.timing === "automatic"
          ? "automatic"
          : transitionTiming,
    durationMs: Number.isFinite(Number(incoming?.durationMs))
      ? Number(incoming.durationMs)
      : 550,
    triggerDistanceVh: Number.isFinite(Number(incoming?.triggerDistanceVh))
      ? Number(incoming.triggerDistanceVh)
      : 0,
    holdDistanceVh: Number.isFinite(Number(incoming?.holdDistanceVh))
      ? Number(incoming.holdDistanceVh)
      : Number(holdDistanceVh) || 0,
    motionDistanceVh: Number.isFinite(Number(incoming?.motionDistanceVh))
      ? Number(incoming.motionDistanceVh)
      : Number(motionDistanceVh) || 100
  };
};
  const getSceneTransitionFrame = function getSceneTransitionFrame(
  cardRects,
  viewportHeight,
  holdDistanceVh = 0,
  motionDistanceVh = 100,
  focusTopRatio = 0.45,
  focusBottomRatio = 0.65,
  stepTransitions = [],
  transitionTiming = "automatic"
) {
  if (!cardRects.length) {
    return {
      fromIndex: -1,
      toIndex: -1,
      progress: 0,
      phase: "hold",
      checkpointIndex: -1
    };
  }

  const focusTop =
    Math.min(focusTopRatio, focusBottomRatio) * viewportHeight;
  const focusBottom =
    Math.max(focusTopRatio, focusBottomRatio) * viewportHeight;

  for (let index = 0; index < cardRects.length - 1; index += 1) {
    const current = cardRects[index];
    const next = cardRects[index + 1];
    const transition = getSceneIntervalTransition(
      stepTransitions,
      index,
      holdDistanceVh,
      motionDistanceVh,
      transitionTiming
    );
    const checkpointTransition = getSceneIntervalTransition(
      stepTransitions,
      index - 1,
      holdDistanceVh,
      motionDistanceVh,
      transitionTiming
    );
    const openingHoldDistance =
      Math.max(0, transition.holdDistanceVh / 200) * viewportHeight;
    const motionDistance =
      Math.max(0.01, transition.motionDistanceVh / 100) * viewportHeight;
    const transitionMetadata = stepTransitions.length
      ? {
          transitionType: transition.type,
          transitionTiming: transition.timing,
          transitionDurationMs: transition.durationMs
        }
      : {};
    const checkpointMetadata = stepTransitions.length
      ? {
          transitionType: checkpointTransition.type,
          transitionTiming: checkpointTransition.timing,
          transitionDurationMs: checkpointTransition.durationMs
        }
      : {};
    if (current.bottom >= focusTop) {
      return {
        fromIndex: index,
        toIndex: index,
        progress: 0,
        phase: "hold",
        checkpointIndex: index,
        ...checkpointMetadata
      };
    }
    if (next.top <= focusBottom) continue;
    const travelled = Math.max(0, focusTop - current.bottom);
    const progress = Math.min(
      1,
      Math.max(0, (travelled - openingHoldDistance) / motionDistance)
    );
    if (progress < 1) {
      return {
        fromIndex: index,
        toIndex: index + 1,
        progress,
        ...(progress === 0
          ? {
              phase: "hold",
              checkpointIndex: index,
              ...checkpointMetadata
            }
          : { phase: "motion" }),
        ...(progress === 0 ? {} : transitionMetadata)
      };
    }
    return {
      fromIndex: index + 1,
      toIndex: index + 1,
      progress: 0,
      phase: "hold",
      checkpointIndex: index + 1,
      ...transitionMetadata
    };
  }

  const lastIndex = cardRects.length - 1;
  return {
    fromIndex: lastIndex,
    toIndex: lastIndex,
    progress: 0,
    phase: "hold",
    checkpointIndex: lastIndex,
    ...(stepTransitions.length
      ? {
          transitionType: stepTransitions[lastIndex]?.type ?? "fade",
          transitionTiming:
            stepTransitions[lastIndex]?.timing ?? transitionTiming,
          transitionDurationMs:
            Number(stepTransitions[lastIndex]?.durationMs) || 550
        }
      : {})
  };
};
  const getScrollyHandoffExtras = function getScrollyHandoffExtras(
  cardRects,
  viewportHeight,
  existingExtras = [],
  transitionTiming = "automatic",
  holdDistanceVh = 0,
  motionDistanceVh = 100,
  focusTopRatio = 0.45,
  focusBottomRatio = 0.65,
  stepTransitions = []
) {
  const focusHeight =
    Math.abs(focusBottomRatio - focusTopRatio) * viewportHeight;

  return cardRects.map((card, index) => {
    if (index === 0) return 0;
    const transition = getSceneIntervalTransition(
      stepTransitions,
      index - 1,
      holdDistanceVh,
      motionDistanceVh,
      transitionTiming
    );
    const checkpointDistance =
      Math.max(
        0,
        transition.holdDistanceVh + transition.motionDistanceVh
      ) / 100 * viewportHeight;
    const targetGap =
      transition.timing === "scroll-linked"
        ? focusHeight + checkpointDistance
        : viewportHeight +
          Math.max(0, transition.triggerDistanceVh / 100) * viewportHeight;
    const previous = cardRects[index - 1];
    const existingExtra = Number.isFinite(existingExtras[index])
      ? existingExtras[index]
      : 0;
    const renderedGap = card.top - previous.bottom;
    const baseGap = renderedGap - existingExtra;
    const nextExtra = targetGap - baseGap;
    return transition.timing === "scroll-linked"
      ? nextExtra
      : Math.max(0, nextExtra);
  });
};
  const isOversizedScrollyCard = function isOversizedScrollyCard(
  cardHeight,
  viewportHeight,
  edgePadding
) {
  return cardHeight > Math.max(0, viewportHeight - edgePadding * 2);
};
  const resolveNarrativeViewportHeight = function resolveNarrativeViewportHeight(
  viewportHeight,
  stableViewportHeight
) {
  const liveHeight = Number(viewportHeight);
  const stableHeight = Number(stableViewportHeight);
  if (Number.isFinite(stableHeight) && stableHeight > 0) {
    return stableHeight;
  }
  return Number.isFinite(liveHeight) && liveHeight > 0 ? liveHeight : 1;
};
  const syncScrollyHandoffLayout = function syncScrollyHandoffLayout(
  steps,
  cards,
  viewportHeight,
  viewportWidth,
  transitionTiming = "automatic",
  holdDistanceVh = 0,
  motionDistanceVh = 100,
  stepTransitions = []
) {
  const measurableCards = (candidate) => {
    if (!candidate) return [];
    if (candidate.matches?.("[data-scrolly-card-group]")) {
      return Array.from(
        candidate.querySelectorAll(
          ".story-scrolly__card:not(.is-editor-placeholder)"
        )
      );
    }
    return [candidate];
  };
  const readCardRects = () =>
    cards.map((card, index) => {
      const cardElements = measurableCards(card);
      const firstRect = cardElements[0]?.getBoundingClientRect();
      const lastRect = cardElements[
        cardElements.length - 1
      ]?.getBoundingClientRect();
      if (!firstRect || !lastRect) {
        const stepRect = steps[index]?.getBoundingClientRect();
        const edgeRatio = viewportWidth <= 700 ? 0.1 : 0.08;
        const anchor =
          (stepRect?.bottom ?? Number.POSITIVE_INFINITY) -
          viewportHeight * edgeRatio;
        return { top: anchor, bottom: anchor };
      }
      return {
        top: firstRect.top,
        bottom: lastRect.bottom
      };
    });
  const existingExtras = steps.map(
    (step) =>
      Number.parseFloat(
        step.style.getPropertyValue("--scrolly-handoff-extra")
      ) || 0
  );
  const focusZone = getSceneCheckpointFocusZone(viewportWidth);
  const nextExtras = getScrollyHandoffExtras(
    readCardRects(),
    viewportHeight,
    existingExtras,
    transitionTiming,
    holdDistanceVh,
    motionDistanceVh,
    focusZone.topRatio,
    focusZone.bottomRatio,
    stepTransitions
  );

  steps.forEach((step, index) => {
    const nextExtra = nextExtras[index];
    if (Math.abs(nextExtra - existingExtras[index]) < 0.5) return;
    if (Math.abs(nextExtra) >= 0.5) {
      step.style.setProperty("--scrolly-handoff-extra", `${nextExtra}px`);
    } else {
      step.style.removeProperty("--scrolly-handoff-extra");
    }
  });

  return readCardRects();
};
  const resolveSceneScrollState = function resolveSceneScrollState(
  cardRects,
  viewportHeight,
  viewportWidth,
  holdDistanceVh = 0,
  motionDistanceVh = 100,
  stepTransitions = [],
  transitionTiming = "automatic"
) {
  const focusZone = getSceneCheckpointFocusZone(viewportWidth);
  return {
    activeIndex: getActiveScrollyStepIndex(
      cardRects.map((rect) => rect.bottom),
      0,
      viewportHeight,
      stepTransitions
    ),
    ...getSceneTransitionFrame(
      cardRects,
      viewportHeight,
      holdDistanceVh,
      motionDistanceVh,
      focusZone.topRatio,
      focusZone.bottomRatio,
      stepTransitions,
      transitionTiming
    )
  };
};
  const resolveStoryScrollyStep = function resolveStoryScrollyStep(
  section,
  selector,
  viewportHeight,
  viewportWidth,
  readComputedStyle = getComputedStyle
) {
  const steps = Array.from(section.querySelectorAll(selector));
  if (!steps.length) return null;

  const cards = steps.map((step) =>
    step.querySelector("[data-scrolly-card-group], .story-scrolly__card")
  );
  const edgePaddings = steps.map(
    (step) =>
      Number.parseFloat(readComputedStyle(step).paddingBottom) ||
      viewportHeight * 0.08
  );

  steps.forEach((step, index) => {
    const card = cards[index];
    const cardElements = card?.matches?.("[data-scrolly-card-group]")
      ? Array.from(card.querySelectorAll(".story-scrolly__card"))
      : card
        ? [card]
        : [];
    step.classList.toggle(
      "is-oversized",
      index > 0 &&
        cardElements.some((candidate) =>
          isOversizedScrollyCard(
            candidate.getBoundingClientRect().height,
            viewportHeight,
            edgePaddings[index]
          )
        )
    );
  });

  const transitionTiming =
    section.dataset.transitionTiming === "scroll-linked"
      ? "scroll-linked"
      : "automatic";
  const transitionHoldDistanceVh =
    Number(section.dataset.transitionHoldDistanceVh) || 0;
  const transitionMotionDistanceVh =
    Number(section.dataset.transitionMotionDistanceVh) || 100;
  const stepTransitions = steps.map((step) => ({
    type: step.dataset.transitionType,
    timing:
      step.dataset.transitionTiming === "scroll-linked"
        ? "scroll-linked"
        : step.dataset.transitionTiming === "automatic"
          ? "automatic"
          : transitionTiming,
    durationMs: Number(step.dataset.transitionDurationMs),
    triggerDistanceVh: Number(step.dataset.transitionTriggerDistanceVh),
    holdDistanceVh: Number(step.dataset.transitionHoldDistanceVh),
    motionDistanceVh: Number(step.dataset.transitionMotionDistanceVh)
  }));
  const cardRects = syncScrollyHandoffLayout(
    steps,
    cards,
    viewportHeight,
    viewportWidth,
    transitionTiming,
    transitionHoldDistanceVh,
    transitionMotionDistanceVh,
    stepTransitions
  );
  const scrollState = resolveSceneScrollState(
    cardRects,
    viewportHeight,
    viewportWidth,
    transitionHoldDistanceVh,
    transitionMotionDistanceVh,
    stepTransitions,
    transitionTiming
  );
  const { activeIndex } = scrollState;
  const active = steps[activeIndex];
  steps.forEach((step) => step.classList.toggle("is-active", step === active));

  return {
    active,
    activeIndex,
    cardRects,
    edgePaddings,
    scrollState,
    steps,
    stepTransitions
  };
};
  const normalizeCamera2D = function normalizeCamera2D(camera) {
  const finiteOr = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };
  return {
    kind: "camera-2d",
    xPercent: Math.min(100, Math.max(0, finiteOr(camera?.xPercent, 50))),
    yPercent: Math.min(100, Math.max(0, finiteOr(camera?.yPercent, 50))),
    zoom: Math.min(5, Math.max(1, finiteOr(camera?.zoom, 1)))
  };
};
  const getCameraCssValues = function getCameraCssValues(camera) {
  const normalized = normalizeCamera2D(camera);
  return {
    x: `${normalized.xPercent}%`,
    y: `${normalized.yPercent}%`,
    zoom: String(normalized.zoom)
  };
};
  const interpolateCamera2D = function interpolateCamera2D(fromCamera, toCamera, progress) {
  const from = normalizeCamera2D(fromCamera);
  const to = normalizeCamera2D(toCamera);
  const amount = Math.min(1, Math.max(0, Number(progress) || 0));
  const interpolate = (start, end) => start + (end - start) * amount;
  return normalizeCamera2D({
    xPercent: interpolate(from.xPercent, to.xPercent),
    yPercent: interpolate(from.yPercent, to.yPercent),
    zoom: interpolate(from.zoom, to.zoom)
  });
};
  const getSvgLayerTransform = function getSvgLayerTransform(state, device = "desktop") {
  const transform =
    device === "mobile"
      ? state?.mobileTransform ?? state?.desktopTransform
      : state?.desktopTransform;
  const numberOr = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };
  return {
    xPercent: numberOr(transform?.xPercent, 0),
    yPercent: numberOr(transform?.yPercent, 0),
    scaleX: numberOr(transform?.scaleX, 1),
    scaleY: numberOr(transform?.scaleY, 1),
    rotation: numberOr(transform?.rotation, 0)
  };
};
  const interpolateSvgLayerStates = function interpolateSvgLayerStates(
  fromStates = {},
  toStates = {},
  progress = 0
) {
  const normalizeTransform = (transform) => {
    const numberOr = (value, fallback) => {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    };
    return {
      xPercent: numberOr(transform?.xPercent, 0),
      yPercent: numberOr(transform?.yPercent, 0),
      scaleX: numberOr(transform?.scaleX, 1),
      scaleY: numberOr(transform?.scaleY, 1),
      rotation: numberOr(transform?.rotation, 0)
    };
  };
  const normalizeState = (state) => ({
    visible: state?.visible !== false,
    opacity: Number.isFinite(Number(state?.opacity))
      ? Math.min(1, Math.max(0, Number(state.opacity)))
      : 1,
    desktopTransform: normalizeTransform(state?.desktopTransform),
    mobileTransform: normalizeTransform(
      state?.mobileTransform ?? state?.desktopTransform
    )
  });
  const interpolateNumber = (from, to, value) =>
    from + (to - from) * Math.min(1, Math.max(0, Number(value) || 0));
  const amount = Math.min(1, Math.max(0, Number(progress) || 0));
  const ids = new Set([
    ...Object.keys(fromStates || {}),
    ...Object.keys(toStates || {})
  ]);
  return Object.fromEntries(
    Array.from(ids).map((id) => {
      const from = normalizeState(fromStates?.[id]);
      const to = normalizeState(toStates?.[id]);
      const transformBetween = (fromTransform, toTransform) => ({
        xPercent: interpolateNumber(
          fromTransform.xPercent,
          toTransform.xPercent,
          amount
        ),
        yPercent: interpolateNumber(
          fromTransform.yPercent,
          toTransform.yPercent,
          amount
        ),
        scaleX: interpolateNumber(
          fromTransform.scaleX,
          toTransform.scaleX,
          amount
        ),
        scaleY: interpolateNumber(
          fromTransform.scaleY,
          toTransform.scaleY,
          amount
        ),
        rotation: interpolateNumber(
          fromTransform.rotation,
          toTransform.rotation,
          amount
        )
      });
      const fromOpacity = from.visible ? from.opacity : 0;
      const toOpacity = to.visible ? to.opacity : 0;
      return [
        id,
        {
          visible:
            amount <= 0
              ? from.visible
              : amount >= 1
                ? to.visible
                : from.visible || to.visible,
          opacity: interpolateNumber(fromOpacity, toOpacity, amount),
          desktopTransform: transformBetween(
            from.desktopTransform,
            to.desktopTransform
          ),
          mobileTransform: transformBetween(
            from.mobileTransform,
            to.mobileTransform
          )
        }
      ];
    })
  );
};
  const createVisualAnnotationProjection = function createVisualAnnotationProjection({
  viewportWidth,
  viewportHeight,
  mediaWidth,
  mediaHeight,
  fit = "cover",
  camera
} = {}) {
  const finitePositive = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  };
  const clamp = (value, minimum, maximum) =>
    Math.min(maximum, Math.max(minimum, value));
  const finiteOr = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };
  const width = finitePositive(viewportWidth, 100);
  const height = finitePositive(viewportHeight, 100);
  const sourceWidth = finitePositive(mediaWidth, width);
  const sourceHeight = finitePositive(mediaHeight, height);
  const focalXPercent = clamp(finiteOr(camera?.xPercent, 50), 0, 100);
  const focalYPercent = clamp(finiteOr(camera?.yPercent, 50), 0, 100);
  const zoom = clamp(finitePositive(camera?.zoom, 1), 1, 5);
  const widthScale = width / sourceWidth;
  const heightScale = height / sourceHeight;
  const fitScale =
    fit === "contain"
      ? Math.min(widthScale, heightScale)
      : Math.max(widthScale, heightScale);
  const renderedWidth = sourceWidth * fitScale;
  const renderedHeight = sourceHeight * fitScale;
  return {
    viewportWidth: width,
    viewportHeight: height,
    mediaWidth: sourceWidth,
    mediaHeight: sourceHeight,
    renderedWidth,
    renderedHeight,
    offsetX: (width - renderedWidth) * (focalXPercent / 100),
    offsetY: (height - renderedHeight) * (focalYPercent / 100),
    originX: width * (focalXPercent / 100),
    originY: height * (focalYPercent / 100),
    zoom,
    fit: fit === "contain" ? "contain" : "cover"
  };
};
  const VISUAL_FRAME_WIDE_MAX_PX = 1280;
const visualFrameSizes = (value) =>
  value === "wide"
    ? `(min-width: ${VISUAL_FRAME_WIDE_MAX_PX}px) ${VISUAL_FRAME_WIDE_MAX_PX}px, 100vw`
    : "100vw";

  const isPanZoomCheckpointHold = function isPanZoomCheckpointHold(frame) {
  if (!frame) return false;
  if (frame.phase !== undefined) return frame.phase === "hold";
  return Number(frame.fromIndex) === Number(frame.toIndex);
};
  const resolvePanZoomVideoCue = function resolvePanZoomVideoCue(
  source = {},
  useMobile = false,
  preferScrubRendition = false
) {
  const useMobileVideo =
    useMobile && source.mobileKind === "video" && Boolean(source.mobileSrc);
  const kind = useMobileVideo ? source.mobileKind : source.desktopKind;
  const originalUrl = useMobileVideo ? source.mobileSrc : source.desktopSrc;
  const scrubUrl = useMobileVideo
    ? source.mobileScrubSrc
    : source.desktopScrubSrc;
  const url = preferScrubRendition && scrubUrl ? scrubUrl : originalUrl;
  const timeSeconds = useMobile
    ? source.mobileTimeSeconds ?? source.desktopTimeSeconds
    : source.desktopTimeSeconds;
  return kind === "video" && url
    ? { url, timeSeconds: Math.max(0, Number(timeSeconds) || 0) }
    : null;
};
  const resolvePanZoomVideoTransitionDuration = function resolvePanZoomVideoTransitionDuration(
  frame,
  mediaSources = [],
  useMobile = false,
  fallbackDurationMs = 900
) {
  if (
    frame?.transitionTiming !== "automatic" ||
    frame?.transitionType === "cut"
  ) {
    return Math.max(0, Number(fallbackDurationMs) || 0);
  }
  const from = resolvePanZoomVideoCue(
    mediaSources[Math.max(0, Number(frame?.fromIndex) || 0)],
    useMobile,
    false
  );
  const to = resolvePanZoomVideoCue(
    mediaSources[Math.max(0, Number(frame?.toIndex) || 0)],
    useMobile,
    false
  );
  if (!from || !to || from.url !== to.url || to.timeSeconds <= from.timeSeconds) {
    return Math.max(0, Number(fallbackDurationMs) || 0);
  }
  return Math.max(0, (to.timeSeconds - from.timeSeconds) * 1000);
};
  const clampPanZoomVideoTime = function clampPanZoomVideoTime(video, value) {
  const duration = Number(video?.duration);
  const upper = Number.isFinite(duration) && duration > 0 ? duration : Infinity;
  return Math.min(upper, Math.max(0, Number(value) || 0));
};
  const setPanZoomVideoTime = function setPanZoomVideoTime(video, value) {
  if (!video) return;
  const next = clampPanZoomVideoTime(video, value);
  if (Math.abs((Number(video.currentTime) || 0) - next) < 0.015) return;
  try {
    video.currentTime = next;
  } catch {
    // Metadata may not be ready yet; the caller retries after loadedmetadata.
  }
};
  const getPanZoomVideoState = function getPanZoomVideoState(media) {
  if (!media.__panZoomVideoState) {
    media.__panZoomVideoState = {
      activeIndex: null,
      sourceUrl: null,
      token: 0,
      videoFrameId: null,
      animationFrameId: null,
      metadataListenerPending: false,
      readyCallback: null,
      suspended: false
    };
  }
  return media.__panZoomVideoState;
};
  const cancelPanZoomVideoMonitor = function cancelPanZoomVideoMonitor(video, state) {
  if (state.videoFrameId !== null) {
    video?.cancelVideoFrameCallback?.(state.videoFrameId);
    state.videoFrameId = null;
  }
  const frameWindow = video?.ownerDocument?.defaultView;
  if (state.animationFrameId !== null && frameWindow) {
    frameWindow.cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }
};
  const syncPanZoomVideo = function syncPanZoomVideo(
  media,
  mediaSources = [],
  frame,
  reducedMotion = false
) {
  if (!media) return;
  const state = getPanZoomVideoState(media);
  const frameWindow = media.ownerDocument?.defaultView;
  const previewDevice = media?.dataset?.panZoomPreviewDevice;
  const useMobile =
    previewDevice === "mobile" ||
    (previewDevice !== "desktop" &&
      Boolean(frameWindow?.matchMedia?.("(max-width: 700px)").matches));
  const visibleLayer =
    media.querySelector?.("[data-pan-zoom-camera-layer].is-visible") ??
    media.querySelector?.("[data-pan-zoom-camera-layer]");
  const video = visibleLayer?.querySelector?.("[data-pan-zoom-video]");
  const activeIndex = Math.max(0, Number(frame?.activeIndex) || 0);
  const fromIndex = Math.max(0, Number(frame?.fromIndex) || 0);
  const toIndex = Math.max(0, Number(frame?.toIndex) || 0);
  const scrollLinked = frame?.transitionTiming === "scroll-linked";
  const activeCue = resolvePanZoomVideoCue(
    mediaSources[activeIndex],
    useMobile,
    scrollLinked
  );
  if (!video || !activeCue || video.hidden) {
    cancelPanZoomVideoMonitor(video, state);
    Array.from(media.querySelectorAll?.("[data-pan-zoom-video]") ?? []).forEach(
      (candidate) => candidate.pause?.()
    );
    state.activeIndex = activeIndex;
    state.sourceUrl = null;
    state.suspended = false;
    return;
  }
  if (video.getAttribute?.("src") !== activeCue.url) {
    video.pause?.();
    video.setAttribute?.("src", activeCue.url);
    video.load?.();
  }

  const section = media.closest?.("[data-pan-zoom-section]");
  const sectionBounds = section?.getBoundingClientRect?.();
  const viewportHeight = Number(frameWindow?.innerHeight) || 0;
  const sectionIsVisible =
    !sectionBounds ||
    !viewportHeight ||
    (sectionBounds.bottom > 0 && sectionBounds.top < viewportHeight);
  if (!sectionIsVisible) {
    cancelPanZoomVideoMonitor(video, state);
    video.pause?.();
    state.suspended = true;
    return;
  }

  const runWhenReady = (callback) => {
    if (Number(video.readyState) >= 2) {
      callback();
      return;
    }
    state.readyCallback = callback;
    if (state.metadataListenerPending) return;
    state.metadataListenerPending = true;
    video.addEventListener?.(
      "loadeddata",
      () => {
        state.metadataListenerPending = false;
        const readyCallback = state.readyCallback;
        state.readyCallback = null;
        readyCallback?.();
      },
      { once: true }
    );
  };
  const fromCue = resolvePanZoomVideoCue(
    mediaSources[fromIndex],
    useMobile,
    scrollLinked
  );
  const toCue = resolvePanZoomVideoCue(
    mediaSources[toIndex],
    useMobile,
    scrollLinked
  );
  if (scrollLinked && fromCue && toCue && fromCue.url === toCue.url) {
    cancelPanZoomVideoMonitor(video, state);
    video.pause?.();
    const progress = Math.min(1, Math.max(0, Number(frame?.progress) || 0));
    const time =
      fromCue.timeSeconds +
      (toCue.timeSeconds - fromCue.timeSeconds) * progress;
    runWhenReady(() => setPanZoomVideoTime(video, time));
    state.activeIndex = activeIndex;
    state.sourceUrl = activeCue.url;
    state.suspended = false;
    return;
  }

  const resuming = state.suspended;
  state.suspended = false;
  const changed =
    state.activeIndex !== activeIndex ||
    state.sourceUrl !== activeCue.url ||
    resuming;
  if (!changed) return;
  cancelPanZoomVideoMonitor(video, state);
  state.token += 1;
  const token = state.token;
  state.activeIndex = activeIndex;
  state.sourceUrl = activeCue.url;
  runWhenReady(() => {
    if (token !== state.token) return;
    const canPlayForward =
      !reducedMotion &&
      frame?.transitionType !== "cut" &&
      fromCue &&
      fromCue.url === activeCue.url &&
      activeCue.timeSeconds > fromCue.timeSeconds;
    if (!canPlayForward) {
      video.pause?.();
      setPanZoomVideoTime(video, activeCue.timeSeconds);
      return;
    }
    if (!resuming) setPanZoomVideoTime(video, fromCue.timeSeconds);
    video.muted = true;
    video.playsInline = true;
    const stopAtCue = () => {
      if (token !== state.token) return;
      if ((Number(video.currentTime) || 0) >= activeCue.timeSeconds - 0.02) {
        video.pause?.();
        setPanZoomVideoTime(video, activeCue.timeSeconds);
        cancelPanZoomVideoMonitor(video, state);
        return;
      }
      if (typeof video.requestVideoFrameCallback === "function") {
        state.videoFrameId = video.requestVideoFrameCallback(stopAtCue);
      } else if (frameWindow) {
        state.animationFrameId = frameWindow.requestAnimationFrame(stopAtCue);
      }
    };
    const playResult = video.play?.();
    if (playResult?.catch) {
      playResult.catch(() => {
        if (token !== state.token) return;
        setPanZoomVideoTime(video, activeCue.timeSeconds);
        video.pause?.();
      });
    }
    stopAtCue();
  });
};

  const MOTION_IMAGE_LONG_EDGE = 1600;
  const MIN_CHECKPOINT_IMAGE_LONG_EDGE = 2048;
  const MAX_IMAGE_DEVICE_PIXEL_RATIO = 2;
  const ADAPTIVE_IMAGE_SETTLE_DELAY_MS = 120;
  const selectImageRendition = function selectImageRendition(renditions, requiredLongEdge, fallbackSrc) {
  const candidates = Array.isArray(renditions)
    ? renditions
        .filter(
          (candidate) => candidate?.url && Number(candidate.longEdge) > 0
        )
        .sort((left, right) => Number(left.longEdge) - Number(right.longEdge))
    : [];
  return (
    candidates.find(
      (candidate) => Number(candidate.longEdge) >= requiredLongEdge
    )?.url ||
    candidates[candidates.length - 1]?.url ||
    fallbackSrc
  );
};
  const getAdaptiveImageState = function getAdaptiveImageState(image) {
  if (!image.__adaptiveImageState) {
    image.__adaptiveImageState = {
      targetUrl: null,
      timer: null,
      pendingUrl: null,
      onApplied: null
    };
  }
  return image.__adaptiveImageState;
};
  const getAdaptiveMediaState = function getAdaptiveMediaState(media) {
  if (!media.__adaptiveImageState) {
    media.__adaptiveImageState = { transitionDeadline: null };
  }
  return media.__adaptiveImageState;
};
  const getPanZoomVisualSourceKey = function getPanZoomVisualSourceKey(source, mobile) {
  const useMobile = Boolean(mobile && source?.mobileSrc);
  const prefix = useMobile ? "mobile" : "desktop";
  const kind = source?.[prefix + "Kind"] || "";
  const svgId = source?.[prefix + "SvgId"] || "";
  const src = source?.[prefix + "Src"] || "";
  return [kind, svgId, src].join("|");
};
  const setAdaptiveImageSource = function setAdaptiveImageSource(
  image,
  sourceElement,
  url,
  fade = false,
  onApplied
) {
  if (!image || !url) return;
  const state = getAdaptiveImageState(image);
  const activeUrl = sourceElement
    ? sourceElement.getAttribute("srcset")
    : image.getAttribute("src");
  if (activeUrl === url) {
    onApplied?.();
    return;
  }
  const apply = () => {
    if (state.targetUrl !== url) return;
    const currentUrl = image.currentSrc || image.getAttribute("src");
    const parent = image.parentElement;
    let outgoing = null;
    if (fade && currentUrl && parent) {
      outgoing = image.cloneNode(false);
      outgoing.removeAttribute("data-pan-zoom-desktop");
      outgoing.removeAttribute("srcset");
      outgoing.setAttribute("src", currentUrl);
      outgoing.classList.add("story-pan-zoom__adaptive-outgoing");
      parent.appendChild(outgoing);
    }
    if (sourceElement) sourceElement.setAttribute("srcset", url);
    else image.setAttribute("src", url);
    image.dataset.adaptiveSrc = url;
    onApplied?.();
    if (outgoing) {
      const frameWindow = image.ownerDocument?.defaultView;
      frameWindow?.requestAnimationFrame?.(() => {
        outgoing.classList.add("is-fading");
      });
      frameWindow?.setTimeout?.(() => outgoing.remove(), 300);
    }
  };
  state.targetUrl = url;
  if (!fade) {
    apply();
    return;
  }
  const frameWindow = image.ownerDocument?.defaultView;
  const Loader = frameWindow?.Image;
  if (!Loader) {
    apply();
    return;
  }
  const loader = new Loader();
  loader.src = url;
  const ready =
    typeof loader.decode === "function"
      ? loader.decode().catch(() => undefined)
      : Promise.resolve();
  ready.then(apply);
};
  const syncAdaptiveImageRendition = function syncAdaptiveImageRendition({
  image,
  sourceElement,
  renditions,
  fallbackSrc,
  camera,
  media,
  settled,
  settleDelayMs = ADAPTIVE_IMAGE_SETTLE_DELAY_MS,
  onApplied
}) {
  if (!image || !fallbackSrc || !Array.isArray(renditions) || !renditions.length) {
    onApplied?.();
    return;
  }
  const state = getAdaptiveImageState(image);
  const frameWindow = image.ownerDocument?.defaultView;
  const bounds = media?.getBoundingClientRect?.();
  const viewportLongEdge = Math.max(
    Number(bounds?.width) || Number(frameWindow?.innerWidth) || 1280,
    Number(bounds?.height) || Number(frameWindow?.innerHeight) || 720
  );
  const devicePixelRatio = Math.min(
    MAX_IMAGE_DEVICE_PIXEL_RATIO,
    Math.max(1, Number(frameWindow?.devicePixelRatio) || 1)
  );
  const zoom = Math.max(1, Number(camera?.zoom) || 1);
  const requiredLongEdge = settled
    ? Math.max(
        MIN_CHECKPOINT_IMAGE_LONG_EDGE,
        Math.ceil(viewportLongEdge * devicePixelRatio * zoom)
      )
    : MOTION_IMAGE_LONG_EDGE;
  const url = selectImageRendition(renditions, requiredLongEdge, fallbackSrc);
  if (settled && state.timer && state.pendingUrl === url) {
    if (onApplied) state.onApplied = onApplied;
    return;
  }
  if (state.timer && frameWindow) {
    frameWindow.clearTimeout(state.timer);
    state.timer = null;
  }
  state.pendingUrl = null;
  state.onApplied = null;
  if (!settled) {
    setAdaptiveImageSource(image, sourceElement, url, false, onApplied);
    return;
  }
  if (!frameWindow) {
    setAdaptiveImageSource(image, sourceElement, url, true, onApplied);
    return;
  }
  state.onApplied = onApplied;
  state.pendingUrl = url;
  state.timer = frameWindow.setTimeout(() => {
    state.timer = null;
    state.pendingUrl = null;
    const pendingCallback = state.onApplied;
    state.onApplied = null;
    setAdaptiveImageSource(image, sourceElement, url, true, pendingCallback);
  }, Math.max(0, Number(settleDelayMs) || 0));
};
  const syncPanZoomAnnotationDetail = function syncPanZoomAnnotationDetail(
  media,
  camera,
  source = {},
  visible,
  onReveal
) {
  const layer =
    media?.querySelector?.("[data-pan-zoom-camera-layer].is-visible") ??
    media?.querySelector?.("[data-pan-zoom-camera-layer]");
  const image = layer?.querySelector?.("[data-pan-zoom-desktop]");
  const mobileSource = layer?.querySelector?.("[data-pan-zoom-mobile]");
  const useMobile =
    Boolean(source.mobileSrc) &&
    Boolean(
      image?.ownerDocument?.defaultView?.matchMedia?.("(max-width: 700px)")
        .matches
    );
  const usesInlineSvg = useMobile
    ? Boolean(source.mobileSvgMarkup || source.desktopSvgMarkup)
    : Boolean(source.desktopSvgMarkup);
  if (usesInlineSvg) {
    onReveal?.();
    return;
  }
  syncAdaptiveImageRendition({
    image,
    sourceElement: useMobile ? mobileSource : null,
    renditions: useMobile
      ? source.mobileRenditions
      : source.desktopRenditions,
    fallbackSrc: useMobile ? source.mobileSrc : source.desktopSrc,
    camera,
    media,
    settled: Boolean(visible),
    settleDelayMs: 0,
    onApplied: visible ? onReveal : undefined
  });
  if (!visible) onReveal?.();
};

  const defaultSvgLayerPosition = "translate(0%, 0%)";
  const defaultSvgLayerGeometry = "rotate(0deg) scale(1, 1)";
  const resolveSvgLayerPivot = function resolveSvgLayerPivot(pivots, layerId, device = "desktop") {
  const state = pivots?.[layerId];
  const value =
    device === "mobile"
      ? state?.mobilePivot ?? state?.desktopPivot ?? state
      : state?.desktopPivot ?? state;
  const xPercent = Number(value?.xPercent);
  const yPercent = Number(value?.yPercent);
  return {
    xPercent: Number.isFinite(xPercent) ? xPercent : 50,
    yPercent: Number.isFinite(yPercent) ? yPercent : 50
  };
};
  const getSvgSourceSize = function getSvgSourceSize(svg) {
  const viewBox = svg
    ?.getAttribute?.("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  return {
    width:
      viewBox?.length === 4 && viewBox[2] > 0
        ? viewBox[2]
        : Number.parseFloat(svg?.getAttribute?.("width") || ""),
    height:
      viewBox?.length === 4 && viewBox[3] > 0
        ? viewBox[3]
        : Number.parseFloat(svg?.getAttribute?.("height") || "")
  };
};
  const applySvgProjection = function applySvgProjection(svg, projection) {
  if (!svg || !projection) return;
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.position = "absolute";
  svg.style.width = `${projection.renderedWidth}px`;
  svg.style.height = `${projection.renderedHeight}px`;
  svg.style.left = `${projection.offsetX}px`;
  svg.style.top = `${projection.offsetY}px`;
};
  const resetSvgMotionLayer = function resetSvgMotionLayer(layer) {
  layer.style.display = "";
  layer.style.opacity = "";
  layer.style.transformBox = "view-box";
  layer.style.transformOrigin = "0 0";
  layer.style.transform = defaultSvgLayerPosition;
  const geometryLayer = Array.from(layer.children ?? []).find(
    (child) =>
      child.dataset?.scrollyLayerGeometry === layer.dataset?.scrollyLayerMotion
  );
  if (geometryLayer) {
    geometryLayer.style.transformBox = "fill-box";
    geometryLayer.style.transformOrigin = "center";
    geometryLayer.style.transform = defaultSvgLayerGeometry;
  }
};
  const getOrCreateSvgMotionLayer = function getOrCreateSvgMotionLayer(group) {
  if (!group) return null;
  const existingGeometry = group.parentElement;
  if (existingGeometry?.dataset?.scrollyLayerGeometry === group.id) {
    const existingMotion = existingGeometry.parentElement;
    if (existingMotion?.dataset?.scrollyLayerMotion === group.id) {
      return { motionGroup: existingMotion, geometryGroup: existingGeometry };
    }
  }
  const existingMotion = group.parentElement;
  if (existingMotion?.dataset?.scrollyLayerMotion === group.id) {
    if (!group.ownerDocument?.createElementNS || !existingMotion.insertBefore) {
      return { motionGroup: existingMotion, geometryGroup: group };
    }
    const geometry = group.ownerDocument.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    );
    geometry.dataset.scrollyLayerGeometry = group.id;
    existingMotion.insertBefore(geometry, group);
    geometry.appendChild(group);
    return { motionGroup: existingMotion, geometryGroup: geometry };
  }
  if (!group.ownerDocument?.createElementNS || !group.parentNode?.insertBefore) {
    return { motionGroup: group, geometryGroup: group };
  }
  const motion = group.ownerDocument.createElementNS(
    "http://www.w3.org/2000/svg",
    "g"
  );
  const geometry = group.ownerDocument.createElementNS(
    "http://www.w3.org/2000/svg",
    "g"
  );
  motion.dataset.scrollyLayerMotion = group.id;
  geometry.dataset.scrollyLayerGeometry = group.id;
  group.parentNode.insertBefore(motion, group);
  motion.appendChild(geometry);
  geometry.appendChild(group);
  return { motionGroup: motion, geometryGroup: geometry };
};
  const applySvgLayerStates = function applySvgLayerStates(
  host,
  states = {},
  pivots = {},
  device = "desktop",
  layerIds = []
) {
  host
    .querySelectorAll("[data-scrolly-layer-motion]")
    .forEach(resetSvgMotionLayer);
  const groupsById = new Map(
    Array.from(host.querySelectorAll("[id]")).map((group) => [group.id, group])
  );
  const preparedLayerIds = new Set([
    ...(Array.isArray(layerIds) ? layerIds : []),
    ...Object.keys(states)
  ]);
  preparedLayerIds.forEach((layerId) => {
    const group = groupsById.get(layerId);
    if (!group) return;
    const state = states[group.id];
    const wrappers = getOrCreateSvgMotionLayer(group);
    if (!wrappers) return;
    const { motionGroup, geometryGroup } = wrappers;
    const transform = getSvgLayerTransform(state, device);
    const pivot = resolveSvgLayerPivot(pivots, group.id, device);
    motionGroup.style.display = state?.visible === false ? "none" : "";
    motionGroup.style.opacity =
      state && Number(state.opacity) < 1
        ? String(Math.max(0, Math.min(1, Number(state.opacity))))
        : "";
    motionGroup.style.transformBox = "view-box";
    motionGroup.style.transformOrigin = "0 0";
    motionGroup.style.transform = `translate(${transform.xPercent}%, ${transform.yPercent}%)`;
    geometryGroup.style.transformBox = "fill-box";
    geometryGroup.style.transformOrigin = `${pivot.xPercent}% ${pivot.yPercent}%`;
    geometryGroup.style.transform = `rotate(${transform.rotation}deg) scale(${transform.scaleX}, ${transform.scaleY})`;
  });
};
  const readSvgMediaViewport = function readSvgMediaViewport(media) {
  const bounds = media?.getBoundingClientRect?.();
  const width = Number(bounds?.width ?? media?.clientWidth);
  const height = Number(bounds?.height ?? media?.clientHeight);
  return width > 0 && height > 0 ? { width, height } : null;
};
  const projectSvgHost = function projectSvgHost(host) {
  const context = host?.__scrollySvgContext;
  const viewport = context?.media?.__scrollySvgViewport;
  const svg = host?.querySelector?.("svg");
  const sourceSize = getSvgSourceSize(svg);
  if (
    !context ||
    !viewport ||
    !svg ||
    sourceSize.width <= 0 ||
    sourceSize.height <= 0
  ) {
    if (host) {
      host.dataset.svgReady = "false";
      host.hidden = true;
    }
    return false;
  }
  const projection = createVisualAnnotationProjection({
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    mediaWidth: sourceSize.width,
    mediaHeight: sourceSize.height,
    fit: context.fit,
    camera: context.camera
  });
  applySvgProjection(svg, projection);
  applySvgLayerStates(
    host,
    context.layerStates,
    context.layerPivots,
    context.device,
    context.layerIds
  );
  host.dataset.svgReady = "true";
  host.hidden = false;
  return true;
};
  const refreshSvgMedia = function refreshSvgMedia(media) {
  const viewport = readSvgMediaViewport(media);
  if (!viewport) return;
  media.__scrollySvgViewport = viewport;
  media.__scrollySvgHosts?.forEach(projectSvgHost);
};
  const scheduleSvgMediaRefresh = function scheduleSvgMediaRefresh(media) {
  if (!media || media.__scrollySvgLayoutFrame != null) return;
  const frameWindow = media.ownerDocument?.defaultView;
  const run = () => {
    media.__scrollySvgLayoutFrame = null;
    refreshSvgMedia(media);
  };
  if (typeof frameWindow?.requestAnimationFrame === "function") {
    media.__scrollySvgLayoutFrame = frameWindow.requestAnimationFrame(run);
  } else {
    run();
  }
};
  const ensureSvgMediaObserver = function ensureSvgMediaObserver(media) {
  if (media.__scrollySvgLayoutObserver) return;
  const frameWindow = media.ownerDocument?.defaultView;
  const ResizeObserverConstructor = frameWindow?.ResizeObserver;
  if (typeof ResizeObserverConstructor === "function") {
    const observer = new ResizeObserverConstructor(() => {
      scheduleSvgMediaRefresh(media);
    });
    observer.observe(media);
    media.__scrollySvgLayoutObserver = { frameWindow, observer };
  } else if (typeof frameWindow?.addEventListener === "function") {
    const resizeHandler = () => scheduleSvgMediaRefresh(media);
    frameWindow.addEventListener("resize", resizeHandler);
    media.__scrollySvgLayoutObserver = { frameWindow, resizeHandler };
  }
};
  const ensureSvgHostObserver = function ensureSvgHostObserver(host, media) {
  if (host.__scrollySvgMutationObserver) return;
  const MutationObserverConstructor =
    media.ownerDocument?.defaultView?.MutationObserver;
  if (typeof MutationObserverConstructor !== "function") return;
  const observer = new MutationObserverConstructor(() => {
    scheduleSvgMediaRefresh(media);
  });
  observer.observe(host, { childList: true });
  host.__scrollySvgMutationObserver = observer;
};
  const registerSvgHost = function registerSvgHost(media, host) {
  if (!media.__scrollySvgHosts) media.__scrollySvgHosts = new Set();
  const isNew = !media.__scrollySvgHosts.has(host);
  media.__scrollySvgHosts.add(host);
  host.__scrollySvgMedia = media;
  ensureSvgMediaObserver(media);
  ensureSvgHostObserver(host, media);
  if (!media.__scrollySvgViewport) refreshSvgMedia(media);
  return isNew;
};
  const unregisterSvgHost = function unregisterSvgHost(host) {
  const media = host?.__scrollySvgMedia;
  media?.__scrollySvgHosts?.delete(host);
  host?.__scrollySvgMutationObserver?.disconnect?.();
  if (host) {
    host.__scrollySvgMutationObserver = null;
    host.__scrollySvgContext = null;
    host.__scrollySvgMedia = null;
    host.__scrollySvgMarkup = null;
  }
  if (media?.__scrollySvgHosts?.size === 0) {
    const observerState = media.__scrollySvgLayoutObserver;
    observerState?.observer?.disconnect?.();
    if (observerState?.resizeHandler) {
      observerState.frameWindow?.removeEventListener?.(
        "resize",
        observerState.resizeHandler
      );
    }
    if (media.__scrollySvgLayoutFrame != null) {
      observerState?.frameWindow?.cancelAnimationFrame?.(
        media.__scrollySvgLayoutFrame
      );
    }
    media.__scrollySvgLayoutObserver = null;
    media.__scrollySvgLayoutFrame = null;
    media.__scrollySvgViewport = null;
  }
};
  const syncPanZoomSvgHost = function syncPanZoomSvgHost({
  host,
  markup,
  assetId,
  media,
  source,
  camera,
  layerIds = []
}) {
  if (!host) return;
  const signature = assetId || (markup ? String(markup).length : "");
  if (!markup) {
    host.innerHTML = "";
    delete host.dataset.svgAssetId;
    host.dataset.svgReady = "false";
    host.hidden = true;
    unregisterSvgHost(host);
    return;
  }
  const markupChanged = host.__scrollySvgMarkup !== markup;
  const svgMissing = !host.querySelector?.("svg");
  if (markupChanged || svgMissing) {
    host.dataset.svgReady = "false";
    host.hidden = true;
    host.innerHTML = markup;
    host.__scrollySvgMarkup = markup;
  }
  host.dataset.svgAssetId = String(signature);
  host.__scrollySvgContext = {
    media,
    signature: String(signature),
    fit: source.fit === "contain" ? "contain" : "cover",
    camera,
    layerStates: source.svgLayerStates,
    layerPivots: source.svgLayerPivots,
    device: source.svgDevice === "mobile" ? "mobile" : "desktop",
    layerIds
  };
  const newlyRegistered = registerSvgHost(media, host);
  projectSvgHost(host);
  if (markupChanged || svgMissing || newlyRegistered) {
    scheduleSvgMediaRefresh(media);
  }
};
  const setPanZoomLayerCamera = function setPanZoomLayerCamera(layer, camera) {
  if (!layer || !camera) return;
  const values = getCameraCssValues(camera);
  layer.style.setProperty("--pan-zoom-x", values.x);
  layer.style.setProperty("--pan-zoom-y", values.y);
  layer.style.setProperty("--pan-zoom-scale", values.zoom);
};
  const syncPanZoomMedia = function syncPanZoomMedia(
  media,
  cameras,
  mediaSources = [],
  frame,
  reducedMotion = false
) {
  const clampIndex = (value, length) =>
    Math.min(length - 1, Math.max(0, Number(value) || 0));
  const layers = Array.from(
    media?.querySelectorAll("[data-pan-zoom-camera-layer]") ?? []
  );
  if (!media || layers.length < 2 || !cameras.length) return;

  const scrollLinkedCameraAtCheckpoint = isPanZoomCheckpointHold(frame);
  const svgLayerIdsFor = (assetId) => {
    if (!assetId) return [];
    const layerIds = new Set();
    mediaSources.forEach((candidate) => {
      if (
        candidate?.desktopSvgId !== assetId &&
        candidate?.mobileSvgId !== assetId
      ) return;
      Object.keys(candidate.svgLayerStates || {}).forEach((layerId) => {
        layerIds.add(layerId);
      });
    });
    return [...layerIds];
  };

  const setSource = (layer, source = {}, camera) => {
    if (!layer) return;
    const previousSource = layer.__adaptiveMediaSource;
    const rasterSourceChanged =
      previousSource?.desktopSrc !== source.desktopSrc ||
      previousSource?.mobileSrc !== source.mobileSrc ||
      previousSource?.desktopScrubSrc !== source.desktopScrubSrc ||
      previousSource?.mobileScrubSrc !== source.mobileScrubSrc ||
      previousSource?.desktopKind !== source.desktopKind ||
      previousSource?.mobileKind !== source.mobileKind;
    layer.__adaptiveMediaSource = source;
    media.dataset.visualFrame = source.visualFrame || "full-bleed";
    const picture = layer.querySelector("[data-pan-zoom-picture]");
    const desktop = layer.querySelector("[data-pan-zoom-desktop]");
    const mobile = layer.querySelector("[data-pan-zoom-mobile]");
    const video = layer.querySelector("[data-pan-zoom-video]");
    const desktopSvg = layer.querySelector("[data-pan-zoom-svg-desktop]");
    const mobileSvg = layer.querySelector("[data-pan-zoom-svg-mobile]");
    const empty = layer.querySelector("[data-pan-zoom-empty]");
    const sizes = visualFrameSizes(source.visualFrame);
    desktop?.setAttribute?.("sizes", sizes);
    mobile?.setAttribute?.("sizes", sizes);
    const hasDesktopVideo =
      source.desktopKind === "video" && Boolean(source.desktopSrc);
    const hasDesktop =
      source.desktopKind !== "video" && Boolean(source.desktopSrc);
    const hasDesktopSvg = Boolean(source.desktopSvgMarkup);
    const hasMobileSvg = Boolean(source.mobileSvgMarkup);
    const hasMobileRaster = Boolean(
      source.mobileSrc && source.mobileKind !== "video" && !hasMobileSvg
    );
    const previewDevice = media?.dataset?.panZoomPreviewDevice;
    const useMobileViewport =
      previewDevice === "mobile" ||
      (previewDevice !== "desktop" &&
        (desktop ?? video)?.ownerDocument?.defaultView?.matchMedia?.(
          "(max-width: 700px)"
        ).matches);
    const useMobile = Boolean(source.mobileSrc && useMobileViewport);
    const hasSelectedVideo = useMobile
      ? source.mobileKind === "video" && Boolean(source.mobileSrc)
      : hasDesktopVideo;
    const hasSelectedRaster = useMobile
      ? source.mobileKind !== "video" && Boolean(source.mobileSrc) && !hasMobileSvg
      : hasDesktop && !hasDesktopSvg;
    const hasSelectedSvg = useMobile ? hasMobileSvg : hasDesktopSvg;
    if (picture) {
      picture.hidden = !hasSelectedRaster;
      picture.classList?.toggle("has-desktop-svg", hasDesktopSvg);
      picture.classList?.toggle("has-mobile-raster", hasMobileRaster);
    }
    layer.classList.toggle("has-mobile-svg", hasMobileSvg);
    layer.classList.toggle("has-mobile-raster", hasMobileRaster);
    if (empty) empty.hidden = hasSelectedRaster || hasSelectedVideo || hasSelectedSvg;
    if (desktop) {
      if (hasDesktop) {
        if (
          (previousSource && rasterSourceChanged) ||
          !desktop.getAttribute?.("src")
        ) {
          desktop.setAttribute("src", source.desktopSrc);
        }
      } else desktop.removeAttribute("src");
      desktop.setAttribute("alt", source.alt ?? "");
    }
    if (mobile) {
      if (source.mobileSrc && source.mobileKind !== "video") {
        if (
          (previousSource && rasterSourceChanged) ||
          !mobile.getAttribute?.("srcset")
        ) {
          mobile.setAttribute("srcset", source.mobileSrc);
        }
      } else {
        mobile.removeAttribute("srcset");
      }
    }
    if (video) {
      const shouldBuffer =
        layer.classList?.contains?.("is-visible") ||
        layer.classList?.contains?.("is-preparing");
      const nextPreload = shouldBuffer ? "auto" : "metadata";
      const preloadChanged = video.preload !== nextPreload;
      video.preload = nextPreload;
      video.hidden = !hasSelectedVideo;
      video.muted = true;
      video.playsInline = true;
      if (hasSelectedVideo) {
        const preferScrubRendition =
          frame?.transitionTiming === "scroll-linked";
        const selectedVideoSrc = useMobile && source.mobileKind === "video"
          ? preferScrubRendition
            ? source.mobileScrubSrc ?? source.mobileSrc
            : source.mobileSrc
          : preferScrubRendition
            ? source.desktopScrubSrc ?? source.desktopSrc
            : source.desktopSrc;
        if (selectedVideoSrc && video.getAttribute?.("src") !== selectedVideoSrc) {
          video.pause?.();
          video.setAttribute("src", selectedVideoSrc);
          video.load?.();
        } else if (preloadChanged && shouldBuffer && Number(video.readyState) < 2) {
          video.load?.();
        }
        if (source.posterSrc) video.setAttribute("poster", source.posterSrc);
        else video.removeAttribute?.("poster");
      } else if (video.getAttribute?.("src")) {
        video.pause?.();
        video.removeAttribute?.("src");
        video.load?.();
      }
    }
    if (hasDesktop && !source.hasAnnotations) {
      if (automaticCameraChange) {
        syncAdaptiveImageRendition({
          image: desktop,
          sourceElement: useMobile ? mobile : null,
          renditions: useMobile
            ? source.mobileRenditions
            : source.desktopRenditions,
          fallbackSrc: useMobile ? source.mobileSrc : source.desktopSrc,
          camera,
          media,
          settled: false
        });
      }
      syncAdaptiveImageRendition({
        image: desktop,
        sourceElement: useMobile ? mobile : null,
        renditions: useMobile
          ? source.mobileRenditions
          : source.desktopRenditions,
        fallbackSrc: useMobile ? source.mobileSrc : source.desktopSrc,
        camera,
        media,
        settled: cameraAtCheckpoint,
        settleDelayMs: adaptiveSettleDelayMs
      });
    } else if (hasDesktop && rasterSourceChanged) {
      syncAdaptiveImageRendition({
        image: desktop,
        sourceElement: useMobile ? mobile : null,
        renditions: useMobile
          ? source.mobileRenditions
          : source.desktopRenditions,
        fallbackSrc: useMobile ? source.mobileSrc : source.desktopSrc,
        camera,
        media,
        settled: false
      });
    }
    syncPanZoomSvgHost({
      host: desktopSvg,
      markup: source.desktopSvgMarkup,
      assetId: source.desktopSvgId,
      media,
      source,
      camera,
      layerIds: svgLayerIdsFor(source.desktopSvgId)
    });
    syncPanZoomSvgHost({
      host: mobileSvg,
      markup: source.mobileSvgMarkup,
      assetId: source.mobileSvgId,
      media,
      source,
      camera,
      layerIds: svgLayerIdsFor(source.mobileSvgId)
    });
  };

  const setVisibleSlot = (slot) => {
    layers.forEach((layer, index) => {
      layer.classList.toggle("is-visible", index === slot);
      layer.setAttribute("aria-hidden", index === slot ? "false" : "true");
      const video = layer.querySelector?.("[data-pan-zoom-video]");
      if (video) video.preload = index === slot ? "auto" : "metadata";
      if (index !== slot) video?.pause?.();
    });
    media.dataset.panZoomVisibleSlot = String(slot);
  };

  const activeIndex = clampIndex(frame?.activeIndex, cameras.length);
  const fromIndex = clampIndex(frame?.fromIndex, cameras.length);
  const toIndex = clampIndex(frame?.toIndex, cameras.length);
  const previousIndex = Number(media.dataset.panZoomActiveIndex);
  let visibleSlot = Number(media.dataset.panZoomVisibleSlot);
  if (!Number.isInteger(visibleSlot) || !layers[visibleSlot]) visibleSlot = 0;

  const transitionType = frame?.transitionType ?? "pan-zoom";
  const automaticCameraChange =
    frame?.transitionTiming === "automatic" &&
    transitionType !== "cut" &&
    !reducedMotion &&
    Number.isInteger(previousIndex) &&
    previousIndex !== activeIndex;
  const frameWindow = media.ownerDocument?.defaultView;
  const adaptiveState = getAdaptiveMediaState(media);
  const adaptiveNow = () =>
    typeof frameWindow?.performance?.now === "function"
      ? frameWindow.performance.now()
      : Date.now();
  if (automaticCameraChange && frameWindow) {
    adaptiveState.transitionDeadline =
      adaptiveNow() + Math.max(0, Number(frame?.transitionDurationMs) || 900);
  }
  const remainingAutomaticMotion = frameWindow
    ? Math.max(
        0,
        Number(adaptiveState.transitionDeadline) - adaptiveNow()
      )
    : 0;
  if (remainingAutomaticMotion === 0) {
    adaptiveState.transitionDeadline = null;
  }
  const adaptiveSettleDelayMs =
    remainingAutomaticMotion + ADAPTIVE_IMAGE_SETTLE_DELAY_MS;
  const cameraAtCheckpoint =
    frame?.transitionTiming === "automatic"
      ? true
      : scrollLinkedCameraAtCheckpoint;

  if (!Number.isInteger(previousIndex)) {
    setPanZoomLayerCamera(layers[visibleSlot], cameras[activeIndex]);
    setSource(layers[visibleSlot], mediaSources[activeIndex], cameras[activeIndex]);
    layers.forEach((layer, index) => {
      layer.style.opacity = index === visibleSlot ? "1" : "0";
    });
    setVisibleSlot(visibleSlot);
    media.dataset.panZoomActiveIndex = String(activeIndex);
    return;
  }

  const shouldAnimateLayerMotion =
    transitionType === "pan-zoom" &&
    frame?.transitionTiming === "automatic" &&
    !reducedMotion &&
    previousIndex !== activeIndex;
  if (shouldAnimateLayerMotion) {
    const section = media.closest?.(".story-pan-zoom");
    if (section && frameWindow) {
      section.classList.add("is-layer-transitioning");
      if (media.__svgLayerTransitionTimer) {
        frameWindow.clearTimeout(media.__svgLayerTransitionTimer);
      }
      media.__svgLayerTransitionTimer = frameWindow.setTimeout(() => {
        section.classList.remove("is-layer-transitioning");
        media.__svgLayerTransitionTimer = null;
      }, Math.max(0, Number(frame?.transitionDurationMs) || 900));
    }
  }
  if (transitionType === "fade" && !reducedMotion && previousIndex !== activeIndex) {
    const incomingSlot = visibleSlot === 0 ? 1 : 0;
    const outgoing = layers[visibleSlot];
    const incoming = layers[incomingSlot];
    incoming.classList.add("is-preparing");
    setPanZoomLayerCamera(incoming, cameras[activeIndex]);
    setSource(incoming, mediaSources[activeIndex], cameras[activeIndex]);
    incoming.style.opacity = "0";
    outgoing.style.opacity = "1";
    void incoming.getBoundingClientRect();
    incoming.classList.remove("is-preparing");
    incoming.style.opacity = "1";
    outgoing.style.opacity = "0";
    visibleSlot = incomingSlot;
    setVisibleSlot(visibleSlot);
  } else {
    const visible = layers[visibleSlot];
    const camera =
      reducedMotion || transitionType === "cut"
        ? cameras[activeIndex]
        : frame?.transitionTiming === "scroll-linked"
          ? interpolateCamera2D(
              cameras[fromIndex],
              cameras[toIndex],
              frame?.progress
            )
          : cameras[activeIndex];
    let activeSource = mediaSources[activeIndex];
    const fromSource = mediaSources[fromIndex];
    const toSource = mediaSources[toIndex];
    const sourceId = (source) =>
      source?.svgDevice === "mobile"
        ? source.mobileSvgId || source.desktopSvgId
        : source?.desktopSvgId;
    if (
      !reducedMotion &&
      transitionType === "pan-zoom" &&
      frame?.transitionTiming === "scroll-linked" &&
      sourceId(fromSource) &&
      sourceId(fromSource) === sourceId(toSource)
    ) {
      activeSource = {
        ...activeSource,
        svgLayerStates: interpolateSvgLayerStates(
          fromSource?.svgLayerStates,
          toSource?.svgLayerStates,
          frame?.progress
        )
      };
    }
    setPanZoomLayerCamera(visible, camera);
    setSource(visible, activeSource, camera);
    layers.forEach((layer, index) => {
      layer.style.opacity = index === visibleSlot ? "1" : "0";
    });
    setVisibleSlot(visibleSlot);
  }

  media.dataset.panZoomActiveIndex = String(activeIndex);
};
  const projectVisualAnnotationPoint = function projectVisualAnnotationPoint(point, projection) {
  const xPercent = Number(point?.xPercent) || 0;
  const yPercent = Number(point?.yPercent) || 0;
  const projectCoordinates = (x, y) => {
    const baseX = projection.offsetX + projection.renderedWidth * (x / 100);
    const baseY = projection.offsetY + projection.renderedHeight * (y / 100);
    const screenX =
      projection.originX + projection.zoom * (baseX - projection.originX);
    const screenY =
      projection.originY + projection.zoom * (baseY - projection.originY);
    return {
      xPercent: (screenX / projection.viewportWidth) * 100,
      yPercent: (screenY / projection.viewportHeight) * 100
    };
  };
  const projected = projectCoordinates(xPercent, yPercent);
  ["in", "out"].forEach((handle) => {
    const x = Number(point?.[`${handle}XPercent`]);
    const y = Number(point?.[`${handle}YPercent`]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const endpoint = projectCoordinates(xPercent + x, yPercent + y);
    projected[`${handle}XPercent`] = endpoint.xPercent - projected.xPercent;
    projected[`${handle}YPercent`] = endpoint.yPercent - projected.yPercent;
  });
  return projected;
};
  const visualAnnotationMarkerScale = function visualAnnotationMarkerScale(
  projection,
  referenceWidth = 1000
) {
  const renderedWidth = Number(projection?.renderedWidth);
  const zoom = Number(projection?.zoom);
  const baseline = Number(referenceWidth);
  if (!(renderedWidth > 0) || !(baseline > 0)) return 1;
  return renderedWidth * (zoom > 0 ? zoom : 1) / baseline;
};
  const visualAnnotationMarkerMetrics = function visualAnnotationMarkerMetrics(
  size,
  strokeWidth,
  projection
) {
  const scale = visualAnnotationMarkerScale(projection);
  return {
    scale,
    sizePx: Math.max(0, Number(size) || 0) * scale,
    strokeWidthPx: Math.max(0, Number(strokeWidth) || 0) * scale,
    motionPx: 7 * scale
  };
};
  const projectVisualAnnotationPoints = function projectVisualAnnotationPoints(points, projection) {
  return (Array.isArray(points) ? points : []).map((point) =>
    projectVisualAnnotationPoint(point, projection)
  );
};
  const unprojectVisualAnnotationPoint = function unprojectVisualAnnotationPoint(point, projection) {
  const screenX =
    projection.viewportWidth * ((Number(point?.xPercent) || 0) / 100);
  const screenY =
    projection.viewportHeight * ((Number(point?.yPercent) || 0) / 100);
  const unprojectCoordinates = (x, y) => {
    const px = projection.viewportWidth * (x / 100);
    const py = projection.viewportHeight * (y / 100);
    const baseX =
      projection.originX + (px - projection.originX) / projection.zoom;
    const baseY =
      projection.originY + (py - projection.originY) / projection.zoom;
    return {
      xPercent:
        ((baseX - projection.offsetX) / projection.renderedWidth) * 100,
      yPercent:
        ((baseY - projection.offsetY) / projection.renderedHeight) * 100
    };
  };
  const unprojected = unprojectCoordinates(
    (screenX / projection.viewportWidth) * 100,
    (screenY / projection.viewportHeight) * 100
  );
  ["in", "out"].forEach((handle) => {
    const x = Number(point?.[`${handle}XPercent`]);
    const y = Number(point?.[`${handle}YPercent`]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const endpoint = unprojectCoordinates(
      (screenX / projection.viewportWidth) * 100 + x,
      (screenY / projection.viewportHeight) * 100 + y
    );
    unprojected[`${handle}XPercent`] = endpoint.xPercent - unprojected.xPercent;
    unprojected[`${handle}YPercent`] = endpoint.yPercent - unprojected.yPercent;
  });
  return unprojected;
};
  const projectStoredVisualAnnotationPoints = function projectStoredVisualAnnotationPoints(
  points,
  coordinateSpace,
  authoredProjection,
  currentProjection
) {
  const source = Array.isArray(points) ? points : [];
  if (coordinateSpace === "image") {
    return projectVisualAnnotationPoints(source, currentProjection);
  }
  return source.map((point) =>
    projectVisualAnnotationPoint(
      unprojectVisualAnnotationPoint(point, authoredProjection),
      currentProjection
    )
  );
};
  const readVisualAnnotationMediaGeometry = function readVisualAnnotationMediaGeometry(
  media,
  useMobile = false
) {
  const bounds = media?.getBoundingClientRect?.();
  const viewportWidth = Number(bounds?.width ?? media?.clientWidth);
  const viewportHeight = Number(bounds?.height ?? media?.clientHeight);
  if (!(viewportWidth > 0) || !(viewportHeight > 0)) return null;

  const visibleLayer =
    media?.querySelector?.("[data-pan-zoom-camera-layer].is-visible") ??
    media?.querySelector?.("[data-pan-zoom-camera-layer]");
  if (!visibleLayer) return null;

  const svgHosts = Array.from(
    visibleLayer.querySelectorAll?.(
      '.story-pan-zoom__svg[data-svg-ready="true"]:not([hidden])'
    ) ?? []
  );
  const desktopSvg = svgHosts.find(
    (host) => !host.classList?.contains("story-pan-zoom__svg--mobile")
  );
  const mobileSvg = svgHosts.find((host) =>
    host.classList?.contains("story-pan-zoom__svg--mobile")
  );
  const hasMobileRaster = visibleLayer.classList?.contains(
    "has-mobile-raster"
  );
  const svgHost = useMobile
    ? mobileSvg ?? (hasMobileRaster ? null : desktopSvg)
    : desktopSvg;
  const svg = svgHost?.querySelector?.("svg");
  const viewBox = svg
    ?.getAttribute?.("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const svgWidth =
    viewBox?.length === 4 && viewBox[2] > 0
      ? viewBox[2]
      : Number.parseFloat(svg?.getAttribute?.("width") || "");
  const svgHeight =
    viewBox?.length === 4 && viewBox[3] > 0
      ? viewBox[3]
      : Number.parseFloat(svg?.getAttribute?.("height") || "");
  if (svgHost && svgWidth > 0 && svgHeight > 0) {
    return {
      viewportWidth,
      viewportHeight,
      mediaWidth: svgWidth,
      mediaHeight: svgHeight,
      cameraTarget: svgHost,
      kind: "svg"
    };
  }

  const video = visibleLayer.querySelector?.(
    "[data-pan-zoom-video]:not([hidden])"
  );
  const image = visibleLayer.querySelector?.("[data-pan-zoom-desktop]");
  const visual = video ?? image;
  const mediaWidth = Number(video?.videoWidth ?? image?.naturalWidth);
  const mediaHeight = Number(video?.videoHeight ?? image?.naturalHeight);
  if (!visual || !(mediaWidth > 0) || !(mediaHeight > 0)) return null;
  return {
    viewportWidth,
    viewportHeight,
    mediaWidth,
    mediaHeight,
    cameraTarget: visual,
    kind: video ? "video" : "image"
  };
};
  const visualAnnotationPathData = function visualAnnotationPathData(points, close = true) {
  const source = Array.isArray(points) ? points : [];
  if (!source.length) return "";
  const controlPoint = (point, handle) => ({
    xPercent: point.xPercent + Number(point?.[`${handle}XPercent`] || 0),
    yPercent: point.yPercent + Number(point?.[`${handle}YPercent`] || 0)
  });
  const appendSegment = (commands, current, next) => {
    const hasCurve =
      (Number.isFinite(Number(current?.outXPercent)) &&
        Number.isFinite(Number(current?.outYPercent))) ||
      (Number.isFinite(Number(next?.inXPercent)) &&
        Number.isFinite(Number(next?.inYPercent)));
    if (!hasCurve) {
      commands.push(`L${Number(next.xPercent)} ${Number(next.yPercent)}`);
      return;
    }
    const firstControl = controlPoint(current, "out");
    const secondControl = controlPoint(next, "in");
    commands.push(
      `C${firstControl.xPercent} ${firstControl.yPercent} ${secondControl.xPercent} ${secondControl.yPercent} ${Number(next.xPercent)} ${Number(next.yPercent)}`
    );
  };
  const commands = [`M${Number(source[0].xPercent)} ${Number(source[0].yPercent)}`];
  for (let index = 0; index < source.length - 1; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    appendSegment(commands, current, next);
  }
  if (close && source.length > 2) {
    const last = source[source.length - 1];
    const first = source[0];
    const curvedClose =
      (Number.isFinite(Number(last?.outXPercent)) &&
        Number.isFinite(Number(last?.outYPercent))) ||
      (Number.isFinite(Number(first?.inXPercent)) &&
        Number.isFinite(Number(first?.inYPercent)));
    if (curvedClose) appendSegment(commands, last, first);
    commands.push("Z");
  }
  return commands.join(" ");
};
  const syncVisualAnnotationProjection = function syncVisualAnnotationProjection(
  section,
  camera,
  activeIndex,
  fit = "cover",
  useMobile = false
) {
  if (section?.dataset?.annotationProjectionFrozen === "true") return false;
  const media = section?.querySelector?.("[data-pan-zoom-media]");
  const group = section?.querySelector?.(
    `[data-pan-zoom-annotations="${Math.max(0, Number(activeIndex) || 0)}"]`
  );
  if (!media || !group) return false;
  const geometry = readVisualAnnotationMediaGeometry(media, useMobile);
  if (!geometry) return false;
  const projection = createVisualAnnotationProjection({
    viewportWidth: geometry.viewportWidth,
    viewportHeight: geometry.viewportHeight,
    mediaWidth: geometry.mediaWidth,
    mediaHeight: geometry.mediaHeight,
    fit,
    camera
  });
  const parseCamera = (value) => {
    const [xPercent, yPercent, zoom] = String(value || "")
      .split(",")
      .map(Number);
    return { xPercent, yPercent, zoom };
  };
  const parsePoints = (value) =>
    String(value || "")
      .trim()
      .split(/\s+/)
      .map((pair) => pair.split(",").map(Number))
      .filter(
        (pair) =>
          pair.length === 2 &&
          Number.isFinite(pair[0]) &&
          Number.isFinite(pair[1])
      )
      .map(([xPercent, yPercent]) => ({ xPercent, yPercent }));
  const parsePath = (value) => {
    try {
      const parsed = JSON.parse(String(value || ""));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const pointsValueFor = (points) =>
    points
      .map((point) => `${point.xPercent},${point.yPercent}`)
      .join(" ");
  let projectedAnnotations = 0;
  Array.from(group.querySelectorAll("[data-visual-annotation]")).forEach(
    (annotation) => {
      const annotationDevice = useMobile ? "mobile" : "desktop";
      if (annotation.dataset.annotationDevice !== annotationDevice) return;
      const annotationType = annotation.dataset.annotationType || "highlight";
      const minimumPoints = annotationType === "highlight" ? 3 : 1;
      let sourcePoints = parsePath(annotation.dataset.path);
      if (sourcePoints.length < minimumPoints) {
        sourcePoints = parsePoints(annotation.dataset.points);
      }
      if (sourcePoints.length < minimumPoints) return;
      const authoredCamera = parseCamera(annotation.dataset.camera);
      const authoredProjection = createVisualAnnotationProjection({
        viewportWidth: geometry.viewportWidth,
        viewportHeight: geometry.viewportHeight,
        mediaWidth: geometry.mediaWidth,
        mediaHeight: geometry.mediaHeight,
        fit,
        camera: authoredCamera
      });
      const coordinateSpace = annotation.dataset.coordinateSpace;
      if (coordinateSpace !== "image") {
        sourcePoints = sourcePoints.map((point) =>
          unprojectVisualAnnotationPoint(point, authoredProjection)
        );
        annotation.dataset.points = pointsValueFor(sourcePoints);
        annotation.dataset.path = JSON.stringify(sourcePoints);
        annotation.dataset.coordinateSpace = "image";
      }
      const points = projectStoredVisualAnnotationPoints(
        sourcePoints,
        "image",
        authoredProjection,
        projection
      );
      const pointsValue = pointsValueFor(points);
      if (annotationType !== "highlight") {
        const metrics = visualAnnotationMarkerMetrics(
          annotation.dataset.markerSize,
          annotation.dataset.strokeWidth,
          projection
        );
        annotation.style?.setProperty?.(
          "--annotation-marker-rendered-size",
          `${metrics.sizePx}px`
        );
        annotation.style?.setProperty?.(
          "--annotation-stroke-rendered-width",
          `${metrics.strokeWidthPx}px`
        );
        annotation.style?.setProperty?.(
          "--annotation-marker-motion",
          `${metrics.motionPx}px`
        );
        const marker = annotation.querySelector("[data-annotation-marker]");
        const anchor = points[0];
        if (marker && anchor) {
          marker.style.left = `${anchor.xPercent}%`;
          marker.style.top = `${anchor.yPercent}%`;
        }
        const label = annotation.querySelector("[data-annotation-label]");
        if (label && anchor) {
          label.style.left = `${anchor.xPercent}%`;
          label.style.top = `${anchor.yPercent}%`;
        }
        if (marker && anchor) projectedAnnotations += 1;
        return;
      }
      const pathValue = visualAnnotationPathData(points, true);
      const shape = annotation.querySelector("[data-annotation-shape]");
      const outline = shape?.querySelector("[data-annotation-outline]");
      outline?.setAttribute("points", pointsValue);
      outline?.setAttribute("d", pathValue);
      const fill = shape?.querySelector("[data-annotation-fill]");
      if (
        fill?.dataset?.fillMode === "inside" ||
        fill?.tagName?.toLowerCase() === "polygon"
      ) {
        fill.setAttribute("points", pointsValue);
        fill.setAttribute("d", pathValue);
      } else if (fill) {
        fill.setAttribute("d", `M0 0 H100 V100 H0 Z ${pathValue}`);
      }
      const xs = points.map((point) => point.xPercent);
      const ys = points.map((point) => point.yPercent);
      const label = annotation.querySelector("[data-annotation-label]");
      if (label) {
        label.style.left = `${Math.min(...xs)}%`;
        label.style.top = `${Math.max(...ys)}%`;
      }
      projectedAnnotations += 1;
    }
  );
  return projectedAnnotations > 0;
};
  const createVisualAnnotationRuntime = function createVisualAnnotationRuntime(
  fadeDurationMs = VISUAL_ANNOTATION_FADE_DURATION_MS
) {
  const timers = new WeakMap();
  const showIndex = (groups, index) => {
    groups.forEach((group, groupIndex) => {
      const visible = groupIndex === index;
      group.classList.toggle("is-visible", visible);
      group.setAttribute("aria-hidden", visible ? "false" : "true");
    });
  };
  const hideAll = (groups) => {
    groups.forEach((group) => {
      group.classList.remove("is-visible");
      group.setAttribute("aria-hidden", "true");
    });
  };

  return function syncVisualAnnotations(
    section,
    frame,
    transition,
    reducedMotion = false,
    prepareAnnotationCheckpoint
  ) {
    const groups = Array.from(
      section?.querySelectorAll("[data-pan-zoom-annotations]") ?? []
    );
    if (!section || !groups.length) return;
    const activeIndex = Math.min(
      groups.length - 1,
      Math.max(0, Number(frame?.activeIndex) || 0)
    );
    const frameWindow = section.ownerDocument?.defaultView;
    const existingTimer = timers.get(section);
    const setProjectionFrozen = (frozen) => {
      if (frozen) section.dataset.annotationProjectionFrozen = "true";
      else delete section.dataset.annotationProjectionFrozen;
    };
    const reveal = (index) => {
      setProjectionFrozen(false);
      const commit = () => showIndex(groups, index);
      if (prepareAnnotationCheckpoint) {
        prepareAnnotationCheckpoint({ visible: true, index }, commit);
      } else commit();
    };
    const conceal = (index) => {
      setProjectionFrozen(true);
      hideAll(groups);
      prepareAnnotationCheckpoint?.({ visible: false, index }, () => {});
    };
    const clearTimer = () => {
      if (existingTimer !== undefined && frameWindow) {
        frameWindow.clearTimeout(existingTimer);
      }
      timers.delete(section);
    };
    const scrollLinked = frame?.transitionTiming === "scroll-linked";
    if (scrollLinked) {
      clearTimer();
      const inMotion =
        frame?.fromIndex !== frame?.toIndex &&
        Number(frame?.progress) > 0 &&
        Number(frame?.progress) < 1;
      section.dataset.annotationActiveIndex = String(activeIndex);
      if (inMotion) conceal(activeIndex);
      else reveal(activeIndex);
      return;
    }

    const previousIndex = Number(section.dataset.annotationActiveIndex);
    if (!Number.isInteger(previousIndex)) {
      section.dataset.annotationActiveIndex = String(activeIndex);
      reveal(activeIndex);
      return;
    }
    if (previousIndex === activeIndex) return;
    clearTimer();
    conceal(activeIndex);
    section.dataset.annotationActiveIndex = String(activeIndex);
    const durationMs = Math.max(0, Number(transition?.durationMs) || 0);
    if (reducedMotion || !frameWindow) {
      reveal(activeIndex);
      return;
    }
    const revealDelayMs =
      transition?.type === "cut" || durationMs === 0
        ? fadeDurationMs
        : Math.max(durationMs, fadeDurationMs);
    timers.set(
      section,
      frameWindow.setTimeout(() => {
        reveal(activeIndex);
        timers.delete(section);
      }, revealDelayMs)
    );
  };
};
  const syncVisualAnnotations = createVisualAnnotationRuntime(250);
  const createVisualAnnotationProjectionGate = function createVisualAnnotationProjectionGate(maxFrames = 120) {
  const pendingFrames = new WeakMap();
  const clearPending = (section) => {
    const pending = pendingFrames.get(section);
    if (pending) {
      pending.frameWindow?.cancelAnimationFrame?.(pending.frameId);
      pendingFrames.delete(section);
    }
  };

  return function revealWhenProjected(section, index, project, reveal) {
    clearPending(section);
    const frameWindow = section?.ownerDocument?.defaultView;
    let attempts = 0;
    const attempt = () => {
      pendingFrames.delete(section);
      if (Number(section?.dataset?.annotationActiveIndex) !== Number(index)) {
        return;
      }
      if (project?.()) {
        reveal?.();
        return;
      }
      attempts += 1;
      if (
        attempts >= Math.max(1, Number(maxFrames) || 120) ||
        typeof frameWindow?.requestAnimationFrame !== "function"
      ) return;
      const frameId = frameWindow.requestAnimationFrame(attempt);
      pendingFrames.set(section, { frameWindow, frameId });
    };
    attempt();
  };
};
  const revealWhenAnnotationProjected = createVisualAnnotationProjectionGate();
  const MIN_SCROLL_SEQUENCE_LENGTH_VH = 100;
  const MAX_SCROLL_SEQUENCE_LENGTH_VH = 1200;
  const DEFAULT_SCROLL_SEQUENCE_LENGTH_VH = 400;
  const MIN_SCROLL_SEQUENCE_CLIP_DURATION_VH = 10;
  const DEFAULT_SCROLL_SEQUENCE_CLIP_DURATION_VH = 80;
  const DEFAULT_SCROLL_SEQUENCE_CARD_FADE_VH = 15;
  const MAX_SCROLL_SEQUENCE_CARD_FADE_VH = 100;
  const DEFAULT_SCROLL_SEQUENCE_VISUAL_STATE = {"xPercent":0,"yPercent":0,"scale":1,"rotation":0,"opacity":1};
  const DEFAULT_SCROLL_SEQUENCE_VISUAL_FADE_VH = 30;
  const clampScrollSequenceVisualValue = (
  value,
  minimum,
  maximum,
  fallback
) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(maximum, Math.max(minimum, number))
    : fallback;
};
  const normalizeScrollSequenceLength = (value) => {
  const length = Number(value);
  return Number.isFinite(length)
    ? Math.min(
        MAX_SCROLL_SEQUENCE_LENGTH_VH,
        Math.max(MIN_SCROLL_SEQUENCE_LENGTH_VH, Math.round(length))
      )
    : DEFAULT_SCROLL_SEQUENCE_LENGTH_VH;
};
  const clampScrollSequencePosition = (positionVh, lengthVh) =>
  Math.min(
    normalizeScrollSequenceLength(lengthVh),
    Math.max(0, Number(positionVh) || 0)
  );
  const normalizeScrollSequenceClip = (clip, lengthVh) => {
  const length = normalizeScrollSequenceLength(lengthVh);
  const startVh = clampScrollSequencePosition(clip?.startVh, length);
  const requestedEnd = Number(clip?.endVh);
  const endVh = Math.min(
    length,
    Math.max(
      startVh + MIN_SCROLL_SEQUENCE_CLIP_DURATION_VH,
      Number.isFinite(requestedEnd)
        ? requestedEnd
        : startVh + DEFAULT_SCROLL_SEQUENCE_CLIP_DURATION_VH
    )
  );
  return { startVh, endVh };
};
  const normalizeScrollSequenceVisualState = (
  value,
  fallback
) => {
  const defaults = fallback || DEFAULT_SCROLL_SEQUENCE_VISUAL_STATE;
  return {
    xPercent: clampScrollSequenceVisualValue(
      value?.xPercent,
      -100,
      100,
      defaults.xPercent
    ),
    yPercent: clampScrollSequenceVisualValue(
      value?.yPercent,
      -100,
      100,
      defaults.yPercent
    ),
    scale: clampScrollSequenceVisualValue(
      value?.scale,
      0.25,
      4,
      defaults.scale
    ),
    rotation: clampScrollSequenceVisualValue(
      value?.rotation,
      -360,
      360,
      defaults.rotation
    ),
    opacity: clampScrollSequenceVisualValue(
      value?.opacity,
      0,
      1,
      defaults.opacity
    )
  };
};
  const interpolateScrollSequenceVisualState = (from, to, progress) => {
  const start = normalizeScrollSequenceVisualState(from);
  const end = normalizeScrollSequenceVisualState(to, start);
  const amount = clampScrollSequenceVisualValue(progress, 0, 1, 0);
  const interpolate = (startValue, endValue) =>
    Math.round((startValue + (endValue - startValue) * amount) * 10000) /
    10000;
  return {
    xPercent: interpolate(start.xPercent, end.xPercent),
    yPercent: interpolate(start.yPercent, end.yPercent),
    scale: interpolate(start.scale, end.scale),
    rotation: interpolate(start.rotation, end.rotation),
    opacity: interpolate(start.opacity, end.opacity)
  };
};
  const normalizeScrollSequenceMotionMode = (value) =>
  value === "pan-through" ? "pan-through" : "manual";
  const normalizeScrollSequenceMotionClip = (clip, lengthVh) => {
  const mode = normalizeScrollSequenceMotionMode(clip?.mode);
  const desktopPanThrough =
    mode === "pan-through" && clip?.desktopPanThrough !== false;
  const mobilePanThrough =
    mode === "pan-through" && clip?.mobilePanThrough !== false;
  const timing =
    mode === "pan-through"
      ? { startVh: 0, endVh: normalizeScrollSequenceLength(lengthVh) }
      : normalizeScrollSequenceClip(clip, lengthVh);
  const desktopFrom = normalizeScrollSequenceVisualState(clip?.desktopFrom);
  const mobileFrom = normalizeScrollSequenceVisualState(
    clip?.mobileFrom,
    desktopFrom
  );
  return {
    ...timing,
    mode,
    desktopPanThrough,
    mobilePanThrough,
    desktopFrom,
    desktopTo: normalizeScrollSequenceVisualState(
      clip?.desktopTo,
      desktopFrom
    ),
    mobileFrom,
    mobileTo: normalizeScrollSequenceVisualState(clip?.mobileTo, mobileFrom)
  };
};
  const normalizeScrollSequenceVisualTransition = (value) =>
  value === "fade" ? "fade" : "cut";
  const normalizeScrollSequenceVisualCue = (cue, lengthVh) => {
  const transition = normalizeScrollSequenceVisualTransition(cue?.transition);
  const requestedFadeVh = Number(cue?.fadeVh);
  return {
    startVh: clampScrollSequencePosition(cue?.startVh, lengthVh),
    visualFrame: normalizeVisualFrameLayout(cue?.visualFrame),
    transition,
    fadeVh:
      transition === "fade"
        ? Math.min(
            200,
            Math.max(
              5,
              Number.isFinite(requestedFadeVh)
                ? requestedFadeVh
                : DEFAULT_SCROLL_SEQUENCE_VISUAL_FADE_VH
            )
          )
        : 0
  };
};
  const VISUAL_FRAME_LAYOUTS = ["full-bleed","wide"];
  const VISUAL_FRAME_DEFAULT = "full-bleed";
  const normalizeVisualFrameLayout = (value) =>
  VISUAL_FRAME_LAYOUTS.includes(value) ? value : VISUAL_FRAME_DEFAULT;
  const resolveScrollSequenceVisualCueFrame = (
  cues,
  positionVh,
  lengthVh
) => {
  const normalized = (Array.isArray(cues) ? cues : [])
    .map((cue, order) => ({
      ...cue,
      ...normalizeScrollSequenceVisualCue(cue, lengthVh),
      order
    }))
    .sort((left, right) => left.startVh - right.startVh || left.order - right.order);
  const position = clampScrollSequencePosition(positionVh, lengthVh);
  let activeIndex = -1;
  normalized.forEach((cue, index) => {
    if (cue.startVh <= position) activeIndex = index;
  });
  if (activeIndex < 0) return { activeId: null, layers: [] };
  const active = normalized[activeIndex];
  if (active.transition !== "fade" || activeIndex === 0) {
    return {
      activeId: active.id,
      layers: [{ id: active.id, opacity: 1 }]
    };
  }
  const progress = clampScrollSequenceVisualValue(
    (position - active.startVh) / Math.max(1, active.fadeVh),
    0,
    1,
    0
  );
  if (progress >= 1) {
    return {
      activeId: active.id,
      layers: [{ id: active.id, opacity: 1 }]
    };
  }
  return {
    activeId: active.id,
    layers: [
      { id: normalized[activeIndex - 1].id, opacity: 1 - progress },
      { id: active.id, opacity: progress }
    ]
  };
};
  const createScrollSequenceVisualProjection = (options = {}) => {
  const {
    viewportWidth,
    viewportHeight,
    mediaWidth,
    mediaHeight,
    fit = "cover",
    state
  } = options;
  const positiveOr = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  };
  const width = positiveOr(viewportWidth, 1);
  const height = positiveOr(viewportHeight, 1);
  const sourceWidth = positiveOr(mediaWidth, width);
  const sourceHeight = positiveOr(mediaHeight, height);
  const visualState = normalizeScrollSequenceVisualState(state);
  const normalizedFit = fit === "contain" ? "contain" : "cover";
  const widthScale = width / sourceWidth;
  const heightScale = height / sourceHeight;
  const fitScale =
    normalizedFit === "contain"
      ? Math.min(widthScale, heightScale)
      : Math.max(widthScale, heightScale);
  const renderedWidth = sourceWidth * fitScale;
  const renderedHeight = sourceHeight * fitScale;
  const radians = (visualState.rotation * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const requiredLocalHalfWidth =
    Math.abs(cosine) * (width / 2) + Math.abs(sine) * (height / 2);
  const requiredLocalHalfHeight =
    Math.abs(sine) * (width / 2) + Math.abs(cosine) * (height / 2);
  const minimumCoverScale =
    normalizedFit === "cover"
      ? Math.max(
          1,
          requiredLocalHalfWidth / Math.max(0.5, renderedWidth / 2),
          requiredLocalHalfHeight / Math.max(0.5, renderedHeight / 2)
        )
      : 0;
  const scale =
    normalizedFit === "cover"
      ? Math.max(visualState.scale, minimumCoverScale)
      : visualState.scale;
  const requestedX = (visualState.xPercent / 100) * width;
  const requestedY = (visualState.yPercent / 100) * height;
  const panThroughProgress = Number(state?.panThroughProgress);
  const hasPanThroughProgress = Number.isFinite(panThroughProgress);
  let translateX = requestedX;
  let translateY = requestedY;
  let verticalTravel = 0;
  if (normalizedFit === "cover") {
    const availableLocalX = Math.max(
      0,
      (renderedWidth * scale) / 2 - requiredLocalHalfWidth
    );
    const availableLocalY = Math.max(
      0,
      (renderedHeight * scale) / 2 - requiredLocalHalfHeight
    );
    verticalTravel = availableLocalY * 2;
    const requestedLocalX = cosine * requestedX + sine * requestedY;
    const requestedLocalY = hasPanThroughProgress
      ? availableLocalY * (1 - 2 * Math.min(1, Math.max(0, panThroughProgress)))
      : -sine * requestedX + cosine * requestedY;
    const localX = Math.min(
      availableLocalX,
      Math.max(-availableLocalX, requestedLocalX)
    );
    const localY = Math.min(
      availableLocalY,
      Math.max(-availableLocalY, requestedLocalY)
    );
    translateX = cosine * localX - sine * localY;
    translateY = sine * localX + cosine * localY;
  }
  const round = (value) => Math.round(value * 10000) / 10000;
  return {
    renderedWidth: round(renderedWidth),
    renderedHeight: round(renderedHeight),
    translateX: round(translateX),
    translateY: round(translateY),
    scale: round(scale),
    authoredScale: visualState.scale,
    rotation: visualState.rotation,
    opacity: visualState.opacity,
    verticalTravel: round(verticalTravel),
    fit: normalizedFit
  };
};
  const getScrollSequencePositionVh = (
  sectionTop,
  viewportHeight,
  lengthVh
) => {
  const viewport = Math.max(1, Number(viewportHeight) || 1);
  return clampScrollSequencePosition(
    (-Number(sectionTop || 0) / viewport) * 100,
    lengthVh
  );
};
  const isScrollSequenceClipActive = (clip, positionVh, lengthVh) => {
  const { startVh, endVh } = normalizeScrollSequenceClip(clip, lengthVh);
  const position = clampScrollSequencePosition(positionVh, lengthVh);
  return position >= startVh &&
    (position < endVh || (position === lengthVh && endVh === lengthVh));
};
  const getScrollSequenceClipProgress = (clip, positionVh, lengthVh) => {
  const { startVh, endVh } = normalizeScrollSequenceClip(clip, lengthVh);
  const duration = Math.max(1, endVh - startVh);
  return Math.min(
    1,
    Math.max(
      0,
      (clampScrollSequencePosition(positionVh, lengthVh) - startVh) /
        duration
    )
  );
};
  const normalizeScrollSequenceCardFadeVh = (value) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(MAX_SCROLL_SEQUENCE_CARD_FADE_VH, Math.max(0, number))
    : DEFAULT_SCROLL_SEQUENCE_CARD_FADE_VH;
};
  const getScrollSequenceCardOpacity = (
  clip,
  positionVh,
  lengthVh
) => {
  const { startVh, endVh } = normalizeScrollSequenceClip(clip, lengthVh);
  const position = clampScrollSequencePosition(positionVh, lengthVh);
  if (position < startVh || position >= endVh) return 0;
  const duration = Math.max(1, endVh - startVh);
  const fadeVh = Math.min(
    normalizeScrollSequenceCardFadeVh(clip?.fadeVh),
    duration / 2
  );
  if (fadeVh <= 0) return 1;
  return Math.min(
    1,
    Math.max(0, (position - startVh) / fadeVh),
    Math.max(0, (endVh - position) / fadeVh)
  );
};
  const resolveScrollSequenceVisualState = (
  clips,
  positionVh,
  lengthVh,
  device = "desktop"
) => {
  const normalizedClips = (Array.isArray(clips) ? clips : [])
    .map((clip, index) => ({
      ...clip,
      ...normalizeScrollSequenceMotionClip(clip, lengthVh),
      order: index
    }))
    .sort((left, right) => left.startVh - right.startVh || left.order - right.order);
  if (!normalizedClips.length) {
    return { ...DEFAULT_SCROLL_SEQUENCE_VISUAL_STATE };
  }
  const position = clampScrollSequencePosition(positionVh, lengthVh);
  const fromKey = device === "mobile" ? "mobileFrom" : "desktopFrom";
  const toKey = device === "mobile" ? "mobileTo" : "desktopTo";
  const withPanThroughProgress = (clip, state, progress) =>
    clip.mode === "pan-through" &&
    (device === "mobile"
      ? clip.mobilePanThrough
      : clip.desktopPanThrough)
      ? {
          ...state,
          panThroughProgress: clampScrollSequenceVisualValue(
            progress,
            0,
            1,
            0
          )
        }
      : state;
  const eligible = normalizedClips.filter((clip) => clip.startVh <= position);
  if (!eligible.length) {
    return withPanThroughProgress(
      normalizedClips[0],
      { ...normalizedClips[0][fromKey] },
      0
    );
  }
  const clip = eligible[eligible.length - 1];
  if (position >= clip.endVh) {
    return withPanThroughProgress(clip, { ...clip[toKey] }, 1);
  }
  const progress = getScrollSequenceClipProgress(clip, position, lengthVh);
  return withPanThroughProgress(
    clip,
    interpolateScrollSequenceVisualState(
      clip[fromKey],
      clip[toKey],
      progress
    ),
    progress
  );
};
  const bar = document.querySelector(".story-progress");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const panZoomSections = Array.from(
    document.querySelectorAll("[data-pan-zoom-section]")
  );
  const scrollSequenceSections = Array.from(
    document.querySelectorAll("[data-scroll-sequence-section]")
  );
  const narrativeViewportProbe = document.createElement("div");
  narrativeViewportProbe.className = "story-narrative-viewport-probe";
  narrativeViewportProbe.setAttribute("aria-hidden", "true");
  document.body.append(narrativeViewportProbe);
  const getNarrativeViewportHeight = () =>
    resolveNarrativeViewportHeight(
      window.innerHeight,
      narrativeViewportProbe.getBoundingClientRect().height
    );
  const mediaSections = Array.from(
    document.querySelectorAll("[data-story-media-section]")
  );
  const preparedMediaSections = new WeakSet();
  const preloadedMediaUrls = new Set();
  const hydrateDeferredImage = (root) => {
    if (!root) return;
    root.querySelectorAll?.("[data-story-src], [data-story-srcset]")
      .forEach((element) => {
        if (element.dataset.storySrcset) {
          element.setAttribute("srcset", element.dataset.storySrcset);
          delete element.dataset.storySrcset;
        }
        if (element.dataset.storySrc) {
          element.setAttribute("src", element.dataset.storySrc);
          delete element.dataset.storySrc;
        }
      });
  };
  const prepareMediaSection = (section) => {
    if (!section || preparedMediaSections.has(section)) return false;
    preparedMediaSections.add(section);
    section.dataset.storyMediaPrepared = "true";
    const openingSequenceVisual = section.querySelector?.(
      "[data-scroll-sequence-media]"
    );
    hydrateDeferredImage(openingSequenceVisual);
    return true;
  };
  const renditionPreloadUrl = (source, mobile) => {
    const isSvg = mobile ? source?.mobileSvgId : source?.desktopSvgId;
    const kind = mobile ? source?.mobileKind : source?.desktopKind;
    if (kind !== "image" || isSvg) return "";
    const renditions = mobile
      ? source?.mobileRenditions
      : source?.desktopRenditions;
    const candidate = Array.isArray(renditions)
      ? renditions.find((rendition) => rendition?.url)
      : null;
    return candidate?.url || (mobile ? source?.mobileSrc : source?.desktopSrc) || "";
  };
  const preloadNearbyPanZoomSource = (source, mobile) => {
    const url = renditionPreloadUrl(source, mobile);
    if (!url || preloadedMediaUrls.has(url)) return;
    preloadedMediaUrls.add(url);
    const image = new Image();
    image.decoding = "async";
    image.src = url;
  };
  mediaSections
    .filter((section, index) =>
      index === 0 || section.hasAttribute("data-story-media-eager")
    )
    .forEach(prepareMediaSection);
  let scheduled = false;
  const update = () => {
    scheduled = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) {
      bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
    }
    scrollSequenceSections.forEach((section) => {
      if (!preparedMediaSections.has(section)) return;
      const lengthVh = Number(section.dataset.scrollSequenceLengthVh) || 400;
      const positionVh = getScrollSequencePositionVh(
        section.getBoundingClientRect().top,
        window.innerHeight,
        lengthVh
      );
      section.style.setProperty("--scroll-sequence-playhead-vh", positionVh);
      const mobile = matchMedia("(max-width: 700px)").matches;
      if (!section.__scrollSequenceMotionClips) {
        try {
          section.__scrollSequenceMotionClips = JSON.parse(
            section.dataset.scrollSequenceMotionClips || "[]"
          );
        } catch {
          section.__scrollSequenceMotionClips = [];
        }
      }
      const visualState = resolveScrollSequenceVisualState(
        section.__scrollSequenceMotionClips,
        positionVh,
        lengthVh,
        mobile ? "mobile" : "desktop"
      );
      const visual = section.querySelector("[data-scroll-sequence-visual]");
      let activeVisualProjection = null;
      let activeVisualImage = null;
      let visualBounds = null;
      if (visual) {
        const layers = Array.from(
          visual.querySelectorAll("[data-visual-cue-id]")
        );
        const cueFrame = resolveScrollSequenceVisualCueFrame(
          layers.map((layer) => ({
            id: layer.dataset.visualCueId,
            startVh: Number(layer.dataset.startVh),
            transition: layer.dataset.transition,
            fadeVh: Number(layer.dataset.fadeVh)
          })),
          positionVh,
          lengthVh
        );
        const activeLayerIndex = layers.findIndex(
          (layer) => layer.dataset.visualCueId === cueFrame.activeId
        );
        [layers[activeLayerIndex], layers[activeLayerIndex + 1]]
          .filter(Boolean)
          .forEach(hydrateDeferredImage);
        const layerOpacities = new Map(
          cueFrame.layers.map((layer) => [layer.id, layer.opacity])
        );
        const activeLayer = layers.find(
          (layer) => layer.dataset.visualCueId === cueFrame.activeId
        );
        visual.dataset.visualFrame =
          activeLayer?.dataset.visualFrame || "full-bleed";
        const bounds = visual.getBoundingClientRect();
        visualBounds = bounds;
        layers.forEach((layer) => {
          const image = layer.querySelector("img");
          const projection = createScrollSequenceVisualProjection({
            viewportWidth: bounds.width,
            viewportHeight: bounds.height,
            mediaWidth: image?.naturalWidth || bounds.width,
            mediaHeight: image?.naturalHeight || bounds.height,
            fit: section.dataset.scrollSequenceFit,
            state: visualState
          });
          const cueOpacity = layerOpacities.get(layer.dataset.visualCueId) || 0;
          if (layer.dataset.visualCueId === cueFrame.activeId) {
            activeVisualProjection = projection;
            activeVisualImage = image;
          }
          layer.style.setProperty(
            "--sequence-visual-width",
            projection.renderedWidth + "px"
          );
          layer.style.setProperty(
            "--sequence-visual-height",
            projection.renderedHeight + "px"
          );
          layer.style.setProperty(
            "--sequence-visual-x",
            projection.translateX + "px"
          );
          layer.style.setProperty(
            "--sequence-visual-y",
            projection.translateY + "px"
          );
          layer.style.setProperty("--sequence-visual-scale", projection.scale);
          layer.style.setProperty(
            "--sequence-visual-rotation",
            projection.rotation + "deg"
          );
          layer.style.setProperty(
            "--sequence-visual-opacity",
            projection.opacity
          );
          layer.style.setProperty("--sequence-cue-opacity", cueOpacity);
          layer.style.zIndex =
            layer.dataset.visualCueId === cueFrame.activeId ? "2" : "1";
          layer.setAttribute("aria-hidden", cueOpacity > 0 ? "false" : "true");
        });
      }
      section.querySelectorAll("[data-scroll-sequence-clip]").forEach((clip) => {
        const timing = {
          startVh: Number(clip.dataset.startVh),
          endVh: Number(clip.dataset.endVh)
        };
        const active = isScrollSequenceClipActive(
          timing,
          positionVh,
          lengthVh
        );
        const xPercent = Number(
          mobile ? clip.dataset.mobileX : clip.dataset.desktopX
        );
        const yPercent = Number(
          mobile ? clip.dataset.mobileY : clip.dataset.desktopY
        );
        const widthPx = Number(
          mobile ? clip.dataset.mobileWidth : clip.dataset.desktopWidth
        );
        const progress = getScrollSequenceClipProgress(
          timing,
          positionVh,
          lengthVh
        );
        const scrolling = clip.dataset.cardBehavior === "scroll-through";
        let visualOffsetPercent = 0;
        if (
          clip.dataset.cardBehavior === "match-visual" &&
          activeVisualProjection &&
          activeVisualImage &&
          visualBounds
        ) {
          const startState = resolveScrollSequenceVisualState(
            section.__scrollSequenceMotionClips,
            timing.startVh,
            lengthVh,
            mobile ? "mobile" : "desktop"
          );
          const startProjection = createScrollSequenceVisualProjection({
            viewportWidth: visualBounds.width,
            viewportHeight: visualBounds.height,
            mediaWidth: activeVisualImage.naturalWidth || visualBounds.width,
            mediaHeight: activeVisualImage.naturalHeight || visualBounds.height,
            fit: section.dataset.scrollSequenceFit,
            state: startState
          });
          visualOffsetPercent =
            ((activeVisualProjection.translateY - startProjection.translateY) /
              Math.max(1, visualBounds.height)) *
            100;
        }
        const opacity = getScrollSequenceCardOpacity(
          {
            ...timing,
            fadeVh: Number(clip.dataset.cardFadeVh)
          },
          positionVh,
          lengthVh
        );
        clip.style.setProperty("--sequence-card-left", xPercent + "%");
        clip.style.setProperty(
          "--sequence-card-top",
          (scrolling
            ? (1 - progress) * 100 + yPercent - 50
            : yPercent + visualOffsetPercent) + "%"
        );
        clip.style.setProperty("--sequence-card-width", widthPx + "px");
        clip.style.setProperty("--sequence-card-half-width", widthPx / 2 + "px");
        clip.style.setProperty(
          "--sequence-card-translate-y",
          (scrolling ? -progress * 100 : -50) + "%"
        );
        clip.style.opacity = String(opacity);
        clip.classList.toggle("is-active", active);
        clip.setAttribute("aria-hidden", active ? "false" : "true");
      });
    });
    panZoomSections.forEach((section) => {
      if (!preparedMediaSections.has(section)) return;
      const state = resolveStoryScrollyStep(
        section,
        "[data-pan-zoom-step]",
        getNarrativeViewportHeight(),
        window.innerWidth
      );
      if (!state) return;
      const useMobileCamera = window.matchMedia("(max-width: 700px)").matches;
      const cameras = state.steps.map((step) =>
        useMobileCamera
          ? {
              xPercent: Number(step.dataset.mobileCameraX),
              yPercent: Number(step.dataset.mobileCameraY),
              zoom: Number(step.dataset.mobileCameraZoom)
            }
          : {
              xPercent: Number(step.dataset.cameraX),
              yPercent: Number(step.dataset.cameraY),
              zoom: Number(step.dataset.cameraZoom)
            }
      );
      const svgMarkupFor = (assetId) => {
        if (!assetId) return undefined;
        return Array.from(
          section.querySelectorAll("template[data-pan-zoom-svg-template]")
        ).find((template) => template.dataset.panZoomSvgTemplate === assetId)
          ?.innerHTML;
      };
      const mediaSources = state.steps.map((step) => {
        let svgLayerStates = {};
        let svgLayerPivots = {};
        let desktopRenditions = [];
        let mobileRenditions = [];
        try {
          svgLayerStates = JSON.parse(step.dataset.svgLayerStates || "{}");
        } catch {
          svgLayerStates = {};
        }
        try {
          svgLayerPivots = JSON.parse(step.dataset.svgLayerPivots || "{}");
        } catch {
          svgLayerPivots = {};
        }
        try {
          desktopRenditions = JSON.parse(
            step.dataset.desktopRenditions || "[]"
          );
        } catch {
          desktopRenditions = [];
        }
        try {
          mobileRenditions = JSON.parse(
            step.dataset.mobileRenditions || "[]"
          );
        } catch {
          mobileRenditions = [];
        }
        return {
          desktopSrc: step.dataset.desktopSrc,
          mobileSrc: step.dataset.mobileSrc,
          desktopScrubSrc: step.dataset.desktopScrubSrc,
          mobileScrubSrc: step.dataset.mobileScrubSrc,
          desktopKind: step.dataset.desktopKind,
          mobileKind: step.dataset.mobileKind,
          desktopTimeSeconds: Number(step.dataset.desktopTimeSeconds) || 0,
          mobileTimeSeconds: Number(step.dataset.mobileTimeSeconds) || 0,
          posterSrc: step.dataset.posterSrc,
          desktopRenditions,
          mobileRenditions,
          hasAnnotations:
            step.dataset[
              useMobileCamera
                ? "hasMobileAnnotations"
                : "hasDesktopAnnotations"
            ] === "true",
          desktopSvgId: step.dataset.desktopSvgId,
          mobileSvgId: step.dataset.mobileSvgId,
          desktopSvgMarkup: svgMarkupFor(step.dataset.desktopSvgId),
          mobileSvgMarkup: svgMarkupFor(step.dataset.mobileSvgId),
          svgLayerStates,
          svgLayerPivots,
          svgDevice: useMobileCamera ? "mobile" : "desktop",
          visualFrame: step.dataset.visualFrame || "full-bleed",
          fit: section.dataset.mediaFit || "cover",
          alt: step.dataset.mediaAlt || ""
        };
      });
      const activeMediaSource = mediaSources[state.activeIndex];
      const nearbyMediaSource =
        mediaSources[Math.min(mediaSources.length - 1, state.activeIndex + 1)];
      if (
        getPanZoomVisualSourceKey(activeMediaSource, useMobileCamera) !==
        getPanZoomVisualSourceKey(nearbyMediaSource, useMobileCamera)
      ) {
        preloadNearbyPanZoomSource(nearbyMediaSource, useMobileCamera);
      }
      const automatic =
        state.scrollState.transitionTiming !== "scroll-linked";
      const previousIndex = Number(section.dataset.runtimeActiveStepIndex);
      const edgeIndex = Number.isInteger(previousIndex)
        ? Math.max(previousIndex, state.activeIndex)
        : state.activeIndex;
      const baseTransition =
        state.stepTransitions[edgeIndex] ?? state.stepTransitions[0];
      const effectiveDurationMs = resolvePanZoomVideoTransitionDuration(
        state.scrollState,
        mediaSources,
        useMobileCamera,
        baseTransition?.durationMs || 900
      );
      const activeTransition = {
        ...baseTransition,
        durationMs: effectiveDurationMs
      };
      const playbackFrame = {
        ...state.scrollState,
        transitionDurationMs: effectiveDurationMs
      };
      section.dataset.runtimeActiveStepIndex = String(state.activeIndex);
      section.style.setProperty(
        "--pan-zoom-transition-duration",
        (activeTransition?.durationMs || 900) + "ms"
      );
      section.classList.toggle(
        "is-camera-cut",
        activeTransition?.type === "cut"
      );
      section.classList.toggle(
        "is-camera-fade",
        activeTransition?.type === "fade"
      );
      section.classList.toggle("story-pan-zoom--automatic", automatic);
      section.classList.toggle(
        "story-scrolly--timing-scroll-linked",
        !automatic
      );
      section.classList.toggle(
        "story-scrolly--timing-automatic",
        automatic
      );
      const media = section.querySelector("[data-pan-zoom-media]");
      if (!media) return;
      syncPanZoomMedia(
        media,
        cameras,
        mediaSources,
        playbackFrame,
        reducedMotion.matches
      );
      syncPanZoomVideo(
        media,
        mediaSources,
        playbackFrame,
        reducedMotion.matches
      );
      const cameraIndex = (value) =>
        Math.min(cameras.length - 1, Math.max(0, Number(value) || 0));
      const currentCamera =
        reducedMotion.matches || activeTransition?.type === "cut"
          ? cameras[cameraIndex(state.activeIndex)]
          : state.scrollState.transitionTiming === "scroll-linked"
            ? interpolateCamera2D(
                cameras[cameraIndex(state.scrollState.fromIndex)],
                cameras[cameraIndex(state.scrollState.toIndex)],
                state.scrollState.progress
              )
            : cameras[cameraIndex(state.activeIndex)];
      syncVisualAnnotations(
        section,
        state.scrollState,
        activeTransition,
        reducedMotion.matches,
        ({ visible, index }, reveal) => {
          const detailIndex = cameraIndex(index);
          const detailSource = mediaSources[detailIndex];
          syncPanZoomAnnotationDetail(
            media,
            cameras[detailIndex],
            detailSource,
            visible,
            () => {
              if (!visible || !detailSource?.hasAnnotations) {
                reveal();
                return;
              }
              revealWhenAnnotationProjected(
                section,
                detailIndex,
                () =>
                  syncVisualAnnotationProjection(
                    section,
                    cameras[detailIndex],
                    detailIndex,
                    section.dataset.mediaFit || "cover",
                    useMobileCamera
                  ),
                reveal
              );
            }
          );
        }
      );
      syncVisualAnnotationProjection(
        section,
        currentCamera,
        state.activeIndex,
        section.dataset.mediaFit || "cover",
        useMobileCamera
      );
    });
  };
  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };
  const deferredMediaSections = mediaSections.filter(
    (section) => !preparedMediaSections.has(section)
  );
  if ("IntersectionObserver" in window) {
    const mediaObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (prepareMediaSection(entry.target)) scheduleUpdate();
          mediaObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "125% 0px", threshold: 0 }
    );
    deferredMediaSections.forEach((section) => mediaObserver.observe(section));
  } else {
    deferredMediaSections.forEach(prepareMediaSection);
  }
  panZoomSections.forEach((section) => {
    section
      .querySelectorAll("[data-pan-zoom-desktop]")
        .forEach((image) => image.addEventListener("load", scheduleUpdate));
    section
      .querySelectorAll("[data-pan-zoom-video]")
      .forEach((video) =>
        video.addEventListener("loadedmetadata", scheduleUpdate)
      );
  });
  scrollSequenceSections.forEach((section) => {
    section
      .querySelectorAll("[data-scroll-sequence-media] img")
      .forEach((image) => image.addEventListener("load", scheduleUpdate));
  });
  addEventListener("scroll", scheduleUpdate, { passive: true });
  addEventListener("resize", scheduleUpdate);
  reducedMotion.addEventListener?.("change", scheduleUpdate);
  if ("ResizeObserver" in window) {
    const cardResizeObserver = new ResizeObserver(scheduleUpdate);
    panZoomSections.forEach((section) => {
      section
        .querySelectorAll(".story-scrolly__card")
        .forEach((card) => cardResizeObserver.observe(card));
    });
  }
  document.fonts?.ready.then(scheduleUpdate);
  update();
})();

function toDate(value) {
  return new Date(value);
}

function toSeconds(milliseconds) {
  return Math.max(0, Math.round(milliseconds / 1000));
}

export function createEngagementSessionTracker({ now = () => Date.now(), initialVisible = true } = {}) {
  const startedAt = now();
  let visible = Boolean(initialVisible);
  let activeStartedAt = visible ? startedAt : null;
  let accumulatedActiveMilliseconds = 0;
  let pauseCount = 0;
  let finalized = false;

  function activeMilliseconds() {
    const currentVisibleMilliseconds = visible && activeStartedAt !== null ? Math.max(0, now() - activeStartedAt) : 0;
    return accumulatedActiveMilliseconds + currentVisibleMilliseconds;
  }

  function snapshot(extra = {}) {
    const timestamp = now();
    return {
      startedAt: new Date(startedAt).toISOString(),
      elapsedSeconds: toSeconds(timestamp - startedAt),
      activeSeconds: toSeconds(activeMilliseconds()),
      pauseCount,
      visible,
      ...extra,
    };
  }

  function start({ entryView = "home" } = {}) {
    const entryDate = toDate(startedAt);
    return {
      eventType: "app_session_started",
      payload: snapshot({
        entryView,
        entryHour: entryDate.getHours(),
      }),
    };
  }

  function pause({ lastView = "home" } = {}) {
    if (finalized || !visible) return null;
    accumulatedActiveMilliseconds = activeMilliseconds();
    activeStartedAt = null;
    visible = false;
    pauseCount += 1;
    return {
      eventType: "app_session_paused",
      payload: snapshot({ lastView }),
    };
  }

  function resume({ currentView = "home" } = {}) {
    if (finalized || visible) return null;
    visible = true;
    activeStartedAt = now();
    return {
      eventType: "app_session_resumed",
      payload: snapshot({ currentView }),
    };
  }

  function end({ lastView = "home" } = {}) {
    if (finalized) return null;
    if (visible) {
      accumulatedActiveMilliseconds = activeMilliseconds();
      activeStartedAt = null;
      visible = false;
    }
    finalized = true;
    return {
      eventType: "app_session_ended",
      payload: snapshot({ lastView }),
    };
  }

  return {
    end,
    pause,
    resume,
    snapshot,
    start,
  };
}

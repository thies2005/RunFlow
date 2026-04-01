import { prisma as _prisma } from '@/lib/db';

export interface SessionEvent {
  type: 'click' | 'input' | 'navigation' | 'error' | 'console' | 'scroll' | 'resize';
  timestamp: number;
  data: any;
}

const sessionEvents: SessionEvent[] = [];
let sessionId: string | null = null;
let sessionStartTime: number = 0;
let flushTimeout: NodeJS.Timeout | null = null;

export function initSessionReplay() {
  if (typeof window === 'undefined') return;

  sessionId = crypto.randomUUID();
  sessionStartTime = Date.now();

  attachEventListeners();
  startFlushInterval();
}

function attachEventListeners() {
  if (typeof window === 'undefined') return;

  window.addEventListener('click', handleClick);
  window.addEventListener('input', handleInput);
  window.addEventListener('popstate', handleNavigation);
  window.addEventListener('hashchange', handleNavigation);
  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize);
}

function handleClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target) return;

  const sessionEvent: SessionEvent = {
    type: 'click',
    timestamp: Date.now(),
    data: {
      tagName: target.tagName,
      className: target.className,
      id: target.id,
      textContent: target.textContent?.substring(0, 100),
      xpath: getXPath(target),
    },
  };

  addEvent(sessionEvent);
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target) return;

  const sessionEvent: SessionEvent = {
    type: 'input',
    timestamp: Date.now(),
    data: {
      tagName: target.tagName,
      type: target.type,
      name: target.name,
      value: target.type === 'password' ? '[REDACTED]' : target.value.substring(0, 100),
      xpath: getXPath(target),
    },
  };

  addEvent(sessionEvent);
}

function handleNavigation() {
  const sessionEvent: SessionEvent = {
    type: 'navigation',
    timestamp: Date.now(),
    data: {
      url: window.location.href,
      path: window.location.pathname,
    },
  };

  addEvent(sessionEvent);
}

function handleError(errorEvent: ErrorEvent) {
  const sessionEvent: SessionEvent = {
    type: 'error',
    timestamp: Date.now(),
    data: {
      message: sanitizeErrorMessage(errorEvent.message),
      filename: errorEvent.filename,
      lineno: errorEvent.lineno,
      colno: errorEvent.colno,
    },
  };

  addEvent(sessionEvent);
}

function handleUnhandledRejection(event: PromiseRejectionEvent) {
  const sessionEvent: SessionEvent = {
    type: 'error',
    timestamp: Date.now(),
    data: {
      message: sanitizeErrorMessage(String(event.reason)),
      type: 'unhandledrejection',
    },
  };

  addEvent(sessionEvent);
}

function handleScroll() {
  const sessionEvent: SessionEvent = {
    type: 'scroll',
    timestamp: Date.now(),
    data: {
      scrollY: window.scrollY,
      scrollX: window.scrollX,
    },
  };

  addEvent(sessionEvent);
}

function handleResize() {
  const sessionEvent: SessionEvent = {
    type: 'resize',
    timestamp: Date.now(),
    data: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };

  addEvent(sessionEvent);
}

function getXPath(element: HTMLElement): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const parts: string[] = [];
  let current = element;

  while (current && current !== document.body) {
    let index = 1;
    let sibling = current.previousElementSibling;

    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }

    parts.unshift(`${current.tagName.toLowerCase()}[${index}]`);
    current = current.parentElement!;
  }

  return '/' + parts.join('/');
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, 'Bearer [REDACTED_TOKEN]')
    .substring(0, 500);
}

function addEvent(event: SessionEvent) {
  sessionEvents.push(event);

  if (sessionEvents.length >= 500) {
    flushSessionEvents();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      flushSessionEvents();
    }, 30000);
  }
}

async function flushSessionEvents() {
  if (sessionEvents.length === 0 || !sessionId) {
    return;
  }

  const eventsToFlush = [...sessionEvents];
  sessionEvents.length = 0;

  const duration = Math.floor((Date.now() - sessionStartTime) / 1000);

  try {
    await fetch('/api/session-replay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        events: eventsToFlush,
        duration,
        routePath: window.location.pathname,
      }),
    });
  } catch (error) {
    console.error('Failed to send session replay events:', error);
  }

  flushTimeout = null;
}

function startFlushInterval() {
  setInterval(() => {
    if (sessionEvents.length > 0) {
      flushSessionEvents();
    }
  }, 60000);
}

export function endSessionReplay() {
  if (sessionEvents.length > 0) {
    flushSessionEvents();
  }

  if (flushTimeout) {
    clearTimeout(flushTimeout);
  }
}

/**
 * Performance monitoring utilities for the CAPI Automation UI.
 *
 * Tracks key performance metrics and sends them to analytics.
 */

/**
 * Report Web Vitals to analytics service.
 *
 * Web Vitals metrics:
 * - LCP (Largest Contentful Paint): < 2.5s good
 * - FID (First Input Delay): < 100ms good
 * - CLS (Cumulative Layout Shift): < 0.1 good
 */
export const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

/**
 * Send performance metrics to analytics.
 *
 * @param {Object} metric - Web Vital metric
 */
export const sendToAnalytics = (metric) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Performance]', metric.name, metric.value);
  }

  // Send to analytics in production
  if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true') {
    // Example: Google Analytics 4
    if (window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      });
    }

    // Example: Custom analytics endpoint
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        id: metric.id,
        rating: metric.rating,
        timestamp: Date.now(),
      }),
    }).catch((error) => {
      console.error('Failed to send analytics:', error);
    });
  }
};

/**
 * Track custom performance marks and measures.
 */
export class PerformanceTracker {
  /**
   * Mark the start of an operation.
   *
   * @param {string} name - Name of the operation
   */
  static mark(name) {
    if (performance && performance.mark) {
      performance.mark(name);
    }
  }

  /**
   * Measure time between two marks.
   *
   * @param {string} name - Name of the measure
   * @param {string} startMark - Start mark name
   * @param {string} endMark - End mark name (optional, uses now if not provided)
   */
  static measure(name, startMark, endMark) {
    if (performance && performance.measure) {
      try {
        if (endMark) {
          performance.measure(name, startMark, endMark);
        } else {
          performance.measure(name, startMark);
        }

        // Get the measure
        const measures = performance.getEntriesByName(name, 'measure');
        if (measures.length > 0) {
          const duration = measures[measures.length - 1].duration;

          if (process.env.NODE_ENV === 'development') {
            console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
          }

          return duration;
        }
      } catch (error) {
        console.error('Performance measure failed:', error);
      }
    }
    return null;
  }

  /**
   * Clear performance marks.
   *
   * @param {string} name - Mark name (optional, clears all if not provided)
   */
  static clearMarks(name) {
    if (performance && performance.clearMarks) {
      performance.clearMarks(name);
    }
  }

  /**
   * Clear performance measures.
   *
   * @param {string} name - Measure name (optional, clears all if not provided)
   */
  static clearMeasures(name) {
    if (performance && performance.clearMeasures) {
      performance.clearMeasures(name);
    }
  }

  /**
   * Get all performance entries.
   */
  static getEntries() {
    if (performance && performance.getEntries) {
      return performance.getEntries();
    }
    return [];
  }
}

/**
 * Track API request performance.
 */
export class APIPerformanceTracker {
  static trackRequest(url, method = 'GET') {
    const startTime = performance.now();

    return {
      end: (status, size = 0) => {
        const duration = performance.now() - startTime;

        if (process.env.NODE_ENV === 'development') {
          console.log(`[API] ${method} ${url}: ${duration.toFixed(2)}ms (${status})`);
        }

        // Send to analytics
        if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true') {
          fetch('/api/analytics/api-performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url,
              method,
              status,
              duration,
              size,
              timestamp: Date.now(),
            }),
          }).catch(() => {
            // Silently fail for analytics
          });
        }

        return duration;
      },
    };
  }
}

/**
 * Monitor long tasks (> 50ms).
 */
export const observeLongTasks = () => {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Long Task]', entry.duration.toFixed(2), 'ms', entry);
          }

          // Send to analytics if task is very long (> 100ms)
          if (entry.duration > 100 && process.env.REACT_APP_ENABLE_ANALYTICS === 'true') {
            fetch('/api/analytics/long-task', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                duration: entry.duration,
                startTime: entry.startTime,
                timestamp: Date.now(),
              }),
            }).catch(() => {});
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // Long Task API not supported
      console.log('Long Task monitoring not available');
    }
  }
};

/**
 * Initialize performance monitoring.
 */
export const initPerformanceMonitoring = () => {
  // Report Web Vitals
  reportWebVitals(sendToAnalytics);

  // Observe long tasks
  observeLongTasks();

  // Log performance on page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData && process.env.NODE_ENV === 'development') {
        console.log('[Performance] Page Load Metrics:');
        console.log('  DNS:', perfData.domainLookupEnd - perfData.domainLookupStart, 'ms');
        console.log('  TCP:', perfData.connectEnd - perfData.connectStart, 'ms');
        console.log('  Request:', perfData.responseStart - perfData.requestStart, 'ms');
        console.log('  Response:', perfData.responseEnd - perfData.responseStart, 'ms');
        console.log('  DOM Processing:', perfData.domComplete - perfData.domInteractive, 'ms');
        console.log('  Total Load Time:', perfData.loadEventEnd - perfData.fetchStart, 'ms');
      }
    }, 0);
  });
};

export default {
  reportWebVitals,
  sendToAnalytics,
  PerformanceTracker,
  APIPerformanceTracker,
  observeLongTasks,
  initPerformanceMonitoring,
};

/**
 * Google Analytics 4 (GA4) Integration for Entlq / Bakalorya SPA
 * 
 * To connect your Google Analytics account:
 * 1. Go to https://analytics.google.com and create/open your GA4 property.
 * 2. In Admin > Data Streams > Web, copy your Measurement ID (formatted like: G-XXXXXXXXXX).
 * 3. Replace 'G-XXXXXXXXXX' below with your actual Measurement ID.
 */

export const GA_MEASUREMENT_ID = "G-QNS1XZVH6Q";

/**
 * Initializes Google Analytics gtag.js script dynamically if not already in document
 */
export function initGoogleAnalytics() {
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === "G-XXXXXXXXXX") {
    // Measurement ID not configured yet; runs in standby mode
    return;
  }

  // Ensure dataLayer and gtag function are defined
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
  }

  // Check if gtag script is already added
  const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`);
  if (!existingScript) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, {
      send_page_view: false // SPA will send page_view on every route transition
    });
  }
}

/**
 * Tracks a virtual page view for Single Page Application (SPA) navigation
 * @param {string} pageTitle Page title
 * @param {string} pagePath Route path or hash (e.g. #courses, #teachers)
 */
export function trackPageView(pageTitle, pagePath) {
  if (typeof window.gtag !== "function") return;

  const currentPath = pagePath || window.location.hash || "/";
  window.gtag("event", "page_view", {
    page_title: pageTitle || document.title,
    page_location: window.location.href,
    page_path: currentPath
  });
}

/**
 * Tracks a custom event in Google Analytics
 * @param {string} eventName Event name (e.g. 'sign_up', 'login', 'course_enroll')
 * @param {object} eventParams Extra parameters
 */
export function trackEvent(eventName, eventParams = {}) {
  if (typeof window.gtag !== "function") return;

  window.gtag("event", eventName, eventParams);
}

// Expose globally for convenience
if (typeof window !== "undefined") {
  window.trackGAEvent = trackEvent;
}

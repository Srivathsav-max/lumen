import DOMPurify from 'isomorphic-dompurify';
import { v4 as uuidv4 } from 'uuid';

interface SecurityConfig {
  csrf: {
    enabled: boolean;
    tokenHeaderName: string;
    tokenFieldName: string;
    cookieName: string;
  };
  xss: {
    enabled: boolean;
    sanitizeInput: boolean;
    allowedTags: string[];
    allowedAttributes: string[];
  };
  fingerprinting: {
    enabled: boolean;
    collectBrowserData: boolean;
  };
  csp: {
    enabled: boolean;
    reportUri?: string;
  };
}

const DEFAULT_CONFIG: SecurityConfig = {
  csrf: {
    enabled: true,
    tokenHeaderName: 'X-CSRF-Token',
    tokenFieldName: 'csrf_token',
    cookieName: 'csrf_token',
  },
  xss: {
    enabled: true,
    sanitizeInput: true,
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'i', 'b', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
    allowedAttributes: ['href', 'title', 'alt', 'class', 'id'],
  },
  fingerprinting: {
    enabled: true,
    collectBrowserData: true,
  },
  csp: {
    enabled: true,
    reportUri: '/api/v1/security/csp-report',
  },
};

class SecurityService {
  private config: SecurityConfig;
  private csrfToken: string | null = null;
  private sessionFingerprint: string | null = null;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }

  /**
   * Initialize security service
   */
  private initialize(): void {
    if (typeof window === 'undefined') return;

    // Initialize CSRF protection
    if (this.config.csrf.enabled) {
      this.initializeCSRF();
    }

    // Initialize fingerprinting
    if (this.config.fingerprinting.enabled) {
      this.generateFingerprint();
    }

    // Initialize CSP violation reporting
    if (this.config.csp.enabled && this.config.csp.reportUri) {
      this.initializeCSPReporting();
    }

    // Set up security event listeners
    this.setupSecurityEventListeners();
  }

  /**
   * CSRF Protection Methods
   */

  // Initialize CSRF token
  private initializeCSRF(): void {
    this.loadCSRFToken();
    
    // If no token exists, request one from the server
    if (!this.csrfToken) {
      this.requestCSRFToken();
    }
  }

  // Load CSRF token from cookie
  private loadCSRFToken(): void {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.config.csrf.cookieName && value) {
        this.csrfToken = decodeURIComponent(value);
        break;
      }
    }
  }

  // Request CSRF token from server
  private async requestCSRFToken(): Promise<void> {
    try {
      const response = await fetch('http://localhost:8080/api/v1/security/csrf-token', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.csrfToken = data.csrf_token;
        console.log('CSRF token obtained successfully');
      }
    } catch (error) {
      console.error('Failed to obtain CSRF token:', error);
    }
  }

  // Get CSRF token for requests
  public getCSRFToken(): string | null {
    return this.csrfToken;
  }

  // Add CSRF token to request headers
  public addCSRFToHeaders(headers: Record<string, string> = {}): Record<string, string> {
    if (this.config.csrf.enabled && this.csrfToken) {
      headers[this.config.csrf.tokenHeaderName] = this.csrfToken;
    }
    return headers;
  }

  // Add CSRF token to form data
  public addCSRFToFormData(formData: FormData): FormData {
    if (this.config.csrf.enabled && this.csrfToken) {
      formData.append(this.config.csrf.tokenFieldName, this.csrfToken);
    }
    return formData;
  }

  /**
   * XSS Prevention Methods
   */

  // Sanitize HTML content
  public sanitizeHTML(html: string): string {
    if (!this.config.xss.enabled) {
      return html;
    }

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: this.config.xss.allowedTags,
      ALLOWED_ATTR: this.config.xss.allowedAttributes,
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'textarea'],
    });
  }

  // Sanitize user input
  public sanitizeInput(input: string): string {
    if (!this.config.xss.sanitizeInput) {
      return input;
    }

    // Basic XSS prevention
    return input
      .replace(/[<>]/g, (match) => {
        const escapeMap: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
        };
        return escapeMap[match] || match;
      })
      .replace(/javascript:/gi, 'javascript-blocked:')
      .replace(/vbscript:/gi, 'vbscript-blocked:')
      .replace(/on\w+\s*=/gi, 'on-event-blocked=');
  }

  // Sanitize JSON data recursively
  public sanitizeJSON(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeInput(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeJSON(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const sanitizedKey = this.sanitizeInput(key);
        sanitized[sanitizedKey] = this.sanitizeJSON(value);
      }
      return sanitized;
    }
    
    return data;
  }

  // Validate input for XSS threats
  public validateInput(input: string): { valid: boolean; threats: string[] } {
    const threats: string[] = [];
    
    // Check for script tags
    if (/<script[^>]*>/i.test(input)) {
      threats.push('script_tag');
    }
    
    // Check for javascript protocol
    if (/javascript:/i.test(input)) {
      threats.push('javascript_protocol');
    }
    
    // Check for event handlers
    if (/on\w+\s*=/i.test(input)) {
      threats.push('event_handler');
    }
    
    // Check for iframe tags
    if (/<iframe[^>]*>/i.test(input)) {
      threats.push('iframe_tag');
    }
    
    // Check for data URLs with HTML
    if (/data:text\/html/i.test(input)) {
      threats.push('data_url_html');
    }
    
    return {
      valid: threats.length === 0,
      threats,
    };
  }

  /**
   * Browser Fingerprinting Methods
   */

  // Generate browser fingerprint
  private generateFingerprint(): void {
    if (!this.config.fingerprinting.collectBrowserData) {
      this.sessionFingerprint = uuidv4();
      return;
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage,
      !!window.indexedDB,
      typeof (window as any).openDatabase,
      (navigator as any).cpuClass || 'unknown',
      navigator.platform,
      navigator.doNotTrack || 'unknown',
    ].join('|');

    // Create hash of fingerprint data
    this.sessionFingerprint = this.simpleHash(fingerprint);
  }

  // Get session fingerprint
  public getFingerprint(): string | null {
    return this.sessionFingerprint;
  }

  /**
   * Secure API Request Methods
   */

  // Make secure API request with all security headers
  public async secureRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    
    // Add CSRF token
    if (this.config.csrf.enabled && this.csrfToken) {
      headers.set(this.config.csrf.tokenHeaderName, this.csrfToken);
    }
    
    // Add fingerprint
    if (this.sessionFingerprint) {
      headers.set('X-Browser-Fingerprint', this.sessionFingerprint);
    }
    
    // Add request ID for tracking
    const requestId = uuidv4();
    headers.set('X-Request-ID', requestId);
    
    // Ensure credentials are included
    const secureOptions: RequestInit = {
      ...options,
      headers,
      credentials: 'include',
    };
    
    // Sanitize request body if it's JSON
    if (secureOptions.body && headers.get('Content-Type')?.includes('application/json')) {
      try {
        const jsonData = JSON.parse(secureOptions.body as string);
        const sanitizedData = this.sanitizeJSON(jsonData);
        secureOptions.body = JSON.stringify(sanitizedData);
      } catch (error) {
        console.warn('Failed to sanitize request body:', error);
      }
    }
    
    console.log('Making secure request:', {
      url,
      method: secureOptions.method || 'GET',
      hasCSRF: !!this.csrfToken,
      hasFingerprint: !!this.sessionFingerprint,
      requestId,
    });
    
    return fetch(url, secureOptions);
  }

  /**
   * Security Event Handling
   */

  // Set up security event listeners
  private setupSecurityEventListeners(): void {
    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', (event) => {
      this.handleCSPViolation(event as SecurityPolicyViolationEvent);
    });
    
    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection (potential security issue):', event.reason);
    });
    
    // Monitor for potential XSS attempts
    this.setupXSSMonitoring();
  }

  // Handle CSP violations
  private handleCSPViolation(event: SecurityPolicyViolationEvent): void {
    const violation = {
      blockedURI: event.blockedURI,
      documentURI: event.documentURI,
      violatedDirective: event.violatedDirective,
      originalPolicy: event.originalPolicy,
      disposition: event.disposition,
      timestamp: Date.now(),
    };
    
    console.warn('CSP Violation detected:', violation);
    
    // Report to server if reporting is enabled
    if (this.config.csp.reportUri) {
      this.reportCSPViolation(violation);
    }
  }

  // Report CSP violation to server
  private async reportCSPViolation(violation: any): Promise<void> {
    try {
      await this.secureRequest(this.config.csp.reportUri!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(violation),
      });
    } catch (error) {
      console.error('Failed to report CSP violation:', error);
    }
  }

  // Set up XSS monitoring
  private setupXSSMonitoring(): void {
    // Monitor DOM mutations for suspicious content
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                this.scanElementForXSS(node as Element);
              }
            });
          }
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  // Scan element for XSS threats
  private scanElementForXSS(element: Element): void {
    // Check for suspicious attributes
    const suspiciousAttributes = ['onload', 'onerror', 'onclick', 'onmouseover'];
    
    suspiciousAttributes.forEach(attr => {
      if (element.hasAttribute(attr)) {
        console.warn('Suspicious attribute detected:', attr, element);
        element.removeAttribute(attr);
      }
    });
    
    // Check for script tags
    if (element.tagName.toLowerCase() === 'script') {
      console.warn('Script tag detected in DOM mutation:', element);
      element.remove();
    }
  }

  /**
   * Initialize CSP reporting
   */
  private initializeCSPReporting(): void {
    // Add CSP report endpoint to document if not already present
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy-Report-Only';
      meta.content = `default-src 'self'; report-uri ${this.config.csp.reportUri}`;
      document.head.appendChild(meta);
    }
  }

  /**
   * Utility Methods
   */

  // Simple hash function for fingerprinting
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Update configuration
  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  public getConfig(): SecurityConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const securityService = new SecurityService();
export default securityService;
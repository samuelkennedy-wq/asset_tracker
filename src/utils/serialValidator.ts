/**
 * Serial Number & Barcode Scan Validation Rule Engine
 * Enforces strict rule: Web URLs, HTTP/HTTPS links, and non-serial strings are not allowed.
 * Automatically cleans single URLs into raw CPU serial numbers, or blocks invalid URL entries.
 */

export interface SerialValidationResult {
  isValid: boolean;
  cleanSerial: string;
  error?: string;
  wasExtractedFromUrl?: boolean;
}

export function validateAndCleanSerial(input: string): SerialValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      cleanSerial: '',
      error: 'Empty scan entry. Please scan a valid CPU serial number tag.',
    };
  }

  const raw = input.trim();
  if (!raw) {
    return {
      isValid: false,
      cleanSerial: '',
      error: 'Empty scan entry.',
    };
  }

  // Detect presence of URL protocols, web domains, hostnames, or web link patterns
  const hasHttp = /https?:\/\//i.test(raw);
  const hasDomainPattern = /(www\.|247\.ai|\.com|\.org|\.net|\.io|\.ai|\/hardware\/|\/app\/|localhost)/i.test(raw);
  const isHostnamePattern = /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\.[a-zA-Z]{2,}$/i.test(raw);
  const httpOccurrences = (raw.match(/https?:\/\//gi) || []).length;

  // Rule 1: Strict rejection of URLs, Hostnames, and Web Links
  if (hasHttp || hasDomainPattern || isHostnamePattern || httpOccurrences > 0) {
    // If there is a clean serial segment at the end of a URL path (e.g. ".../LP100079448")
    const segments = raw.split(/[\/\?#=]/).map(s => s.trim()).filter(Boolean);
    const lastSeg = segments.pop() || '';
    const cleanCandidate = lastSeg.replace(/[^A-Za-z0-9\-_]/g, '').toUpperCase();

    // If clean serial candidate exists at end of URL
    if (
      cleanCandidate &&
      cleanCandidate.length >= 4 &&
      !/HTTP|HTTPS|WWW|HARDWARE|LOCALHOST|247|GMA|APP|COM|NET|ORG/i.test(cleanCandidate)
    ) {
      return {
        isValid: true,
        cleanSerial: cleanCandidate,
        wasExtractedFromUrl: true,
      };
    }

    return {
      isValid: false,
      cleanSerial: '',
      error: `URL / HOSTNAME BLOCKED: Scanning web links, URLs, or hostnames ("${raw.substring(0, 30)}...") is strictly prohibited. Please scan physical CPU Serial Numbers (e.g. 178963, LP100079448) instead.`,
    };
  }

  // Rule 3: Pure Serial Number validation (Alphanumeric, dashes, underscores)
  // Must not contain invalid URL symbols or slashes
  if (/[\/\?#\\:]/.test(raw)) {
    return {
      isValid: false,
      cleanSerial: '',
      error: `INVALID FORMAT: Scan contains illegal characters or slashes ("${raw}"). Only clean CPU Serial Numbers are permitted.`,
    };
  }

  const cleanVal = raw.replace(/[^A-Za-z0-9\-_]/g, '').toUpperCase();
  if (!cleanVal || cleanVal.length < 2) {
    return {
      isValid: false,
      cleanSerial: '',
      error: 'INVALID SERIAL NUMBER: CPU serial must be at least 2 alphanumeric characters.',
    };
  }

  return {
    isValid: true,
    cleanSerial: cleanVal,
  };
}

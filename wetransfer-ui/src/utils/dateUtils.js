/**
 * Date utility functions for consistent GMT/UTC time display
 */

/**
 * Format a date in GMT/UTC timezone using date-fns format
 * @param {Date|string} date - Date to format
 * @param {string} formatStr - Format string (date-fns format)
 * @returns {string} Formatted date string in GMT
 */
export const formatInGMT = (date, formatStr = 'PPP p') => {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';

    // Create formatter for UTC timezone
    const options = {};

    // Map common date-fns formats to Intl.DateTimeFormat options
    if (formatStr.includes('PPP') && formatStr.includes('p')) {
        // Full date + time: "January 6, 2026 at 8:38 AM"
        options.dateStyle = 'long';
        options.timeStyle = 'short';
    } else if (formatStr === 'PPP') {
        // Full date: "January 6, 2026"
        options.dateStyle = 'long';
    } else if (formatStr === 'PP') {
        // Medium date: "Jan 6, 2026"
        options.dateStyle = 'medium';
    } else if (formatStr === 'p') {
        // Time only: "8:38 AM"
        options.timeStyle = 'short';
    } else if (formatStr === 'MMM d, p') {
        // "Jan 6, 8:38 AM"
        options.month = 'short';
        options.day = 'numeric';
        options.hour = 'numeric';
        options.minute = '2-digit';
    } else if (formatStr === 'MMM d') {
        // "Jan 6"
        options.month = 'short';
        options.day = 'numeric';
    } else {
        // Default to medium date + short time
        options.dateStyle = 'medium';
        options.timeStyle = 'short';
    }

    options.timeZone = 'UTC';

    return new Intl.DateTimeFormat('en-US', options).format(d);
};

/**
 * Format a date for datetime-local input in GMT
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted string for datetime-local input (YYYY-MM-DDTHH:MM)
 */
export const toGMTDateTimeLocal = (date) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    // Get UTC components
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Parse a datetime-local value as GMT and return ISO string
 * @param {string} datetimeLocal - Value from datetime-local input
 * @returns {string} ISO 8601 string in UTC
 */
export const fromGMTDateTimeLocal = (datetimeLocal) => {
    if (!datetimeLocal) return '';
    // datetime-local format: "YYYY-MM-DDTHH:MM"
    // Append 'Z' to treat it as UTC
    return new Date(datetimeLocal + ':00.000Z').toISOString();
};

/**
 * Get current GMT time formatted for datetime-local input
 * @returns {string} Formatted string for datetime-local input
 */
export const getCurrentGMTDateTimeLocal = () => {
    return toGMTDateTimeLocal(new Date());
};

/**
 * Get a future date in GMT formatted for datetime-local input
 * @param {number} days - Number of days to add
 * @returns {string} Formatted string for datetime-local input
 */
export const getFutureGMTDateTimeLocal = (days = 7) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    return toGMTDateTimeLocal(d);
};

/**
 * Format distance to now in GMT context
 * This is a wrapper that doesn't change behavior since formatDistanceToNow
 * already works correctly with UTC dates
 */
export { formatDistanceToNow } from 'date-fns';

/**
 * Check if a date is after another date
 */
export { isAfter } from 'date-fns';

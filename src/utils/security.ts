/**
 * Clean user text input to prevent XSS (HTML escaping)
 */
export function sanitizeHTML(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Filter out common prompt injection vectors
 */
export function containsPromptInjection(input: string): boolean {
  if (!input) return false;
  
  const lowerInput = input.toLowerCase();
  
  const injectionPatterns = [
    'ignore previous instructions',
    'ignore all previous',
    'system prompt',
    'you are now',
    'bypass security',
    'override configuration',
    'new role',
    'forget what I said',
    'do not follow the rules',
    'act as a'
  ];

  return injectionPatterns.some(pattern => lowerInput.includes(pattern));
}

/**
 * Safely parse numbers to avoid NaN or negative values
 */
export function safeParseNumber(value: string | number, defaultValue = 0): number {
  if (value === undefined || value === null || value === '') return defaultValue;
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return defaultValue;
  return Math.max(0, num); // Grid constraints require positive logs
}

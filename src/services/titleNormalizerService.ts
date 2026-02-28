
// Job title normalization patterns
export interface TitlePattern {
  pattern: RegExp;
  normalizedTitle: string;
}

export const titlePatterns: Record<string, TitlePattern[]> = {
  "Founder": [
    { pattern: /\b(ceo|chief\s*exec|founder|owner)\b/i, normalizedTitle: "Founder" },
    { pattern: /\b(co-founder|cofounder)\b/i, normalizedTitle: "Co-Founder" }
  ],
  "CTO": [
    { pattern: /\b(cto|chief\s*tech|head\s*of\s*tech|vp\s*of\s*tech|tech\s*lead)\b/i, normalizedTitle: "CTO" }
  ],
  "CMO": [
    { pattern: /\b(cmo|chief\s*market|head\s*of\s*market|vp\s*of\s*market|market.*lead|market.*director)\b/i, normalizedTitle: "CMO" }
  ],
  "Sales": [
    { pattern: /\b(vp\s*of\s*sales|sales\s*director|head\s*of\s*sales|sales\s*manager)\b/i, normalizedTitle: "Sales Director" },
    { pattern: /\b(account\s*exec|sales\s*rep|business\s*dev|bdr|sdr)\b/i, normalizedTitle: "Sales Rep" }
  ],
  "Engineering": [
    { pattern: /\b(software\s*eng|developer|programmer|coder|full.*stack|front.*end|back.*end)\b/i, normalizedTitle: "Engineer" },
    { pattern: /\b(eng\s*manager|lead\s*eng|head\s*of\s*eng|director\s*of\s*eng)\b/i, normalizedTitle: "Engineering Manager" }
  ],
  "Product": [
    { pattern: /\b(product\s*manager|pm|product\s*owner)\b/i, normalizedTitle: "Product Manager" },
    { pattern: /\b(dir.*product|vp.*product|head.*product)\b/i, normalizedTitle: "Product Director" }
  ],
  "HR": [
    { pattern: /\b(hr\s*manager|human\s*resource|talent|recruiter|hiring)\b/i, normalizedTitle: "HR" }
  ]
};

export const normalizeTitle = (title: string): string => {
  if (!title) return "";
  
  // Check each category
  for (const [category, patterns] of Object.entries(titlePatterns)) {
    for (const { pattern, normalizedTitle } of patterns) {
      if (pattern.test(title)) {
        return normalizedTitle;
      }
    }
  }
  
  // If no match, return original with proper casing
  return title.trim();
};

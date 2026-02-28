
export interface ICPCriteria {
  field: string;
  weight: number;
  keywords?: string[];
  ranges?: {min: number; max: number; score: number}[];
  locations?: {region: string; score: number}[];
}

export interface ICPConfig {
  jobTitle: ICPCriteria;
  industry: ICPCriteria;
  revenue: ICPCriteria;
  location: ICPCriteria;
  techStack: ICPCriteria;
}

// Default ICP configuration
export const defaultICPConfig: ICPConfig = {
  jobTitle: {
    field: "job_title",
    weight: 25,
    keywords: ["founder", "ceo", "cto", "coo", "cio", "cfo", "vp", "director", "head", "manager"]
  },
  industry: {
    field: "industry",
    weight: 25,
    keywords: ["technology", "software", "saas", "fintech", "healthcare", "education", "ecommerce"]
  },
  revenue: {
    field: "revenue",
    weight: 20,
    ranges: [
      {min: 10000000, max: 100000000, score: 100},
      {min: 1000000, max: 10000000, score: 80},
      {min: 100000, max: 1000000, score: 60},
      {min: 0, max: 100000, score: 40}
    ]
  },
  location: {
    field: "location",
    weight: 15,
    locations: [
      {region: "usa", score: 100},
      {region: "canada", score: 90},
      {region: "europe", score: 80},
      {region: "uk", score: 80},
      {region: "australia", score: 70},
      {region: "asia", score: 60}
    ]
  },
  techStack: {
    field: "tech_stack",
    weight: 15,
    keywords: ["aws", "google cloud", "azure", "react", "nodejs", "python", "salesforce", "hubspot", "shopify"]
  }
};

// Calculate ICP score based on contact data and configuration
export const calculateICPScore = (
  contact: Record<string, string>, 
  config: ICPConfig = defaultICPConfig,
  enabledCriteria: string[] = ["jobTitle", "industry", "revenue", "location", "techStack"]
): number => {
  let totalScore = 0;
  let totalWeight = 0;
  
  // Process each enabled criteria
  Object.entries(config).forEach(([key, criteria]) => {
    // Skip if not enabled
    if (!enabledCriteria.includes(key)) return;
    
    const fieldValue = contact[criteria.field];
    if (!fieldValue) return;
    
    totalWeight += criteria.weight;
    let criteriaScore = 0;
    
    // Score based on keywords
    if (criteria.keywords) {
      const matches = criteria.keywords.filter(keyword => 
        fieldValue.toLowerCase().includes(keyword.toLowerCase())
      );
      criteriaScore = matches.length > 0 ? 100 : 0;
    }
    
    // Score based on numeric ranges (for revenue)
    else if (criteria.ranges) {
      const numericValue = parseFloat(fieldValue.replace(/[^0-9.]/g, ''));
      if (!isNaN(numericValue)) {
        const matchingRange = criteria.ranges.find(
          range => numericValue >= range.min && numericValue <= range.max
        );
        criteriaScore = matchingRange ? matchingRange.score : 0;
      }
    }
    
    // Score based on location
    else if (criteria.locations) {
      const matchingLocation = criteria.locations.find(location =>
        fieldValue.toLowerCase().includes(location.region.toLowerCase())
      );
      criteriaScore = matchingLocation ? matchingLocation.score : 0;
    }
    
    totalScore += (criteriaScore * criteria.weight);
  });
  
  // Normalize to 0-100 scale
  return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
};

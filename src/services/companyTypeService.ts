
export enum CompanyType {
  B2B = "B2B",
  B2C = "B2C",
  B2B2C = "B2B2C",
  C2C = "C2C",
  C2B = "C2B",
  UNKNOWN = "Unknown"
}

// Keywords that indicate company type
const companyTypeKeywords: Record<CompanyType, string[]> = {
  [CompanyType.B2B]: [
    "enterprise", "business solutions", "b2b", "for businesses", "corporate", 
    "saas", "software-as-a-service", "cloud services", "api", "business tools",
    "procurement", "supply chain", "wholesale", "industry", "industrial",
    "business intelligence", "professional services", "vendor", "supplier"
  ],
  [CompanyType.B2C]: [
    "consumer", "retail", "direct-to-consumer", "d2c", "b2c", "customers", 
    "shop", "shopping", "marketplace", "ecommerce", "app store", "play store",
    "lifestyle", "personal", "individual", "home delivery", "subscription box"
  ],
  [CompanyType.B2B2C]: [
    "b2b2c", "platform", "marketplace", "saas platform", "enablement", 
    "white-label", "api platform", "infrastructure", "payment processing"
  ],
  [CompanyType.C2C]: [
    "peer-to-peer", "p2p", "c2c", "community marketplace", "sharing economy", 
    "user-generated", "user listings", "classified ads", "secondhand"
  ],
  [CompanyType.C2B]: [
    "c2b", "reverse auction", "consumer-to-business", "user feedback", 
    "freelance", "gig economy", "influencer"
  ],
  [CompanyType.UNKNOWN]: []
};

// Score company description to determine type
export const detectCompanyType = (
  description: string = "", 
  industry: string = "", 
  keywords: string = ""
): CompanyType => {
  if (!description && !industry && !keywords) {
    return CompanyType.UNKNOWN;
  }
  
  // Combine all text fields
  const combinedText = `${description} ${industry} ${keywords}`.toLowerCase();
  
  // Calculate scores for each type
  const scores = Object.entries(companyTypeKeywords).reduce((acc, [type, keywordList]) => {
    if (type === CompanyType.UNKNOWN) return acc;
    
    let score = 0;
    keywordList.forEach(keyword => {
      if (combinedText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });
    
    acc[type as CompanyType] = score;
    return acc;
  }, {} as Record<CompanyType, number>);
  
  // Find highest scoring type
  let highestScore = 0;
  let detectedType = CompanyType.UNKNOWN;
  
  Object.entries(scores).forEach(([type, score]) => {
    if (score > highestScore) {
      highestScore = score;
      detectedType = type as CompanyType;
    }
  });
  
  return detectedType;
};

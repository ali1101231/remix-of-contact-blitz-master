
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import { useProcessedData } from "@/hooks/useProcessedData";

const CompanyServiceFinder: React.FC = () => {
  const { processedData, setProcessedData } = useProcessedData();
  const [descriptionField, setDescriptionField] = useState<string>("");
  const [websiteContentField, setWebsiteContentField] = useState<string>("");
  const [useWebsiteContent, setUseWebsiteContent] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultData, setResultData] = useState<ProcessedData | null>(null);
  const { toast } = useToast();

  // Common service/product categories
  const serviceCategories = [
    { name: "Software Development", keywords: ["software development", "app development", "web development", "software engineer"] },
    { name: "IT Services", keywords: ["IT services", "IT consulting", "technical support", "managed services", "cloud services"] },
    { name: "Marketing", keywords: ["marketing", "advertising", "branding", "campaigns", "promotion"] },
    { name: "SEO", keywords: ["SEO", "search engine optimization", "search ranking", "keyword optimization"] },
    { name: "Content Creation", keywords: ["content creation", "content marketing", "copywriting", "content writing"] },
    { name: "Social Media", keywords: ["social media", "social marketing", "Facebook", "Instagram", "Twitter", "LinkedIn"] },
    { name: "E-commerce", keywords: ["e-commerce", "online store", "online shopping", "e-shop", "webshop"] },
    { name: "Financial Services", keywords: ["financial services", "accounting", "bookkeeping", "tax", "investment"] },
    { name: "Legal Services", keywords: ["legal services", "law firm", "attorney", "lawyer", "legal counsel"] },
    { name: "Healthcare", keywords: ["healthcare", "medical", "clinical", "patient", "hospital", "health"] },
    { name: "Education", keywords: ["education", "learning", "teaching", "training", "courses", "e-learning"] },
    { name: "Manufacturing", keywords: ["manufacturing", "production", "factory", "assembly", "industrial"] },
    { name: "Real Estate", keywords: ["real estate", "property", "housing", "apartments", "commercial space"] },
    { name: "Hospitality", keywords: ["hospitality", "hotel", "restaurant", "travel", "tourism", "accommodation"] },
    { name: "Consulting", keywords: ["consulting", "consultancy", "advisor", "business advisor", "strategy"] },
    { name: "HR Services", keywords: ["HR", "human resources", "recruiting", "staffing", "talent acquisition"] },
    { name: "Logistics", keywords: ["logistics", "shipping", "delivery", "transportation", "supply chain"] },
    { name: "Security", keywords: ["security", "protection", "cybersecurity", "surveillance", "guards"] },
    { name: "Construction", keywords: ["construction", "building", "contractors", "renovation", "remodeling"] },
    { name: "Design", keywords: ["design", "graphic design", "UI/UX", "web design", "interior design"] },
    { name: "Telecommunications", keywords: ["telecommunications", "telecom", "phone service", "internet service"] },
    { name: "Energy", keywords: ["energy", "power", "electricity", "gas", "renewable energy", "solar"] },
    { name: "Insurance", keywords: ["insurance", "coverage", "policy", "risk management", "protection"] },
  ];

  const findCompanyService = (text: string): string => {
    if (!text) return "Unknown";
    
    const lowercaseText = text.toLowerCase();
    
    // Count occurrences of keywords for each category
    const categoryCounts = serviceCategories.map(category => {
      const count = category.keywords.reduce((sum, keyword) => {
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
        const matches = lowercaseText.match(regex);
        return sum + (matches ? matches.length : 0);
      }, 0);
      
      return { name: category.name, count };
    });
    
    // Sort categories by occurrence count
    categoryCounts.sort((a, b) => b.count - a.count);
    
    // Return the most frequent category if it has any matches
    if (categoryCounts[0].count > 0) {
      return categoryCounts[0].name;
    }
    
    // Check for common phrases that might indicate the service
    if (lowercaseText.includes("we provide") || lowercaseText.includes("we offer")) {
      // Extract text after these phrases to try to identify the service
      const provideMatch = lowercaseText.match(/we provide\s+([^.!?]+)/i);
      const offerMatch = lowercaseText.match(/we offer\s+([^.!?]+)/i);
      
      if (provideMatch && provideMatch[1]) {
        return provideMatch[1].trim().slice(0, 50) + "...";
      } else if (offerMatch && offerMatch[1]) {
        return offerMatch[1].trim().slice(0, 50) + "...";
      }
    }
    
    return "Unknown Service";
  };

  const handleFind = async () => {
    if (!processedData || (!descriptionField && !useWebsiteContent) || 
        (useWebsiteContent && !websiteContentField)) {
      toast({
        title: "Missing information",
        description: "Please select at least one data source (description or website content)",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    const totalRows = processedData.rows.length;
    const updatedRows = processedData.rows.map((row, index) => {
      // Get description and website content
      const description = descriptionField ? row[descriptionField] || "" : "";
      const websiteContent = useWebsiteContent && websiteContentField ? row[websiteContentField] || "" : "";
      
      // Combine both sources if both are selected
      const combinedText = descriptionField && useWebsiteContent && websiteContentField
        ? `${description} ${websiteContent}`
        : description || websiteContent;
      
      // Find company service
      const service = findCompanyService(combinedText);
      
      // Update progress
      setProgress(Math.floor(((index + 1) / totalRows) * 100));
      
      return {
        ...row,
        "Company Service": service
      };
    });

    const resultData: ProcessedData = {
      ...processedData,
      headers: [...new Set([...processedData.headers, "Company Service"])],
      rows: updatedRows,
      fileName: `${processedData.fileName}-with-services`
    };

    setResultData(resultData);
    setProcessedData(resultData);
    setIsProcessing(false);

    toast({
      title: "Company services identified",
      description: `Analyzed ${totalRows} companies and identified their services/products.`,
    });
  };

  const handleDownload = () => {
    if (!resultData) return;
    
    // Convert to CSV
    const headers = resultData.headers.join(',');
    const rows = resultData.rows.map(row => 
      resultData.headers.map(header => 
        `"${(row[header] || "").replace(/"/g, '""')}"`
      ).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${resultData.fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Company Service Finder</CardTitle>
        <CardDescription>
          Identify the primary service or product that a company provides
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Analyzing companies and identifying services...
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Progress: {progress}%
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Company Description Field</Label>
              <Select 
                value={descriptionField} 
                onValueChange={setDescriptionField}
                disabled={(useWebsiteContent && websiteContentField) ? false : false}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field with company descriptions" />
                </SelectTrigger>
                <SelectContent>
                  {processedData?.headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 py-2">
              <Checkbox 
                id="useWebsiteContent" 
                checked={useWebsiteContent} 
                onCheckedChange={(checked) => setUseWebsiteContent(checked as boolean)}
              />
              <Label htmlFor="useWebsiteContent">Also use website content (if available)</Label>
            </div>

            {useWebsiteContent && (
              <div className="space-y-2">
                <Label>Select Website Content Field</Label>
                <Select value={websiteContentField} onValueChange={setWebsiteContentField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field with website content" />
                  </SelectTrigger>
                  <SelectContent>
                    {processedData?.headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-4">
              <Button 
                onClick={handleFind}
                disabled={!processedData || (!descriptionField && !websiteContentField)}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Find Company Services
              </Button>

              {resultData && (
                <Button 
                  variant="outline" 
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Results
                </Button>
              )}
            </div>

            {resultData && (
              <div className="border rounded-md p-4 mt-4">
                <h3 className="font-medium mb-2">Sample Results (First 5 rows)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service/Product</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {resultData.rows.slice(0, 5).map((row, index) => {
                        const companyField = processedData.source === 'Clay' ? 'company' : 'company_name';
                        const company = row[companyField] || row["cleaned_company_name"] || "Unknown";
                        
                        return (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-700">
                              {company}
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {row["Company Service"]}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompanyServiceFinder;

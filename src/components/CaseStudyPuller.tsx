
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import { useProcessedData } from "@/hooks/useProcessedData";

const CaseStudyPuller: React.FC = () => {
  const { processedData, setProcessedData } = useProcessedData();
  const [descriptionField, setDescriptionField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultData, setResultData] = useState<ProcessedData | null>(null);
  const { toast } = useToast();

  // Common companies that might be mentioned in case studies
  const knownCompanies = [
    "Google", "Microsoft", "Apple", "Amazon", "Facebook", "Meta", "IBM", "Oracle", "SAP", "Salesforce", 
    "Adobe", "Cisco", "Intel", "Dell", "HP", "Lenovo", "Samsung", "Sony", "LG", "Panasonic", 
    "BMW", "Mercedes", "Toyota", "Ford", "Tesla", "Uber", "Lyft", "Airbnb", "Netflix", "Spotify", 
    "Walmart", "Target", "Starbucks", "McDonald's", "Coca-Cola", "Pepsi", "Adidas", "Nike", "JPMorgan", "Goldman Sachs"
  ];

  const extractCaseStudyCompany = (text: string): string => {
    if (!text) return "N/A";
    
    // Look for case study mentions followed by company names
    const caseStudyPatterns = [
      /case stud(?:y|ies) (?:with|for) ([A-Z][a-zA-Z0-9\s]+)/i,
      /work(?:s|ed|ing) with ([A-Z][a-zA-Z0-9\s]+)/i,
      /client(?:s)? (?:like|such as|including) ([A-Z][a-zA-Z0-9\s]+)/i,
      /success (?:story|stories) (?:with|for) ([A-Z][a-zA-Z0-9\s]+)/i,
      /partner(?:s|ed|ship) with ([A-Z][a-zA-Z0-9\s]+)/i,
    ];
    
    // Try to match based on patterns
    for (const pattern of caseStudyPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Extract just the company name (not the whole match)
        let companyName = match[1].trim();
        // If there's a comma, take just the first part (likely the company name)
        if (companyName.includes(',')) {
          companyName = companyName.split(',')[0].trim();
        }
        // If there's "and", take just the first part
        if (companyName.includes(' and ')) {
          companyName = companyName.split(' and ')[0].trim();
        }
        return companyName;
      }
    }
    
    // Check for known companies
    for (const company of knownCompanies) {
      if (text.includes(company)) {
        return company;
      }
    }
    
    return "N/A";
  };

  const handleExtract = async () => {
    if (!processedData || !descriptionField) {
      toast({
        title: "Missing information",
        description: "Please select a description field",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    const totalRows = processedData.rows.length;
    const updatedRows = processedData.rows.map((row, index) => {
      const description = row[descriptionField] || "";
      const caseStudyCompany = extractCaseStudyCompany(description);
      
      // Update progress
      setProgress(Math.floor(((index + 1) / totalRows) * 100));
      
      return {
        ...row,
        "Case Study Company": caseStudyCompany
      };
    });

    const resultData: ProcessedData = {
      ...processedData,
      headers: [...new Set([...processedData.headers, "Case Study Company"])],
      rows: updatedRows,
      fileName: `${processedData.fileName}-with-case-study-companies`
    };

    setResultData(resultData);
    setProcessedData(resultData);
    setIsProcessing(false);

    toast({
      title: "Case study companies extracted",
      description: `Analyzed ${totalRows} descriptions for company mentions in case studies.`,
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
        <CardTitle className="text-xl">Case Study Puller</CardTitle>
        <CardDescription>
          Extract company names mentioned in case studies from descriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!processedData ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>Please upload and process your CSV file first</p>
          </div>
        ) : isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Extracting case study companies...
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Progress: {progress}%
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Description Field</Label>
              <Select value={descriptionField} onValueChange={setDescriptionField}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field with company descriptions" />
                </SelectTrigger>
                <SelectContent>
                  {processedData.headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={handleExtract}
                disabled={!processedData || !descriptionField}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Extract Case Study Companies
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
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description Snippet</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Case Study Company</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {resultData.rows.slice(0, 5).map((row, index) => {
                        const companyField = processedData.source === 'Clay' ? 'company' : 'company_name';
                        const company = row[companyField] || row["cleaned_company_name"] || "Unknown";
                        const description = row[descriptionField] || "";
                        
                        return (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-700">
                              {company}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500 max-w-xs truncate">
                              {description.length > 100 ? description.substring(0, 100) + "..." : description}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-700">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                row["Case Study Company"] !== "N/A" ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {row["Case Study Company"]}
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

export default CaseStudyPuller;

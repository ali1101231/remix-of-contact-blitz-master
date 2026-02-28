
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import { detectCompanyType, CompanyType } from "@/services/companyTypeService";

interface CompanyTypeFinderProps {
  processedData: ProcessedData | null;
}

const CompanyTypeFinder: React.FC<CompanyTypeFinderProps> = ({ processedData }) => {
  const [descriptionField, setDescriptionField] = useState<string>("");
  const [industryField, setIndustryField] = useState<string>("");
  const [keywordsField, setKeywordsField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultData, setResultData] = useState<ProcessedData | null>(null);
  const { toast } = useToast();

  const handleProcess = () => {
    if (!processedData) {
      toast({
        title: "No data available",
        description: "Please upload and process your data first",
        variant: "destructive",
      });
      return;
    }

    if (!descriptionField && !industryField && !keywordsField) {
      toast({
        title: "Missing information",
        description: "Please select at least one field for company type detection",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    try {
      let processed = 0;
      const total = processedData.rows.length;
      
      // Process each row
      const updatedRows = processedData.rows.map(row => {
        const description = descriptionField ? row[descriptionField] || "" : "";
        const industry = industryField ? row[industryField] || "" : "";
        const keywords = keywordsField ? row[keywordsField] || "" : "";
        
        // Detect company type
        const companyType = detectCompanyType(description, industry, keywords);
        
        processed++;
        if (processed % 10 === 0 || processed === total) {
          setProgress(Math.floor((processed / total) * 100));
        }
        
        return {
          ...row,
          "Company's Type": companyType
        };
      });
      
      // Update processed data
      setResultData({
        ...processedData,
        headers: [...processedData.headers, "Company's Type"],
        rows: updatedRows,
        fileName: `${processedData.fileName}-with-company-types`
      });
      
      toast({
        title: "Processing complete",
        description: `Successfully identified company types for ${updatedRows.length} contacts.`,
      });
    } catch (error) {
      console.error("Error processing company types:", error);
      toast({
        title: "Processing error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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

  // Count of each company type
  const typeCount = resultData?.rows.reduce((acc, row) => {
    const type = row["Company's Type"] || CompanyType.UNKNOWN;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Company Type Finder</CardTitle>
        <CardDescription>
          Identify if companies are B2B, B2C, or other business types
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Analyzing company data...
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Completed: {progress}%
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Company Description Field (Optional)</Label>
                <Select value={descriptionField} onValueChange={setDescriptionField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {processedData?.headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Industry Field (Optional)</Label>
                <Select value={industryField} onValueChange={setIndustryField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {processedData?.headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Keywords Field (Optional)</Label>
                <Select value={keywordsField} onValueChange={setKeywordsField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {processedData?.headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={handleProcess} 
                disabled={!processedData || (!descriptionField && !industryField && !keywordsField)}
                className="flex items-center gap-2"
              >
                <Briefcase className="h-4 w-4" />
                Identify Company Types
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
              <div className="mt-6">
                <h3 className="font-medium mb-3">Company Type Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                  {Object.entries(typeCount).map(([type, count]) => (
                    <div key={type} className="border rounded-md p-3 text-center">
                      <div className="text-lg font-medium">{type}</div>
                      <div className="text-sm text-muted-foreground">{count} companies</div>
                    </div>
                  ))}
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-3">Sample Results (First 5 rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {resultData.rows.slice(0, 5).map((row, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {row["Fixed Company Name"] || row["cleaned_company_name"] || row["Company Name"] || row["company_name"] || "-"}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500 font-medium">
                              {row["Company's Type"] || "Unknown"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompanyTypeFinder;

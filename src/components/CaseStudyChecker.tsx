
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

const CaseStudyChecker: React.FC = () => {
  const { processedData, setProcessedData } = useProcessedData();
  const [descriptionField, setDescriptionField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultData, setResultData] = useState<ProcessedData | null>(null);
  const { toast } = useToast();

  const checkForCaseStudies = (text: string): boolean => {
    if (!text) return false;
    
    // Look for case study indicators in the text
    const caseStudyIndicators = [
      'case study',
      'case studies',
      'success story',
      'success stories',
      'client story',
      'customer story',
      'testimonial',
      'worked with',
      'helped',
      'partnered with',
      'collaborated with',
      'client success',
      'customer success'
    ];
    
    const lowercaseText = text.toLowerCase();
    return caseStudyIndicators.some(indicator => lowercaseText.includes(indicator));
  };

  const handleCheck = async () => {
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
      const hasCaseStudies = checkForCaseStudies(description);
      
      // Update progress
      setProgress(Math.floor(((index + 1) / totalRows) * 100));
      
      return {
        ...row,
        "Has Case Studies": hasCaseStudies ? "Y" : "N"
      };
    });

    const resultData: ProcessedData = {
      ...processedData,
      headers: [...new Set([...processedData.headers, "Has Case Studies"])],
      rows: updatedRows,
      fileName: `${processedData.fileName}-with-case-studies`
    };

    setResultData(resultData);
    setProcessedData(resultData);
    setIsProcessing(false);

    toast({
      title: "Case study check complete",
      description: `Analyzed ${totalRows} descriptions for case study mentions.`,
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
        <CardTitle className="text-xl">Case Study Checker</CardTitle>
        <CardDescription>
          Check if company descriptions mention case studies or customer stories
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
              Analyzing descriptions for case studies...
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
                onClick={handleCheck}
                disabled={!processedData || !descriptionField}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Check for Case Studies
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
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Has Case Studies</th>
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
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                row["Has Case Studies"] === "Y" ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {row["Has Case Studies"]}
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

export default CaseStudyChecker;

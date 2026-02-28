
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Shield, Download, Check, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import * as CSVService from "@/services/csvService";

interface DecisionMakerPrioritizerProps {
  processedData: ProcessedData | null;
}

const DecisionMakerPrioritizer: React.FC<DecisionMakerPrioritizerProps> = ({ processedData }) => {
  const [jobTitleField, setJobTitleField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultData, setResultData] = useState<ProcessedData | null>(null);
  const [decisionMakerCount, setDecisionMakerCount] = useState<number>(0);
  const { toast } = useToast();

  // Function to check if a job title indicates a decision maker
  const isDecisionMaker = (title: string): boolean => {
    if (!title) return false;
    
    title = title.toLowerCase().trim();
    
    // Key decision maker indicators
    const decisionMakerKeywords = [
      'founder', 'ceo', 'coo', 'cfo', 'cto', 'cmo', 'chief', 'president', 'owner',
      'director', 'vp', 'vice president', 'head of', 'lead', 'principal', 'partner',
      'chairman', 'chairwoman', 'chairperson', 'executive', 'manager', 'managing'
    ];
    
    // Check for matches
    return decisionMakerKeywords.some(keyword => title.includes(keyword));
  };

  const handleProcess = () => {
    if (!processedData) {
      toast({
        title: "No data available",
        description: "Please upload and process your data first",
        variant: "destructive",
      });
      return;
    }

    if (!jobTitleField) {
      toast({
        title: "Missing information",
        description: "Please select the column containing job titles",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    try {
      let processed = 0;
      const total = processedData.rows.length;
      let decisionMakers = 0;
      
      // Process each row
      const updatedRows = processedData.rows.map(row => {
        const jobTitle = row[jobTitleField] || "";
        const isDecisionMakerValue = isDecisionMaker(jobTitle);
        
        if (isDecisionMakerValue) {
          decisionMakers++;
        }
        
        processed++;
        if (processed % 10 === 0 || processed === total) {
          setProgress(Math.floor((processed / total) * 100));
        }
        
        return {
          ...row,
          "Is Decision Maker": isDecisionMakerValue ? "Yes" : "No",
          "Priority": isDecisionMakerValue ? "High" : "Standard"
        };
      });
      
      // Update processed data
      const updatedData = {
        ...processedData,
        headers: [...processedData.headers, "Is Decision Maker", "Priority"],
        rows: updatedRows,
        fileName: `${processedData.fileName}-with-decision-makers`
      };
      
      setResultData(updatedData);
      setDecisionMakerCount(decisionMakers);
      
      toast({
        title: "Processing complete",
        description: `Identified ${decisionMakers} decision makers out of ${total} contacts.`,
      });
    } catch (error) {
      console.error("Error processing decision makers:", error);
      toast({
        title: "Processing error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (type: "all" | "decision-makers" | "others") => {
    if (!resultData) return;
    
    try {
      let dataToExport;
      let fileName;
      
      if (type === "all") {
        dataToExport = resultData;
        fileName = "all-contacts-with-priority.csv";
      } else if (type === "decision-makers") {
        dataToExport = {
          ...resultData,
          rows: resultData.rows.filter(row => row["Is Decision Maker"] === "Yes"),
          fileName: "decision-makers"
        };
        fileName = "decision-makers.csv";
      } else {
        dataToExport = {
          ...resultData,
          rows: resultData.rows.filter(row => row["Is Decision Maker"] === "No"),
          fileName: "non-decision-makers"
        };
        fileName = "non-decision-makers.csv";
      }
      
      const csv = CSVService.exportToCSV(dataToExport);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: "Your file is being downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download error",
        description: "Failed to download the data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Decision Maker Prioritizer</CardTitle>
        <CardDescription>
          Identify and prioritize key decision makers based on job titles
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Analyzing job titles...
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Completed: {progress}%
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Job Title Column</Label>
              <Select value={jobTitleField} onValueChange={setJobTitleField}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job title column" />
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
            
            <div className="flex gap-4">
              <Button 
                onClick={handleProcess} 
                disabled={!processedData || !jobTitleField}
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Identify Decision Makers
              </Button>
              
              {resultData && (
                <Button 
                  variant="outline" 
                  onClick={() => handleDownload("all")}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Results
                </Button>
              )}
            </div>

            {resultData && (
              <div className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Total Contacts</p>
                    <p className="text-3xl font-bold text-brand-dark">{resultData.rows.length.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-green-700">Decision Makers</p>
                    <p className="text-3xl font-bold text-green-700">{decisionMakerCount.toLocaleString()}</p>
                    <p className="text-sm text-green-600">
                      ({Math.round((decisionMakerCount / resultData.rows.length) * 100)}%)
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Other Contacts</p>
                    <p className="text-3xl font-bold text-gray-500">
                      {(resultData.rows.length - decisionMakerCount).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 mb-6">
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={() => handleDownload("decision-makers")}
                  >
                    <Check className="h-4 w-4 text-green-600" />
                    Download Only Decision Makers
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="flex items-center gap-2" 
                    onClick={() => handleDownload("others")}
                  >
                    <X className="h-4 w-4 text-gray-500" />
                    Download Only Non-Decision Makers
                  </Button>
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-3">Sample Results</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          {jobTitleField && (
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Job Title
                            </th>
                          )}
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Decision Maker</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {resultData.rows.slice(0, 10).map((row, index) => (
                          <tr key={index}>
                            {jobTitleField && (
                              <td className="px-3 py-2 text-sm text-gray-500">
                                {row[jobTitleField] || "-"}
                              </td>
                            )}
                            <td className="px-3 py-2 text-sm">
                              {row["Is Decision Maker"] === "Yes" ? (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                  <Check className="mr-1 h-3 w-3" />
                                  Yes
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                  <X className="mr-1 h-3 w-3" />
                                  No
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-sm font-medium">
                              {row["Priority"] === "High" ? (
                                <span className="text-green-600">High Priority</span>
                              ) : (
                                <span className="text-gray-500">Standard</span>
                              )}
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

export default DecisionMakerPrioritizer;

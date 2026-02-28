
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import { calculateICPScore, defaultICPConfig, ICPCriteria, ICPConfig } from "@/services/icpScoringService";

interface ICPScoreCalculatorProps {
  processedData: ProcessedData | null;
}

const ICPScoreCalculator: React.FC<ICPScoreCalculatorProps> = ({ processedData }) => {
  const [config, setConfig] = useState<ICPConfig>({...defaultICPConfig});
  const [enabledCriteria, setEnabledCriteria] = useState<string[]>(["jobTitle", "industry", "revenue", "location", "techStack"]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({
    jobTitle: "",
    industry: "",
    revenue: "",
    location: "",
    techStack: ""
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultData, setResultData] = useState<ProcessedData | null>(null);
  const { toast } = useToast();

  const toggleCriteria = (key: string) => {
    setEnabledCriteria(prev => 
      prev.includes(key) 
        ? prev.filter(item => item !== key) 
        : [...prev, key]
    );
  };

  const updateFieldMapping = (criteriaKey: string, fieldName: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [criteriaKey]: fieldName
    }));
    
    // Also update the config
    setConfig(prev => ({
      ...prev,
      [criteriaKey]: {
        ...prev[criteriaKey as keyof ICPConfig],
        field: fieldName
      }
    }));
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
    
    const selectedFields = enabledCriteria.filter(criteria => fieldMappings[criteria]);
    if (selectedFields.length === 0) {
      toast({
        title: "Missing information",
        description: "Please select at least one field for ICP scoring",
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
        // Calculate ICP score
        const icpScore = calculateICPScore(row, config, enabledCriteria);
        
        processed++;
        if (processed % 10 === 0 || processed === total) {
          setProgress(Math.floor((processed / total) * 100));
        }
        
        return {
          ...row,
          "ICP Score": icpScore.toString()
        };
      });
      
      // Sort by ICP score (highest first)
      updatedRows.sort((a, b) => {
        const scoreA = parseInt(a["ICP Score"] || "0");
        const scoreB = parseInt(b["ICP Score"] || "0");
        return scoreB - scoreA;
      });
      
      // Update processed data
      setResultData({
        ...processedData,
        headers: [...processedData.headers, "ICP Score"],
        rows: updatedRows,
        fileName: `${processedData.fileName}-with-icp-scores`
      });
      
      toast({
        title: "Processing complete",
        description: `Successfully calculated ICP scores for ${updatedRows.length} contacts.`,
      });
    } catch (error) {
      console.error("Error calculating ICP scores:", error);
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

  // Calculate score distribution
  const scoreDistribution = resultData?.rows.reduce((acc, row) => {
    const score = parseInt(row["ICP Score"] || "0");
    const bucket = Math.floor(score / 10) * 10; // Group in buckets of 10 (0-9, 10-19, etc.)
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {} as Record<number, number>) || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">ICP Score Calculator</CardTitle>
        <CardDescription>
          Score leads based on your Ideal Customer Profile criteria
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Calculating ICP scores...
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Completed: {progress}%
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-4 mb-6">
              <h3 className="font-medium">Select and map your ICP criteria</h3>
              
              {/* Job Title */}
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="jobTitle" 
                  checked={enabledCriteria.includes('jobTitle')}
                  onCheckedChange={() => toggleCriteria('jobTitle')}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="jobTitle" className="text-sm font-medium">
                    Job Title
                  </Label>
                  <Select 
                    value={fieldMappings.jobTitle} 
                    onValueChange={(value) => updateFieldMapping('jobTitle', value)}
                    disabled={!enabledCriteria.includes('jobTitle')}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select field" />
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
              </div>
              
              {/* Industry */}
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="industry" 
                  checked={enabledCriteria.includes('industry')}
                  onCheckedChange={() => toggleCriteria('industry')}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="industry" className="text-sm font-medium">
                    Industry
                  </Label>
                  <Select 
                    value={fieldMappings.industry} 
                    onValueChange={(value) => updateFieldMapping('industry', value)}
                    disabled={!enabledCriteria.includes('industry')}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select field" />
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
              </div>
              
              {/* Revenue */}
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="revenue" 
                  checked={enabledCriteria.includes('revenue')}
                  onCheckedChange={() => toggleCriteria('revenue')}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="revenue" className="text-sm font-medium">
                    Revenue
                  </Label>
                  <Select 
                    value={fieldMappings.revenue} 
                    onValueChange={(value) => updateFieldMapping('revenue', value)}
                    disabled={!enabledCriteria.includes('revenue')}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select field" />
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
              </div>
              
              {/* Location */}
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="location" 
                  checked={enabledCriteria.includes('location')}
                  onCheckedChange={() => toggleCriteria('location')}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="location" className="text-sm font-medium">
                    Location
                  </Label>
                  <Select 
                    value={fieldMappings.location} 
                    onValueChange={(value) => updateFieldMapping('location', value)}
                    disabled={!enabledCriteria.includes('location')}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select field" />
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
              </div>
              
              {/* Tech Stack */}
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="techStack" 
                  checked={enabledCriteria.includes('techStack')}
                  onCheckedChange={() => toggleCriteria('techStack')}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="techStack" className="text-sm font-medium">
                    Tech Stack
                  </Label>
                  <Select 
                    value={fieldMappings.techStack} 
                    onValueChange={(value) => updateFieldMapping('techStack', value)}
                    disabled={!enabledCriteria.includes('techStack')}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select field" />
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
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={handleProcess} 
                disabled={!processedData || enabledCriteria.length === 0}
                className="flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                Calculate ICP Scores
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
                <h3 className="font-medium mb-3">ICP Score Distribution</h3>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-6">
                  {/* Display score buckets 0-10, 10-20, etc. */}
                  {Array.from({length: 10}, (_, i) => i * 10).map(bucket => (
                    <div key={bucket} className="border rounded-md p-2 text-center">
                      <div className="text-xs">{bucket}-{bucket+9}</div>
                      <div className="text-sm font-medium">{scoreDistribution[bucket] || 0}</div>
                    </div>
                  ))}
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-3">Top ICP Matches (First 5 rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {resultData.rows.slice(0, 5).map((row, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {row["Fixed Company Name"] || row["cleaned_company_name"] || row["Company Name"] || row["company_name"] || "-"}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {row["first_name"] ? `${row["first_name"]} ${row["last_name"] || ""}` : row["name"] || "-"}
                            </td>
                            <td className="px-3 py-2 text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <span className={parseInt(row["ICP Score"]) >= 70 ? "text-green-600" : 
                                  parseInt(row["ICP Score"]) >= 40 ? "text-amber-600" : "text-gray-500"}>
                                  {row["ICP Score"] || "0"}
                                </span>
                                <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${
                                      parseInt(row["ICP Score"]) >= 70 ? "bg-green-500" : 
                                      parseInt(row["ICP Score"]) >= 40 ? "bg-amber-500" : "bg-gray-400"
                                    }`}
                                    style={{ width: `${row["ICP Score"] || 0}%` }}
                                  />
                                </div>
                              </div>
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

export default ICPScoreCalculator;

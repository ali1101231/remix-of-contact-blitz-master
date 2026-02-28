
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Scissors, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import * as CSVService from "@/services/csvService";
import { useProcessedData } from "@/hooks/useProcessedData";

const JobTitleCleaner: React.FC = () => {
  const { processedData } = useProcessedData();
  const [titleField, setTitleField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultData, setResultData] = useState<ProcessedData | null>(null);
  const { toast } = useToast();

  const cleanJobTitle = (title: string) => {
    // Standard job level mapping
    const levelMapping = {
      "senior": "Senior",
      "sr": "Senior",
      "jr": "Junior",
      "junior": "Junior",
      "lead": "Lead",
      "head": "Head",
      "chief": "Chief",
      "principal": "Principal",
      "staff": "Staff",
      "executive": "Executive"
    };

    // Standard job role mapping
    const roleMapping = {
      "vp": "VP",
      "vice president": "VP",
      "ceo": "CEO",
      "cto": "CTO",
      "cfo": "CFO",
      "coo": "COO",
      "cmo": "CMO",
      "cio": "CIO",
      "director": "Director",
      "manager": "Manager",
      "engineer": "Engineer",
      "developer": "Developer",
      "analyst": "Analyst",
      "specialist": "Specialist",
      "coordinator": "Coordinator",
      "administrator": "Administrator",
      "assistant": "Assistant"
    };

    // Department/function mapping
    const departmentMapping = {
      "marketing": "Marketing",
      "sales": "Sales",
      "engineering": "Engineering",
      "product": "Product",
      "finance": "Finance",
      "human resources": "HR",
      "hr": "HR",
      "operations": "Operations",
      "customer success": "Customer Success",
      "support": "Support",
      "information technology": "IT",
      "it": "IT",
      "research": "Research",
      "development": "Development",
      "business development": "Business Development",
      "legal": "Legal",
      "partnerships": "Partnerships",
      "strategic alliances": "Partnerships"
    };

    // Clean and normalize the job title
    const normalizedTitle = title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Replace non-alphanumeric chars with spaces
      .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
      .trim();

    // Extract level, role and department
    let level = "";
    let role = "";
    let department = "";

    // Check for level
    for (const [key, value] of Object.entries(levelMapping)) {
      if (normalizedTitle.includes(key)) {
        level = value;
        break;
      }
    }

    // Check for role
    for (const [key, value] of Object.entries(roleMapping)) {
      if (normalizedTitle.includes(key)) {
        role = value;
        break;
      }
    }

    // Check for department
    for (const [key, value] of Object.entries(departmentMapping)) {
      if (normalizedTitle.includes(key)) {
        department = value;
        break;
      }
    }

    return {
      level,
      role,
      department,
      original: title
    };
  };

  const handleProcess = async () => {
    if (!processedData || !titleField) {
      toast({
        title: "Missing information",
        description: "Please upload data and select the job title field",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    const totalRows = processedData.rows.length;
    const updatedRows = processedData.rows.map((row, index) => {
      const title = row[titleField] || "";
      const { level, role, department } = cleanJobTitle(title);
      
      setProgress(Math.floor(((index + 1) / totalRows) * 100));
      
      return {
        ...row,
        "Job Level": level || "N/A",
        "Job Role": role || "N/A", 
        "Department": department || "N/A"
      };
    });

    const resultData: ProcessedData = {
      ...processedData,
      headers: [...processedData.headers, "Job Level", "Job Role", "Department"],
      rows: updatedRows,
      fileName: `${processedData.fileName}-cleaned-titles`
    };

    setResultData(resultData);
    setIsProcessing(false);

    toast({
      title: "Processing complete",
      description: `Cleaned ${totalRows} job titles.`,
    });
  };

  const handleDownload = () => {
    if (!resultData) return;
    
    try {
      const csv = CSVService.exportToCSV(resultData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${resultData.fileName}.csv`;
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
        <CardTitle className="text-xl">Job Title Cleaner</CardTitle>
        <CardDescription>
          Clean and standardize job titles into level, role, and department
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Cleaning job titles...
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Progress: {progress}%
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Job Title Column</Label>
              <Select value={titleField} onValueChange={setTitleField}>
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
                disabled={!processedData || !titleField}
                className="flex items-center gap-2"
              >
                <Scissors className="h-4 w-4" />
                Clean Job Titles
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
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Original</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {resultData.rows.slice(0, 5).map((row, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm text-gray-500">
                            {row[titleField]}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-500">
                            {row["Job Level"]}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-500">
                            {row["Job Role"]}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-500">
                            {row["Department"]}
                          </td>
                        </tr>
                      ))}
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

export default JobTitleCleaner;

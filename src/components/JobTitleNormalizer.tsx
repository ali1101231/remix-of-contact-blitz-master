
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, User } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import { normalizeTitle, titlePatterns } from "@/services/titleNormalizerService";

interface JobTitleNormalizerProps {
  processedData: ProcessedData | null;
}

const JobTitleNormalizer: React.FC<JobTitleNormalizerProps> = ({ processedData }) => {
  const [titleField, setTitleField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultData, setResultData] = useState<ProcessedData | null>(null);
  const { toast } = useToast();

  const handleNormalize = () => {
    if (!processedData || !titleField) {
      toast({
        title: "Missing information",
        description: "Please select a field containing job titles",
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
        const jobTitle = row[titleField] || "";
        const normalizedTitle = normalizeTitle(jobTitle);
        
        processed++;
        if (processed % 10 === 0 || processed === total) {
          setProgress(Math.floor((processed / total) * 100));
        }
        
        return {
          ...row,
          "Normalized Title": normalizedTitle
        };
      });
      
      // Update processed data
      setResultData({
        ...processedData,
        headers: [...processedData.headers, "Normalized Title"],
        rows: updatedRows,
        fileName: `${processedData.fileName}-with-normalized-titles`
      });
      
      toast({
        title: "Normalization complete",
        description: `Successfully normalized job titles for ${updatedRows.length} contacts.`,
      });
    } catch (error) {
      console.error("Error normalizing job titles:", error);
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

  // Count of each normalized title
  const titleCount = resultData?.rows.reduce((acc, row) => {
    const title = row["Normalized Title"];
    if (title) {
      acc[title] = (acc[title] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  // Sort titles by count
  const sortedTitles = Object.entries(titleCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Job Title Normalizer</CardTitle>
        <CardDescription>
          Standardize job titles for better segmentation and targeting
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Normalizing job titles...
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Completed: {progress}%
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Job Title Field</Label>
              <Select value={titleField} onValueChange={setTitleField}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field containing job titles" />
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
                onClick={handleNormalize} 
                disabled={!processedData || !titleField}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Normalize Job Titles
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-3">Most Common Normalized Titles</h3>
                    <div className="border rounded-md p-4">
                      <ul className="space-y-2">
                        {sortedTitles.map(([title, count]) => (
                          <li key={title} className="flex justify-between items-center">
                            <span className="font-medium">{title}</span>
                            <span className="text-sm text-muted-foreground">{count} contacts</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-3">Example Normalizations</h3>
                    <div className="border rounded-md p-4">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Original Title</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Normalized Title</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {resultData.rows.slice(0, 7).map((row, index) => (
                              <tr key={index}>
                                <td className="px-3 py-2 text-sm text-gray-500">
                                  {row[titleField] || "-"}
                                </td>
                                <td className="px-3 py-2 text-sm font-medium">
                                  {row["Normalized Title"] || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
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

export default JobTitleNormalizer;

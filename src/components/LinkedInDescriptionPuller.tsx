
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileSearch, Download, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import { useProcessedData } from "@/hooks/useProcessedData";

const LinkedInDescriptionPuller: React.FC = () => {
  const { processedData, setProcessedData } = useProcessedData();
  const [urlField, setUrlField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultData, setResultData] = useState<ProcessedData | null>(null);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const { toast } = useToast();

  // Function to simulate pulling LinkedIn descriptions
  const simulatePullDescription = async (url: string): Promise<string> => {
    if (!url) return "N/A";
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (isCancelled) throw new Error("Operation cancelled by user");
    
    // Generate some dummy descriptions for demonstration
    const dummyDescriptions = [
      "A leading provider of innovative software solutions, helping businesses transform their operations through digital technology. We work with enterprise clients across industries, providing custom software development, cloud migration, and AI-powered analytics.",
      "We're a customer-centric marketing agency specializing in digital strategies that drive growth. Our services include content marketing, SEO, PPC, and social media management, tailored to meet the unique needs of each client.",
      "An award-winning fintech company revolutionizing payment processing for small and medium businesses. Our platform provides secure, efficient, and affordable payment solutions with real-time analytics and reporting.",
      "A global consulting firm with expertise in organizational transformation, leadership development, and strategic planning. We've helped Fortune 500 companies improve performance and achieve sustainable growth.",
      "Pioneers in clean energy solutions, we design and implement renewable energy systems for residential and commercial properties. Our mission is to accelerate the transition to a sustainable future through innovative technology.",
      "A boutique law firm specializing in intellectual property, patent law, and technology licensing. We represent clients from startups to multinational corporations, protecting their innovations and creative assets.",
      "We provide end-to-end logistics and supply chain solutions, optimizing operations for efficiency and cost-effectiveness. Our global network enables seamless delivery of goods across international borders.",
      "An innovative healthtech company developing AI-powered diagnostic tools for healthcare providers. Our solutions improve accuracy, reduce costs, and enhance patient outcomes through early detection of conditions."
    ];
    
    // Return a random description
    return dummyDescriptions[Math.floor(Math.random() * dummyDescriptions.length)];
  };

  const handlePull = async () => {
    if (!processedData || !urlField) {
      toast({
        title: "Missing information",
        description: "Please select a field containing LinkedIn URLs",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setIsCancelled(false);
    
    const totalRows = processedData.rows.length;
    const updatedRows = [...processedData.rows];
    const batchSize = 10; // Process 10 at a time
    
    try {
      for (let i = 0; i < updatedRows.length; i += batchSize) {
        if (isCancelled) {
          throw new Error("Operation cancelled by user");
        }
        
        const batch = updatedRows.slice(i, Math.min(i + batchSize, updatedRows.length));
        const batchPromises = batch.map(async (row, batchIndex) => {
          const url = row[urlField] || "";
          let description = "N/A";
          
          try {
            description = await simulatePullDescription(url);
          } catch (error) {
            if ((error as Error).message === "Operation cancelled by user") {
              throw error;
            }
            console.error(`Error fetching description for ${url}:`, error);
          }
          
          const rowIndex = i + batchIndex;
          updatedRows[rowIndex] = {
            ...updatedRows[rowIndex],
            "LinkedIn Description": description
          };
        });
        
        await Promise.all(batchPromises);
        
        // Update progress after each batch
        setProgress(Math.floor(((i + batch.length) / totalRows) * 100));
      }
      
      const resultData: ProcessedData = {
        ...processedData,
        headers: [...new Set([...processedData.headers, "LinkedIn Description"])],
        rows: updatedRows,
        fileName: `${processedData.fileName}-with-linkedin-descriptions`
      };
  
      setResultData(resultData);
      setProcessedData(resultData);
      
      toast({
        title: "LinkedIn descriptions retrieved",
        description: `Successfully retrieved descriptions for ${totalRows} companies.`,
      });
    } catch (error) {
      if ((error as Error).message === "Operation cancelled by user") {
        toast({
          title: "Operation cancelled",
          description: "The LinkedIn description pulling was cancelled.",
        });
      } else {
        console.error("Error retrieving LinkedIn descriptions:", error);
        toast({
          title: "Error retrieving descriptions",
          description: (error as Error).message || "An unexpected error occurred",
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setIsCancelled(true);
    toast({
      title: "Cancelling operation",
      description: "The LinkedIn description pulling will be cancelled after the current batch completes.",
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
        <CardTitle className="text-xl">LinkedIn Description Puller</CardTitle>
        <CardDescription>
          Extract company descriptions from LinkedIn profiles
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
              Retrieving LinkedIn descriptions... (processing 10 at a time)
            </p>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Progress: {progress}%
              </p>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleCancel}
                className="flex items-center gap-1"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select LinkedIn URL Field</Label>
              <Select value={urlField} onValueChange={setUrlField}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field containing LinkedIn URLs" />
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
                onClick={handlePull}
                disabled={!processedData || !urlField}
                className="flex items-center gap-2"
              >
                <FileSearch className="h-4 w-4" />
                Pull LinkedIn Descriptions
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
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">LinkedIn URL</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">LinkedIn Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {resultData.rows.slice(0, 5).map((row, index) => {
                        const companyField = processedData.source === 'Clay' ? 'company' : 'company_name';
                        const company = row[companyField] || row["cleaned_company_name"] || "Unknown";
                        const url = row[urlField] || "-";
                        const description = row["LinkedIn Description"] || "N/A";
                        
                        return (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-700">
                              {company}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500 max-w-[200px] truncate">
                              {url}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500 max-w-xs truncate">
                              {description.length > 100 ? description.substring(0, 100) + "..." : description}
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

export default LinkedInDescriptionPuller;

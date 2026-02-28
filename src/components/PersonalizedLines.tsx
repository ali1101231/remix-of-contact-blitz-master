
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

const PersonalizedLines: React.FC = () => {
  const { processedData, setProcessedData } = useProcessedData();
  const [descriptionField, setDescriptionField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultData, setResultData] = useState<ProcessedData | null>(null);
  const { toast } = useToast();

  const generatePersonalizedLine = (company: string, description: string): string => {
    if (!description || !company) return "I'd love to learn more about your business.";
    
    // Extract key points from description
    const descLower = description.toLowerCase();
    
    // Find metrics - numbers with units or percentages
    const metrics = description.match(/\d+(\.\d+)?%|\d+\s*(million|billion|k|users|customers|clients|companies|businesses)/gi);
    
    // Find notable phrases
    const innovations = [
      "leading", "innovative", "premier", "top", "award-winning", "cutting-edge", "state-of-the-art", 
      "advanced", "pioneering", "revolutionary", "groundbreaking", "first"
    ];
    
    let innovationMention = "";
    for (const term of innovations) {
      if (descLower.includes(term)) {
        const index = descLower.indexOf(term);
        // Get some context around the term
        const start = Math.max(0, index - 20);
        const end = Math.min(description.length, index + 50);
        innovationMention = description.substring(start, end);
        break;
      }
    }
    
    // Detect what they help clients with
    const clientHelp = description.match(/helps?|enables?|empowers?|allows?|lets?|assists?|supports?|provides?/i);
    let helpContext = "";
    if (clientHelp) {
      const index = description.indexOf(clientHelp[0]);
      const start = Math.max(0, index - 5);
      const end = Math.min(description.length, index + 50);
      helpContext = description.substring(start, end);
    }
    
    // Generate personalized line templates
    const templates = [
      `I was impressed by how ${company} is ${innovationMention && innovationMention.length > 10 ? innovationMention : "driving innovation in your industry"}.`,
      metrics && metrics.length > 0 ? `It's remarkable that ${company} has achieved ${metrics[0]}.` : `I've been following ${company}'s growth in the market.`,
      helpContext ? `I like how ${company} ${helpContext.toLowerCase()}.` : `I'm intrigued by ${company}'s approach to solving industry challenges.`,
      `The way ${company} has positioned itself in the market caught my attention.`,
      `I'm particularly interested in how ${company} is tackling the challenges in your industry.`
    ];
    
    // Select a template based on available information
    if (metrics && metrics.length > 0) {
      return `It's impressive to see that ${company} has achieved ${metrics[0]}.`;
    } else if (innovationMention && innovationMention.length > 10) {
      return `I was impressed by how ${company} is ${innovationMention.toLowerCase()}.`;
    } else if (helpContext) {
      return `I like how ${company} ${helpContext.toLowerCase()}.`;
    } else {
      // Fallback to random template
      return templates[Math.floor(Math.random() * templates.length)];
    }
  };

  const handleGenerate = async () => {
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
      // Find company name
      const companyField = processedData.source === 'Clay' ? 'company' : 'company_name';
      const company = row[companyField] || row["cleaned_company_name"] || "your company";
      
      // Get description
      const description = row[descriptionField] || "";
      
      // Generate personalized line
      const personalizedLine = generatePersonalizedLine(company, description);
      
      // Update progress
      setProgress(Math.floor(((index + 1) / totalRows) * 100));
      
      return {
        ...row,
        "Personalized Line": personalizedLine
      };
    });

    const resultData: ProcessedData = {
      ...processedData,
      headers: [...new Set([...processedData.headers, "Personalized Line"])],
      rows: updatedRows,
      fileName: `${processedData.fileName}-with-personalized-lines`
    };

    setResultData(resultData);
    setProcessedData(resultData);
    setIsProcessing(false);

    toast({
      title: "Personalized lines generated",
      description: `Created personalized lines for ${totalRows} contacts.`,
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
        <CardTitle className="text-xl">Personalized Lines Writer</CardTitle>
        <CardDescription>
          Generate engaging personalized opening lines for your emails based on company descriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Generating personalized lines...
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
                onClick={handleGenerate}
                disabled={!processedData || !descriptionField}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Generate Personalized Lines
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
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Personalized Line</th>
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
                            <td className="px-3 py-2 text-sm text-gray-700">
                              {row["Personalized Line"]}
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

export default PersonalizedLines;

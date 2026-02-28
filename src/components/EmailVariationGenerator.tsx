
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Mail, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import * as CSVService from "@/services/csvService";

interface EmailVariationGeneratorProps {
  processedData: ProcessedData | null;
}

const EmailVariationGenerator: React.FC<EmailVariationGeneratorProps> = ({ processedData }) => {
  const [firstNameField, setFirstNameField] = useState<string>("");
  const [lastNameField, setLastNameField] = useState<string>("");
  const [domainField, setDomainField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultData, setResultData] = useState<ProcessedData | null>(null);
  const { toast } = useToast();

  // Function to extract domain from email
  const extractDomainFromEmail = (email: string): string => {
    if (!email) return "";
    const parts = email.split('@');
    return parts.length > 1 ? parts[1].toLowerCase() : "";
  };

  // Function to generate email variations
  const generateEmailVariations = (firstName: string, lastName: string, domain: string) => {
    if (!firstName || !lastName || !domain) return [];
    
    // Clean the inputs
    firstName = firstName.trim();
    lastName = lastName.trim();
    domain = domain.trim();
    
    if (domain.startsWith('@')) domain = domain.substring(1);
    
    // Generate variations
    const variations = [
      `${firstName}${lastName}@${domain}`,
      `${firstName}.${lastName}@${domain}`,
      `${firstName}@${domain}`,
      `${firstName[0]}${lastName}@${domain}`,
      `${firstName[0]}.${lastName}@${domain}`,
      `${lastName}${firstName}@${domain}`,
      `${firstName}${lastName}1@${domain}`,
      `${firstName}.${lastName}1@${domain}`,
      `${firstName[0]}${lastName}1@${domain}`,
      `${firstName[0]}.${lastName}1@${domain}`,
      `${firstName.toLowerCase()}@${domain}`,
      `${firstName.toLowerCase()}${lastName.toLowerCase()}@${domain}`,
      `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
      `${firstName.toLowerCase()}${lastName.toLowerCase()}1@${domain}`,
      `${firstName.toLowerCase()}.${lastName.toLowerCase()}1@${domain}`
    ];
    
    // Filter out any invalid variations (e.g., if firstName is empty)
    return variations.filter(email => {
      const parts = email.split('@');
      return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
    });
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

    if (!firstNameField || !lastNameField) {
      toast({
        title: "Missing information",
        description: "Please select both first name and last name columns",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    try {
      let processed = 0;
      const total = processedData.rows.length;
      
      // Create new rows with variations
      const newRows: Record<string, string>[] = [];
      
      // Process each row
      processedData.rows.forEach(row => {
        const firstName = row[firstNameField] || "";
        const lastName = row[lastNameField] || "";
        
        let domain = "";
        if (domainField) {
          domain = row[domainField] || "";
        } else {
          // Try to extract domain from any email field
          for (const key of Object.keys(row)) {
            if (key.toLowerCase().includes('email') && row[key]) {
              domain = extractDomainFromEmail(row[key]);
              if (domain) break;
            }
          }
        }
        
        if (firstName && lastName && domain) {
          const variations = generateEmailVariations(firstName, lastName, domain);
          
          variations.forEach((email, i) => {
            newRows.push({
              "First Name": firstName,
              "Last Name": lastName,
              "Domain": domain,
              "Email Variation": email,
              "Variation Type": `Variation ${i + 1}`
            });
          });
        }
        
        processed++;
        if (processed % 10 === 0 || processed === total) {
          setProgress(Math.floor((processed / total) * 100));
        }
      });
      
      // Create result dataset
      const result = {
        headers: ["First Name", "Last Name", "Domain", "Email Variation", "Variation Type"],
        rows: newRows,
        fileName: `${processedData.fileName}-email-variations`,
        source: "Generated"
      };
      
      setResultData(result);
      
      toast({
        title: "Email variations generated",
        description: `Created ${newRows.length} email variations for your contacts.`,
      });
    } catch (error) {
      console.error("Error generating email variations:", error);
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
        description: "Your email variations are being downloaded.",
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
        <CardTitle className="text-xl">Email Variation Generator</CardTitle>
        <CardDescription>
          Generate multiple email format variations for Apollo outreach
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Generating email variations...
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
                <Label>First Name Column</Label>
                <Select value={firstNameField} onValueChange={setFirstNameField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select first name column" />
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
              
              <div className="space-y-2">
                <Label>Last Name Column</Label>
                <Select value={lastNameField} onValueChange={setLastNameField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select last name column" />
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
              
              <div className="space-y-2">
                <Label>Domain Column (Optional)</Label>
                <Select value={domainField} onValueChange={setDomainField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select domain column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Auto-detect</SelectItem>
                    {processedData?.headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  If not selected, will try to extract from email fields
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={handleProcess} 
                disabled={!processedData || !firstNameField || !lastNameField}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Generate Email Variations
              </Button>
              
              {resultData && (
                <Button 
                  variant="outline" 
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Variations
                </Button>
              )}
            </div>

            {resultData && resultData.rows.length > 0 && (
              <div className="mt-6">
                <Card className="mb-4">
                  <CardHeader className="py-4">
                    <CardTitle>Generated Email Variations</CardTitle>
                    <CardDescription>
                      {resultData.rows.length} total variations created
                    </CardDescription>
                  </CardHeader>
                </Card>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-3">Sample Variations</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email Variation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {resultData.rows.slice(0, 10).map((row, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {row["First Name"]} {row["Last Name"]}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {row["Domain"]}
                            </td>
                            <td className="px-3 py-2 text-sm font-medium">
                              {row["Email Variation"]}
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

export default EmailVariationGenerator;

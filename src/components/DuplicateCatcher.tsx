
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Copy, Download, Trash } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import * as CSVService from "@/services/csvService";
import { Checkbox } from "@/components/ui/checkbox";

interface DuplicateCatcherProps {
  processedData: ProcessedData | null;
}

const DuplicateCatcher: React.FC<DuplicateCatcherProps> = ({ processedData }) => {
  const [emailField, setEmailField] = useState<string>("");
  const [domainField, setDomainField] = useState<string>("");
  const [nameField, setNameField] = useState<string>("");
  const [useFuzzyMatching, setUseFuzzyMatching] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [uniqueData, setUniqueData] = useState<ProcessedData | null>(null);
  const [duplicatesData, setDuplicatesData] = useState<ProcessedData | null>(null);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const { toast } = useToast();

  // Simple function to calculate string similarity (Levenshtein distance)
  const calculateSimilarity = (str1: string, str2: string): number => {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    // Convert to lowercase for case-insensitive comparison
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
    
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Create matrix
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
    
    // Initialize first row and column
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;
    
    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    // Calculate similarity as 1 - (distance / max length)
    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);
    return 1 - (distance / maxLength);
  };

  // Function to extract domain from email
  const extractDomain = (email: string): string => {
    if (!email) return "";
    const parts = email.split('@');
    return parts.length > 1 ? parts[1].toLowerCase() : "";
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

    if (!emailField && !domainField && !nameField) {
      toast({
        title: "Missing information",
        description: "Please select at least one field for duplicate detection",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    try {
      const total = processedData.rows.length;
      const uniqueRows: typeof processedData.rows = [];
      const duplicateRows: typeof processedData.rows = [];
      
      // Maps to track unique values
      const emailMap = new Map<string, boolean>();
      const domainMap = new Map<string, boolean>();
      const nameMap = new Map<string, boolean>();
      
      // Process each row
      for (let i = 0; i < total; i++) {
        const row = processedData.rows[i];
        let isDuplicate = false;
        
        // Check for email duplicates
        if (emailField) {
          const email = (row[emailField] || "").toLowerCase().trim();
          if (email && emailMap.has(email)) {
            isDuplicate = true;
          } else if (email) {
            emailMap.set(email, true);
          }
        }
        
        // Check for domain duplicates
        if (!isDuplicate && domainField) {
          const domain = (row[domainField] || "").toLowerCase().trim();
          if (domain && domainMap.has(domain)) {
            isDuplicate = true;
          } else if (domain) {
            domainMap.set(domain, true);
          }
        }
        // Or extract domain from email
        else if (!isDuplicate && emailField && !domainField) {
          const email = row[emailField] || "";
          const domain = extractDomain(email);
          if (domain && domainMap.has(domain)) {
            isDuplicate = true;
          } else if (domain) {
            domainMap.set(domain, true);
          }
        }
        
        // Check for name duplicates with fuzzy matching
        if (!isDuplicate && nameField) {
          const name = (row[nameField] || "").trim();
          
          if (name) {
            if (useFuzzyMatching) {
              // Check similarity with all existing names
              let highestSimilarity = 0;
              for (const existingName of nameMap.keys()) {
                const similarity = calculateSimilarity(name, existingName);
                if (similarity > 0.85) { // 85% similarity threshold
                  highestSimilarity = similarity;
                  break;
                }
              }
              
              if (highestSimilarity > 0.85) {
                isDuplicate = true;
              } else {
                nameMap.set(name, true);
              }
            } else {
              // Exact name matching
              if (nameMap.has(name)) {
                isDuplicate = true;
              } else {
                nameMap.set(name, true);
              }
            }
          }
        }
        
        // Add row to appropriate list
        if (isDuplicate) {
          duplicateRows.push({...row, "Is Duplicate": "Yes"});
        } else {
          uniqueRows.push({...row, "Is Duplicate": "No"});
        }
        
        // Update progress
        if (i % 10 === 0 || i === total - 1) {
          setProgress(Math.floor(((i + 1) / total) * 100));
        }
      }
      
      // Create result datasets
      const uniqueResult = {
        ...processedData,
        headers: [...processedData.headers, "Is Duplicate"],
        rows: uniqueRows,
        fileName: `${processedData.fileName}-unique`
      };
      
      const duplicatesResult = {
        ...processedData,
        headers: [...processedData.headers, "Is Duplicate"],
        rows: duplicateRows,
        fileName: `${processedData.fileName}-duplicates`
      };
      
      setUniqueData(uniqueResult);
      setDuplicatesData(duplicatesResult);
      setDuplicateCount(duplicateRows.length);
      
      toast({
        title: "Duplicate detection complete",
        description: `Found ${duplicateRows.length} duplicates out of ${total} contacts.`,
      });
    } catch (error) {
      console.error("Error detecting duplicates:", error);
      toast({
        title: "Processing error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (dataToDownload: ProcessedData | null, type: "unique" | "duplicates") => {
    if (!dataToDownload) return;
    
    try {
      const csv = CSVService.exportToCSV(dataToDownload);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = type === "unique" 
        ? "unique_contacts.csv" 
        : "duplicate_contacts.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: `Your ${type} contacts are being downloaded.`,
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
        <CardTitle className="text-xl">Duplicate Catcher</CardTitle>
        <CardDescription>
          Find and remove duplicate contacts based on email, domain, or name
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Searching for duplicates...
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
                <Label>Email Column (optional)</Label>
                <Select value={emailField} onValueChange={setEmailField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select email column" />
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
                <Label>Domain Column (optional)</Label>
                <Select value={domainField} onValueChange={setDomainField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select domain column" />
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
                <p className="text-xs text-muted-foreground">
                  If empty and email is selected, we'll extract domains from emails
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Name Column (optional)</Label>
                <Select value={nameField} onValueChange={setNameField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select name column" />
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
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="fuzzyMatching" 
                checked={useFuzzyMatching} 
                onCheckedChange={(checked) => setUseFuzzyMatching(checked === true)}
              />
              <label 
                htmlFor="fuzzyMatching" 
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Use fuzzy name matching (for similar names like "John Smith" and "Jon Smith")
              </label>
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={handleProcess} 
                disabled={!processedData || (!emailField && !domainField && !nameField)}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Find Duplicates
              </Button>
            </div>

            {uniqueData && duplicatesData && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-lg">Unique Contacts</CardTitle>
                      <CardDescription>
                        {uniqueData.rows.length} contacts
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="py-2">
                      <Button 
                        variant="outline" 
                        onClick={() => handleDownload(uniqueData, "unique")}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Unique Contacts
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-lg text-destructive">Duplicate Contacts</CardTitle>
                      <CardDescription>
                        {duplicatesData.rows.length} contacts ({Math.round((duplicatesData.rows.length / (uniqueData.rows.length + duplicatesData.rows.length)) * 100)}%)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="py-2">
                      <Button 
                        variant="outline" 
                        onClick={() => handleDownload(duplicatesData, "duplicates")}
                        className="flex items-center gap-2"
                      >
                        <Trash className="h-4 w-4" />
                        Download Duplicates
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                
                {duplicatesData.rows.length > 0 && (
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-3">Sample Duplicates (First 5)</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            {emailField && (
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Email
                              </th>
                            )}
                            {nameField && (
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Name
                              </th>
                            )}
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              {domainField || "Domain"}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {duplicatesData.rows.slice(0, 5).map((row, index) => (
                            <tr key={index}>
                              {emailField && (
                                <td className="px-3 py-2 text-sm text-gray-500">
                                  {row[emailField] || "-"}
                                </td>
                              )}
                              {nameField && (
                                <td className="px-3 py-2 text-sm text-gray-500">
                                  {row[nameField] || "-"}
                                </td>
                              )}
                              <td className="px-3 py-2 text-sm text-gray-500">
                                {domainField ? row[domainField] : 
                                 (emailField ? extractDomain(row[emailField] || "") : "-")}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DuplicateCatcher;

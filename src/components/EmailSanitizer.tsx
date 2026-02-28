
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Check, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import * as CSVService from "@/services/csvService";

interface EmailSanitizerProps {
  processedData: ProcessedData | null;
}

interface SanitizationStats {
  totalRows: number;
  sanitizedRows: number;
  fixedEmails: number;
  flaggedFakeEntries: number;
  removedEmojis: number;
  fixedNames: number;
}

const EmailSanitizer: React.FC<EmailSanitizerProps> = ({ processedData }) => {
  const [nameFields, setNameFields] = useState<string[]>([]);
  const [emailField, setEmailField] = useState<string>("");
  const [companyField, setCompanyField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultData, setResultData] = useState<ProcessedData | null>(null);
  const [sanitizationStats, setSanitizationStats] = useState<SanitizationStats | null>(null);
  const { toast } = useToast();

  const addNameField = (field: string) => {
    if (field && !nameFields.includes(field)) {
      setNameFields([...nameFields, field]);
    }
  };

  const removeNameField = (field: string) => {
    setNameFields(nameFields.filter(f => f !== field));
  };

  // Function to sanitize text (remove emojis, weird characters)
  const sanitizeText = (text: string): { sanitized: string, wasModified: boolean } => {
    if (!text) return { sanitized: "", wasModified: false };
    
    // Original text for comparison
    const originalText = text;
    
    // Remove emojis and special characters
    // This regex matches emoji characters and other non-standard symbols
    let sanitized = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    
    // Trim multiple spaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    const wasModified = originalText !== sanitized;
    
    return { sanitized, wasModified };
  };

  // Function to check if entry is likely fake/test data
  const isFakeEntry = (text: string): boolean => {
    if (!text) return false;
    
    text = text.toLowerCase().trim();
    
    // Common test data patterns
    const fakePatterns = [
      'test', 'asdf', 'qwerty', 'n/a', 'none', 'xyz', 'fake', 'example',
      'john doe', 'jane doe', 'jdoe', '12345', 'delete', 'remove', 'dummy'
    ];
    
    // Check if the text matches any fake patterns exactly or contains bad words
    return fakePatterns.some(pattern => text === pattern || text.includes('fuck') || text.includes('shit'));
  };

  // Function to fix common email typos
  const fixEmailTypos = (email: string): { fixed: string, wasFixed: boolean } => {
    if (!email) return { fixed: "", wasFixed: false };
    
    const originalEmail = email;
    let fixed = email.toLowerCase().trim();
    
    // Common typos in email domains
    const typoFixes: Record<string, string> = {
      'gmal.com': 'gmail.com',
      'gamil.com': 'gmail.com',
      'gnail.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gmail.con': 'gmail.com',
      'gmail.co': 'gmail.com',
      'hotmai.com': 'hotmail.com',
      'hotmial.com': 'hotmail.com',
      'hotmail.con': 'hotmail.com',
      'hotmal.com': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outloo.com': 'outlook.com',
      'outlook.con': 'outlook.com',
      'yahooo.com': 'yahoo.com',
      'yaho.com': 'yahoo.com',
      'yahoo.con': 'yahoo.com'
    };
    
    // Check for domain typos
    const parts = fixed.split('@');
    if (parts.length === 2) {
      const domain = parts[1];
      if (typoFixes[domain]) {
        fixed = `${parts[0]}@${typoFixes[domain]}`;
      }
    }
    
    // Check if email was fixed
    const wasFixed = originalEmail !== fixed;
    
    return { fixed, wasFixed };
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

    if (nameFields.length === 0 && !emailField && !companyField) {
      toast({
        title: "Missing information",
        description: "Please select at least one field to sanitize",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    try {
      let processed = 0;
      const total = processedData.rows.length;
      
      // Initialize stats
      const stats: SanitizationStats = {
        totalRows: total,
        sanitizedRows: 0,
        fixedEmails: 0,
        flaggedFakeEntries: 0,
        removedEmojis: 0,
        fixedNames: 0
      };
      
      // Process each row
      const updatedRows = processedData.rows.map(row => {
        const newRow = { ...row };
        let rowModified = false;
        
        // Sanitize name fields
        nameFields.forEach(field => {
          if (newRow[field]) {
            const { sanitized, wasModified } = sanitizeText(newRow[field]);
            if (wasModified) {
              newRow[field] = sanitized;
              newRow[`Original ${field}`] = row[field];
              stats.removedEmojis++;
              stats.fixedNames++;
              rowModified = true;
            }
          }
        });
        
        // Sanitize company field
        if (companyField && newRow[companyField]) {
          const { sanitized, wasModified } = sanitizeText(newRow[companyField]);
          if (wasModified) {
            newRow[companyField] = sanitized;
            newRow[`Original ${companyField}`] = row[companyField];
            stats.removedEmojis++;
            rowModified = true;
          }
        }
        
        // Fix email typos
        if (emailField && newRow[emailField]) {
          const { fixed, wasFixed } = fixEmailTypos(newRow[emailField]);
          if (wasFixed) {
            newRow[`Original ${emailField}`] = row[emailField];
            newRow[emailField] = fixed;
            stats.fixedEmails++;
            rowModified = true;
          }
        }
        
        // Check for fake entries
        let isFake = false;
        
        // Check names
        nameFields.forEach(field => {
          if (newRow[field] && isFakeEntry(newRow[field])) {
            isFake = true;
          }
        });
        
        // Check email
        if (emailField && newRow[emailField] && isFakeEntry(newRow[emailField])) {
          isFake = true;
        }
        
        // Check company
        if (companyField && newRow[companyField] && isFakeEntry(newRow[companyField])) {
          isFake = true;
        }
        
        if (isFake) {
          newRow["Potential Fake Entry"] = "Yes";
          stats.flaggedFakeEntries++;
          rowModified = true;
        } else {
          newRow["Potential Fake Entry"] = "No";
        }
        
        if (rowModified) {
          stats.sanitizedRows++;
        }
        
        processed++;
        if (processed % 10 === 0 || processed === total) {
          setProgress(Math.floor((processed / total) * 100));
        }
        
        return newRow;
      });
      
      // Create new headers list
      const newHeaders = [...processedData.headers];
      
      // Add original fields headers
      nameFields.forEach(field => {
        if (!newHeaders.includes(`Original ${field}`)) {
          newHeaders.push(`Original ${field}`);
        }
      });
      
      if (emailField && !newHeaders.includes(`Original ${emailField}`)) {
        newHeaders.push(`Original ${emailField}`);
      }
      
      if (companyField && !newHeaders.includes(`Original ${companyField}`)) {
        newHeaders.push(`Original ${companyField}`);
      }
      
      // Add fake entry flag
      if (!newHeaders.includes("Potential Fake Entry")) {
        newHeaders.push("Potential Fake Entry");
      }
      
      // Create result dataset
      const result = {
        ...processedData,
        headers: newHeaders,
        rows: updatedRows,
        fileName: `${processedData.fileName}-sanitized`
      };
      
      setResultData(result);
      setSanitizationStats(stats);
      
      toast({
        title: "Sanitization complete",
        description: `Sanitized ${stats.sanitizedRows} contacts out of ${total}.`,
      });
    } catch (error) {
      console.error("Error sanitizing data:", error);
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
        description: "Your sanitized data is being downloaded.",
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
        <CardTitle className="text-xl">Email Sanitizer</CardTitle>
        <CardDescription>
          Clean contact data by fixing typos, removing emojis, and flagging fake entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Sanitizing contact data...
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
                <Label>Name Fields to Sanitize</Label>
                <Select onValueChange={addNameField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add name field" />
                  </SelectTrigger>
                  <SelectContent>
                    {processedData?.headers
                      .filter(header => !nameFields.includes(header))
                      .map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                
                {nameFields.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-medium">Selected Name Fields:</p>
                    <div className="flex flex-wrap gap-2">
                      {nameFields.map(field => (
                        <div key={field} className="bg-gray-100 rounded-md px-2 py-1 text-sm flex items-center gap-1">
                          <span>{field}</span>
                          <button 
                            onClick={() => removeNameField(field)} 
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Email Field to Fix Typos</Label>
                <Select value={emailField} onValueChange={setEmailField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select email field" />
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
                <Label>Company Field to Sanitize</Label>
                <Select value={companyField} onValueChange={setCompanyField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company field" />
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
                disabled={!processedData || (nameFields.length === 0 && !emailField && !companyField)}
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Sanitize Contact Data
              </Button>
              
              {resultData && (
                <Button 
                  variant="outline" 
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Sanitized Data
                </Button>
              )}
            </div>

            {sanitizationStats && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Sanitization Results</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{sanitizationStats.sanitizedRows}</div>
                      <div className="text-sm text-gray-500">Contacts Modified</div>
                      <div className="text-xs text-gray-400">
                        {Math.round((sanitizationStats.sanitizedRows / sanitizationStats.totalRows) * 100)}% of total
                      </div>
                    </CardContent>
                  </Card>
                  
                  {emailField && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{sanitizationStats.fixedEmails}</div>
                        <div className="text-sm text-gray-500">Email Typos Fixed</div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {nameFields.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{sanitizationStats.fixedNames}</div>
                        <div className="text-sm text-gray-500">Names Sanitized</div>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{sanitizationStats.removedEmojis}</div>
                      <div className="text-sm text-gray-500">Emojis/Special Chars Removed</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{sanitizationStats.flaggedFakeEntries}</div>
                      <div className="text-sm text-gray-500">Potential Fake Entries</div>
                      <div className="text-xs text-gray-400">
                        {Math.round((sanitizationStats.flaggedFakeEntries / sanitizationStats.totalRows) * 100)}% of total
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {resultData && resultData.rows.some(row => row["Potential Fake Entry"] === "Yes") && (
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-3">Sample Flagged Entries</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            {nameFields.map((field) => (
                              <th key={field} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                {field}
                              </th>
                            ))}
                            {emailField && (
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                {emailField}
                              </th>
                            )}
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Flagged As
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {resultData.rows
                            .filter(row => row["Potential Fake Entry"] === "Yes")
                            .slice(0, 5)
                            .map((row, index) => (
                              <tr key={index}>
                                {nameFields.map((field) => (
                                  <td key={field} className="px-3 py-2 text-sm text-gray-500">
                                    {row[field] || "-"}
                                  </td>
                                ))}
                                {emailField && (
                                  <td className="px-3 py-2 text-sm text-gray-500">
                                    {row[emailField] || "-"}
                                  </td>
                                )}
                                <td className="px-3 py-2 text-sm">
                                  <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                                    Potential Fake Entry
                                  </span>
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

export default EmailSanitizer;

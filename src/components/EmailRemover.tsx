import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FilterX, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import * as CSVService from "@/services/csvService";

interface EmailRemoverProps {
  processedData: ProcessedData | null;
}

const EmailRemover: React.FC<EmailRemoverProps> = ({ processedData }) => {
  const [emailField, setEmailField] = useState<string>("");
  const [titleField, setTitleField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [cleanedData, setCleanedData] = useState<ProcessedData | null>(null);
  const [removedData, setRemovedData] = useState<ProcessedData | null>(null);
  const [removedCount, setRemovedCount] = useState<number>(0);
  const { toast } = useToast();

  // Function to check if an email is a free/personal email
  const isFreeEmail = (email: string): boolean => {
    if (!email) return false;
    
    email = email.toLowerCase().trim();
    
    const freeEmailDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
      'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com',
      'gmx.com', 'inbox.com', 'me.com', 'live.com', 'msn.com'
    ];
    
    const domain = email.split('@')[1];
    return freeEmailDomains.some(freeDomain => domain === freeDomain);
  };

  // Function to check if a job title is a generic role
  const isGenericRole = (title: string): boolean => {
    if (!title) return false;
    
    title = title.toLowerCase().trim();
    
    const genericRoles = [
      'intern', 'assistant', 'associate', 'coordinator', 'support',
      'receptionist', 'trainee', 'administrator', 'clerk', 'representative',
      'help desk', 'customer service', 'student'
    ];
    
    return genericRoles.some(role => title.includes(role));
  };

  const handleRemoveFreeEmails = () => {
    if (!processedData) {
      toast({
        title: "No data available",
        description: "Please upload and process your data first",
        variant: "destructive",
      });
      return;
    }

    if (!emailField) {
      toast({
        title: "Missing information",
        description: "Please select which column contains email addresses",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    try {
      let processed = 0;
      const total = processedData.rows.length;
      
      // Separate rows into clean and removed
      const cleanRows: typeof processedData.rows = [];
      const removedRows: typeof processedData.rows = [];
      
      // Process each row
      processedData.rows.forEach(row => {
        const email = row[emailField] || "";
        
        if (isFreeEmail(email)) {
          // This is a free email, add to removed list
          removedRows.push(row);
        } else {
          // This is not a free email, keep it
          cleanRows.push(row);
        }
        
        processed++;
        if (processed % 10 === 0 || processed === total) {
          setProgress(Math.floor((processed / total) * 100));
        }
      });
      
      // Create cleaned dataset
      const cleaned = {
        ...processedData,
        rows: cleanRows,
        fileName: `${processedData.fileName}-no-free-emails`
      };
      
      // Create removed dataset
      const removed = {
        ...processedData,
        rows: removedRows,
        fileName: `${processedData.fileName}-free-emails-only`
      };
      
      setCleanedData(cleaned);
      setRemovedData(removed);
      setRemovedCount(removedRows.length);
      
      toast({
        title: "Free emails filtered",
        description: `Removed ${removedRows.length} free email addresses out of ${total} contacts.`,
      });
    } catch (error) {
      console.error("Error removing free emails:", error);
      toast({
        title: "Processing error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveGenericRoles = () => {
    if (!processedData) {
      toast({
        title: "No data available",
        description: "Please upload and process your data first",
        variant: "destructive",
      });
      return;
    }

    if (!titleField) {
      toast({
        title: "Missing information",
        description: "Please select which column contains job titles",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    try {
      let processed = 0;
      const total = processedData.rows.length;
      
      // Separate rows into clean and removed
      const cleanRows: typeof processedData.rows = [];
      const removedRows: typeof processedData.rows = [];
      
      // Process each row
      processedData.rows.forEach(row => {
        const title = row[titleField] || "";
        
        if (isGenericRole(title)) {
          // This is a generic role, add to removed list
          removedRows.push(row);
        } else {
          // This is not a generic role, keep it
          cleanRows.push(row);
        }
        
        processed++;
        if (processed % 10 === 0 || processed === total) {
          setProgress(Math.floor((processed / total) * 100));
        }
      });
      
      // Create cleaned dataset
      const cleaned = {
        ...processedData,
        rows: cleanRows,
        fileName: `${processedData.fileName}-no-generic-roles`
      };
      
      // Create removed dataset
      const removed = {
        ...processedData,
        rows: removedRows,
        fileName: `${processedData.fileName}-generic-roles-only`
      };
      
      setCleanedData(cleaned);
      setRemovedData(removed);
      setRemovedCount(removedRows.length);
      
      toast({
        title: "Generic roles filtered",
        description: `Removed ${removedRows.length} generic roles out of ${total} contacts.`,
      });
    } catch (error) {
      console.error("Error removing generic roles:", error);
      toast({
        title: "Processing error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (dataToDownload: ProcessedData | null, type: "cleaned" | "removed") => {
    if (!dataToDownload) return;
    
    try {
      const csv = CSVService.exportToCSV(dataToDownload);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${dataToDownload.fileName}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: `Your ${type === "cleaned" ? "cleaned" : "removed"} data is being downloaded.`,
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
        <CardTitle className="text-xl">Email & Role Remover</CardTitle>
        <CardDescription>
          Remove free emails and generic roles to focus on high-value contacts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Processing data...
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Completed: {progress}%
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-3">Remove Free Email Addresses</h3>
              <p className="text-sm text-gray-500 mb-4">
                Filter out Gmail, Yahoo, Hotmail, and other personal email accounts
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Email Column</Label>
                  <Select value={emailField} onValueChange={setEmailField}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select email column" />
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
                
                <div className="flex items-end">
                  <Button 
                    onClick={handleRemoveFreeEmails} 
                    disabled={!processedData || !emailField}
                    className="flex items-center gap-2"
                  >
                    <FilterX className="h-4 w-4" />
                    Remove Free Emails
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-3">Remove Generic Roles</h3>
              <p className="text-sm text-gray-500 mb-4">
                Filter out interns, assistants, support staff, and other non-decision maker roles
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                
                <div className="flex items-end">
                  <Button 
                    onClick={handleRemoveGenericRoles} 
                    disabled={!processedData || !titleField}
                    className="flex items-center gap-2"
                  >
                    <FilterX className="h-4 w-4" />
                    Remove Generic Roles
                  </Button>
                </div>
              </div>
            </div>

            {cleanedData && removedData && (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-lg">Cleaned Data</CardTitle>
                      <CardDescription>
                        {cleanedData.rows.length} contacts retained
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button 
                        variant="outline" 
                        onClick={() => handleDownload(cleanedData, "cleaned")}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Clean List
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-lg text-destructive">Removed Data</CardTitle>
                      <CardDescription>
                        {removedCount} contacts removed ({Math.round((removedCount / (cleanedData.rows.length + removedCount)) * 100)}%)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button 
                        variant="outline" 
                        onClick={() => handleDownload(removedData, "removed")}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Removed List
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                
                {removedData.rows.length > 0 && (
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-3">Sample Removed Data (First 5)</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            {emailField && (
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Email
                              </th>
                            )}
                            {titleField && (
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Job Title
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {removedData.rows.slice(0, 5).map((row, index) => (
                            <tr key={index}>
                              {emailField && (
                                <td className="px-3 py-2 text-sm text-gray-500">
                                  {row[emailField] || "-"}
                                </td>
                              )}
                              {titleField && (
                                <td className="px-3 py-2 text-sm text-gray-500">
                                  {row[titleField] || "-"}
                                </td>
                              )}
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

export default EmailRemover;

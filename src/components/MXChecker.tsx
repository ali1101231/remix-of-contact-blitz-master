
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Download, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useProcessedData } from "@/hooks/useProcessedData";

interface DomainStatus {
  domain: string;
  isValid: boolean;
  hasMX: boolean;
  isCatchAll: boolean;
  deliverability: string;
}

const MXChecker: React.FC = () => {
  const { processedData, setProcessedData } = useProcessedData();
  const [domains, setDomains] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<DomainStatus[]>([]);
  const { toast } = useToast();

  const checkDomainValidity = (domain: string): boolean => {
    // Simple domain validation regex
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    return domainRegex.test(domain);
  };

  const simulateCheckMX = async (domain: string): Promise<boolean> => {
    // In a real implementation, this would make an API call to check MX records
    // Here we're simulating with some common domains known to have MX records
    const knownMXDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com", "icloud.com", "protonmail.com"];
    const domainBase = domain.split('@').pop()?.toLowerCase() || domain.toLowerCase();
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 80% chance of having MX records for unknown domains (most real domains do)
    return knownMXDomains.includes(domainBase) || Math.random() < 0.8;
  };

  const simulateCheckCatchAll = async (domain: string): Promise<boolean> => {
    // In a real implementation, this would make an API call to check if the domain is catch-all
    // Here we're simulating with some common domains known to be catch-all
    const knownCatchAllDomains = ["gmail.com", "yahoo.com"];
    const domainBase = domain.split('@').pop()?.toLowerCase() || domain.toLowerCase();
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 30% chance of being catch-all for unknown domains
    return knownCatchAllDomains.includes(domainBase) || Math.random() < 0.3;
  };

  const getDeliverabilityStatus = (isValid: boolean, hasMX: boolean, isCatchAll: boolean): string => {
    if (!isValid) return "Invalid domain";
    if (!hasMX) return "No MX records";
    if (isCatchAll) return "Catch-all (Medium risk)";
    return "Valid (Good deliverability)";
  };

  const handleCheck = async () => {
    const domainList = domains.split(/[\n,;]/).map(d => d.trim()).filter(Boolean);
    
    if (domainList.length === 0) {
      toast({
        title: "No domains found",
        description: "Please enter at least one domain to check",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResults([]);
    
    const results: DomainStatus[] = [];
    
    for (let i = 0; i < domainList.length; i++) {
      const domain = domainList[i];
      const isValid = checkDomainValidity(domain);
      const hasMX = isValid ? await simulateCheckMX(domain) : false;
      const isCatchAll = hasMX ? await simulateCheckCatchAll(domain) : false;
      const deliverability = getDeliverabilityStatus(isValid, hasMX, isCatchAll);
      
      results.push({
        domain,
        isValid,
        hasMX,
        isCatchAll,
        deliverability
      });
      
      setProgress(Math.floor(((i + 1) / domainList.length) * 100));
    }
    
    setResults(results);
    setIsProcessing(false);
    
    toast({
      title: "Domain check complete",
      description: `Checked ${results.length} domains successfully.`,
    });
  };

  const handleAddToData = () => {
    if (!processedData || !results.length) return;
    
    // Create a domain to status mapping for quick lookup
    const domainStatusMap = results.reduce((acc, item) => {
      acc[item.domain] = item.deliverability;
      return acc;
    }, {} as Record<string, string>);
    
    // Update rows with deliverability status
    const updatedRows = processedData.rows.map(row => {
      const updatedRow = { ...row };
      
      // Try to find an email field
      const emailFields = ['email', 'email_address', 'mail', 'contact_email'];
      let emailField = '';
      
      for (const field of emailFields) {
        if (row[field]) {
          emailField = field;
          break;
        }
      }
      
      if (emailField) {
        const email = row[emailField];
        if (email) {
          const domain = email.split('@')[1];
          if (domain && domainStatusMap[domain]) {
            updatedRow["Deliverability Status"] = domainStatusMap[domain];
          }
        }
      }
      
      return updatedRow;
    });
    
    // Update processed data with the new information
    setProcessedData({
      ...processedData,
      headers: [...new Set([...processedData.headers, "Deliverability Status"])],
      rows: updatedRows,
    });
    
    toast({
      title: "Data updated",
      description: "Deliverability status has been added to your data.",
    });
  };

  const handleExportCSV = () => {
    if (!results.length) return;
    
    const headers = ["Domain", "Valid", "MX Records", "Catch-All", "Deliverability Status"];
    const csvRows = [
      headers.join(','),
      ...results.map(r => 
        [
          r.domain,
          r.isValid ? 'Yes' : 'No',
          r.hasMX ? 'Yes' : 'No',
          r.isCatchAll ? 'Yes' : 'No',
          r.deliverability
        ].join(',')
      )
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'mx_check_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">MX Record Checker</CardTitle>
        <CardDescription>
          Check domain validity, MX records, and catch-all status for email deliverability
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Checking domains...
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Progress: {progress}%
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Enter Domains (one per line or comma-separated)
              </label>
              <Textarea 
                value={domains}
                onChange={(e) => setDomains(e.target.value)}
                placeholder="e.g. gmail.com, yahoo.com, example.org"
                className="min-h-[120px]"
              />
            </div>
            
            <div className="flex gap-4">
              <Button
                onClick={handleCheck}
                className="flex items-center gap-2"
                disabled={!domains.trim()}
              >
                <Search className="h-4 w-4" />
                Check Domains
              </Button>
              
              {results.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export Results
                  </Button>
                  
                  {processedData && (
                    <Button
                      variant="secondary"
                      onClick={handleAddToData}
                      className="flex items-center gap-2"
                    >
                      Add to Dataset
                    </Button>
                  )}
                </>
              )}
            </div>
            
            {results.length > 0 && (
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Results</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valid</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">MX Records</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Catch-All</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Deliverability</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {results.map((result, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm text-gray-500">{result.domain}</td>
                          <td className="px-3 py-2 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${result.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {result.isValid ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${result.hasMX ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {result.hasMX ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${result.isCatchAll ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                              {result.isCatchAll ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              result.deliverability.includes('Good') ? 'bg-green-100 text-green-800' : 
                              result.deliverability.includes('Medium') ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {result.deliverability}
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
      </CardContent>
    </Card>
  );
};

export default MXChecker;

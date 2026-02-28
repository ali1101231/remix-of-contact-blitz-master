import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Download, AtSign } from "lucide-react";
import { ProcessedData, exportToCSV } from "@/services/csvService";

interface CompanyPullerProps {
  processedData: ProcessedData | null;
}

const CompanyPuller: React.FC<CompanyPullerProps> = ({ processedData }) => {
  const [selectedField, setSelectedField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [results, setResults] = useState<ProcessedData | null>(null);
  const { toast } = useToast();

  const extractCompanyFromEmail = (email: string): string => {
    if (!email || typeof email !== 'string') {
      return '';
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return '';
    }

    try {
      // Extract domain part (everything after @)
      const domain = email.trim().split('@')[1];
      if (!domain) return '';

      // Remove everything after the first dot (all TLD parts)
      const domainWithoutTLD = domain.split('.')[0];
      if (!domainWithoutTLD) return '';

      // Handle common prefixes like www, mail, etc.
      let cleanDomain = domainWithoutTLD;
      if (cleanDomain.startsWith('www')) {
        cleanDomain = cleanDomain.substring(3);
      }
      if (cleanDomain.startsWith('mail')) {
        cleanDomain = cleanDomain.substring(4);
      }

      // Intelligent word splitting
      const companyName = splitCompoundWords(cleanDomain);

      return companyName;
    } catch (error) {
      console.error('Error extracting company name from email:', email, error);
      return '';
    }
  };

  const splitCompoundWords = (domain: string): string => {
    // First, try to split on common separators
    let words = domain.split(/[-_]/);
    
    // If no separators found, try to split camelCase or compound words
    if (words.length === 1) {
      words = splitCamelCaseAndCompounds(domain);
    }

    // Capitalize each word properly
    const capitalizedWords = words
      .filter(word => word.length > 0)
      .map(word => {
        // Handle common abbreviations and special cases
        const upperWord = word.toUpperCase();
        if (['LLC', 'INC', 'CORP', 'LTD', 'CO', 'GROUP', 'TECH', 'IT', 'AI', 'API', 'SaaS', 'CRM', 'ERP'].includes(upperWord)) {
          return upperWord;
        }
        
        // Regular capitalization
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      });

    return capitalizedWords.join(' ');
  };

  const splitCamelCaseAndCompounds = (word: string): string[] => {
    // Split on camelCase boundaries
    let result = word.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Common compound word patterns
    const compounds = [
      { pattern: /clarity(\w+)/i, replacement: 'clarity $1' },
      { pattern: /short(\w+)/i, replacement: 'short $1' },
      { pattern: /(\w+)tech/i, replacement: '$1 tech' },
      { pattern: /(\w+)group/i, replacement: '$1 group' },
      { pattern: /(\w+)solutions/i, replacement: '$1 solutions' },
      { pattern: /(\w+)services/i, replacement: '$1 services' },
      { pattern: /(\w+)systems/i, replacement: '$1 systems' },
      { pattern: /(\w+)consulting/i, replacement: '$1 consulting' },
      { pattern: /(\w+)marketing/i, replacement: '$1 marketing' },
      { pattern: /(\w+)software/i, replacement: '$1 software' },
      { pattern: /(\w+)digital/i, replacement: '$1 digital' },
      { pattern: /(\w+)media/i, replacement: '$1 media' },
      { pattern: /(\w+)labs/i, replacement: '$1 labs' },
      { pattern: /(\w+)works/i, replacement: '$1 works' },
      { pattern: /(\w+)corp/i, replacement: '$1 corp' },
      { pattern: /(\w+)inc/i, replacement: '$1 inc' },
      { pattern: /(\w+)ltd/i, replacement: '$1 ltd' },
      { pattern: /(\w+)llc/i, replacement: '$1 llc' },
      { pattern: /data(\w+)/i, replacement: 'data $1' },
      { pattern: /web(\w+)/i, replacement: 'web $1' },
      { pattern: /auto(\w+)/i, replacement: 'auto $1' },
      { pattern: /smart(\w+)/i, replacement: 'smart $1' },
      { pattern: /quick(\w+)/i, replacement: 'quick $1' },
      { pattern: /fast(\w+)/i, replacement: 'fast $1' },
      { pattern: /easy(\w+)/i, replacement: 'easy $1' },
      { pattern: /best(\w+)/i, replacement: 'best $1' },
      { pattern: /top(\w+)/i, replacement: 'top $1' },
      { pattern: /pro(\w+)/i, replacement: 'pro $1' },
      { pattern: /max(\w+)/i, replacement: 'max $1' },
      { pattern: /super(\w+)/i, replacement: 'super $1' },
      { pattern: /mega(\w+)/i, replacement: 'mega $1' },
      { pattern: /ultra(\w+)/i, replacement: 'ultra $1' },
      { pattern: /multi(\w+)/i, replacement: 'multi $1' },
      { pattern: /global(\w+)/i, replacement: 'global $1' },
      { pattern: /world(\w+)/i, replacement: 'world $1' },
      { pattern: /universal(\w+)/i, replacement: 'universal $1' },
      { pattern: /total(\w+)/i, replacement: 'total $1' },
      { pattern: /full(\w+)/i, replacement: 'full $1' },
      { pattern: /all(\w+)/i, replacement: 'all $1' },
      { pattern: /one(\w+)/i, replacement: 'one $1' },
      { pattern: /first(\w+)/i, replacement: 'first $1' },
      { pattern: /prime(\w+)/i, replacement: 'prime $1' },
      { pattern: /elite(\w+)/i, replacement: 'elite $1' },
      { pattern: /premium(\w+)/i, replacement: 'premium $1' },
      { pattern: /advanced(\w+)/i, replacement: 'advanced $1' },
      { pattern: /next(\w+)/i, replacement: 'next $1' },
      { pattern: /new(\w+)/i, replacement: 'new $1' },
      { pattern: /modern(\w+)/i, replacement: 'modern $1' },
      { pattern: /future(\w+)/i, replacement: 'future $1' },
      { pattern: /innovative(\w+)/i, replacement: 'innovative $1' },
      { pattern: /creative(\w+)/i, replacement: 'creative $1' },
      { pattern: /strategic(\w+)/i, replacement: 'strategic $1' },
      { pattern: /dynamic(\w+)/i, replacement: 'dynamic $1' },
      { pattern: /active(\w+)/i, replacement: 'active $1' },
      { pattern: /interactive(\w+)/i, replacement: 'interactive $1' },
      { pattern: /integrated(\w+)/i, replacement: 'integrated $1' }
    ];

    // Apply compound patterns
    for (const compound of compounds) {
      if (compound.pattern.test(result)) {
        result = result.replace(compound.pattern, compound.replacement);
        break;
      }
    }

    // If still one word, try to split based on length and common patterns
    if (!result.includes(' ') && result.length > 8) {
      // Look for natural breaking points
      const breakPoints = [];
      for (let i = 3; i < result.length - 3; i++) {
        const char = result[i];
        const prevChar = result[i - 1];
        const nextChar = result[i + 1];
        
        // Break on consonant clusters or vowel-consonant boundaries
        if ((isVowel(prevChar) && !isVowel(char) && !isVowel(nextChar)) ||
            (!isVowel(prevChar) && !isVowel(char) && isVowel(nextChar))) {
          breakPoints.push(i);
        }
      }
      
      // Use the most logical break point (closest to middle)
      if (breakPoints.length > 0) {
        const middle = result.length / 2;
        const bestBreak = breakPoints.reduce((prev, curr) => 
          Math.abs(curr - middle) < Math.abs(prev - middle) ? curr : prev
        );
        result = result.slice(0, bestBreak) + ' ' + result.slice(bestBreak);
      }
    }

    return result.split(/\s+/).filter(word => word.length > 0);
  };

  const isVowel = (char: string): boolean => {
    return 'aeiouAEIOU'.includes(char);
  };

  const handleProcess = async () => {
    if (!processedData || !selectedField) {
      toast({
        title: "Missing Information",
        description: "Please select a field containing email addresses.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const processedRows = processedData.rows.map(row => {
        const email = row[selectedField] || '';
        const companyName = extractCompanyFromEmail(email);
        
        return {
          ...row,
          'Company Name (Domain)': companyName
        };
      });

      const newHeaders = [...processedData.headers];
      if (!newHeaders.includes('Company Name (Domain)')) {
        newHeaders.push('Company Name (Domain)');
      }

      const resultData: ProcessedData = {
        headers: newHeaders,
        rows: processedRows,
        fileName: `${processedData.fileName}_company_extracted`,
        source: processedData.source
      };

      setResults(resultData);

      const successCount = processedRows.filter(row => row['Company Name (Domain)']).length;

      toast({
        title: "Company Names Extracted",
        description: `Successfully extracted company names from ${successCount} out of ${processedRows.length} email addresses.`,
      });

    } catch (error) {
      console.error("Error extracting company names:", error);
      toast({
        title: "Processing Error",
        description: "An error occurred while extracting company names. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!results) return;

    try {
      const csv = exportToCSV(results);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${results.fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Started",
        description: "Your processed file is being downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download Error",
        description: "Failed to download the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!processedData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AtSign className="h-5 w-5" />
            CompanyName Puller From Emails
          </CardTitle>
          <CardDescription>
            No data available. Please upload and process a CSV file first.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AtSign className="h-5 w-5" />
            CompanyName Puller From Emails
          </CardTitle>
          <CardDescription>
            Extract company names from email domains and create a new "Company Name (Domain)" column
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailField">Select Email Field</Label>
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger>
                <SelectValue placeholder="Choose the field containing email addresses" />
              </SelectTrigger>
              <SelectContent>
                {processedData.headers.map((header, index) => (
                  <SelectItem key={index} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleProcess}
            disabled={!selectedField || isProcessing}
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Extract Company Names"}
          </Button>

          {selectedField && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Preview</h3>
              <p className="text-sm text-gray-600 mb-3">
                Sample data from the "{selectedField}" field:
              </p>
              <div className="space-y-2">
                {processedData.rows.slice(0, 3).map((row, index) => {
                  const email = row[selectedField] || '';
                  const companyName = extractCompanyFromEmail(email);
                  return (
                    <div key={index} className="text-sm">
                      <span className="font-medium">"{email}"</span> → 
                      <span className="text-blue-600"> Company: "{companyName || 'No valid company found'}"</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              Successfully processed {results.rows.length} rows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={handleDownload} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Processed File
              </Button>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {results.headers.slice(0, 4).map((header, index) => (
                        <TableHead key={index}>{header}</TableHead>
                      ))}
                      <TableHead>Company Name (Domain)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.rows.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        {results.headers.slice(0, 4).map((header, cellIndex) => (
                          <TableCell key={cellIndex}>
                            {row[header] || '-'}
                          </TableCell>
                        ))}
                        <TableCell className="font-medium text-blue-600">
                          {row['Company Name (Domain)'] || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CompanyPuller;

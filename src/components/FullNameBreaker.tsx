
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Download, UserPlus } from "lucide-react";
import { ProcessedData, exportToCSV } from "@/services/csvService";
import Papa from "papaparse";

interface FullNameBreakerProps {
  processedData: ProcessedData | null;
}

const FullNameBreaker: React.FC<FullNameBreakerProps> = ({ processedData }) => {
  const [selectedField, setSelectedField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [results, setResults] = useState<ProcessedData | null>(null);
  const { toast } = useToast();

  const breakFullName = (fullName: string): { firstName: string; lastName: string } => {
    if (!fullName || typeof fullName !== 'string') {
      return { firstName: '', lastName: '' };
    }

    const trimmedName = fullName.trim();
    const nameParts = trimmedName.split(/\s+/);

    if (nameParts.length === 0) {
      return { firstName: '', lastName: '' };
    } else if (nameParts.length === 1) {
      return { firstName: nameParts[0], lastName: '' };
    } else {
      // First part is firstName, rest is lastName
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      return { firstName, lastName };
    }
  };

  const handleProcess = async () => {
    if (!processedData || !selectedField) {
      toast({
        title: "Missing Information",
        description: "Please select a field containing full names.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const processedRows = processedData.rows.map(row => {
        const fullName = row[selectedField] || '';
        const { firstName, lastName } = breakFullName(fullName);
        
        return {
          ...row,
          'First Name': firstName,
          'Last Name': lastName
        };
      });

      const newHeaders = [...processedData.headers];
      if (!newHeaders.includes('First Name')) {
        newHeaders.push('First Name');
      }
      if (!newHeaders.includes('Last Name')) {
        newHeaders.push('Last Name');
      }

      const resultData: ProcessedData = {
        headers: newHeaders,
        rows: processedRows,
        fileName: `${processedData.fileName}_name_broken`,
        source: processedData.source
      };

      setResults(resultData);

      toast({
        title: "Names Processed Successfully",
        description: `Processed ${processedRows.length} rows. Added First Name and Last Name columns.`,
      });

    } catch (error) {
      console.error("Error processing names:", error);
      toast({
        title: "Processing Error",
        description: "An error occurred while breaking the names. Please try again.",
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
            <UserPlus className="h-5 w-5" />
            Full Name Breaker
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
            <UserPlus className="h-5 w-5" />
            Full Name Breaker
          </CardTitle>
          <CardDescription>
            Split full names into separate first name and last name columns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullNameField">Select Full Name Field</Label>
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger>
                <SelectValue placeholder="Choose the field containing full names" />
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
            {isProcessing ? "Processing..." : "Break Names"}
          </Button>

          {selectedField && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Preview</h3>
              <p className="text-sm text-gray-600 mb-3">
                Sample data from the "{selectedField}" field:
              </p>
              <div className="space-y-2">
                {processedData.rows.slice(0, 3).map((row, index) => {
                  const fullName = row[selectedField] || '';
                  const { firstName, lastName } = breakFullName(fullName);
                  return (
                    <div key={index} className="text-sm">
                      <span className="font-medium">"{fullName}"</span> → 
                      <span className="text-blue-600"> First: "{firstName}"</span>, 
                      <span className="text-green-600"> Last: "{lastName}"</span>
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
                      {results.headers.slice(0, 5).map((header, index) => (
                        <TableHead key={index}>{header}</TableHead>
                      ))}
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.rows.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        {results.headers.slice(0, 5).map((header, cellIndex) => (
                          <TableCell key={cellIndex}>
                            {row[header] || '-'}
                          </TableCell>
                        ))}
                        <TableCell className="font-medium text-blue-600">
                          {row['First Name'] || '-'}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {row['Last Name'] || '-'}
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

export default FullNameBreaker;

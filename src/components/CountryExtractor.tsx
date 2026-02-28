import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MapPin, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import { useProcessedData } from "@/hooks/useProcessedData";

const countriesData = {
  "USA": { country: "USA", region: "North America", continent: "North America" },
  "United States": { country: "USA", region: "North America", continent: "North America" },
  "US": { country: "USA", region: "North America", continent: "North America" },
  "UK": { country: "UK", region: "Europe", continent: "Europe" },
  "United Kingdom": { country: "UK", region: "Europe", continent: "Europe" },
  "Great Britain": { country: "UK", region: "Europe", continent: "Europe" },
  "Canada": { country: "Canada", region: "North America", continent: "North America" },
  "Australia": { country: "Australia", region: "Oceania", continent: "Australia" },
  "Germany": { country: "Germany", region: "Europe", continent: "Europe" },
  "France": { country: "France", region: "Europe", continent: "Europe" },
  "Italy": { country: "Italy", region: "Europe", continent: "Europe" },
  "Spain": { country: "Spain", region: "Europe", continent: "Europe" },
  "Japan": { country: "Japan", region: "East Asia", continent: "Asia" },
  "China": { country: "China", region: "East Asia", continent: "Asia" },
  "India": { country: "India", region: "South Asia", continent: "Asia" },
  "Brazil": { country: "Brazil", region: "South America", continent: "South America" },
  "Mexico": { country: "Mexico", region: "North America", continent: "North America" },
  "South Africa": { country: "South Africa", region: "Southern Africa", continent: "Africa" },
  "Nigeria": { country: "Nigeria", region: "West Africa", continent: "Africa" },
  "Russia": { country: "Russia", region: "Eastern Europe", continent: "Europe" }
};

const extractCountryInfo = (address: string) => {
  const normalizedAddress = address.toLowerCase();
  
  for (const [country, info] of Object.entries(countriesData)) {
    if (normalizedAddress.includes(country.toLowerCase())) {
      return info;
    }
  }
  
  if (normalizedAddress.match(/\b\d{5}\b/) && normalizedAddress.match(/\bca\b|\bcalifornia\b/)) {
    return countriesData["USA"];
  }
  
  if (normalizedAddress.match(/\b[A-Z0-9]{2,4}\s?[0-9][A-Z]{2}\b/i)) {
    return countriesData["UK"];
  }
  
  return { country: "Unknown", region: "Unknown", continent: "Unknown" };
};

const CountryExtractor: React.FC = () => {
  const { processedData, setProcessedData } = useProcessedData();
  const [addressField, setAddressField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultData, setResultData] = useState<ProcessedData | null>(null);
  const { toast } = useToast();

  const handleExtract = async () => {
    if (!processedData || !addressField) {
      toast({
        title: "Missing information",
        description: "Please select the address field",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    const totalRows = processedData.rows.length;
    const updatedRows = processedData.rows.map((row, index) => {
      const address = row[addressField] || "";
      const { country, region, continent } = extractCountryInfo(address);
      
      setProgress(Math.floor(((index + 1) / totalRows) * 100));
      
      return {
        ...row,
        "Country": country,
        "Region/State": region,
        "Continent": continent
      };
    });

    const resultData: ProcessedData = {
      ...processedData,
      headers: [...new Set([...processedData.headers, "Country", "Region/State", "Continent"])],
      rows: updatedRows,
      fileName: `${processedData.fileName}-with-location`
    };

    setResultData(resultData);
    if (setProcessedData) {
      setProcessedData(resultData);
    }
    setIsProcessing(false);

    toast({
      title: "Location extraction complete",
      description: `Processed ${totalRows} addresses and extracted location information.`,
    });
  };

  const handleDownload = () => {
    if (!resultData) return;
    
    const headers = resultData.headers.join(',');
    const rows = resultData.rows.map(row => 
      resultData.headers.map(header => 
        `"${(row[header] || "").replace(/"/g, '""')}"`
      ).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    
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
        <CardTitle className="text-xl">Country & Region Extractor</CardTitle>
        <CardDescription>
          Extract country, region, and continent information from addresses
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
              Extracting location data...
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Progress: {progress}%
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Address Field</Label>
              <Select value={addressField} onValueChange={setAddressField}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field containing addresses" />
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
                onClick={handleExtract}
                disabled={!processedData || !addressField}
                className="flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                Extract Locations
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
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Region/State</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Continent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {resultData.rows.slice(0, 5).map((row, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm text-gray-500">
                            {row[addressField] || "-"}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">
                            {row["Country"]}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">
                            {row["Region/State"]}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">
                            {row["Continent"]}
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

export default CountryExtractor;

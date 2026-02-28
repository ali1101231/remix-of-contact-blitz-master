import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Filter, Download } from "lucide-react";
import * as CSVService from "@/services/csvService";
import { ProcessedData, SegmentOption } from "@/services/csvService";

interface CSVProcessorProps {
  processedData?: ProcessedData[];
  initialActiveTab?: string;
  onProcessedDataChange?: (data: ProcessedData | null) => void;
}

const CSVProcessor: React.FC<CSVProcessorProps> = ({ 
  processedData = [], 
  initialActiveTab = "merge",
  onProcessedDataChange 
}) => {
  const [data, setData] = useState<ProcessedData | null>(null);
  const [mergedData, setMergedData] = useState<ProcessedData | null>(null);
  const [segmentedData, setSegmentedData] = useState<ProcessedData | null>(null);
  const [splitData, setSplitData] = useState<ProcessedData[]>([]);
  const [segmentField, setSegmentField] = useState<string>("");
  const [segmentValue, setSegmentValue] = useState<string>("");
  const [chunkSize, setChunkSize] = useState<number>(8000);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [uniqueValues, setUniqueValues] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [progress, setProgress] = useState(0);
  const [companyNameField, setCompanyNameField] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (processedData && processedData.length > 0) {
      // Select default company name field based on data source
      const firstData = processedData[0];
      if (firstData.source === 'Apollo' && firstData.headers.includes('company_name')) {
        setCompanyNameField('company_name');
      } else if (firstData.source === 'Clay' && firstData.headers.includes('company')) {
        setCompanyNameField('company');
      }
    }
  }, [processedData]);

  useEffect(() => {
    if (data && onProcessedDataChange) {
      onProcessedDataChange(data);
    }
  }, [data, onProcessedDataChange]);

  const handleProcessData = async () => {
    if (!processedData || processedData.length === 0) {
      toast({
        title: "No data",
        description: "Please upload at least one CSV file first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      // Company name field is now optional
      const merged = CSVService.mergeCSVs(processedData, companyNameField);
      setMergedData(merged);
      setData(merged);

      const fields = merged.headers || [];
      setAvailableFields(fields);

      setProgress(100);

      toast({
        title: "Processing complete",
        description: `Successfully processed ${merged.rows.length} contacts.`,
      });
    } catch (error) {
      console.error("Error processing data:", error);
      toast({
        title: "Processing error",
        description: "Failed to process the CSV data. Please check your files and try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSegment = () => {
    if (!mergedData || !segmentField || !segmentValue) {
      toast({
        title: "Missing information",
        description: "Please select a field and enter a value for segmentation.",
        variant: "destructive",
      });
      return;
    }

    try {
      const segmented = CSVService.segmentData(mergedData, segmentField, segmentValue);
      setSegmentedData(segmented);
      setData(segmented);

      toast({
        title: "Segmentation complete",
        description: `Found ${segmented.rows.length} contacts matching your criteria.`,
      });
    } catch (error) {
      toast({
        title: "Segmentation error",
        description: "Failed to segment the data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSplit = () => {
    if (!data) {
      toast({
        title: "No data",
        description: "Please process your data first before splitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      const chunks = CSVService.splitData(data, chunkSize);
      setSplitData(chunks);

      toast({
        title: "Split complete",
        description: `Created ${chunks.length} chunks of approximately ${chunkSize} contacts each.`,
      });
    } catch (error) {
      toast({
        title: "Split error",
        description: "Failed to split the data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (dataToDownload: ProcessedData | null, fileName: string = "processed_contacts.csv") => {
    if (!dataToDownload) {
      toast({
        title: "No data",
        description: "There is no data to download. Please process your data first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const csv = CSVService.exportToCSV(dataToDownload);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: "Your file is being downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download error",
        description: "Failed to download the data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFieldSelect = (field: string) => {
    setSegmentField(field);
    if (mergedData && field) {
      const values = CSVService.getUniqueValuesForField(mergedData, field);
      setUniqueValues(values.slice(0, 100));
    }
  };

  const getStatistics = () => {
    if (!data) return { totalRows: 0, uniqueCompanies: 0 };
    return CSVService.getDataStatistics(data);
  };

  const stats = getStatistics();

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl">Process Contact Lists</CardTitle>
        <CardDescription>
          Clean, segment, and prepare your contact data
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-center">Processing your data...</p>
            <Progress value={progress} className="h-2" />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <Label htmlFor="companyNameField">
                What column contains company name? (Optional)
              </Label>
              <Select
                value={companyNameField}
                onValueChange={setCompanyNameField}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select the company name column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {processedData[0]?.headers.map((header, idx) => (
                    <SelectItem key={idx} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {data && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Total Contacts</p>
                  <p className="text-3xl font-bold text-brand-dark">{stats.totalRows.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Unique Companies</p>
                  <p className="text-3xl font-bold text-brand-dark">{stats.uniqueCompanies.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Current Data Source</p>
                  <p className="text-xl font-medium text-brand-dark">{data.source}</p>
                </div>
              </div>
            )}

            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="merge">Merge & Clean</TabsTrigger>
                <TabsTrigger value="segment">Segment</TabsTrigger>
                <TabsTrigger value="split">Split</TabsTrigger>
              </TabsList>
              
              <TabsContent value="merge" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">
                    Merge multiple CSVs into one master list and clean company names by removing suffixes
                    like LLC, Inc., Ltd. while also correcting capitalization.
                  </p>
                  <Button onClick={handleProcessData} className="w-full md:w-auto">
                    Process Files
                  </Button>
                </div>
                
                {mergedData && (
                  <div className="border rounded-md p-4 mt-4">
                    <h3 className="font-medium mb-2">Sample data (first 3 rows)</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            {mergedData.headers.slice(0, 5).map((header, index) => (
                              <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {header}
                              </th>
                            ))}
                            {mergedData.headers.includes("Fixed Company Name") && (
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Fixed Company Name
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {mergedData.rows.slice(0, 3).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {mergedData.headers.slice(0, 5).map((header, colIndex) => (
                                <td key={colIndex} className="px-3 py-2 text-sm text-gray-500">
                                  {row[header] || '-'}
                                </td>
                              ))}
                              {mergedData.headers.includes("Fixed Company Name") && (
                                <td className="px-3 py-2 text-sm text-brand-dark">
                                  {row["Fixed Company Name"] || '-'}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        onClick={() => handleDownload(mergedData, "merged_cleaned_contacts.csv")}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Merged Data
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="segment" className="mt-4 space-y-4">
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Segment your contact list by specific fields such as industry, job title, etc.
                    This helps create targeted campaign lists.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="segmentField">Field to segment by</Label>
                      <Select value={segmentField} onValueChange={handleFieldSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map((field, index) => (
                            <SelectItem key={index} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="segmentValue">Value contains</Label>
                      <Input
                        value={segmentValue}
                        onChange={(e) => setSegmentValue(e.target.value)}
                        placeholder="Enter a value to search for"
                      />
                    </div>
                  </div>
                  
                  {segmentField && uniqueValues.length > 0 && (
                    <div className="space-y-2">
                      <Label>Sample values in this field:</Label>
                      <div className="flex flex-wrap gap-2">
                        {uniqueValues.slice(0, 10).map((value, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => setSegmentValue(value)}
                            className="text-xs"
                          >
                            {value}
                          </Button>
                        ))}
                        {uniqueValues.length > 10 && <span className="text-xs text-gray-500 self-center">+ {uniqueValues.length - 10} more</span>}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-4">
                    <Button
                      onClick={handleSegment}
                      disabled={!segmentField || !segmentValue}
                      className="flex items-center gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      Apply Filter
                    </Button>
                    
                    {segmentedData && (
                      <Button
                        variant="outline"
                        onClick={() => handleDownload(segmentedData, `segmented_${segmentField}_${segmentValue}.csv`)}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Segmented Data
                      </Button>
                    )}
                  </div>
                </div>
                
                {segmentedData && (
                  <div className="border rounded-md p-4 mt-4">
                    <h3 className="font-medium mb-2">
                      Segmentation Results: {segmentedData.rows.length} contacts found
                    </h3>
                    {segmentedData.rows.length === 0 ? (
                      <p className="text-sm text-gray-500">No contacts match your criteria.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              {segmentedData.headers.slice(0, 5).map((header, index) => (
                                <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {segmentedData.rows.slice(0, 3).map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {segmentedData.headers.slice(0, 5).map((header, colIndex) => (
                                  <td key={colIndex} className="px-3 py-2 text-sm text-gray-500">
                                    {row[header] || '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="split" className="mt-4 space-y-4">
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Split your contact list into smaller chunks for uploading to Apollo or other platforms.
                    The default size is 8,000 contacts per file, which is optimal for Apollo.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contacts per chunk</Label>
                      <Input
                        type="number"
                        value={chunkSize}
                        onChange={(e) => setChunkSize(Math.max(1, parseInt(e.target.value) || 1000))}
                        min={1}
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <Button onClick={handleSplit} className="flex items-center gap-2" disabled={!data}>
                        Split List
                      </Button>
                    </div>
                  </div>
                </div>
                
                {splitData.length > 0 && (
                  <div className="border rounded-md p-4 mt-4">
                    <h3 className="font-medium mb-2">
                      Split Result: {splitData.length} chunks created
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                      {splitData.map((chunk, index) => (
                        <Card key={index} className="bg-gray-50">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">Chunk {index + 1}</h4>
                                <p className="text-sm text-gray-500">{chunk.rows.length} contacts</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(chunk, `chunk_${index + 1}_of_${splitData.length}.csv`)}
                                className="flex items-center gap-1"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {splitData.length > 3 && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          onClick={() => {
                            toast({
                              title: "Download All",
                              description: "Please download each chunk individually for now.",
                            });
                          }}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download All Chunks
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CSVProcessor;

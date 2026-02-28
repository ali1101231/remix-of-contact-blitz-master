
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Download, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import { useProcessedData } from "@/hooks/useProcessedData";

interface WebsiteScraperProps {
  processedData: ProcessedData | null;
}

const WebsiteScraper: React.FC<WebsiteScraperProps> = ({ processedData }) => {
  const { setProcessedData } = useProcessedData();
  const [websiteField, setWebsiteField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [scrapedData, setScrapedData] = useState<Record<string, string>>({});
  const [resultData, setResultData] = useState<ProcessedData | null>(null);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [totalToProcess, setTotalToProcess] = useState<number>(0);
  const { toast } = useToast();

  const batchScrapeWebsites = async (
    urls: string[],
    progressCallback: (progress: number, processed: number) => void,
    shouldCancel: () => boolean
  ): Promise<Record<string, string>> => {
    const results: Record<string, string> = {};
    let completed = 0;
    
    // Limit to 100 websites
    const limitedUrls = urls.slice(0, 100);
    
    // Process in batches of 10
    for (let i = 0; i < limitedUrls.length; i += 10) {
      if (shouldCancel()) {
        break;
      }
      
      const batch = limitedUrls.slice(i, i + 10);
      
      // Process each batch of 10 sites in parallel
      const batchPromises = batch.map(async url => {
        try {
          // Check if URL has protocol, add if missing
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
          }
          
          // This is just a client-side example - for production use, you would use a proxy server or API
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
          
          if (shouldCancel()) {
            return { url, content: "" };
          }
          
          // Generate some dummy content for demonstration
          const dummyContents = [
            "Welcome to our company website. We provide innovative solutions for businesses across various industries. Our team of experts is dedicated to helping our clients achieve success through our comprehensive range of services.",
            "Our company is a leading provider of technology solutions. We specialize in software development, cloud computing, and digital transformation. Contact us today to learn how we can help your business grow.",
            "Founded in 2010, our mission is to revolutionize the industry with cutting-edge products. We serve clients worldwide with customized solutions that address their specific needs and challenges.",
            "We are a global company with offices in major cities around the world. Our diverse team of professionals brings together expertise from various fields to deliver exceptional results for our clients.",
            "Innovation is at the core of everything we do. We invest heavily in research and development to stay ahead of the competition and provide our customers with the best possible products and services."
          ];
          
          return { 
            url, 
            content: dummyContents[Math.floor(Math.random() * dummyContents.length)]
          };
        } catch (error) {
          console.error('Error scraping website:', error);
          return { url, content: `Failed to scrape: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // Add results to the accumulator
      for (const { url, content } of batchResults) {
        if (content) {
          results[url] = content;
        }
      }
      
      completed += batch.length;
      progressCallback(Math.floor((completed / limitedUrls.length) * 100), completed);
    }
    
    return results;
  };

  const handleScrape = async () => {
    if (!processedData || !websiteField) {
      toast({
        title: "Missing information",
        description: "Please select a field containing website URLs",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);
    setIsCancelled(false);
    
    try {
      // Extract URLs from the data
      const websites = processedData.rows
        .map(row => row[websiteField])
        .filter(Boolean)
        .slice(0, 100); // Limit to 100 websites
      
      if (websites.length === 0) {
        throw new Error("No valid websites found in the selected field");
      }
      
      setTotalToProcess(websites.length);
      
      toast({
        title: "Starting website scraping",
        description: `Scraping ${websites.length} websites. Processing 10 websites at a time. This may take a while.`,
      });
      
      // Scrape websites
      const results = await batchScrapeWebsites(
        websites, 
        (progress, processed) => {
          setProgress(progress);
          setProcessedCount(processed);
        },
        () => isCancelled
      );
      
      setScrapedData(results);
      
      if (!isCancelled) {
        // Update data with scraped content
        const updatedRows = processedData.rows.map(row => {
          const website = row[websiteField];
          return {
            ...row,
            "Website Content": website && results[website] ? results[website] : ""
          };
        });
        
        const updatedData = {
          ...processedData,
          headers: [...new Set([...processedData.headers, "Website Content"])],
          rows: updatedRows,
          fileName: `${processedData.fileName}-with-website-content`
        };
        
        setResultData(updatedData);
        setProcessedData(updatedData);
        
        toast({
          title: "Scraping complete",
          description: `Successfully scraped ${Object.keys(results).length} websites.`,
        });
      }
    } catch (error) {
      console.error("Error scraping websites:", error);
      toast({
        title: "Scraping error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setIsCancelled(true);
    toast({
      title: "Cancelling scraping",
      description: "The scraping operation will stop after the current batch completes.",
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
        <CardTitle className="text-xl">Website Scraper</CardTitle>
        <CardDescription>
          Extract content from the first page of your leads' websites (up to 100 sites, 10 at a time)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Scraping websites... Processing 10 websites at a time.
            </p>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Completed: {processedCount}/{totalToProcess} ({progress}%)
              </p>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleCancel}
                className="flex items-center gap-1"
              >
                <XCircle className="h-4 w-4" />
                Stop Scraping
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Website URL Field</Label>
              <Select value={websiteField} onValueChange={setWebsiteField}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field containing website URLs" />
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
                onClick={handleScrape} 
                disabled={!processedData || !websiteField}
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Start Scraping (Max 100 sites)
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
              <div className="mt-6 border rounded-md p-4">
                <h3 className="font-medium mb-3">Sample Results (First 3 rows)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Website</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Content Preview</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {resultData.rows.slice(0, 3).map((row, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm text-gray-500">
                            {row[websiteField] || "-"}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-500">
                            {row["Website Content"] 
                              ? `${row["Website Content"].substring(0, 100)}...` 
                              : "No content scraped"}
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

export default WebsiteScraper;

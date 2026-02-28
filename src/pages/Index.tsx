
import React, { useState } from "react";
import FileUpload from "@/components/FileUpload";
import CSVProcessor from "@/components/CSVProcessor";
import { ProcessedData } from "@/services/csvService";
import { Separator } from "@/components/ui/separator";
import { parseCSV } from "@/services/csvService";
import { useToast } from "@/components/ui/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import WebsiteScraper from "@/components/WebsiteScraper";
import CompanyTypeFinder from "@/components/CompanyTypeFinder";
import JobTitleNormalizer from "@/components/JobTitleNormalizer";
import JobTitleCleaner from "@/components/JobTitleCleaner";
import MXChecker from "@/components/MXChecker";
import CountryExtractor from "@/components/CountryExtractor";
import AIAssistant from "@/components/AIAssistant";
import ESPFinder from "@/components/ESPFinder";
import DuplicateCatcher from "@/components/DuplicateCatcher";
import EmailVariationGenerator from "@/components/EmailVariationGenerator";
import DecisionMakerPrioritizer from "@/components/DecisionMakerPrioritizer";
import ListHealthChecker from "@/components/ListHealthChecker";
import EmailSanitizer from "@/components/EmailSanitizer";
import EmailRemover from "@/components/EmailRemover";
import FullNameBreaker from "@/components/FullNameBreaker";
import CompanyPuller from "@/components/CompanyPuller";
import { Zap } from "lucide-react";

const Index = () => {
  const [processedData, setProcessedData] = useState<ProcessedData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [mergedData, setMergedData] = useState<ProcessedData | null>(null);
  const { toast } = useToast();

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) {
      setProcessedData([]);
      return;
    }

    setIsProcessing(true);
    toast({
      title: "Processing files",
      description: `Parsing ${files.length} files. This may take a moment...`,
    });

    try {
      const processedFilesPromises = files.map(file => parseCSV(file));
      const results = await Promise.all(processedFilesPromises);
      
      setProcessedData(results);
      
      toast({
        title: "Files processed",
        description: `Successfully processed ${files.length} files with ${results.reduce((acc, data) => acc + data.rows.length, 0)} contacts.`,
      });
    } catch (error) {
      console.error("Error processing files:", error);
      toast({
        title: "Processing error",
        description: "An error occurred while processing the files. Please check the format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleProcessedDataChange = (data: ProcessedData | null) => {
    if (data) {
      setMergedData(data);
      
      // Instead of storing directly in sessionStorage, just keep it in memory
      // This avoids the QuotaExceededError
    }
  };

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "upload":
        return (
          <div className="space-y-6">
            <FileUpload 
              onFilesSelected={handleFilesSelected} 
              multiple={true}
              acceptedFileTypes={[".csv"]}
            />
            
            {processedData.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-3">Uploaded Files</h2>
                <div className="space-y-2">
                  {processedData.map((data, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-white rounded-md border">
                      <div>
                        <p className="font-medium">{data.fileName}</p>
                        <p className="text-sm text-gray-500">{data.rows.length} contacts • {data.source} format</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case "process":
        return (
          <CSVProcessor 
            processedData={processedData} 
            onProcessedDataChange={handleProcessedDataChange}
          />
        );
      case "company-name-fixer":
        return (
          <CSVProcessor 
            processedData={processedData} 
            onProcessedDataChange={handleProcessedDataChange}
            initialActiveTab="merge"
          />
        );
      case "merge-clean":
        return (
          <CSVProcessor 
            processedData={processedData} 
            onProcessedDataChange={handleProcessedDataChange}
            initialActiveTab="merge"
          />
        );
      case "segmentation":
        return processedData.length > 0 ? 
          <CSVProcessor 
            processedData={mergedData ? [mergedData] : processedData} 
            onProcessedDataChange={handleProcessedDataChange}
            initialActiveTab="segment"
          /> : 
          <div className="p-8 text-center">
            <p>Please upload and process your files first</p>
          </div>;
      case "splitter":
        return processedData.length > 0 ? 
          <CSVProcessor 
            processedData={mergedData ? [mergedData] : processedData} 
            onProcessedDataChange={handleProcessedDataChange}
            initialActiveTab="split"
          /> : 
          <div className="p-8 text-center">
            <p>Please upload and process your files first</p>
          </div>;
      case "website-scraper":
        return <WebsiteScraper processedData={mergedData || (processedData[0] || null)} />;
      case "company-type":
        return <CompanyTypeFinder processedData={mergedData || (processedData[0] || null)} />;
      case "job-title":
        return <JobTitleNormalizer processedData={mergedData || (processedData[0] || null)} />;
      case "job-title-cleaner":
        return <JobTitleCleaner />;
      case "full-name-breaker":
        return <FullNameBreaker processedData={mergedData || (processedData[0] || null)} />;
      case "company-puller":
        return <CompanyPuller processedData={mergedData || (processedData[0] || null)} />;
      case "esp-finder":
        return <ESPFinder processedData={mergedData || (processedData[0] || null)} />;
      case "duplicate-catcher":
        return <DuplicateCatcher processedData={mergedData || (processedData[0] || null)} />;
      case "email-variation":
        return <EmailVariationGenerator processedData={mergedData || (processedData[0] || null)} />;
      case "decision-maker":
        return <DecisionMakerPrioritizer processedData={mergedData || (processedData[0] || null)} />;
      case "list-health":
        return <ListHealthChecker processedData={mergedData || (processedData[0] || null)} />;
      case "email-sanitizer":
        return <EmailSanitizer processedData={mergedData || (processedData[0] || null)} />;
      case "email-remover":
        return <EmailRemover processedData={mergedData || (processedData[0] || null)} />;
      case "mx-checker":
        return <MXChecker />;
      case "country-extractor":
        return <CountryExtractor />;
      case "ai-assistant":
        return <AIAssistant />;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-background">
        <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        
        <div className="flex-1 p-6">
          <div className="max-w-5xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-8 h-8 text-blue-500" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                LeadGenFriend
              </h1>
            </div>
            
            <p className="text-gray-400 mb-6 animate-slide-in">
              Clean, format, and prepare your contact lists in seconds — without ever touching a spreadsheet.
            </p>

            <Separator className="my-6" />
            
            <div className="glass-card p-6">
              {renderActiveComponent()}
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;

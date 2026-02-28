
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { List, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";

interface ListHealthCheckerProps {
  processedData: ProcessedData | null;
}

interface HealthStats {
  totalContacts: number;
  personalEmails: number;
  personalEmailPercent: number;
  missingLinkedIn: number;
  missingLinkedInPercent: number;
  nonDecisionMakers: number;
  nonDecisionMakerPercent: number;
  issuesByCategory: {
    [category: string]: {
      count: number;
      percent: number;
    }
  };
  overallHealth: number; // 0-100
}

const ListHealthChecker: React.FC<ListHealthCheckerProps> = ({ processedData }) => {
  const [emailField, setEmailField] = useState<string>("");
  const [linkedInField, setLinkedInField] = useState<string>("");
  const [jobTitleField, setJobTitleField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [healthStats, setHealthStats] = useState<HealthStats | null>(null);
  const { toast } = useToast();

  // Function to check if an email is a personal email
  const isPersonalEmail = (email: string): boolean => {
    if (!email) return false;
    
    email = email.toLowerCase().trim();
    
    const personalDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
      'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com',
      'gmx.com', 'inbox.com', 'me.com', 'live.com', 'msn.com'
    ];
    
    const domain = email.split('@')[1];
    return personalDomains.some(personalDomain => domain?.includes(personalDomain));
  };

  // Function to check if a job title indicates a decision maker
  const isDecisionMaker = (title: string): boolean => {
    if (!title) return false;
    
    title = title.toLowerCase().trim();
    
    // Key decision maker indicators
    const decisionMakerKeywords = [
      'founder', 'ceo', 'coo', 'cfo', 'cto', 'cmo', 'chief', 'president', 'owner',
      'director', 'vp', 'vice president', 'head of', 'lead', 'principal', 'partner',
      'chairman', 'chairwoman', 'chairperson', 'executive', 'manager', 'managing'
    ];
    
    // Check for matches
    return decisionMakerKeywords.some(keyword => title.includes(keyword));
  };

  const calculateHealthScore = (stats: Omit<HealthStats, 'overallHealth'>): number => {
    // Calculate a health score based on the metrics
    // Lower percentages of issues = higher score
    
    // Weights for each factor (customize as needed)
    const weights = {
      personalEmails: 0.3,      // 30% weight
      missingLinkedIn: 0.3,     // 30% weight
      nonDecisionMakers: 0.4     // 40% weight
    };
    
    // Convert percentages to scores (100% - percentage of issues)
    const personalEmailScore = 100 - stats.personalEmailPercent;
    const linkedInScore = 100 - stats.missingLinkedInPercent;
    const decisionMakerScore = 100 - stats.nonDecisionMakerPercent;
    
    // Weighted average score
    const weightedScore = 
      (personalEmailScore * weights.personalEmails) +
      (linkedInScore * weights.missingLinkedIn) +
      (decisionMakerScore * weights.nonDecisionMakers);
    
    return Math.round(weightedScore);
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

    if (!emailField && !linkedInField && !jobTitleField) {
      toast({
        title: "Missing information",
        description: "Please select at least one field to check",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    try {
      let processed = 0;
      const total = processedData.rows.length;
      
      // Initialize counters
      let personalEmails = 0;
      let missingLinkedIn = 0;
      let nonDecisionMakers = 0;
      
      // Process each row
      processedData.rows.forEach(row => {
        // Check for personal emails
        if (emailField && row[emailField]) {
          if (isPersonalEmail(row[emailField])) {
            personalEmails++;
          }
        }
        
        // Check for missing LinkedIn URLs
        if (linkedInField) {
          const linkedInUrl = row[linkedInField];
          if (!linkedInUrl || linkedInUrl.trim() === '') {
            missingLinkedIn++;
          }
        }
        
        // Check for non-decision makers
        if (jobTitleField && row[jobTitleField]) {
          if (!isDecisionMaker(row[jobTitleField])) {
            nonDecisionMakers++;
          }
        }
        
        processed++;
        if (processed % 10 === 0 || processed === total) {
          setProgress(Math.floor((processed / total) * 100));
        }
      });
      
      // Calculate percentages
      const personalEmailPercent = emailField ? Math.round((personalEmails / total) * 100) : 0;
      const missingLinkedInPercent = linkedInField ? Math.round((missingLinkedIn / total) * 100) : 0;
      const nonDecisionMakerPercent = jobTitleField ? Math.round((nonDecisionMakers / total) * 100) : 0;
      
      // Create health stats object
      const stats: Omit<HealthStats, 'overallHealth'> = {
        totalContacts: total,
        personalEmails,
        personalEmailPercent,
        missingLinkedIn,
        missingLinkedInPercent,
        nonDecisionMakers,
        nonDecisionMakerPercent,
        issuesByCategory: {
          "Personal Emails": {
            count: personalEmails,
            percent: personalEmailPercent
          },
          "Missing LinkedIn": {
            count: missingLinkedIn,
            percent: missingLinkedInPercent
          },
          "Non-Decision Makers": {
            count: nonDecisionMakers,
            percent: nonDecisionMakerPercent
          }
        }
      };
      
      // Calculate overall health score
      const overallHealth = calculateHealthScore(stats);
      
      setHealthStats({ ...stats, overallHealth });
      
      toast({
        title: "List health check complete",
        description: `Overall health score: ${overallHealth}/100`,
      });
    } catch (error) {
      console.error("Error checking list health:", error);
      toast({
        title: "Processing error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to determine background color based on health score
  const getHealthScoreColor = (score: number): string => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };
  
  // Function to determine background color based on issue percentage
  const getIssuePercentColor = (percent: number): string => {
    if (percent <= 20) return "bg-green-100 text-green-800";
    if (percent <= 40) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">List Health Checker</CardTitle>
        <CardDescription>
          Assess the quality and effectiveness of your contact list
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Analyzing list health...
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
                <Label>Email Column (Optional)</Label>
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
                <Label>LinkedIn URL Column (Optional)</Label>
                <Select value={linkedInField} onValueChange={setLinkedInField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select LinkedIn column" />
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
                <Label>Job Title Column (Optional)</Label>
                <Select value={jobTitleField} onValueChange={setJobTitleField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select job title column" />
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
            
            <Button 
              onClick={handleProcess} 
              disabled={!processedData || (!emailField && !linkedInField && !jobTitleField)}
              className="flex items-center gap-2"
            >
              <List className="h-4 w-4" />
              Check List Health
            </Button>

            {healthStats && (
              <div className="mt-6 space-y-6">
                <div className="text-center p-6 border rounded-lg">
                  <h2 className="text-lg font-medium mb-2">Overall List Health Score</h2>
                  <div className={`text-5xl font-bold inline-block px-4 py-2 rounded-md ${getHealthScoreColor(healthStats.overallHealth)}`}>
                    {healthStats.overallHealth}/100
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Based on the quality metrics of your {healthStats.totalContacts} contacts
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {emailField && (
                    <Card>
                      <CardHeader className="py-4">
                        <CardTitle className="text-lg">Personal Emails</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-baseline justify-between">
                          <span className={`text-xl font-bold px-2 py-1 rounded-md ${getIssuePercentColor(healthStats.personalEmailPercent)}`}>
                            {healthStats.personalEmailPercent}%
                          </span>
                          <span className="text-sm text-gray-500">
                            {healthStats.personalEmails.toLocaleString()} contacts
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                          Personal emails like Gmail or Outlook may have lower deliverability
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {linkedInField && (
                    <Card>
                      <CardHeader className="py-4">
                        <CardTitle className="text-lg">Missing LinkedIn URLs</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-baseline justify-between">
                          <span className={`text-xl font-bold px-2 py-1 rounded-md ${getIssuePercentColor(healthStats.missingLinkedInPercent)}`}>
                            {healthStats.missingLinkedInPercent}%
                          </span>
                          <span className="text-sm text-gray-500">
                            {healthStats.missingLinkedIn.toLocaleString()} contacts
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                          LinkedIn profiles help verify contact information
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {jobTitleField && (
                    <Card>
                      <CardHeader className="py-4">
                        <CardTitle className="text-lg">Non-Decision Makers</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-baseline justify-between">
                          <span className={`text-xl font-bold px-2 py-1 rounded-md ${getIssuePercentColor(healthStats.nonDecisionMakerPercent)}`}>
                            {healthStats.nonDecisionMakerPercent}%
                          </span>
                          <span className="text-sm text-gray-500">
                            {healthStats.nonDecisionMakers.toLocaleString()} contacts
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                          Non-decision makers may not have purchase authority
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-3">Recommendations</h3>
                  <ul className="space-y-2 list-disc pl-5">
                    {healthStats.personalEmailPercent > 30 && (
                      <li>Consider enriching your list with company email addresses instead of personal emails</li>
                    )}
                    {healthStats.missingLinkedInPercent > 30 && (
                      <li>Add LinkedIn URLs to verify contact identity and build credibility</li>
                    )}
                    {healthStats.nonDecisionMakerPercent > 40 && (
                      <li>Target more senior-level decision makers for better campaign results</li>
                    )}
                    {healthStats.totalContacts < 100 && (
                      <li>Your list is relatively small. Consider expanding it for better campaign reach.</li>
                    )}
                    {healthStats.overallHealth < 60 && (
                      <li>Consider using a data enrichment service to improve your list quality</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ListHealthChecker;

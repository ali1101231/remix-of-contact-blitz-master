import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Zap, Settings, Plus, Send, FileSpreadsheet, File, Download, Play, Brain } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import { useProcessedData } from "@/hooks/useProcessedData";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Papa from "papaparse";

type AIProvider = "openai" | "anthropic" | "google" | "perplexity" | "built-in";

interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  temperature: number;
}

interface ProcessingConfig {
  templatePrompt: string;
  outputColumnName: string;
}

const AIAssistant: React.FC = () => {
  const { processedData, setProcessedData } = useProcessedData();
  const [settings, setSettings] = useState<AISettings>({
    provider: "built-in",
    apiKey: "",
    model: "basic",
    temperature: 0.7
  });
  
  const [isConnected, setIsConnected] = useState<boolean>(true); // Default connected for built-in
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [processingConfig, setProcessingConfig] = useState<ProcessingConfig>({
    templatePrompt: "",
    outputColumnName: "AI_Generated_Output"
  });
  const [newField, setNewField] = useState<string>("");
  const [customFields, setCustomFields] = useState<string[]>([]);
  const { toast } = useToast();
  const [processedRows, setProcessedRows] = useState<number>(0);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("process");
  const [lastError, setLastError] = useState<string>("");
  
  // This will store our processed results
  const [resultsData, setResultsData] = useState<ProcessedData | null>(null);

  // Load API key from localStorage on component mount
  React.useEffect(() => {
    const savedSettings = localStorage.getItem("ai-settings");
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        setIsConnected(parsedSettings.provider === "built-in" || !!parsedSettings.apiKey);
      } catch (e) {
        console.error("Failed to parse saved settings:", e);
      }
    }
    
    // Load custom fields if any
    const savedFields = localStorage.getItem("custom-fields");
    if (savedFields) {
      try {
        setCustomFields(JSON.parse(savedFields));
      } catch (e) {
        console.error("Failed to parse saved fields:", e);
      }
    }
  }, []);

  const handleConnect = () => {
    if (settings.provider !== "built-in" && !settings.apiKey) {
      toast({
        title: "API Key Required",
        description: `Please enter your ${getProviderName(settings.provider)} API key to connect.`,
        variant: "destructive",
      });
      return;
    }

    // Store settings in localStorage
    localStorage.setItem("ai-settings", JSON.stringify(settings));
    setIsConnected(true);
    
    if (settings.provider === "built-in") {
      toast({
        title: "Connected to Built-in AI",
        description: "No API key required. Note that results may be less sophisticated than external AI services.",
      });
    } else {
      toast({
        title: `Connected to ${getProviderName(settings.provider)}`,
        description: "Your API key has been saved securely in your browser.",
      });
    }
    
    // Close settings after connecting
    setShowSettings(false);
    setLastError("");
  };

  const handleDisconnect = () => {
    // Remove API key from localStorage
    localStorage.removeItem("ai-settings");
    setSettings({
      ...settings,
      apiKey: ""
    });
    setIsConnected(settings.provider === "built-in");
    
    toast({
      title: `Disconnected from ${getProviderName(settings.provider)}`,
      description: "Your API key has been removed.",
    });
  };

  const addCustomField = () => {
    if (!newField) return;
    
    const updatedFields = [...customFields, newField];
    setCustomFields(updatedFields);
    setNewField("");
    
    // Store in localStorage
    localStorage.setItem("custom-fields", JSON.stringify(updatedFields));
    
    toast({
      title: "Custom Field Added",
      description: `Added "${newField}" to available fields.`,
    });
  };

  const insertField = (field: string) => {
    const cursorPosition = (document.getElementById("prompt-textarea") as HTMLTextAreaElement).selectionStart;
    const textBefore = processingConfig.templatePrompt.substring(0, cursorPosition);
    const textAfter = processingConfig.templatePrompt.substring(cursorPosition);
    
    setProcessingConfig({
      ...processingConfig,
      templatePrompt: `${textBefore}/${field}${textAfter}`
    });
    
    // Focus back on textarea
    setTimeout(() => {
      const textarea = document.getElementById("prompt-textarea") as HTMLTextAreaElement;
      textarea.focus();
      textarea.selectionStart = cursorPosition + field.length + 1;
      textarea.selectionEnd = cursorPosition + field.length + 1;
    }, 0);
  };

  const getProviderName = (provider: AIProvider): string => {
    switch (provider) {
      case "openai": return "OpenAI";
      case "anthropic": return "Anthropic Claude";
      case "google": return "Google Gemini";
      case "perplexity": return "Perplexity";
      case "built-in": return "Built-in AI";
      default: return "AI Provider";
    }
  };

  const getModelsForProvider = (provider: AIProvider): { value: string, label: string }[] => {
    switch (provider) {
      case "openai":
        return [
          { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast & Affordable)" },
          { value: "gpt-4o", label: "GPT-4o (Powerful)" },
          { value: "gpt-4.5-preview", label: "GPT-4.5 Preview (Most Powerful)" }
        ];
      case "anthropic":
        return [
          { value: "claude-3-opus", label: "Claude 3 Opus (Most Powerful)" },
          { value: "claude-3-sonnet", label: "Claude 3 Sonnet (Balanced)" },
          { value: "claude-3-haiku", label: "Claude 3 Haiku (Fast)" }
        ];
      case "google":
        return [
          { value: "gemini-pro", label: "Gemini Pro" },
          { value: "gemini-ultra", label: "Gemini Ultra" }
        ];
      case "perplexity":
        return [
          { value: "llama-3.1-sonar-small-128k-online", label: "Llama 3.1 Sonar Small (8B)" },
          { value: "llama-3.1-sonar-large-128k-online", label: "Llama 3.1 Sonar Large (70B)" },
          { value: "llama-3.1-sonar-huge-128k-online", label: "Llama 3.1 Sonar Huge (405B)" }
        ];
      case "built-in":
        return [
          { value: "basic", label: "Basic (Fast)" },
          { value: "advanced", label: "Advanced (Better quality)" }
        ];
      default:
        return [];
    }
  };

  const processRowWithAI = async (row: Record<string, string>, rowIndex: number, totalRowCount: number) => {
    try {
      let processedPrompt = processingConfig.templatePrompt;
      
      // Replace field placeholders with actual values
      const regex = /\/([A-Za-z0-9_\s]+)/g;
      const matches = processingConfig.templatePrompt.match(regex);
      
      if (matches) {
        matches.forEach(match => {
          const fieldName = match.substring(1); // Remove '/' prefix
          if (row[fieldName]) {
            // Replace all occurrences with the actual value
            const replaceRegex = new RegExp(`\\/${fieldName}`, 'g');
            processedPrompt = processedPrompt.replace(replaceRegex, row[fieldName] || "");
          }
        });
      }

      // Call the appropriate AI API based on provider
      let aiResponse: string;
      
      switch (settings.provider) {
        case "openai":
          aiResponse = await callOpenAI(processedPrompt);
          break;
        case "anthropic":
          aiResponse = await callClaude(processedPrompt);
          break;
        case "google":
          aiResponse = await callGemini(processedPrompt);
          break;
        case "perplexity":
          aiResponse = await callPerplexity(processedPrompt);
          break;
        case "built-in":
          aiResponse = await useBuiltInAI(processedPrompt, row);
          break;
        default:
          throw new Error("Invalid AI provider");
      }
      
      // Update progress
      setProcessedRows(rowIndex + 1);
      setProgress(Math.round(((rowIndex + 1) / totalRowCount) * 100));
      
      return aiResponse;
    } catch (error) {
      console.error(`Error processing row ${rowIndex}:`, error);
      setLastError(`Error processing row ${rowIndex}: ${error instanceof Error ? error.message : String(error)}`);
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  };

  // Built-in AI assistant that doesn't require an external API - IMPROVED VERSION
  const useBuiltInAI = async (prompt: string, rowData: Record<string, string>): Promise<string> => {
    // Add a small delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    const lowerPrompt = prompt.toLowerCase();
    
    // Find case study or client name
    if (lowerPrompt.includes("case study") || lowerPrompt.includes("client name")) {
      // Extract potential company names from description or other fields
      let potentialClientName = "";
      
      // Check common company name fields first
      const companyFields = ["Company", "Company Name", "Client", "Client Name", "Organization"];
      for (const field of companyFields) {
        if (rowData[field] && rowData[field].trim()) {
          return rowData[field].trim(); // Return exact company name if explicitly available
        }
      }
      
      // Look through description or other text fields for company mentions
      const textFields = Object.entries(rowData).filter(([key, value]) => 
        typeof value === 'string' && 
        value.length > 20 && 
        (key.includes("Description") || key.includes("Notes") || key.includes("Text"))
      );
      
      for (const [key, value] of textFields) {
        if (!value) continue;
        
        // Look for company indicators in sentences
        const sentences = value.split(/[.!?]+/);
        for (const sentence of sentences) {
          // Look for company naming patterns
          const companyPatterns = [
            /(?:client|customer|worked with|helped) ([A-Z][A-Za-z0-9\s&]+?)(?:,|\sto|\son|\sin|\sfor|\swhen|\sby|\s\.|\.$)/i,
            /([A-Z][A-Za-z0-9\s&]+?)(?:,? (?:Inc|LLC|Ltd|Corp|GmbH|Co|Company|Limited))/,
            /(?:project for|case study for|worked for) ([A-Z][A-Za-z0-9\s&]+)/i
          ];
          
          for (const pattern of companyPatterns) {
            const match = sentence.match(pattern);
            if (match && match[1] && match[1].length > 2) {
              return match[1].trim(); // Return just the company name
            }
          }
        }
      }
      
      // If no clear pattern match, look for capitalized words that might be company names
      for (const [key, value] of textFields) {
        if (!value) continue;
        
        const words = value.split(/\s+/);
        for (let i = 0; i < words.length; i++) {
          // Check for capitalized words that might be company names
          if (words[i].match(/^[A-Z][a-z]+$/) && 
              !["The", "A", "An", "In", "On", "At", "By", "For", "With", "About"].includes(words[i])) {
            // Look for multi-word company names
            let companyName = words[i];
            let j = i + 1;
            while (j < words.length && 
                  (words[j].match(/^[A-Z][a-z]+$/) || words[j] === "&" || words[j] === "and" || words[j].match(/^[a-z]+$/))) {
              companyName += " " + words[j];
              j++;
              // Limit company name length
              if (j - i > 5) break;
            }
            if (companyName.split(/\s+/).length > 1) {
              return companyName; // Return multi-word company name
            }
          }
        }
      }
      
      return "No clear client or case study name could be identified.";
    }
    
    // Identify products or services
    else if (lowerPrompt.includes("product") || lowerPrompt.includes("service") || 
             lowerPrompt.includes("offering") || lowerPrompt.includes("sell")) {
      
      // First check if there's a direct Product or Service field
      const productFields = ["Product", "Service", "Offering", "Solution"];
      for (const field of productFields) {
        if (rowData[field] && rowData[field].trim()) {
          return rowData[field].trim(); // Return exact product/service if explicitly available
        }
      }
      
      // Look through description or other text fields for service mentions
      const textFields = Object.entries(rowData).filter(([key, value]) => 
        typeof value === 'string' && 
        value.length > 20 && 
        (key.includes("Description") || key.includes("About") || key.includes("Text"))
      );
      
      for (const [key, value] of textFields) {
        if (!value) continue;
        
        // Try to find the most specific service pattern
        const servicePatterns = [
          /(?:offers|provides|specializes in|delivers) ([^.!?;]+?)(?:services|solutions|products|platforms|tools)/i,
          /primary (?:service|product|offering) (?:is|includes) ([^.!?;]+)/i,
          /(?:offers|provides|specializes in|delivers) ([^.!?;]+)/i
        ];
        
        for (const pattern of servicePatterns) {
          const match = value.match(pattern);
          if (match && match[1] && match[1].length > 3) {
            // Clean up the match to provide only the core service
            let service = match[1].trim();
            
            // Remove leading articles and common prefixes
            service = service.replace(/^(?:a|an|the|its|their)\s+/i, '');
            
            // Remove trailing conjunctions
            service = service.replace(/(?:\s+and|\s+or|\s+as well as)\s+.*$/, '');
            
            // If it's too long, limit it to first 10 words
            const words = service.split(/\s+/);
            if (words.length > 10) {
              service = words.slice(0, 10).join(' ') + '...';
            }
            
            return service;
          }
        }
        
        // If no pattern match, look for service keywords
        const serviceKeywords = [
          "consulting", "software", "platform", "app", "application", 
          "technology", "solution", "service", "product", "system", 
          "marketplace", "brokerage", "analytics", "automation"
        ];
        
        const sentences = value.split(/[.!?]+/);
        for (const sentence of sentences) {
          for (const keyword of serviceKeywords) {
            if (sentence.toLowerCase().includes(keyword)) {
              // Extract a concise phrase around the keyword
              const words = sentence.split(/\s+/);
              const keywordIndex = words.findIndex(w => w.toLowerCase().includes(keyword));
              
              if (keywordIndex >= 0) {
                // Take a few words before and after the keyword
                const start = Math.max(0, keywordIndex - 3);
                const end = Math.min(words.length, keywordIndex + 4);
                let servicePhrase = words.slice(start, end).join(' ');
                
                // Clean up the phrase
                servicePhrase = servicePhrase.replace(/^(?:a|an|the|its|their)\s+/i, '');
                servicePhrase = servicePhrase.replace(/[,.;:]$/, '');
                
                return servicePhrase;
              }
            }
          }
        }
      }
      
      return "No specific product or service could be identified.";
    }
    
    // Generate personalized content
    else if (lowerPrompt.includes("personalize") || lowerPrompt.includes("custom") || 
             lowerPrompt.includes("write") || lowerPrompt.includes("create")) {
      
      // Extract key information from row data
      let companyName = "";
      let personName = "";
      let industry = "";
      let role = "";
      
      // Try to find company name
      ["Company", "Company Name", "Organization"].forEach(field => {
        if (rowData[field]) companyName = rowData[field];
      });
      
      // Try to find person name
      ["Name", "First Name", "Contact Name", "Contact"].forEach(field => {
        if (rowData[field]) personName = rowData[field];
      });
      
      // Try to find industry
      ["Industry", "Sector", "Vertical"].forEach(field => {
        if (rowData[field]) industry = rowData[field];
      });
      
      // Try to find role
      ["Title", "Job Title", "Role", "Position"].forEach(field => {
        if (rowData[field]) role = rowData[field];
      });
      
      // Check if the prompt is asking for a specific template or framework
      const frameworks = {
        "pain-agitate-solution": (name: string, company: string, ind: string, pos: string) => {
          return `Hi ${name}, I noticed that ${company} might be facing challenges with ${ind || "industry"} solutions. Many ${pos || "professionals"} struggle with this. Our platform could help streamline this for you.`;
        },
        "attention-interest-desire-action": (name: string, company: string, ind: string, pos: string) => {
          return `Hi ${name}, I saw that ${company} is making waves in the ${ind || "industry"} space. I thought you might be interested in how our solution has helped similar ${pos || "professionals"} increase efficiency by 30%. Would you be open to a quick call?`;
        },
        "before-after-bridge": (name: string, company: string, ind: string, pos: string) => {
          return `Hi ${name}, before working with us, many ${pos || "professionals"} at companies like ${company} struggled with ${ind || "industry"} challenges. After implementing our solution, they saw immediate improvements. I'd love to bridge that gap for you too.`;
        },
        "problem-solution-benefit": (name: string, company: string, ind: string, pos: string) => {
          return `Hi ${name}, many ${pos || "professionals"} at ${ind || "industry"} companies like ${company} face efficiency problems. Our solution directly addresses this by automating key processes, saving you valuable time and resources.`;
        }
      };
      
      // Try to match a framework
      for (const [key, template] of Object.entries(frameworks)) {
        if (lowerPrompt.includes(key)) {
          return template(personName || "there", companyName || "your company", industry, role);
        }
      }
      
      // Check for specific writing tasks
      if (lowerPrompt.includes("subject line")) {
        return `Customized solution for ${companyName || "your"} ${industry || ""} challenges`;
      }
      
      if (lowerPrompt.includes("opening line")) {
        return personName 
          ? `Hi ${personName}, I noticed ${companyName || "your company"} has been making an impact in the ${industry || "industry"} space`
          : `I noticed ${companyName || "your company"} has been making an impact in the ${industry || "industry"} space`;
      }
      
      // Generic personalized message
      let message = "";
      
      if (personName) {
        message += `Hi ${personName}`;
        if (role) message += `, ${role}`;
        message += "! ";
      } else {
        message += "Hello! ";
      }
      
      if (companyName) {
        message += `I noticed that ${companyName} `;
        if (industry) message += `is in the ${industry} industry and `;
        message += "could benefit from our solutions. ";
      }
      
      message += "I'd love to connect and discuss how we might be able to help you achieve your goals.";
      
      return message;
    }
    
    // Provide specific answer to specific question patterns
    else if (lowerPrompt.match(/what (is|are|does)/i) || lowerPrompt.includes("tell me about") || 
             lowerPrompt.includes("describe") || lowerPrompt.includes("explain")) {
      
      // Extract the focus of the question
      let focus = "";
      
      if (lowerPrompt.includes("tell me about")) {
        focus = prompt.substring(prompt.toLowerCase().indexOf("tell me about") + 13).trim();
      } else if (lowerPrompt.includes("describe")) {
        focus = prompt.substring(prompt.toLowerCase().indexOf("describe") + 8).trim();
      } else if (lowerPrompt.includes("explain")) {
        focus = prompt.substring(prompt.toLowerCase().indexOf("explain") + 7).trim();
      } else if (lowerPrompt.match(/what (is|are|does)/i)) {
        const match = lowerPrompt.match(/what (is|are|does) ([^?]+)/i);
        if (match && match[2]) {
          focus = match[2].trim();
        }
      }
      
      // Search for that focus in the data
      if (focus) {
        // Directly check if there's an exact field match
        for (const [key, value] of Object.entries(rowData)) {
          if (key.toLowerCase().includes(focus.toLowerCase()) && value) {
            return value;
          }
        }
        
        // Search within text fields for sentences containing the focus
        const textFields = Object.entries(rowData).filter(([key, value]) => 
          typeof value === 'string' && value.length > 20
        );
        
        for (const [key, value] of textFields) {
          if (!value) continue;
          
          const sentences = value.split(/[.!?]+/);
          for (const sentence of sentences) {
            if (sentence.toLowerCase().includes(focus.toLowerCase())) {
              return sentence.trim();
            }
          }
        }
      }
      
      // If nothing specific found, pick the most relevant field
      for (const [key, value] of Object.entries(rowData)) {
        if (typeof value === 'string' && value.length > 0 && key.toLowerCase().includes("description")) {
          return value;
        }
      }
      
      return "Specific information not found in the provided data.";
    }
    
    // Extract specific data points
    else if (lowerPrompt.includes("extract") || lowerPrompt.includes("find") || lowerPrompt.includes("identify")) {
      // Determine what to extract
      let extractTarget = "";
      
      const extractPatterns = [
        /(?:extract|find|identify|get|pull) (?:the |all |)([^.!?;]+?)(?:from|in|within|of|for)/i,
        /(?:extract|find|identify|get|pull) ([^.!?;]+)/i
      ];
      
      for (const pattern of extractPatterns) {
        const match = lowerPrompt.match(pattern);
        if (match && match[1]) {
          extractTarget = match[1].trim().toLowerCase();
          break;
        }
      }
      
      // Common extraction targets
      if (extractTarget.includes("email") || extractTarget.includes("e-mail")) {
        // Look for email pattern in all fields
        for (const value of Object.values(rowData)) {
          if (typeof value !== 'string') continue;
          
          const emailMatch = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (emailMatch) {
            return emailMatch[0];
          }
        }
      }
      
      if (extractTarget.includes("phone") || extractTarget.includes("number")) {
        // Look for phone pattern in all fields
        for (const value of Object.values(rowData)) {
          if (typeof value !== 'string') continue;
          
          const phoneMatch = value.match(/(?:\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/);
          if (phoneMatch) {
            return phoneMatch[0];
          }
        }
      }
      
      if (extractTarget.includes("website") || extractTarget.includes("url") || extractTarget.includes("site")) {
        // Look for URL pattern in all fields
        for (const value of Object.values(rowData)) {
          if (typeof value !== 'string') continue;
          
          const urlMatch = value.match(/https?:\/\/[^\s]+/);
          if (urlMatch) {
            return urlMatch[0];
          }
        }
      }
      
      // Generic extraction - look for fields that might contain what's requested
      for (const [key, value] of Object.entries(rowData)) {
        if (key.toLowerCase().includes(extractTarget) && value) {
          return value;
        }
      }
      
      return `Could not find ${extractTarget} in the provided data.`;
    }
    
    // Generic request (try to give simple, focused answer)
    else {
      // Extract most important information
      const companyName = rowData["Company"] || rowData["Company Name"] || rowData["Organization"] || "";
      const description = rowData["Description"] || rowData["About"] || rowData["Company Description"] || "";
      
      // If the prompt is very short (likely just a general command), provide a concise output
      if (prompt.length < 20) {
        if (companyName) {
          return companyName + (description ? ": " + description.substring(0, 100) + (description.length > 100 ? "..." : "") : "");
        }
        
        // Return the first non-empty value that's not too long
        for (const [key, value] of Object.entries(rowData)) {
          if (typeof value === 'string' && value.length > 0 && value.length < 200) {
            return value;
          }
        }
      }
      
      // Try to interpret the prompt as a request for a specific field
      for (const [key, value] of Object.entries(rowData)) {
        if (lowerPrompt.includes(key.toLowerCase()) && value) {
          return value;
        }
      }
      
      // Default to a single sentence summary
      if (companyName && description) {
        const firstSentence = description.split(/[.!?]+/)[0];
        return `${companyName}: ${firstSentence.trim()}`;
      }
      
      // Just return the most informative field
      for (const field of ["Description", "About", "Summary", "Notes"]) {
        if (rowData[field] && typeof rowData[field] === 'string' && rowData[field].length > 0) {
          const sentences = rowData[field].split(/[.!?]+/);
          return sentences[0].trim();
        }
      }
      
      return "No relevant information found for this request.";
    }
  };

  const callOpenAI = async (prompt: string): Promise<string> => {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            { role: "system", content: "You are a helpful assistant that generates concise, useful responses." },
            { role: "user", content: prompt }
          ],
          temperature: settings.temperature
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw error;
    }
  };

  const callClaude = async (prompt: string): Promise<string> => {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: settings.model,
          max_tokens: 1000,
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: settings.temperature
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error("Claude API error:", error);
      throw error;
    }
  };

  const callGemini = async (prompt: string): Promise<string> => {
    try {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + settings.model + ":generateContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": settings.apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: settings.temperature,
            maxOutputTokens: 1000
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Gemini API error:", error);
      throw error;
    }
  };

  const callPerplexity = async (prompt: string): Promise<string> => {
    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            { role: "system", content: "Be precise and concise." },
            { role: "user", content: prompt }
          ],
          temperature: settings.temperature,
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Perplexity API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Perplexity API error:", error);
      throw error;
    }
  };

  return (
    <div>
      {/* ... existing JSX */}
    </div>
  );
};

export default AIAssistant;

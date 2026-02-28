
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Mail, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProcessedData } from "@/services/csvService";
import * as CSVService from "@/services/csvService";

interface ESPFinderProps {
  processedData: ProcessedData | null;
}

interface EmailESPCounts {
  [esp: string]: number;
}

interface MXCache {
  [domain: string]: string;
}

// Helper to map MX hostnames to ESP
function mapMxToESP(mx: string): string {
  if (!mx) return "Unknown";

  const lmx = mx.toLowerCase();
  if (
    lmx.includes("google.com") ||
    lmx.includes("aspmx.l") ||
    lmx.includes("googlemail.com")
  ) return "Google Workspace";

  if (
    lmx.includes("outlook.com") ||
    lmx.includes("protection.outlook.com") ||
    lmx.includes("office365.com") ||
    lmx.includes("hotmail.com") ||
    lmx.includes("msn.com") ||
    lmx.includes("live.com")
  ) return "Microsoft";

  if (
    lmx.includes("yahoodns.net") ||
    lmx.includes("yahoo.com")
  ) return "Yahoo";

  if (
    lmx.includes("aol.com")
  ) return "AOL";

  if (
    lmx.includes("protonmail.ch") ||
    lmx.includes("protonmail-")
  ) return "ProtonMail";

  if (
    lmx.includes("zoho.com")
  ) return "Zoho";

  if (
    lmx.includes("icloud.com") ||
    lmx.includes("me.com") ||
    lmx.includes("mac.com")
  ) return "Apple";

  if (
    lmx.includes("yandex.net") ||
    lmx.includes("yandex.ru")
  ) return "Yandex";

  if (
    lmx.includes("mail.ru")
  ) return "Mail.ru";

  if (
    lmx.includes("gmx.net") ||
    lmx.includes("gmx.com")
  ) return "GMX";
  
  if (
    lmx.includes("messagelabs.com")
  ) return "Proofpoint/Messagelabs";

  return "Other";
}

// Helper to fetch MX record (Google DNS over HTTPS; returns a promise)
async function fetchMx(domain: string): Promise<string | null> {
  try {
    const dnsUrl = `https://dns.google/resolve?name=${domain}&type=MX`;
    const response = await fetch(dnsUrl);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.Answer?.length) return null;
    // MX answer: { name, type, TTL, data: "priority hostname." }
    // "priority hostname." -- split and extract hostname
    const mxRecord: string = data.Answer[0].data.split(" ").slice(1).join("").replace(/\.$/, "");
    return mxRecord;
  } catch (e) {
    return null;
  }
}

const ESPFinder: React.FC<ESPFinderProps> = ({ processedData }) => {
  const [emailField, setEmailField] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultData, setResultData] = useState<ProcessedData | null>(null);
  const [espCounts, setEspCounts] = useState<EmailESPCounts>({});
  const [domainCache, setDomainCache] = useState<MXCache>({});
  const { toast } = useToast();

  // Process all contacts: lookup MX per unique domain, then map to ESP and annotate each row
  const handleProcess = async () => {
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

    // 1. Map emails -> domains, de-duplicate
    const allEmails = processedData.rows.map(row => row[emailField] || "").filter(Boolean);
    const uniqueDomains = Array.from(new Set(
      allEmails.map(email => {
        const parts = email.split("@");
        return parts.length === 2 ? parts[1].toLowerCase() : "";
      }).filter(x => x)
    ));

    // 2. Fetch MX for each domain (with caching)
    const mxResCache: MXCache = { ...domainCache };
    let fetched = 0;

    for (let domain of uniqueDomains) {
      if (!mxResCache[domain]) {
        let mx: string | null = null;
        try {
          mx = await fetchMx(domain);
        } catch (e) {
          mx = null;
        }
        mxResCache[domain] = mx || "Unknown";
        fetched++;
        // Progress for MX fetching (40%)
        setProgress(Math.floor((fetched / uniqueDomains.length) * 40));
      }
    }
    setDomainCache(mxResCache); // Save for UI

    // 3. For each row: assign ESP using MX mapping
    let leadESPs: EmailESPCounts = {};
    const updatedRows = processedData.rows.map(row => {
      const email = row[emailField] || "";
      let esp = "Unknown";
      if (email.includes("@")) {
        const domain = email.split("@")[1].toLowerCase();
        const mx = mxResCache[domain] || "";
        esp = mapMxToESP(mx);
      }
      leadESPs[esp] = (leadESPs[esp] || 0) + 1;
      return {
        ...row,
        "Lead's ESP": esp
      };
    });

    setEspCounts(leadESPs);

    // 4. Update processed data object
    const updatedData: ProcessedData = {
      ...processedData,
      headers: Array.from(new Set([...processedData.headers, "Lead's ESP"])),
      rows: updatedRows,
      fileName: `${processedData.fileName}-with-leads-esp`
    };
    setResultData(updatedData);

    setProgress(100);

    toast({
      title: "Processing complete",
      description: `Identified ESPs using MX records for ${updatedRows.length} contacts.`,
    });

    setIsProcessing(false);
  };

  const handleDownload = () => {
    if (!resultData) return;
    try {
      const csv = CSVService.exportToCSV(resultData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${resultData.fileName}.csv`;
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

  // Sort ESPs by count
  const sortedESPs = Object.entries(espCounts).sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">ESP Finder</CardTitle>
        <CardDescription>
          Identify the real email service provider (ESP) used by each contact by MX record lookup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <p className="text-sm text-center">
              Fetching MX records and analyzing ESPs...
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Progress: {progress}%
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address Column</Label>
              <Select value={emailField} onValueChange={setEmailField}>
                <SelectTrigger>
                  <SelectValue placeholder="Select email column" />
                </SelectTrigger>
                <SelectContent>
                  {processedData?.headers
                    .filter(header => !!header) // skip empty
                    .map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <Button 
                onClick={handleProcess} 
                disabled={!processedData || !emailField}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Identify ESPs via MX Records
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
              <div className="mt-6">
                <h3 className="font-medium mb-3">Email Provider Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  {sortedESPs.slice(0, 12).map(([esp, count]) => (
                    <div key={esp} className="border rounded-md p-3 text-center">
                      <div className="font-medium">{esp}</div>
                      <div className="text-sm text-muted-foreground">{count} contacts</div>
                      <div className="text-xs text-muted-foreground">
                        ({Math.round((count / (processedData!.rows.length)) * 100)}%)
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-3">Sample Results (First 5 rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lead's ESP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {resultData.rows.slice(0, 5).map((row, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {row[emailField] || "-"}
                            </td>
                            <td className="px-3 py-2 text-sm font-medium">
                              {row["Lead's ESP"] || "Unknown"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ESPFinder;

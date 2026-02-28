import Papa from 'papaparse';

export interface CSVRow {
  [key: string]: string;
}

export interface ProcessedData {
  headers: string[];
  rows: CSVRow[];
  fileName: string;
  source: string;
}

export interface SegmentOption {
  field: string;
  value: string;
}

// Helper function to detect CSV source (Apollo, Clay, or custom)
export const detectCsvSource = (headers: string[]): string => {
  const headersSet = new Set(headers.map(h => h.toLowerCase().trim()));
  
  if (headersSet.has('apollo_contact_id') || 
      (headersSet.has('first_name') && headersSet.has('last_name') && headersSet.has('company_name'))) {
    return 'Apollo';
  }
  
  if (headersSet.has('clay_contact_id') || 
      (headersSet.has('name') && headersSet.has('company') && headersSet.has('clay_id'))) {
    return 'Clay';
  }
  
  return 'Custom';
};

// Clean company name for cold email by removing suffixes and fixing capitalization
export const cleanCompanyName = (name: string): string => {
  if (!name) return "";

  // Normalize whitespace and trim
  let cleanedName = name.trim().replace(/\s+/g, " ");

  // Remove common suffixes
  const suffixes = [
    "Inc", "Inc.", "LLC", "Ltd", "Ltd.", "Limited", "Corp", "Corp.",
    "Corporation", "Co", "Co.", "Company", "GmbH", "AG", "S.A.",
    "S.A", "SA", "N.V.", "NV", "B.V.", "BV", "Pty Ltd", "Pty. Ltd.",
    "L.P.", "LP", "LLP", "PLLC", "PLC", "P.C.", "PC"
  ];

  // Create a regex pattern to match these suffixes with optional comma before them
  const suffixPattern = new RegExp(`\\s*,?\\s*(${suffixes.join("|")})\\s*$`, "i");
  cleanedName = cleanedName.replace(suffixPattern, "");

  // Fix capitalization (first letter uppercase, rest lowercase)
  if (cleanedName === cleanedName.toUpperCase()) {
    cleanedName = cleanedName
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  // universal: make first upper, rest lower for every word
  cleanedName = cleanedName
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Handle specific capitalization cases
  cleanedName = cleanedName
    .replace(/\b(ibm|hp|sap|aws|gm|ge|kpmg|ey|pwc)\b/ig, match => match.toUpperCase())
    .replace(/\b(mc)([a-z])/ig, (match, p1, p2) => p1.charAt(0).toUpperCase() + p1.slice(1) + p2.toUpperCase())
    .replace(/\b(o')([a-z])/ig, (match, p1, p2) => p1 + p2.toUpperCase());

  return cleanedName;
};

// Parse CSV file
export const parseCSV = (file: File): Promise<ProcessedData> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as CSVRow[];
        const source = detectCsvSource(headers);
        
        // Add the cleaned company name column
        const processedRows = rows.map(row => {
          const companyNameField = source === 'Clay' ? 'company' : 'company_name';
          const companyName = row[companyNameField] || '';
          
          return {
            ...row,
            cleaned_company_name: cleanCompanyName(companyName)
          };
        });
        
        resolve({
          headers: [...headers, 'cleaned_company_name'],
          rows: processedRows,
          fileName: file.name,
          source
        });
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

// Merge multiple CSV data sets & allow custom company name column
export const mergeCSVs = (
  dataSets: ProcessedData[],
  companyNameFieldFromUser?: string
): ProcessedData => {
  if (!dataSets || dataSets.length === 0) {
    return { headers: [], rows: [], fileName: "merged", source: "Custom" };
  }

  // Get union of all headers
  const allHeaders = new Set<string>();
  dataSets.forEach((dataset) => {
    dataset.headers.forEach((header) => allHeaders.add(header));
  });
  // Always include "Fixed Company Name"
  allHeaders.add("Fixed Company Name");

  // Merge rows
  const mergedRows: CSVRow[] = [];
  dataSets.forEach((dataset) => {
    dataset.rows.forEach((row) => {
      const companyName = companyNameFieldFromUser
        ? row[companyNameFieldFromUser] || ""
        : ""; // fallback empty string
      mergedRows.push({
        ...row,
        ["Fixed Company Name"]: cleanCompanyName(companyName),
      });
    });
  });

  return {
    headers: Array.from(allHeaders),
    rows: mergedRows,
    fileName: "merged",
    source: "Custom",
  };
};

// Segment data based on field criteria
export const segmentData = (data: ProcessedData, field: string, value: string): ProcessedData => {
  if (!data || !data.rows || !field) {
    return data;
  }
  
  const segmentedRows = data.rows.filter(row => {
    const fieldValue = row[field];
    if (!fieldValue) return false;
    
    // Case-insensitive includes check
    return fieldValue.toLowerCase().includes(value.toLowerCase());
  });
  
  return {
    ...data,
    rows: segmentedRows,
    fileName: `${data.fileName}-segmented`
  };
};

// Split data into chunks of specified size
export const splitData = (data: ProcessedData, chunkSize: number): ProcessedData[] => {
  if (!data || !data.rows || chunkSize <= 0) {
    return [data];
  }
  
  const chunks: ProcessedData[] = [];
  for (let i = 0; i < data.rows.length; i += chunkSize) {
    const chunkRows = data.rows.slice(i, i + chunkSize);
    chunks.push({
      ...data,
      rows: chunkRows,
      fileName: `${data.fileName}-part${chunks.length + 1}`
    });
  }
  
  return chunks;
};

// Export data as CSV
export const exportToCSV = (data: ProcessedData): string => {
  if (!data || !data.rows) return '';
  
  return Papa.unparse({
    fields: data.headers,
    data: data.rows
  });
};

// Get unique values for a specific field
export const getUniqueValuesForField = (data: ProcessedData, field: string): string[] => {
  if (!data || !data.rows || !field) return [];
  
  const uniqueValues = new Set<string>();
  data.rows.forEach(row => {
    const value = row[field];
    if (value) uniqueValues.add(value);
  });
  
  return Array.from(uniqueValues).sort();
};

// Get statistics for the data
export const getDataStatistics = (data: ProcessedData): Record<string, number> => {
  if (!data || !data.rows) {
    return {
      totalRows: 0,
      uniqueCompanies: 0,
    };
  }
  
  const uniqueCompanies = new Set<string>();
  data.rows.forEach(row => {
    if (row.cleaned_company_name) {
      uniqueCompanies.add(row.cleaned_company_name);
    }
  });
  
  return {
    totalRows: data.rows.length,
    uniqueCompanies: uniqueCompanies.size,
  };
};

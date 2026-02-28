
import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { ProcessedData } from "@/services/csvService";

const AppLayout = () => {
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  
  // On initial load, try to get processedData from sessionStorage
  useEffect(() => {
    const storedData = sessionStorage.getItem('processedData');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setProcessedData(parsedData);
        console.log('AppLayout: Restored data from sessionStorage');
      } catch (error) {
        console.error('AppLayout: Error parsing stored data', error);
        sessionStorage.removeItem('processedData');
      }
    }
  }, []);
  
  // Update sessionStorage when processedData changes with safe storage handling
  const handleSetProcessedData = (data: ProcessedData | null) => {
    setProcessedData(data);
    if (data) {
      try {
        // Store metadata and a sample of rows instead of all data
        const storageSafeData = {
          ...data,
          rows: data.rows.slice(0, 100), // Only store first 100 rows for preview
          _fullRowCount: data.rows.length, // Keep track of the actual row count
          _isTruncated: data.rows.length > 100 // Flag indicating truncation
        };
        
        sessionStorage.setItem('processedData', JSON.stringify(storageSafeData));
      } catch (error) {
        console.warn('Failed to store processed data in sessionStorage:', error);
        // Clear storage and try with even less data if still failing
        sessionStorage.removeItem('processedData');
        try {
          const minimalData = {
            ...data,
            rows: data.rows.slice(0, 10),
            _fullRowCount: data.rows.length,
            _isTruncated: true
          };
          sessionStorage.setItem('processedData', JSON.stringify(minimalData));
        } catch (e) {
          console.error('Still unable to store minimal data in session storage', e);
        }
      }
    } else {
      sessionStorage.removeItem('processedData');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Outlet context={{ processedData, setProcessedData: handleSetProcessedData }} />
    </div>
  );
};

export default AppLayout;

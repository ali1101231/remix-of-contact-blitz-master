
import { useOutletContext } from "react-router-dom";
import { ProcessedData } from "@/services/csvService";

type ProcessedDataContext = { 
  processedData: ProcessedData | null;
  setProcessedData: (data: ProcessedData | null) => void;
};

export const useProcessedData = (): ProcessedDataContext => {
  try {
    const context = useOutletContext<ProcessedDataContext>();
    
    // Check for context from sessionStorage if context isn't available
    if (!context || !context.processedData) {
      // Try to get from sessionStorage - with safety handling
      const storedData = sessionStorage.getItem('processedData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          console.log('useProcessedData: Retrieved data from sessionStorage');
          
          return {
            processedData: parsedData,
            setProcessedData: (data) => {
              if (data) {
                try {
                  // Store metadata and sample only to avoid quota errors
                  const storageSafeData = {
                    ...data,
                    rows: data.rows.slice(0, 100),
                    _fullRowCount: data.rows.length,
                    _isTruncated: data.rows.length > 100
                  };
                  sessionStorage.setItem('processedData', JSON.stringify(storageSafeData));
                } catch (error) {
                  console.warn('Failed to store in sessionStorage:', error);
                  sessionStorage.removeItem('processedData');
                }
              } else {
                sessionStorage.removeItem('processedData');
              }
            }
          };
        } catch (e) {
          console.warn('Error parsing stored data, removing corrupted data', e);
          sessionStorage.removeItem('processedData');
        }
      }
      
      console.warn('useProcessedData: No context available, returning default');
      return {
        processedData: null,
        setProcessedData: () => {}
      };
    }
    
    // Return the existing context with safe storage handling
    return {
      processedData: context.processedData,
      setProcessedData: (data) => {
        context.setProcessedData(data);
      }
    };
  } catch (error) {
    console.warn('useProcessedData: Error accessing context', error);
    
    // Try to get from sessionStorage as fallback with same safety pattern
    const storedData = sessionStorage.getItem('processedData');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        return {
          processedData: parsedData,
          setProcessedData: (data) => {
            if (data) {
              try {
                const storageSafeData = {
                  ...data,
                  rows: data.rows.slice(0, 100),
                  _fullRowCount: data.rows.length,
                  _isTruncated: data.rows.length > 100
                };
                sessionStorage.setItem('processedData', JSON.stringify(storageSafeData));
              } catch (e) {
                console.warn('Session storage error in fallback handler', e);
                sessionStorage.removeItem('processedData');
              }
            } else {
              sessionStorage.removeItem('processedData');
            }
          }
        };
      } catch (e) {
        console.error('Error parsing fallback storage data', e);
      }
    }
    
    return {
      processedData: null,
      setProcessedData: () => {}
    };
  }
};

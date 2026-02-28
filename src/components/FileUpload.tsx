import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  maxFileSizeMB?: number;
  acceptedFileTypes?: string[];
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  multiple = true,
  maxFileSizeMB = 50,
  acceptedFileTypes = [".csv"],
  className = "",
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFiles = (files: File[]): File[] => {
    return files.filter(file => {
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const isValidType = acceptedFileTypes.includes(fileExtension);
      
      const isValidSize = file.size <= maxFileSizeMB * 1024 * 1024;
      
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid file type. Please upload ${acceptedFileTypes.join(", ")} files.`,
          variant: "destructive",
        });
      }
      
      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the maximum file size of ${maxFileSizeMB}MB.`,
          variant: "destructive",
        });
      }
      
      return isValidType && isValidSize;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (!droppedFiles || droppedFiles.length === 0) return;
    
    const validFiles = validateFiles(droppedFiles);
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => {
        const newFiles = multiple ? [...prev, ...validFiles] : validFiles;
        onFilesSelected(newFiles);
        return newFiles;
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (!e.target.files || e.target.files.length === 0) return;
    
    const fileArray = Array.from(e.target.files);
    const validFiles = validateFiles(fileArray);
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => {
        const newFiles = multiple ? [...prev, ...validFiles] : validFiles;
        onFilesSelected(newFiles);
        return newFiles;
      });
    }
  };

  const openFileSelector = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };
  
  const removeFile = (fileToRemove: File) => {
    setSelectedFiles(prev => {
      const updatedFiles = prev.filter(file => file !== fileToRemove);
      onFilesSelected(updatedFiles);
      return updatedFiles;
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xl">Upload Contact Lists</CardTitle>
        <CardDescription>
          Drag and drop your CSV files from Apollo, Clay, or other sources
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer min-h-[200px] ${
            dragActive ? "border-brand bg-brand/5" : "border-gray-300"
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={openFileSelector}
        >
          <input
            ref={inputRef}
            type="file"
            multiple={multiple}
            accept={acceptedFileTypes.join(",")}
            className="hidden"
            onChange={handleChange}
          />
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-brand-light/30 rounded-full">
              <Upload className="h-6 w-6 text-brand-dark" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                <span className="text-brand">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {acceptedFileTypes.join(", ")} (Max size: {maxFileSizeMB}MB)
              </p>
            </div>
          </div>
        </div>
        
        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Selected files ({selectedFiles.length})</h3>
            <div className="max-h-40 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md mb-1">
                  <div className="flex items-center">
                    <div className="ml-2 text-sm">{file.name}</div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setSelectedFiles([])}>
          Clear All
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileUpload;

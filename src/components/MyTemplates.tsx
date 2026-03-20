import { useState, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Plus,
  Share2,
  Eye,
  Trash2,
  Download,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { N8NInstructions } from "./N8NInstructions";

interface User {
  email: string;
  name: string;
  picture?: string;
  plan?: string;
  tokens?: number;
}

interface UploadedTemplate {
  id: string;
  name: string;
  description?: string;
  file: File;
  uploadedAt: Date;
  status: 'uploading' | 'success' | 'error';
  size: number;
  error?: string;
  jsonData?: any;
}

interface MyTemplatesProps {
  user: User;
}

export function MyTemplates({ user }: MyTemplatesProps) {
  const [uploadedTemplates, setUploadedTemplates] = useState<UploadedTemplate[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<UploadedTemplate | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.name.toLowerCase().endsWith('.json')) {
      return 'Only .JSON files are supported';
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  const processFiles = async (files: FileList) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);

    // Process each valid file
    for (const file of validFiles) {
      const templateId = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Add to uploaded templates with uploading status
      const newTemplate: UploadedTemplate = {
        id: templateId,
        name: file.name.replace('.json', ''),
        file,
        uploadedAt: new Date(),
        status: 'uploading',
        size: file.size
      };

      setUploadedTemplates(prev => [...prev, newTemplate]);

      try {
        // Simulate upload process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Try to parse JSON to validate it's a proper N8N workflow
        const text = await file.text();
        const workflow = JSON.parse(text);
        
        // Basic validation for N8N workflow structure
        if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
          throw new Error('Invalid N8N workflow format');
        }

        // Update status to success
        setUploadedTemplates(prev => 
          prev.map(t => 
            t.id === templateId 
              ? { 
                  ...t, 
                  status: 'success' as const, 
                  description: workflow.meta?.description || 'N8N Workflow Template',
                  jsonData: workflow
                }
              : t
          )
        );

        toast.success(`Successfully uploaded ${file.name}`);
      } catch (error) {
        // Update status to error
        setUploadedTemplates(prev => 
          prev.map(t => 
            t.id === templateId 
              ? { ...t, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
              : t
          )
        );

        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, []);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const removeTemplate = (templateId: string) => {
    setUploadedTemplates(prev => prev.filter(t => t.id !== templateId));
    toast.success('Template removed');
  };

  const downloadTemplate = (template: UploadedTemplate) => {
    const url = URL.createObjectURL(template.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = template.file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const showInstructions = (template: UploadedTemplate) => {
    setSelectedTemplate(template);
    setInstructionsOpen(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-medium mb-2">Share Your Templates</h1>
                <p className="text-muted-foreground">
                  Upload and share N8N templates that you have prepared or created
                </p>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <Card className="mb-8">
            <div className="p-8">
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                  isDragOver 
                    ? 'border-primary bg-primary/5 scale-[1.02]' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                } ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                onClick={!isUploading ? handleFileSelect : undefined}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isDragOver ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                  }`}>
                    <Upload className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">
                      {isDragOver ? 'Drop your N8N templates here' : 'Drop your N8N templates here'}
                    </h3>
                    <p className="text-muted-foreground">
                      or click to browse and select multiple template files
                    </p>
                  </div>

                  <Button 
                    className="bg-primary hover:bg-primary/90 text-white px-6"
                    disabled={isUploading}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileSelect();
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Select Files
                  </Button>

                  <p className="text-sm text-muted-foreground">
                    Supports: N8N workflow .JSON files
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </Card>

          {/* My Templates Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-medium">My Templates</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              View and manage your uploaded templates
            </p>

            {/* Templates List */}
            {uploadedTemplates.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">You haven't uploaded any templates yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {uploadedTemplates.map((template) => (
                  <Card key={template.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          template.status === 'success' ? 'bg-green-100 text-green-600' :
                          template.status === 'error' ? 'bg-red-100 text-red-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {template.status === 'success' ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : template.status === 'error' ? (
                            <AlertCircle className="w-5 h-5" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{template.name}</h3>
                            <Badge 
                              variant={
                                template.status === 'success' ? 'secondary' :
                                template.status === 'error' ? 'destructive' :
                                'default'
                              }
                              className="text-xs"
                            >
                              {template.status === 'uploading' ? 'Uploading...' : 
                               template.status === 'success' ? 'Ready' : 'Failed'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{formatFileSize(template.size)}</span>
                            <span>•</span>
                            <span>{template.uploadedAt.toLocaleDateString()}</span>
                            {template.description && (
                              <>
                                <span>•</span>
                                <span className="truncate">{template.description}</span>
                              </>
                            )}
                          </div>
                          
                          {template.error && (
                            <p className="text-sm text-destructive mt-1">{template.error}</p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {template.status === 'success' && (
                          <>
                            <Button variant="ghost" size="sm" className="gap-2">
                              <Eye className="w-4 h-4" />
                              Preview
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-2"
                              onClick={() => downloadTemplate(template)}
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-2 text-primary hover:text-primary"
                              onClick={() => showInstructions(template)}
                            >
                              <HelpCircle className="w-4 h-4" />
                              Use in N8N
                            </Button>
                          </>
                        )}
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2 text-destructive hover:text-destructive"
                          onClick={() => removeTemplate(template.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Upload Guidelines */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <h4 className="font-medium">Upload Guidelines</h4>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Only valid N8N workflow .JSON files are accepted</li>
                  <li>• Maximum file size: 10MB per file</li>
                  <li>• You can upload multiple files at once</li>
                  <li>• Templates will be validated before publishing</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Instructions Modal */}
      {selectedTemplate && (
        <N8NInstructions
          isOpen={instructionsOpen}
          onClose={() => setInstructionsOpen(false)}
          type="my-template"
          title={selectedTemplate.name}
          jsonData={selectedTemplate.jsonData}
          downloadUrl={selectedTemplate.file ? URL.createObjectURL(selectedTemplate.file) : undefined}
        />
      )}
    </div>
  );
}
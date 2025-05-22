"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Loader2Icon, PlayIcon, PauseIcon, RefreshCcwIcon, CheckCircle, AlertCircle, InfoIcon} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Status {
  isRunning: boolean;
  lastRun: string | null;
  ratio?: string;
  model?: string;
}

interface ImageItem {
  id: number;
  imageTitle: string;
  prompts: string;
  imageFile: string;
  resizeImageCover: string;
  resizeImageThumb: string;
  model: string;
  ratio: string;
  size: string;
  createdAt: string;
}

const ratios = ["random", "1:1", "16:9", "3:2", "4:3", "2:3", "3:4", "9:16", "21:9"];
const models = ["random", "flux-1.1-pro-ultra", "ideogram-v3-quality"];

export default function AutomationPage() {
  const [status, setStatus] = useState<Status>({ isRunning: false, lastRun: null });
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedRatio, setSelectedRatio] = useState("random");
  const [selectedModel, setSelectedModel] = useState("random");
  const [error, setError] = useState<string | null>(null);
  const [regenLoadingId, setRegenLoadingId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await axios.get("/api/automation/status");
      setStatus(res.data);
    } catch (err) {
      setError("Failed to fetch status");
      console.error(err);
    }
  };

  const fetchImages = async () => {
    try {
      const res = await axios.get("/api/history");
      setImages(res.data);
    } catch (err) {
      setError("Failed to fetch images");
      console.error(err);
    }
  };

  const handlePlay = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post("/api/automation/play", { 
        ratio: selectedRatio,
        model: selectedModel 
      });
      if (!res.data.success) throw new Error("Failed to start automation");
      await fetchStatus();
      toast.success("Automation started successfully", {
        description: `Running with ${selectedModel} model and ${selectedRatio} ratio`,
        icon: <PlayIcon className="size-4" />
      });
    } catch {
      setError("Unable to start automation");
      toast.error("Failed to start automation", {
        icon: <AlertCircle className="size-4" />
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post("/api/automation/pause");
      if (!res.data.success) throw new Error("Failed to pause automation");
      await fetchStatus();
      toast.info("Automation paused", {
        icon: <PauseIcon className="size-4" />
      });
    } catch {
      setError("Unable to pause automation");
      toast.error("Failed to pause automation", {
        icon: <AlertCircle className="size-4" />
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateOne = async (id: number) => {
    setRegenLoadingId(id);
    try {
      await axios.post("/api/regenerate", { id });
      await fetchImages(); // reload images
      toast.success("Image regenerated", {
        icon: <CheckCircle className="size-4" />
      });
    } catch (err) {
      console.error("❌ Regenerate failed:", err);
      setError("Failed to regenerate image.");
      toast.error("Failed to regenerate image", {
        icon: <AlertCircle className="size-4" />
      });
    } finally {
      setRegenLoadingId(null);
    }
  };

  const handleImageClick = (image: ImageItem) => {
    setSelectedImage(image);
    setDialogOpen(true);
  };

  useEffect(() => {
    fetchStatus();
    fetchImages();
    const interval = setInterval(() => {
      fetchStatus();
      fetchImages();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <Toaster position="top-right" closeButton richColors />
      
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">AI Image Automation</h1>
        <Badge variant={status.isRunning ? "default" : "secondary"} className="h-6">
          {status.isRunning ? "Running" : "Paused"}
        </Badge>
      </div>

      <Card className="mb-8">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            {/* Model and Ratio Selection Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-full sm:w-40">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Model</label>
                <Select value={selectedModel} onValueChange={setSelectedModel} disabled={status.isRunning || loading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model === "random" ? "🎲 Random" : model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-40">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Ratio</label>
                <Select value={selectedRatio} onValueChange={setSelectedRatio} disabled={status.isRunning || loading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    {ratios.map((ratio) => (
                      <SelectItem key={ratio} value={ratio}>
                        {ratio === "random" ? "🎲 Random" : ratio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Control Buttons and Status Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex gap-3 w-full sm:w-auto">
                <Button 
                  className="w-full sm:w-auto" 
                  disabled={loading || status.isRunning} 
                  onClick={handlePlay}
                >
                  {loading ? (
                    <Loader2Icon className="size-4 mr-2 animate-spin" />
                  ) : (
                    <PlayIcon className="size-4 mr-2" />
                  )}
                  Start
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full sm:w-auto" 
                  disabled={loading || !status.isRunning} 
                  onClick={handlePause}
                >
                  <PauseIcon className="size-4 mr-2" />
                  Pause
                </Button>
              </div>

              {status.lastRun && (
                <div className="flex items-center gap-2 text-sm text-gray-500 sm:ml-auto">
                  <InfoIcon className="size-4" />
                  <span>Last run: {new Date(status.lastRun).toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            {/* Current Settings Display */}
            {(status.isRunning && (status.model || status.ratio)) && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-blue-800 mb-1">Current Settings:</div>
                <div className="flex gap-2">
                  {status.model && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Model: {status.model}
                    </Badge>
                  )}
                  {status.ratio && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Ratio: {status.ratio}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="size-4" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {images.map((item) => (
          <Card key={item.id} className="overflow-hidden shadow-sm hover:shadow transition-shadow">
            <div 
              className="relative h-48 bg-gray-50 cursor-pointer"
              onClick={() => item.imageFile && handleImageClick(item)}
            >
              {item.imageFile ? (
                <img
                  src={item.imageFile.replace(/^\/public/, "")}
                  alt={item.imageTitle}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/fallback.jpg";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Loader2Icon className="size-5 mr-2 animate-spin" />
                  <span>Processing...</span>
                </div>
              )}
            </div>
            
            <CardContent className="p-4">
              <h2 className="font-medium text-sm truncate">{item.imageTitle}</h2>
              <p className="text-xs text-gray-500 line-clamp-2 mt-1 h-8">{item.prompts}</p>
              
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs px-2">
                    {item.model}
                  </Badge>
                  <Badge variant="secondary" className="text-xs px-2">
                    {item.ratio}
                  </Badge>
                  {item.size && (
                    <Badge variant="secondary" className="text-xs px-2">
                      {item.size}
                    </Badge>
                  )}
                </div>
                
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={regenLoadingId === item.id}
                    onClick={() => regenerateOne(item.id)}
                  >
                    {regenLoadingId === item.id ? (
                      <div className="flex items-center justify-center">
                        <Loader2Icon className="size-3 mr-2 animate-spin" />
                        <span>Regenerating</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <RefreshCcwIcon className="size-3 mr-2" />
                        <span>Regenerate</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl w-[90vw]">
          <DialogHeader>
            <DialogTitle>
              {selectedImage?.imageTitle}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {selectedImage?.imageFile ? (
              <img
                src={selectedImage.imageFile.replace(/^\/public/, "")}
                alt={selectedImage.imageTitle}
                className="w-full max-h-[70vh] object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/fallback.jpg";
                }}
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center text-gray-400">
                Image not available
              </div>
            )}
          </div>
          
          <div className="mt-4 space-y-4">
            <div className="text-sm space-y-2">
              <DialogDescription className="mb-2">
                Prompt used to generate this image:
              </DialogDescription>
              <div className="text-sm font-medium">
                {selectedImage?.prompts}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {selectedImage?.model && (
                <Badge variant="secondary" className="px-2">
                  {selectedImage.model}
                </Badge>
              )}
              {selectedImage?.ratio && (
                <Badge variant="secondary" className="px-2">
                  {selectedImage.ratio}
                </Badge>
              )}
              {selectedImage?.size && (
                <Badge variant="secondary" className="px-2">
                  {selectedImage.size}
                </Badge>
              )}
              {selectedImage?.createdAt && (
                <Badge variant="secondary" className="px-2">
                  {new Date(selectedImage.createdAt).toLocaleString()}
                </Badge>
              )}
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                disabled={regenLoadingId === selectedImage?.id}
                onClick={() => selectedImage && regenerateOne(selectedImage.id)}
              >
                {regenLoadingId === selectedImage?.id ? (
                  <div className="flex items-center">
                    <Loader2Icon className="size-4 mr-2 animate-spin" />
                    <span>Regenerating</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <RefreshCcwIcon className="size-4 mr-2" />
                    <span>Regenerate</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
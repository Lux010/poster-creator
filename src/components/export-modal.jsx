import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Download } from "lucide-react";
import { useToast } from "../hooks/use-toast";

export default function ExportModal({
  open,
  onOpenChange,
  exportFunction,
  posterName,
  setPosterName,
}) {
  const { toast } = useToast();
  const [format, setFormat] = useState("png");
  const [quality, setQuality] = useState("high");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!exportFunction) return;

    setIsExporting(true);
    try {
      const dataUrl = await exportFunction();

      if (!dataUrl) {
        throw new Error("No data URL generated");
      }

      if (!posterName.trim()) {
        toast({
          title: "Name required",
          description: "Please enter a poster name",
        });
        return;
      }

      // Example usage
      console.log("Exporting poster:", posterName);

      // Create download link
      const link = document.createElement("a");
      link.download = `${posterName}.${format}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Your poster has been downloaded as ${format.toUpperCase()}.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "Failed to export your poster. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Poster</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Poster name input */}
          <label className="block text-sm font-medium mb-1">Poster name</label>
          <input
            type="text"
            value={posterName}
            onChange={(e) => setPosterName(e.target.value)}
            placeholder="e.g. Weekend Special"
            className="w-full border rounded-md px-3 py-2 mb-4"
          />

          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-2 block">
              Format
            </Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG (Recommended)</SelectItem>
                <SelectItem value="jpg">JPG</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-2 block">
              Quality
            </Label>
            <Select value={quality} onValueChange={setQuality}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High (Best for print)</SelectItem>
                <SelectItem value="medium">Medium (Web optimized)</SelectItem>
                <SelectItem value="low">Low (Small file size)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Download"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

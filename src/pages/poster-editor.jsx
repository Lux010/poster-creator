import { useState, useCallback } from "react";
import { fabric } from "fabric";
import PosterCanvas from "../components/poster-canvas";
import TemplateSidebar from "../components/template-sidebar";
import PropertiesPanel from "../components/properties-panel";
import ExportModal from "../components/export-modal";
import { Button } from "../components/ui/button";
import { Download } from "lucide-react";

export default function PosterEditor() {
  const [canvasInstance, setCanvasInstance] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [canvasState, setCanvasState] = useState({
    zoom: 1,
    selectedObject: null,
    objectCount: 0,
    backgroundColor: "#ffffff",
    showGrid: false,
    snapToGrid: false,
  });

  const handleCanvasReady = useCallback((canvas) => {
    setCanvasInstance(canvas);
  }, []);

  const handleCanvasStateChange = useCallback((updates) => {
    setCanvasState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleTemplateSelect = useCallback(
    (template) => {
      if (!canvasInstance) return;

      try {
        canvasInstance.clear();
        if (template.canvasData) {
          canvasInstance.loadFromJSON(template.canvasData, () => {
            canvasInstance.renderAll();
          });
        }
      } catch (error) {
        console.warn("Template loading failed:", error);
      }
    },
    [canvasInstance]
  );

  const handleAddElement = useCallback(
    (elementData) => {
      if (!canvasInstance) return;

      try {
        switch (elementData.type) {
          case "text":
            const text = new fabric.Text(elementData.text || "New Text", {
              left: 100,
              top: 100,
              fontSize: 20,
              fill: "#000000",
            });
            canvasInstance.add(text);
            break;
          case "rectangle":
            const rect = new fabric.Rect({
              left: 100,
              top: 100,
              width: 100,
              height: 100,
              fill: "#FF0000",
            });
            canvasInstance.add(rect);
            break;
          case "circle":
            const circle = new fabric.Circle({
              left: 100,
              top: 100,
              radius: 50,
              fill: "#00FF00",
            });
            canvasInstance.add(circle);
            break;
        }
        canvasInstance.renderAll();
      } catch (error) {
        console.warn("Element creation failed:", error);
      }
    },
    [canvasInstance]
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Poster Editor</h1>
          <Button
            onClick={() => setExportModalOpen(true)}
            disabled={!canvasInstance}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        <div className="w-64 bg-white border-r overflow-y-auto">
          <TemplateSidebar
            templates={[]}
            onTemplateSelect={handleTemplateSelect}
            onAddElement={handleAddElement}
            canvasInstance={canvasInstance}
          />
        </div>

        <div className="flex-1 p-4">
          <PosterCanvas
            onCanvasReady={handleCanvasReady}
            canvasState={canvasState}
            onCanvasStateChange={handleCanvasStateChange}
          />
        </div>

        <div className="w-80 bg-white border-l overflow-y-auto">
          <PropertiesPanel
            selectedObject={canvasState.selectedObject}
            canvasInstance={canvasInstance}
            canvasState={canvasState}
            onCanvasStateChange={handleCanvasStateChange}
          />
        </div>
      </div>

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        canvasInstance={canvasInstance}
      />
    </div>
  );
}

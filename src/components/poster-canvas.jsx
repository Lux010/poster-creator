import { useEffect, useRef } from "react";
import { fabric } from "fabric";

export default function PosterCanvas({
  onCanvasReady,
  canvasState,
  onCanvasStateChange,
}) {
  const canvasRef = useRef(null);
  const canvasInstanceRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!canvasRef.current || isInitialized.current) return;

    // Initialize Fabric.js canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      backgroundColor: "#ffffff",
      selection: true,
      preserveObjectStacking: true,
      width: 800,
      height: 600,
    });

    canvasInstanceRef.current = canvas;
    isInitialized.current = true;

    // Add initial welcome text
    const welcomeText = new fabric.Text("Click on Templates to get started!", {
      left: 250,
      top: 280,
      fontSize: 24,
      fontFamily: "Inter",
      fill: "#64748B",
      textAlign: "center",
    });
    canvas.add(welcomeText);

    // Canvas event listeners
    canvas.on("selection:created", (e) => {
      const selectedObject = e.selected?.[0] || e.target;
      onCanvasStateChange({
        selectedObject,
        objectCount: canvas.getObjects().length,
      });
    });

    canvas.on("selection:updated", (e) => {
      const selectedObject = e.selected?.[0] || e.target;
      onCanvasStateChange({
        selectedObject,
        objectCount: canvas.getObjects().length,
      });
    });

    canvas.on("selection:cleared", () => {
      onCanvasStateChange({
        selectedObject: null,
        objectCount: canvas.getObjects().length,
      });
    });

    canvas.on("object:added", () => {
      onCanvasStateChange({
        objectCount: canvas.getObjects().length,
      });
    });

    canvas.on("object:removed", () => {
      onCanvasStateChange({
        objectCount: canvas.getObjects().length,
      });
    });

    // Notify parent component
    onCanvasReady(canvas);

    // Cleanup
    return () => {
      if (canvas) {
        canvas.dispose();
      }
      isInitialized.current = false;
    };
  }, []);

  // Update canvas background when state changes
  useEffect(() => {
    if (canvasInstanceRef.current && canvasState.backgroundColor) {
      canvasInstanceRef.current.setBackgroundColor(
        canvasState.backgroundColor,
        () => canvasInstanceRef.current?.renderAll()
      );
    }
  }, [canvasState.backgroundColor]);

  return (
    <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-200">
      <canvas
        ref={canvasRef}
        className="border border-gray-300 rounded bg-white shadow-sm"
      />
    </div>
  );
}

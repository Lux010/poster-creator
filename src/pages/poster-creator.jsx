import React, { useState, useRef, useCallback } from "react";
import predefinedImages from "../assets/index";
import { toPng } from "html-to-image";
import {
  Upload,
  Type,
  Image,
  Square,
  Circle,
  Download,
  Trash2,
  Move,
  RotateCw,
  Palette,
  Plus,
  Grid3x3,
} from "lucide-react";
import { Button } from "../components/ui/button";
import ExportModal from "../components/export-modal";

const PosterCreator = () => {
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 800 });
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [leftTab, setLeftTab] = useState("create");
  const [rightTab, setRightTab] = useState("properties");
  const [draggedElement, setDraggedElement] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [posterName, setPosterName] = useState("");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [zoom, setZoom] = useState(1);

  const zoomIn = () =>
    setZoom((z) => Math.min(3, parseFloat((z + 0.1).toFixed(1))));
  const zoomOut = () =>
    setZoom((z) => Math.max(0.1, parseFloat((z - 0.1).toFixed(1))));
  const zoomFit = () => {
    // fit canvas width inside center panel (approx window - 640px for both sidebars)
    const available = window.innerWidth - 640 - 64; // minus panels and padding
    setZoom(parseFloat(Math.min(1, available / canvasSize.width).toFixed(2)));
  };

  const [showImageSourcePicker, setShowImageSourcePicker] = useState(false);
  const [showPredefinedPicker, setShowPredefinedPicker] = useState(false);
  const [activeImageCategory, setActiveImageCategory] = useState("Products");
  const [removeBackground, setRemoveBackground] = useState(false);
  const [isProcessingBg, setIsProcessingBg] = useState(false);

  // Add new text element
  const addTextElement = () => {
    const newElement = {
      id: Date.now(),
      type: "text",
      content: "Double click to edit",
      x: 50,
      y: 100,
      fontSize: 24,
      fontFamily: "Arial",
      color: "#000000",
      fontWeight: "normal",
      textAlign: "left",
      rotation: 0,
      zIndex: elements.length,
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  // Add image element
  const addImageElement = useCallback(
    (imageSrc) => {
      const newElement = {
        id: Date.now(),
        type: "image",
        src: imageSrc,
        x: 50,
        y: 50,
        width: 200,
        height: 150,
        rotation: 0,
        zIndex: elements.length,
      };
      setElements((prev) => [...prev, newElement]);
      setSelectedElement(newElement.id);
    },
    [elements.length]
  );

  // Add shape element
  const addShape = (shapeType) => {
    const newElement = {
      id: Date.now(),
      type: "shape",
      shapeType,
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      fill: "#3b82f6",
      stroke: "#1e40af",
      strokeWidth: 2,
      rotation: 0,
      zIndex: elements.length,
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  // --- Background removal helpers ---

  // Sample the 4 corners + edges to guess background color
  const detectBgColor = (pixels, width, height) => {
    const samples = [
      [0, 0],
      [width - 1, 0],
      [0, height - 1],
      [width - 1, height - 1],
      [Math.floor(width / 2), 0],
      [0, Math.floor(height / 2)],
      [width - 1, Math.floor(height / 2)],
      [Math.floor(width / 2), height - 1],
    ];
    let rSum = 0,
      gSum = 0,
      bSum = 0;
    for (const [x, y] of samples) {
      const i = (y * width + x) * 4;
      rSum += pixels[i];
      gSum += pixels[i + 1];
      bSum += pixels[i + 2];
    }
    return {
      r: Math.round(rSum / samples.length),
      g: Math.round(gSum / samples.length),
      b: Math.round(bSum / samples.length),
    };
  };

  // Flood-fill from all 4 edges, marking background pixels
  const floodFillEdges = (pixels, width, height, bgColor, tolerance) => {
    const visited = new Uint8Array(width * height);
    const queue = [];

    const colorDist = (i) => {
      const r = pixels[i] - bgColor.r;
      const g = pixels[i + 1] - bgColor.g;
      const b = pixels[i + 2] - bgColor.b;
      return Math.sqrt(r * r + g * g + b * b);
    };

    const enqueue = (x, y) => {
      const idx = y * width + x;
      if (visited[idx]) return;
      visited[idx] = 1;
      if (colorDist(idx * 4) <= tolerance) queue.push(idx);
    };

    // Seed from all 4 edges
    for (let x = 0; x < width; x++) {
      enqueue(x, 0);
      enqueue(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      enqueue(0, y);
      enqueue(width - 1, y);
    }

    // BFS
    while (queue.length > 0) {
      const idx = queue.pop();
      const x = idx % width;
      const y = Math.floor(idx / width);
      pixels[idx * 4 + 3] = 0; // make transparent

      if (x > 0) enqueue(x - 1, y);
      if (x < width - 1) enqueue(x + 1, y);
      if (y > 0) enqueue(x, y - 1);
      if (y < height - 1) enqueue(x, y + 1);
    }
  };

  // Feather edges: semi-transparent pixels near transparent areas for smoother cutout
  const featherEdges = (pixels, width, height, radius = 1) => {
    const alphaMap = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) alphaMap[i] = pixels[i * 4 + 3];

    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = y * width + x;
        if (alphaMap[idx] === 0) continue;
        // Check if any neighbour is transparent
        let hasTransparentNeighbour = false;
        for (let dy = -radius; dy <= radius && !hasTransparentNeighbour; dy++) {
          for (
            let dx = -radius;
            dx <= radius && !hasTransparentNeighbour;
            dx++
          ) {
            if (alphaMap[(y + dy) * width + (x + dx)] === 0)
              hasTransparentNeighbour = true;
          }
        }
        if (hasTransparentNeighbour) pixels[idx * 4 + 3] = 128;
      }
    }
  };

  // Main: remove background entirely in the browser using flood-fill
  const removeImageBackground = (base64DataUrl) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        const { width, height } = canvas;

        const bgColor = detectBgColor(pixels, width, height);
        const tolerance = 40;

        floodFillEdges(pixels, width, height, bgColor, tolerance);
        featherEdges(pixels, width, height, 1);

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = base64DataUrl;
    });
  };

  // Handle file upload for images
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      if (removeBackground) {
        setIsProcessingBg(true);
        try {
          const processed = await removeImageBackground(dataUrl);
          addImageElement(processed);
        } catch (err) {
          console.error("Background removal failed:", err);
          addImageElement(dataUrl); // fallback to original
        } finally {
          setIsProcessingBg(false);
        }
      } else {
        addImageElement(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle template upload
  const handleTemplateUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundColor("transparent");
        addImageElement(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Update element properties
  const updateElement = (id, updates) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
    );
  };

  // Delete element
  const deleteElement = (id) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedElement(null);
  };

  // Handle text editing
  const handleTextEdit = (id, newContent) => {
    updateElement(id, { content: newContent });
  };

  // Move element to front/back
  const moveElement = (id, direction) => {
    const element = elements.find((el) => el.id === id);
    if (!element) return;

    const newZIndex =
      direction === "front"
        ? Math.max(...elements.map((el) => el.zIndex)) + 1
        : Math.min(...elements.map((el) => el.zIndex)) - 1;

    updateElement(id, { zIndex: newZIndex });
  };

  // Reorder elements via drag and drop
  const reorderElements = (draggedId, targetId) => {
    const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);
    const draggedIndex = sortedElements.findIndex((el) => el.id === draggedId);
    const targetIndex = sortedElements.findIndex((el) => el.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder the array
    const reordered = [...sortedElements];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Update zIndex based on new order (higher index = higher zIndex)
    const updated = reordered.map((el, index) => ({
      ...el,
      zIndex: reordered.length - index - 1,
    }));

    setElements(updated);
  };

  // Download poster as image
  const downloadPoster = useCallback(async () => {
    try {
      if (!canvasRef.current) return null;

      // Temporarily remove selection indicators
      const selectedId = selectedElement;
      setSelectedElement(null);

      // Wait for React to update the DOM
      await new Promise((resolve) => setTimeout(resolve, 50));

      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor:
          backgroundColor === "transparent" ? "#ffffff00" : backgroundColor,
        quality: 1,
        pixelRatio: 2,
      });

      // Restore selection
      setSelectedElement(selectedId);

      return dataUrl;
    } catch (error) {
      console.error("Error generating poster:", error);
      throw error;
    }
  }, [backgroundColor, selectedElement]);

  // Snap to grid function
  const snapToGrid = (value) => {
    if (!showGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  // Handle resize functionality
  const handleResizeStart = (e, elementId, corner) => {
    e.stopPropagation();
    setIsResizing(true);

    const element = elements.find((el) => el.id === elementId);
    if (!element) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = element.width || 100;
    const startHeight =
      element.height || (element.type === "text" ? element.fontSize : 100);
    const startPosX = element.x;
    const startPosY = element.y;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startPosX;
      let newY = startPosY;

      switch (corner) {
        case "se": // Southeast (bottom-right)
          newWidth = Math.max(20, startWidth + deltaX);
          newHeight = Math.max(20, startHeight + deltaY);
          break;
        case "sw": // Southwest (bottom-left)
          newWidth = Math.max(20, startWidth - deltaX);
          newHeight = Math.max(20, startHeight + deltaY);
          newX = startPosX + (startWidth - newWidth);
          break;
        case "ne": // Northeast (top-right)
          newWidth = Math.max(20, startWidth + deltaX);
          newHeight = Math.max(20, startHeight - deltaY);
          newY = startPosY + (startHeight - newHeight);
          break;
        case "nw": // Northwest (top-left)
          newWidth = Math.max(20, startWidth - deltaX);
          newHeight = Math.max(20, startHeight - deltaY);
          newX = startPosX + (startWidth - newWidth);
          newY = startPosY + (startHeight - newHeight);
          break;
      }

      if (element.type === "text") {
        // For text, we adjust font size based on height change
        const fontScale = newHeight / startHeight;
        const newFontSize = Math.max(
          8,
          Math.min(200, element.fontSize * fontScale)
        );
        updateElement(elementId, {
          fontSize: newFontSize,
          x: snapToGrid(newX),
          y: snapToGrid(newY),
        });
      } else {
        updateElement(elementId, {
          width: newWidth,
          height: newHeight,
          x: snapToGrid(newX),
          y: snapToGrid(newY),
        });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const openPredefinedImagesPicker = () => {
    setShowPredefinedPicker(true);
  };

  const selectedEl = elements.find((el) => el.id === selectedElement);

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      {/* Left Panel - Create & Template */}
      <div className="w-80 bg-white shadow-lg p-6 overflow-y-auto h-screen flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Poster Creator
        </h1>

        {/* Left Panel Tabs */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setLeftTab("create")}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              leftTab === "create"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Create
          </button>
          <button
            onClick={() => setLeftTab("template")}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              leftTab === "template"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Template
          </button>
        </div>

        {leftTab === "template" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Template
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleTemplateUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Add Elements */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Add Elements
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={addTextElement}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                >
                  <Type size={16} />
                  Text
                </button>
                <button
                  // onClick={() => fileInputRef.current?.click()}
                  onClick={() => setShowImageSourcePicker(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100"
                >
                  <Image size={16} />
                  Image
                </button>
                {showImageSourcePicker && (
                  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
                      <h3 className="text-xl font-bold text-center mb-6">
                        Add Image
                      </h3>

                      {/* Remove Background Toggle */}
                      <div className="flex items-center justify-between mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            Remove Background
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Auto-remove bg when uploading
                          </p>
                        </div>
                        <button
                          onClick={() => setRemoveBackground((v) => !v)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            removeBackground ? "bg-blue-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              removeBackground
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {removeBackground && (
                        <div className="flex items-start gap-2 px-3 py-2 mb-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                          <span className="text-base leading-none mt-0.5">
                            💡
                          </span>
                          <span>
                            For best results, photograph your subject against a{" "}
                            <strong>plain, solid-colored background</strong> —
                            white, grey, or any distinct single color works
                            best.
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Option 1: Upload from computer */}
                        <button
                          onClick={() => {
                            setShowImageSourcePicker(false);
                            fileInputRef.current?.click();
                          }}
                          className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50/50 transition-colors group"
                        >
                          <div className="p-4 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                            <Upload size={32} className="text-green-600" />
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-800">
                              Upload from computer
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              PNG, JPG, up to 10MB
                            </p>
                          </div>
                        </button>

                        {/* Option 2: Choose from predefined images */}
                        <button
                          onClick={() => {
                            setShowImageSourcePicker(false);
                            openPredefinedImagesPicker();
                          }}
                          className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-colors group"
                        >
                          <div className="p-4 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                            <Image size={32} className="text-blue-600" />
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-gray-800">
                              Choose from library
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              Predefined images & templates
                            </p>
                          </div>
                        </button>
                      </div>

                      <button
                        onClick={() => setShowImageSourcePicker(false)}
                        className="mt-8 w-full py-3 text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {showPredefinedPicker && (
                  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold">
                          Choose Image from Library
                        </h3>
                        <button
                          onClick={() => setShowPredefinedPicker(false)}
                          className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                        >
                          ×
                        </button>
                      </div>

                      {/* Category Tabs */}
                      <div className="flex flex-wrap gap-2 mb-6 border-b pb-2">
                        {Object.keys(predefinedImages).map((category) => (
                          <button
                            key={category}
                            onClick={() => setActiveImageCategory(category)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              activeImageCategory === category
                                ? "bg-blue-600 text-white shadow"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>

                      {/* Images Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {(predefinedImages[activeImageCategory] || []).map(
                          (image) => (
                            <div
                              key={image.id}
                              className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 cursor-pointer transition-all hover:shadow-md bg-gray-50"
                              onClick={() => {
                                addImageElement(image.src);
                                setShowPredefinedPicker(false);
                                // Optional: reset to default category next time
                                // setActiveImageCategory("Products");
                              }}
                            >
                              <img
                                src={image.src}
                                alt={image.alt}
                                className="w-full h-full object-contain p-2" // contain instead of cover → better for logos/badges
                                loading="lazy"
                              />
                              {/* Optional: show name on hover */}
                              <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs p-1.5 opacity-0 hover:opacity-100 transition-opacity text-center">
                                {image.alt}
                              </div>
                            </div>
                          )
                        )}

                        {predefinedImages[activeImageCategory]?.length ===
                          0 && (
                          <div className="col-span-full py-12 text-center text-gray-500">
                            No images in this category yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => addShape("rectangle")}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded hover:bg-purple-100"
                >
                  <Square size={16} />
                  Rectangle
                </button>
                <button
                  onClick={() => addShape("circle")}
                  className="flex items-center gap-2 px-3 py-2 bg-pink-50 text-pink-700 rounded hover:bg-pink-100"
                >
                  <Circle size={16} />
                  Circle
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Canvas Settings */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Canvas Settings
              </h3>
              <div className="space-y-3">
                {/* Preset sizes */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Preset Sizes
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { label: "A1", w: 1684, h: 2384 },
                      { label: "A2", w: 1191, h: 1684 },
                      { label: "A3", w: 842, h: 1191 },
                    ].map(({ label, w, h }) => (
                      <button
                        key={label}
                        onClick={() => setCanvasSize({ width: w, height: h })}
                        className={`flex flex-col items-center py-2 px-1 rounded border text-xs font-medium transition-colors ${
                          canvasSize.width === w && canvasSize.height === h
                            ? "bg-blue-100 border-blue-400 text-blue-700"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <span className="font-semibold">{label}</span>
                        <span className="text-gray-400 mt-0.5">
                          {w}×{h}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Width
                    </label>
                    <input
                      type="number"
                      value={canvasSize.width}
                      onChange={(e) =>
                        setCanvasSize((prev) => ({
                          ...prev,
                          width: parseInt(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Height
                    </label>
                    <input
                      type="number"
                      value={canvasSize.height}
                      onChange={(e) =>
                        setCanvasSize((prev) => ({
                          ...prev,
                          height: parseInt(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Background
                  </label>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm text-gray-600">
                    Show Grid
                  </label>
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showGrid
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <Grid3x3 size={16} />
                    {showGrid ? "On" : "Off"}
                  </button>
                </div>
                {showGrid && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Grid Size
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={gridSize}
                      onChange={(e) => setGridSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>10px</span>
                      <span>{gridSize}px</span>
                      <span>50px</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Download */}
            <div className="pt-6 border-t">
              <Button
                onClick={() => setExportModalOpen(true)}
                className="w-full flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Poster
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Zoom toolbar */}
        <div className="flex items-center justify-center gap-2 py-2 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={zoomOut}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 font-bold text-lg leading-none"
          >
            −
          </button>
          <button
            onClick={() => setZoom(1)}
            className="min-w-[4rem] px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded text-center"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={zoomIn}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 font-bold text-lg leading-none"
          >
            +
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onClick={zoomFit}
            className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded"
          >
            Fit
          </button>
        </div>

        {/* Scrollable canvas viewport */}
        <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
          <div
            className="relative"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              marginBottom: `${(zoom - 1) * canvasSize.height}px`,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedElement(null);
              }
            }}
          >
            <div
              ref={canvasRef}
              className="relative shadow-2xl border border-gray-300"
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                backgroundColor,
                backgroundImage: showGrid
                  ? `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`
                  : "none",
                backgroundSize: showGrid
                  ? `${gridSize}px ${gridSize}px`
                  : "auto",
              }}
              onClick={() => setSelectedElement(null)}
            >
              {elements
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((element) => (
                  <div
                    key={element.id}
                    className={`absolute cursor-move ${
                      selectedElement === element.id
                        ? "ring-2 ring-blue-500"
                        : ""
                    }`}
                    style={{
                      left: element.x,
                      top: element.y,
                      transform: `rotate(${element.rotation || 0}deg)`,
                      zIndex: element.zIndex,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElement(element.id);
                    }}
                    onMouseDown={(e) => {
                      if (isResizing) return;

                      const startX = e.clientX - element.x;
                      const startY = e.clientY - element.y;

                      const handleMouseMove = (e) => {
                        const newX = e.clientX - startX;
                        const newY = e.clientY - startY;
                        updateElement(element.id, { x: newX, y: newY });
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  >
                    {element.type === "text" && (
                      <div
                        style={{
                          fontSize: element.fontSize,
                          fontFamily: element.fontFamily,
                          color: element.color,
                          fontWeight: element.fontWeight,
                          textAlign: element.textAlign,
                          whiteSpace: "pre-wrap",
                          minWidth: "20px",
                          minHeight: `${element.fontSize}px`,
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          const newContent = prompt(
                            "Edit text:",
                            element.content
                          );
                          if (newContent !== null) {
                            handleTextEdit(element.id, newContent);
                          }
                        }}
                      >
                        {element.content}
                      </div>
                    )}

                    {element.type === "image" && (
                      <img
                        src={element.src}
                        alt="Poster element"
                        style={{
                          width: element.width,
                          height: element.height,
                          objectFit: "cover",
                        }}
                        draggable={false}
                      />
                    )}

                    {element.type === "shape" && (
                      <div
                        style={{
                          width: element.width,
                          height: element.height,
                          backgroundColor: element.fill,
                          border: `${element.strokeWidth}px solid ${element.stroke}`,
                          borderRadius:
                            element.shapeType === "circle" ? "50%" : "0",
                        }}
                      />
                    )}

                    {/* Resize handles */}
                    {selectedElement === element.id && (
                      <>
                        <div
                          className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-nw-resize shadow-sm"
                          onMouseDown={(e) =>
                            handleResizeStart(e, element.id, "nw")
                          }
                        />
                        <div
                          className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-ne-resize shadow-sm"
                          style={{
                            left:
                              (element.width ||
                                (element.type === "text" ? "auto" : 100)) ===
                              "auto"
                                ? "auto"
                                : `${element.width || 100}px`,
                          }}
                          onMouseDown={(e) =>
                            handleResizeStart(e, element.id, "ne")
                          }
                        />
                        <div
                          className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-sw-resize shadow-sm"
                          style={{
                            top:
                              element.type === "text"
                                ? `${element.fontSize}px`
                                : `${element.height || 100}px`,
                          }}
                          onMouseDown={(e) =>
                            handleResizeStart(e, element.id, "sw")
                          }
                        />
                        <div
                          className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-se-resize shadow-sm"
                          style={{
                            left:
                              (element.width ||
                                (element.type === "text" ? "auto" : 100)) ===
                              "auto"
                                ? "auto"
                                : `${element.width || 100}px`,
                            top:
                              element.type === "text"
                                ? `${element.fontSize}px`
                                : `${element.height || 100}px`,
                          }}
                          onMouseDown={(e) =>
                            handleResizeStart(e, element.id, "se")
                          }
                        />
                      </>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Properties & Elements */}
      <div className="w-80 bg-white shadow-lg p-6 overflow-y-auto h-screen flex-shrink-0">
        {/* Right Panel Tabs */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setRightTab("properties")}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              rightTab === "properties"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Properties
          </button>
          <button
            onClick={() => setRightTab("elements")}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              rightTab === "elements"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Elements
          </button>
        </div>

        {rightTab === "elements" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                All Elements
              </h3>
              <span className="text-sm text-gray-500">
                {elements.length} items
              </span>
            </div>

            {elements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="mb-2">No elements added yet</div>
                <div className="text-sm">
                  Switch to Create tab to add elements
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {elements
                  .sort((a, b) => b.zIndex - a.zIndex)
                  .map((element, index) => (
                    <div
                      key={element.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedElement(element.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedElement && draggedElement !== element.id) {
                          reorderElements(draggedElement, element.id);
                        }
                        setDraggedElement(null);
                      }}
                      onDragEnd={() => setDraggedElement(null)}
                      className={`p-3 border rounded-lg cursor-move transition-all ${
                        selectedElement === element.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      } ${draggedElement === element.id ? "opacity-50" : ""}`}
                      onClick={() => setSelectedElement(element.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Move size={14} className="text-gray-400" />
                          {element.type === "text" && <Type size={16} />}
                          {element.type === "image" && <Image size={16} />}
                          {element.type === "shape" && (
                            <>
                              {element.shapeType === "rectangle" && (
                                <Square size={16} />
                              )}
                              {element.shapeType === "circle" && (
                                <Circle size={16} />
                              )}
                            </>
                          )}
                          <span className="text-sm font-medium">
                            {element.type === "text"
                              ? element.content.substring(0, 20) +
                                (element.content.length > 20 ? "..." : "")
                              : element.type.charAt(0).toUpperCase() +
                                element.type.slice(1)}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteElement(element.id);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Element Properties
            </h3>

            {!selectedEl ? (
              <div className="text-center py-8 text-gray-500">
                <div className="mb-2">No element selected</div>
                <div className="text-sm">
                  Click on an element to edit its properties
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Type-specific properties */}
                {selectedEl.type === "text" && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Text Content
                      </label>
                      <textarea
                        value={selectedEl.content}
                        onChange={(e) =>
                          updateElement(selectedEl.id, {
                            content: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        rows="3"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Font Size
                        </label>
                        <input
                          type="number"
                          value={selectedEl.fontSize}
                          onChange={(e) =>
                            updateElement(selectedEl.id, {
                              fontSize: parseInt(e.target.value),
                            })
                          }
                          className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Color
                        </label>
                        <input
                          type="color"
                          value={selectedEl.color}
                          onChange={(e) =>
                            updateElement(selectedEl.id, {
                              color: e.target.value,
                            })
                          }
                          className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Font Family
                      </label>
                      <select
                        value={selectedEl.fontFamily}
                        onChange={(e) =>
                          updateElement(selectedEl.id, {
                            fontFamily: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Font Weight
                      </label>
                      <select
                        value={selectedEl.fontWeight}
                        onChange={(e) =>
                          updateElement(selectedEl.id, {
                            fontWeight: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="100">Thin (100)</option>
                        <option value="200">Extra Light (200)</option>
                        <option value="300">Light (300)</option>
                        <option value="normal">Normal (400)</option>
                        <option value="500">Medium (500)</option>
                        <option value="600">Semi Bold (600)</option>
                        <option value="bold">Bold (700)</option>
                        <option value="800">Extra Bold (800)</option>
                        <option value="900">Black (900)</option>
                      </select>
                    </div>
                  </>
                )}

                {selectedEl.type === "shape" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm text-gray-600">
                          Fill Color
                        </label>
                        <input
                          type="color"
                          value={selectedEl.fill}
                          onChange={(e) =>
                            updateElement(selectedEl.id, {
                              fill: e.target.value,
                            })
                          }
                          className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600">
                          Stroke Color
                        </label>
                        <input
                          type="color"
                          value={selectedEl.stroke}
                          onChange={(e) =>
                            updateElement(selectedEl.id, {
                              stroke: e.target.value,
                            })
                          }
                          className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Common properties */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm text-gray-600">
                      X Position
                    </label>
                    <input
                      type="number"
                      value={selectedEl.x}
                      onChange={(e) =>
                        updateElement(selectedEl.id, {
                          x: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">
                      Y Position
                    </label>
                    <input
                      type="number"
                      value={selectedEl.y}
                      onChange={(e) =>
                        updateElement(selectedEl.id, {
                          y: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>

                {(selectedEl.type === "image" ||
                  selectedEl.type === "shape") && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm text-gray-600">
                        Width
                      </label>
                      <input
                        type="number"
                        value={selectedEl.width}
                        onChange={(e) =>
                          updateElement(selectedEl.id, {
                            width: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">
                        Height
                      </label>
                      <input
                        type="number"
                        value={selectedEl.height}
                        onChange={(e) =>
                          updateElement(selectedEl.id, {
                            height: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Rotation
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={selectedEl.rotation || 0}
                    onChange={(e) =>
                      updateElement(selectedEl.id, {
                        rotation: parseInt(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-500 mt-1">
                    {selectedEl.rotation || 0}°
                  </div>
                </div>

                {/* Layer controls */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Layer Order
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => moveElement(selectedEl.id, "front")}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                    >
                      Bring Forward
                    </button>
                    <button
                      onClick={() => moveElement(selectedEl.id, "back")}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                    >
                      Send Back
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => deleteElement(selectedEl.id)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100"
                >
                  <Trash2 size={16} />
                  Delete Element
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Background Removal Processing Overlay */}
      {isProcessingBg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Removing Background
            </h3>
            <p className="text-sm text-gray-500">
              Claude is analyzing your image…
            </p>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        exportFunction={downloadPoster}
        posterName={posterName}
        setPosterName={setPosterName}
      />
    </div>
  );
};

export default PosterCreator;

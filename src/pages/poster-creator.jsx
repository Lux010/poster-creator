import React, { useState, useRef, useCallback } from "react";
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

  // Handle file upload for images
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        addImageElement(e.target.result);
      };
      reader.readAsDataURL(file);
    }
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

  const selectedEl = elements.find((el) => el.id === selectedElement);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left Panel - Create & Template */}
      <div className="w-80 bg-white shadow-lg p-6 overflow-y-auto">
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
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100"
                >
                  <Image size={16} />
                  Image
                </button>
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
      <div className="flex-1 p-8 flex items-center justify-center">
        <div
          className="relative"
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
              backgroundSize: showGrid ? `${gridSize}px ${gridSize}px` : "auto",
            }}
            onClick={() => setSelectedElement(null)}
          >
            {elements
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((element) => (
                <div
                  key={element.id}
                  className={`absolute cursor-move ${
                    selectedElement === element.id ? "ring-2 ring-blue-500" : ""
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

      {/* Right Panel - Properties & Elements */}
      <div className="w-80 bg-white shadow-lg p-6 overflow-y-auto">
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

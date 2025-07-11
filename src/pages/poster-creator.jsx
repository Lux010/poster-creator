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
  const [activeTab, setActiveTab] = useState("create");
  const [isResizing, setIsResizing] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);
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
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Poster Creator
        </h1>

        {/* Tabs */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              activeTab === "create"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Create
          </button>
          <button
            onClick={() => setActiveTab("template")}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              activeTab === "template"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Template
          </button>
          <button
            onClick={() => setActiveTab("elements")}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              activeTab === "elements"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Elements
          </button>
        </div>

        {activeTab === "template" ? (
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
        ) : activeTab === "elements" ? (
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
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {elements
                  .sort((a, b) => b.zIndex - a.zIndex)
                  .map((element, index) => (
                    <div
                      key={element.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedElement === element.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedElement(element.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {element.type === "text" && (
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Type size={16} className="text-blue-600" />
                              </div>
                            )}
                            {element.type === "image" && (
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <Image size={16} className="text-green-600" />
                              </div>
                            )}
                            {element.type === "shape" && (
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                {element.shapeType === "rectangle" ? (
                                  <Square
                                    size={16}
                                    className="text-purple-600"
                                  />
                                ) : (
                                  <Circle
                                    size={16}
                                    className="text-purple-600"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {element.type === "text"
                                ? element.content.substring(0, 20) +
                                  (element.content.length > 20 ? "..." : "")
                                : element.type === "image"
                                ? "Image Element"
                                : `${element.shapeType} Shape`}
                            </div>
                            <div className="text-xs text-gray-500">
                              Layer{" "}
                              {elements.length -
                                Math.max(...elements.map((el) => el.zIndex)) +
                                element.zIndex}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveElement(element.id, "front");
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            title="Bring Forward"
                          >
                            <Move size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteElement(element.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {selectedElement === element.id && (
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                          {element.type === "text" && (
                            <>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                  Text Content
                                </label>
                                <textarea
                                  value={element.content}
                                  onChange={(e) =>
                                    updateElement(element.id, {
                                      content: e.target.value,
                                    })
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  rows="2"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs text-gray-600">
                                    Font Size
                                  </label>
                                  <input
                                    type="number"
                                    value={element.fontSize}
                                    onChange={(e) =>
                                      updateElement(element.id, {
                                        fontSize: parseInt(e.target.value),
                                      })
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600">
                                    Color
                                  </label>
                                  <input
                                    type="color"
                                    value={element.color}
                                    onChange={(e) =>
                                      updateElement(element.id, {
                                        color: e.target.value,
                                      })
                                    }
                                    className="w-full h-6 border border-gray-300 rounded cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {element.type === "shape" && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600">
                                  Fill
                                </label>
                                <input
                                  type="color"
                                  value={element.fill}
                                  onChange={(e) =>
                                    updateElement(element.id, {
                                      fill: e.target.value,
                                    })
                                  }
                                  className="w-full h-6 border border-gray-300 rounded cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600">
                                  Stroke
                                </label>
                                <input
                                  type="color"
                                  value={element.stroke}
                                  onChange={(e) =>
                                    updateElement(element.id, {
                                      stroke: e.target.value,
                                    })
                                  }
                                  className="w-full h-6 border border-gray-300 rounded cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          )}

                          {(element.type === "image" ||
                            element.type === "shape") && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600">
                                  Width
                                </label>
                                <input
                                  type="number"
                                  value={element.width}
                                  onChange={(e) =>
                                    updateElement(element.id, {
                                      width: parseInt(e.target.value),
                                    })
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600">
                                  Height
                                </label>
                                <input
                                  type="number"
                                  value={element.height}
                                  onChange={(e) =>
                                    updateElement(element.id, {
                                      height: parseInt(e.target.value),
                                    })
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-600">
                                X Position
                              </label>
                              <input
                                type="number"
                                value={element.x}
                                onChange={(e) =>
                                  updateElement(element.id, {
                                    x: parseInt(e.target.value),
                                  })
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600">
                                Y Position
                              </label>
                              <input
                                type="number"
                                value={element.y}
                                onChange={(e) =>
                                  updateElement(element.id, {
                                    y: parseInt(e.target.value),
                                  })
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Canvas Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Canvas
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm text-gray-600">Width</label>
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
                    <label className="block text-sm text-gray-600">
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

            {/* Add Elements */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Add Elements
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={addTextElement}
                  className="flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Type size={20} />
                  <span className="text-sm">Text</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Image size={20} />
                  <span className="text-sm">Image</span>
                </button>
                <button
                  onClick={() => addShape("rectangle")}
                  className="flex items-center justify-center gap-2 p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Square size={20} />
                  <span className="text-sm">Rectangle</span>
                </button>
                <button
                  onClick={() => addShape("circle")}
                  className="flex items-center justify-center gap-2 p-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <Circle size={20} />
                  <span className="text-sm">Circle</span>
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

            {/* Element Properties */}
            {selectedEl && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Properties
                </h3>
                <div className="space-y-3">
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
                          rows="2"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm text-gray-600">
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
                          <label className="block text-sm text-gray-600">
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
                          <option value="Times New Roman">
                            Times New Roman
                          </option>
                          <option value="Georgia">Georgia</option>
                          <option value="Verdana">Verdana</option>
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

                  <div className="flex gap-2">
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

                  <button
                    onClick={() => deleteElement(selectedEl.id)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                    Delete Element
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Download */}
        <div className="mt-6 pt-6 border-t">
          <Button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Poster
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 p-8 flex items-center justify-center">
        <div
          className="relative"
          onClick={(e) => {
            // Only unselect if clicking on the container itself, not elements
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

                  {/* Resize handles - only show for selected element */}
                  {selectedElement === element.id && (
                    <>
                      {/* Corner resize handles */}
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

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        exportFunction={downloadPoster}
      />
    </div>
  );
};

export default PosterCreator;

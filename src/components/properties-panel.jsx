import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  MousePointer,
  MoveUp,
  MoveDown,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
} from "lucide-react";

export default function PropertiesPanel({
  selectedObject,
  canvasInstance,
  canvasState,
  onCanvasStateChange,
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fillColor, setFillColor] = useState("#000000");
  const [opacity, setOpacity] = useState([100]);
  const [fontSize, setFontSize] = useState(20);
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontWeight, setFontWeight] = useState("normal");
  const [canvasBackground, setCanvasBackground] = useState("#ffffff");

  // Update local state when selectedObject changes
  useEffect(() => {
    if (selectedObject) {
      setPosition({
        x: Math.round(selectedObject.left || 0),
        y: Math.round(selectedObject.top || 0),
      });
      setSize({
        width: Math.round(
          selectedObject.getScaledWidth?.() || selectedObject.width || 0
        ),
        height: Math.round(
          selectedObject.getScaledHeight?.() || selectedObject.height || 0
        ),
      });
      setFillColor(selectedObject.fill || "#000000");
      setOpacity([(selectedObject.opacity || 1) * 100]);

      if (selectedObject.type === "text" || selectedObject.type === "i-text") {
        setFontSize(selectedObject.fontSize || 20);
        setFontFamily(selectedObject.fontFamily || "Inter");
        setFontWeight(selectedObject.fontWeight || "normal");
      }
    }
  }, [selectedObject]);

  // Update canvas background
  useEffect(() => {
    if (
      canvasInstance &&
      typeof canvasInstance.setBackgroundColor === "function" &&
      canvasInstance.getElement()
    ) {
      try {
        canvasInstance.setBackgroundColor(canvasBackground, () => {
          if (
            canvasInstance &&
            typeof canvasInstance.renderAll === "function"
          ) {
            canvasInstance.renderAll();
          }
        });
      } catch (error) {
        console.warn("Canvas background update failed:", error);
      }
    }
  }, [canvasBackground, canvasInstance]);

  const updateObjectProperty = (property, value) => {
    if (selectedObject && canvasInstance) {
      selectedObject.set(property, value);
      canvasInstance.renderAll();
    }
  };

  const handlePositionChange = (axis, value) => {
    const numValue = parseInt(value) || 0;
    const property = axis === "x" ? "left" : "top";
    setPosition((prev) => ({ ...prev, [axis]: numValue }));
    updateObjectProperty(property, numValue);
  };

  const handleSizeChange = (dimension, value) => {
    const numValue = parseInt(value) || 0;
    setSize((prev) => ({ ...prev, [dimension]: numValue }));

    if (selectedObject && canvasInstance) {
      if (dimension === "width") {
        selectedObject.set("scaleX", numValue / (selectedObject.width || 1));
      } else {
        selectedObject.set("scaleY", numValue / (selectedObject.height || 1));
      }
      canvasInstance.renderAll();
    }
  };

  const handleFillColorChange = (color) => {
    setFillColor(color);
    updateObjectProperty("fill", color);
  };

  const handleOpacityChange = (value) => {
    setOpacity(value);
    updateObjectProperty("opacity", value[0] / 100);
  };

  const handleFontChange = (property, value) => {
    if (property === "fontSize") {
      setFontSize(value);
    } else if (property === "fontFamily") {
      setFontFamily(value);
    } else if (property === "fontWeight") {
      setFontWeight(value);
    }
    updateObjectProperty(property, value);
  };

  const handleTextAlign = (align) => {
    updateObjectProperty("textAlign", align);
  };

  const deleteObject = () => {
    if (selectedObject && canvasInstance) {
      canvasInstance.remove(selectedObject);
      onCanvasStateChange({ selectedObject: null });
    }
  };

  const bringToFront = () => {
    if (selectedObject && canvasInstance) {
      canvasInstance.bringToFront(selectedObject);
      canvasInstance.renderAll();
    }
  };

  const sendToBack = () => {
    if (selectedObject && canvasInstance) {
      canvasInstance.sendToBack(selectedObject);
      canvasInstance.renderAll();
    }
  };

  const handleBackgroundImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file || !canvasInstance || !canvasInstance.setBackgroundImage) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target?.result;
      canvasInstance.setBackgroundImage(
        imgUrl,
        () => {
          canvasInstance.renderAll();
        },
        {
          scaleX: canvasInstance.width / 800,
          scaleY: canvasInstance.height / 600,
        }
      );
    };
    reader.readAsDataURL(file);
  };

  const isTextObject =
    selectedObject &&
    (selectedObject.type === "text" || selectedObject.type === "i-text");

  return (
    <div className="w-72 bg-white border-l border-neutral-200 flex flex-col">
      <div className="border-b border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-800">Properties</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!selectedObject ? (
          <div className="p-4 text-center text-neutral-500">
            <MousePointer className="mx-auto mb-2 h-8 w-8" />
            <div className="text-sm">Select an element to edit properties</div>
          </div>
        ) : (
          <div>
            {/* Position & Size */}
            <div className="border-b border-neutral-200 p-4">
              <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-3">
                Position & Size
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-neutral-600 mb-1">X</Label>
                  <Input
                    type="number"
                    value={position.x}
                    onChange={(e) => handlePositionChange("x", e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-neutral-600 mb-1">Y</Label>
                  <Input
                    type="number"
                    value={position.y}
                    onChange={(e) => handlePositionChange("y", e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-neutral-600 mb-1">Width</Label>
                  <Input
                    type="number"
                    value={size.width}
                    onChange={(e) => handleSizeChange("width", e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-neutral-600 mb-1">
                    Height
                  </Label>
                  <Input
                    type="number"
                    value={size.height}
                    onChange={(e) => handleSizeChange("height", e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="border-b border-neutral-200 p-4">
              <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-3">
                Appearance
              </h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-neutral-600 mb-1">
                    Fill Color
                  </Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={fillColor}
                      onChange={(e) => handleFillColorChange(e.target.value)}
                      className="w-8 h-8 border border-neutral-300 rounded cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={fillColor}
                      onChange={(e) => handleFillColorChange(e.target.value)}
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-neutral-600 mb-1">
                    Opacity
                  </Label>
                  <Slider
                    value={opacity}
                    onValueChange={handleOpacityChange}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-xs text-neutral-500 mt-1">
                    {opacity[0]}%
                  </div>
                </div>
              </div>
            </div>

            {/* Text Properties */}
            {isTextObject && (
              <div className="border-b border-neutral-200 p-4">
                <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-3">
                  Text
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-neutral-600 mb-1">
                      Font Family
                    </Label>
                    <Select
                      value={fontFamily}
                      onValueChange={(value) =>
                        handleFontChange("fontFamily", value)
                      }
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                        <SelectItem value="Times New Roman">
                          Times New Roman
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-neutral-600 mb-1">
                        Size
                      </Label>
                      <Input
                        type="number"
                        value={fontSize}
                        onChange={(e) =>
                          handleFontChange("fontSize", parseInt(e.target.value))
                        }
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-neutral-600 mb-1">
                        Weight
                      </Label>
                      <Select
                        value={fontWeight}
                        onValueChange={(value) =>
                          handleFontChange("fontWeight", value)
                        }
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="bold">Bold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleTextAlign("left")}
                    >
                      <AlignLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleTextAlign("center")}
                    >
                      <AlignCenter className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleTextAlign("right")}
                    >
                      <AlignRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Layer Controls */}
            <div className="border-b border-neutral-200 p-4">
              <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-3">
                Layer
              </h3>
              <div className="flex space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={bringToFront}
                >
                  <MoveUp className="mr-1 h-3 w-3" />
                  Front
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={sendToBack}
                >
                  <MoveDown className="mr-1 h-3 w-3" />
                  Back
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={deleteObject}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Canvas Background */}
        <div className="border-b border-neutral-200 p-4">
          <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-3">
            Canvas Background
          </h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-neutral-600 mb-1">
                Background Color
              </Label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={canvasBackground}
                  onChange={(e) => setCanvasBackground(e.target.value)}
                  className="w-8 h-8 border border-neutral-300 rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={canvasBackground}
                  onChange={(e) => setCanvasBackground(e.target.value)}
                  className="flex-1 text-xs"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() =>
                document.getElementById("background-upload")?.click()
              }
            >
              <ImageIcon className="mr-2 h-3 w-3" />
              Upload Background Image
            </Button>
            <input
              id="background-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBackgroundImageUpload}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

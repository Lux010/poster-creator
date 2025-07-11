import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { fabric } from "fabric";
import {
  Upload,
  Square,
  Circle,
  Triangle,
  Star,
  Image as ImageIcon,
  Type,
} from "lucide-react";

export default function TemplateSidebar({
  templates,
  onTemplateSelect,
  onAddElement,
  canvasInstance,
}) {
  const { toast } = useToast();
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const uploadTemplate = useMutation({
    mutationFn: async (formData) => {
      const response = await fetch("/api/templates", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template uploaded",
        description: "Your custom template has been saved.",
      });
      setUploadingTemplate(false);
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload template. Please try again.",
        variant: "destructive",
      });
      setUploadingTemplate(false);
    },
  });

  const uploadImage = useMutation({
    mutationFn: async (formData) => {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: (data) => {
      if (canvasInstance) {
        fabric.Image.fromURL(data.url, (img) => {
          img.set({
            left: 100,
            top: 100,
            scaleX: 0.5,
            scaleY: 0.5,
          });
          canvasInstance.add(img);
          canvasInstance.renderAll();
        });
      }
      toast({
        title: "Image added",
        description: "Image has been added to your poster.",
      });
      setUploadingImage(false);
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      setUploadingImage(false);
    },
  });

  const handleTemplateUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingTemplate(true);
    const formData = new FormData();
    formData.append("templateImage", file);
    formData.append("name", file.name.split(".")[0]);
    formData.append("category", "custom");

    // Create basic canvas data for uploaded image
    const canvasData = {
      version: "5.3.0",
      objects: [],
    };
    formData.append("canvasData", JSON.stringify(canvasData));

    uploadTemplate.mutate(formData);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);
    uploadImage.mutate(formData);
  };

  const addText = (style) => {
    if (!canvasInstance) return;

    let fontSize, text;
    switch (style) {
      case "heading":
        fontSize = 48;
        text = "Your Heading";
        break;
      case "subheading":
        fontSize = 32;
        text = "Your Subheading";
        break;
      case "body":
        fontSize = 20;
        text = "Your text here";
        break;
    }

    const textObject = new fabric.IText(text, {
      left: 100,
      top: 100,
      fontSize: fontSize,
      fontFamily: "Inter",
      fill: "#000000",
    });

    canvasInstance.add(textObject);
    canvasInstance.setActiveObject(textObject);
    canvasInstance.renderAll();
  };

  const addShape = (shape) => {
    if (!canvasInstance) return;

    let shapeObject;

    switch (shape) {
      case "rectangle":
        shapeObject = new fabric.Rect({
          left: 100,
          top: 100,
          width: 150,
          height: 100,
          fill: "#2563EB",
        });
        break;
      case "circle":
        shapeObject = new fabric.Circle({
          left: 100,
          top: 100,
          radius: 50,
          fill: "#2563EB",
        });
        break;
      case "triangle":
        shapeObject = new fabric.Triangle({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: "#2563EB",
        });
        break;
      case "star":
        const starPath =
          "M 50 10 L 61 40 L 91 40 L 69 60 L 80 90 L 50 70 L 20 90 L 31 60 L 9 40 L 39 40 Z";
        shapeObject = new fabric.Path(starPath, {
          left: 100,
          top: 100,
          fill: "#2563EB",
          scaleX: 1,
          scaleY: 1,
        });
        break;
      default:
        return;
    }

    canvasInstance.add(shapeObject);
    canvasInstance.setActiveObject(shapeObject);
    canvasInstance.renderAll();
  };

  const addPriceTag = (style) => {
    if (!canvasInstance) return;

    let backgroundColor, text, subtext;

    switch (style) {
      case "sale":
        backgroundColor = "#EF4444";
        text = "SALE";
        subtext = "50% OFF";
        break;
      case "new":
        backgroundColor = "#10B981";
        text = "NEW";
        subtext = "Just Arrived";
        break;
      case "limited":
        backgroundColor = "#F97316";
        text = "LIMITED";
        subtext = "Time Offer";
        break;
    }

    const tag = new fabric.Rect({
      left: 0,
      top: 0,
      width: 120,
      height: 80,
      fill: backgroundColor,
      rx: 8,
      ry: 8,
    });

    const mainText = new fabric.Text(text, {
      left: 60,
      top: 25,
      fontSize: 16,
      fontFamily: "Inter",
      fontWeight: "bold",
      fill: "#ffffff",
      originX: "center",
      originY: "center",
    });

    const subText = new fabric.Text(subtext, {
      left: 60,
      top: 50,
      fontSize: 12,
      fontFamily: "Inter",
      fill: "#ffffff",
      originX: "center",
      originY: "center",
    });

    const group = new fabric.Group([tag, mainText, subText], {
      left: 100,
      top: 100,
    });

    canvasInstance.add(group);
    canvasInstance.setActiveObject(group);
    canvasInstance.renderAll();
  };

  const salesTemplates = templates.filter((t) => t.category === "sales");
  const businessTemplates = templates.filter((t) => t.category === "business");

  return (
    <div className="w-80 bg-white border-r border-neutral-200 flex flex-col">
      <Tabs defaultValue="templates" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates" className="text-xs">
            <Upload className="mr-1 h-3 w-3" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="elements" className="text-xs">
            <Square className="mr-1 h-3 w-3" />
            Elements
          </TabsTrigger>
          <TabsTrigger value="text" className="text-xs">
            <Type className="mr-1 h-3 w-3" />
            Text
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="templates"
          className="flex-1 overflow-y-auto p-4 mt-0"
        >
          <div className="mb-4">
            <Button
              variant="outline"
              className="w-full p-6 border-2 border-dashed border-neutral-300 hover:border-primary hover:text-primary transition-colors"
              disabled={uploadingTemplate}
              onClick={() =>
                document.getElementById("template-upload")?.click()
              }
            >
              <div className="text-center">
                <Upload className="mx-auto mb-2 h-6 w-6" />
                <div className="text-sm font-medium">Upload Template</div>
                <div className="text-xs text-neutral-500">
                  JPG, PNG up to 10MB
                </div>
              </div>
            </Button>
            <Input
              id="template-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleTemplateUpload}
            />
          </div>

          {salesTemplates.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-neutral-800 mb-3">
                Sales Templates
              </h3>
              <div className="space-y-3">
                {salesTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-neutral-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => onTemplateSelect(template)}
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-red-500 to-orange-500 p-4 text-white relative">
                      <div className="text-xs font-bold mb-1">TEMPLATE</div>
                      <div className="text-lg font-bold">{template.name}</div>
                    </div>
                    <div className="p-2">
                      <div className="text-xs font-medium text-neutral-700">
                        {template.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {businessTemplates.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-neutral-800 mb-3">
                Business Templates
              </h3>
              <div className="space-y-3">
                {businessTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-neutral-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => onTemplateSelect(template)}
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-indigo-600 to-blue-600 p-4 text-white relative">
                      <div className="text-xs font-bold mb-1">TEMPLATE</div>
                      <div className="text-lg font-bold">{template.name}</div>
                    </div>
                    <div className="p-2">
                      <div className="text-xs font-medium text-neutral-700">
                        {template.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="elements"
          className="flex-1 overflow-y-auto p-4 mt-0"
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-800 mb-3">
                Shapes
              </h3>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  className="aspect-square"
                  onClick={() => addShape("rectangle")}
                >
                  <Square className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="aspect-square"
                  onClick={() => addShape("circle")}
                >
                  <Circle className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="aspect-square"
                  onClick={() => addShape("triangle")}
                >
                  <Triangle className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="aspect-square"
                  onClick={() => addShape("star")}
                >
                  <Star className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-800 mb-3">
                Price Tags
              </h3>
              <div className="space-y-2">
                <Button
                  className="w-full bg-red-500 hover:bg-red-600 text-left"
                  onClick={() => addPriceTag("sale")}
                >
                  <div>
                    <div className="font-bold">SALE</div>
                    <div className="text-sm opacity-90">50% OFF</div>
                  </div>
                </Button>
                <Button
                  className="w-full bg-green-500 hover:bg-green-600 text-left"
                  onClick={() => addPriceTag("new")}
                >
                  <div>
                    <div className="font-bold">NEW</div>
                    <div className="text-sm opacity-90">Just Arrived</div>
                  </div>
                </Button>
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-left"
                  onClick={() => addPriceTag("limited")}
                >
                  <div>
                    <div className="font-bold">LIMITED</div>
                    <div className="text-sm opacity-90">Time Offer</div>
                  </div>
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-800 mb-3">
                Images
              </h3>
              <Button
                variant="outline"
                className="w-full p-6 border-2 border-dashed border-neutral-300 hover:border-primary hover:text-primary transition-colors"
                disabled={uploadingImage}
                onClick={() => document.getElementById("image-upload")?.click()}
              >
                <div className="text-center">
                  <ImageIcon className="mx-auto mb-2 h-6 w-6" />
                  <div className="text-sm font-medium">Upload Image</div>
                  <div className="text-xs text-neutral-500">
                    JPG, PNG up to 5MB
                  </div>
                </div>
              </Button>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="text" className="flex-1 overflow-y-auto p-4 mt-0">
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full text-left p-4"
              onClick={() => addText("heading")}
            >
              <div>
                <div className="text-lg font-bold text-neutral-800">
                  Add Heading
                </div>
                <div className="text-sm text-neutral-600">Large title text</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full text-left p-4"
              onClick={() => addText("subheading")}
            >
              <div>
                <div className="text-base font-semibold text-neutral-800">
                  Add Subheading
                </div>
                <div className="text-sm text-neutral-600">
                  Medium subtitle text
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full text-left p-4"
              onClick={() => addText("body")}
            >
              <div>
                <div className="text-sm font-medium text-neutral-800">
                  Add Body Text
                </div>
                <div className="text-xs text-neutral-600">
                  Regular paragraph text
                </div>
              </div>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

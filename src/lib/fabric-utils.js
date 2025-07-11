import * as fabric from "fabric";

export const createGradient = (colors, coords) => {
  return new fabric.Gradient({
    type: "linear",
    coords: coords || { x1: 0, y1: 0, x2: 100, y2: 100 },
    colorStops: colors.map((color, index) => ({
      offset: index / (colors.length - 1),
      color,
    })),
  });
};

export const createPriceTag = (text, subtext, backgroundColor, position) => {
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

  return new fabric.Group([tag, mainText, subText], {
    left: position.x,
    top: position.y,
  });
};

export const createTemplateBackground = (width, height, colors) => {
  const gradient = createGradient(colors, {
    x1: 0,
    y1: 0,
    x2: width,
    y2: height,
  });

  return new fabric.Rect({
    left: 0,
    top: 0,
    width,
    height,
    fill: gradient,
    selectable: false,
  });
};

export const addImageFromUrl = (
  canvas,
  url,
  position,
  scale = { x: 1, y: 1 }
) => {
  fabric.Image.fromURL(url, (img) => {
    img.set({
      left: position.x,
      top: position.y,
      scaleX: scale.x,
      scaleY: scale.y,
    });
    canvas.add(img);
    canvas.renderAll();
  });
};

export const exportCanvasAsImage = (canvas, format = "png", quality = 1) => {
  if (format === "jpg") {
    return canvas.toDataURL("image/jpeg", quality);
  }
  return canvas.toDataURL("image/png");
};

export const loadTemplateFromJSON = (canvas, templateData, callback) => {
  canvas.loadFromJSON(templateData, () => {
    canvas.renderAll();
    if (callback) callback();
  });
};

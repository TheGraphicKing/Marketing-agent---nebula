import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Type, Image, Download, Undo, Redo, Trash2, Copy, Layers, ZoomIn, ZoomOut, RotateCw, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, ChevronUp, ChevronDown, Plus, Minus, Upload } from 'lucide-react';

// We'll load Fabric.js from CDN
declare global {
  interface Window {
    fabric: any;
  }
}

interface PosterEditorProps {
  imageBase64: string;
  onClose: () => void;
  onSave?: (imageBase64: string) => void;
}

const PosterEditor: React.FC<PosterEditorProps> = ({ imageBase64, onClose, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(32);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [isLoading, setIsLoading] = useState(true);
  const [canvasReady, setCanvasReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 
    'Courier New', 'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black',
    'Palatino', 'Garamond', 'Bookman', 'Tahoma', 'Lucida Console'
  ];

  const colors = [
    '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00',
    '#ff00ff', '#00ffff', '#ff6600', '#6600ff', '#00ff66', '#ff0066',
    '#333333', '#666666', '#999999', '#cccccc', '#1a73e8', '#ea4335',
    '#34a853', '#fbbc04', '#4285f4', '#db4437', '#f4b400', '#0f9d58'
  ];

  // Load Fabric.js from CDN
  useEffect(() => {
    const loadFabric = async () => {
      if (window.fabric) {
        initCanvas();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js';
      script.async = true;
      script.onload = () => {
        initCanvas();
      };
      document.body.appendChild(script);
    };

    loadFabric();

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, []);

  const initCanvas = () => {
    if (!canvasRef.current || !window.fabric) return;

    const canvas = new window.fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 800,
      backgroundColor: '#1a1a2e',
      preserveObjectStacking: true
    });

    fabricCanvasRef.current = canvas;

    // Load the AI-generated image as background
    window.fabric.Image.fromURL(imageBase64, (img: any) => {
      // Scale image to fit canvas while maintaining aspect ratio
      const scale = Math.min(800 / img.width, 800 / img.height);
      
      canvas.setWidth(img.width * scale);
      canvas.setHeight(img.height * scale);
      
      img.scale(scale);
      img.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true
      });

      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
      setIsLoading(false);
      setCanvasReady(true);
      saveToHistory();
    }, { crossOrigin: 'anonymous' });

    // Event listeners
    canvas.on('selection:created', (e: any) => {
      setSelectedObject(e.selected[0]);
      updateSelectedObjectProperties(e.selected[0]);
    });

    canvas.on('selection:updated', (e: any) => {
      setSelectedObject(e.selected[0]);
      updateSelectedObjectProperties(e.selected[0]);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    canvas.on('object:modified', () => {
      saveToHistory();
    });
  };

  const updateSelectedObjectProperties = (obj: any) => {
    if (obj && obj.type === 'i-text') {
      setTextColor(obj.fill || '#ffffff');
      setFontSize(obj.fontSize || 32);
      setFontFamily(obj.fontFamily || 'Arial');
    }
  };

  const saveToHistory = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    const json = JSON.stringify(fabricCanvasRef.current.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(json);
      return newHistory.slice(-20); // Keep last 20 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0 && fabricCanvasRef.current) {
      const newIndex = historyIndex - 1;
      fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
        fabricCanvasRef.current.renderAll();
        setHistoryIndex(newIndex);
      });
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1 && fabricCanvasRef.current) {
      const newIndex = historyIndex + 1;
      fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
        fabricCanvasRef.current.renderAll();
        setHistoryIndex(newIndex);
      });
    }
  };

  const addText = () => {
    if (!fabricCanvasRef.current) return;

    const text = new window.fabric.IText('Double-click to edit', {
      left: 100,
      top: 100,
      fontSize: fontSize,
      fontFamily: fontFamily,
      fill: textColor,
      fontWeight: 'normal',
      shadow: new window.fabric.Shadow({
        color: 'rgba(0,0,0,0.5)',
        blur: 3,
        offsetX: 2,
        offsetY: 2
      })
    });

    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    saveToHistory();
  };

  const addImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvasRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      window.fabric.Image.fromURL(event.target?.result as string, (img: any) => {
        // Scale image to reasonable size
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        img.scale(scale);
        
        img.set({
          left: 100,
          top: 100
        });

        fabricCanvasRef.current.add(img);
        fabricCanvasRef.current.setActiveObject(img);
        saveToHistory();
      });
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const deleteSelected = () => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    fabricCanvasRef.current.remove(selectedObject);
    setSelectedObject(null);
    saveToHistory();
  };

  const duplicateSelected = () => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    
    selectedObject.clone((cloned: any) => {
      cloned.set({
        left: selectedObject.left + 20,
        top: selectedObject.top + 20
      });
      fabricCanvasRef.current.add(cloned);
      fabricCanvasRef.current.setActiveObject(cloned);
      saveToHistory();
    });
  };

  const bringForward = () => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    fabricCanvasRef.current.bringForward(selectedObject);
    saveToHistory();
  };

  const sendBackward = () => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    fabricCanvasRef.current.sendBackwards(selectedObject);
    saveToHistory();
  };

  const updateTextProperty = (property: string, value: any) => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    
    if (property === 'fill') setTextColor(value);
    if (property === 'fontSize') setFontSize(value);
    if (property === 'fontFamily') setFontFamily(value);
    
    selectedObject.set(property, value);
    fabricCanvasRef.current.renderAll();
    saveToHistory();
  };

  const toggleBold = () => {
    if (!selectedObject || selectedObject.type !== 'i-text') return;
    const newWeight = selectedObject.fontWeight === 'bold' ? 'normal' : 'bold';
    updateTextProperty('fontWeight', newWeight);
  };

  const toggleItalic = () => {
    if (!selectedObject || selectedObject.type !== 'i-text') return;
    const newStyle = selectedObject.fontStyle === 'italic' ? 'normal' : 'italic';
    updateTextProperty('fontStyle', newStyle);
  };

  const toggleUnderline = () => {
    if (!selectedObject || selectedObject.type !== 'i-text') return;
    updateTextProperty('underline', !selectedObject.underline);
  };

  const setTextAlign = (align: string) => {
    if (!selectedObject || selectedObject.type !== 'i-text') return;
    updateTextProperty('textAlign', align);
  };

  const rotateSelected = () => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    selectedObject.rotate((selectedObject.angle || 0) + 15);
    fabricCanvasRef.current.renderAll();
    saveToHistory();
  };

  const handleZoom = (delta: number) => {
    if (!fabricCanvasRef.current) return;
    const newZoom = Math.max(0.5, Math.min(2, zoom + delta));
    setZoom(newZoom);
    fabricCanvasRef.current.setZoom(newZoom);
    fabricCanvasRef.current.renderAll();
  };

  const exportImage = (format: 'png' | 'jpg') => {
    if (!fabricCanvasRef.current) return;

    // Deselect all objects before export
    fabricCanvasRef.current.discardActiveObject();
    fabricCanvasRef.current.renderAll();

    const dataURL = fabricCanvasRef.current.toDataURL({
      format: format,
      quality: 1,
      multiplier: 2 // 2x resolution
    });

    // Download
    const link = document.createElement('a');
    link.download = `poster-${Date.now()}.${format}`;
    link.href = dataURL;
    link.click();

    if (onSave) {
      onSave(dataURL);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex">
      {/* Left Toolbar */}
      <div className="w-16 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-4 gap-2">
        <button
          onClick={addText}
          className="p-3 hover:bg-gray-700 rounded-lg transition-colors group relative"
          title="Add Text"
        >
          <Type size={20} className="text-gray-300" />
        </button>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 hover:bg-gray-700 rounded-lg transition-colors"
          title="Add Image/Logo"
        >
          <Image size={20} className="text-gray-300" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={addImage}
          className="hidden"
        />

        <div className="border-t border-gray-700 w-10 my-2"></div>

        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          className="p-3 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          title="Undo"
        >
          <Undo size={20} className="text-gray-300" />
        </button>

        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="p-3 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          title="Redo"
        >
          <Redo size={20} className="text-gray-300" />
        </button>

        <div className="border-t border-gray-700 w-10 my-2"></div>

        <button
          onClick={() => handleZoom(0.1)}
          className="p-3 hover:bg-gray-700 rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={20} className="text-gray-300" />
        </button>

        <button
          onClick={() => handleZoom(-0.1)}
          className="p-3 hover:bg-gray-700 rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={20} className="text-gray-300" />
        </button>

        <span className="text-xs text-gray-400 mt-1">{Math.round(zoom * 100)}%</span>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4">
          <h2 className="text-white font-semibold">Poster Editor</h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportImage('png')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download size={18} />
              Export PNG
            </button>
            <button
              onClick={() => exportImage('jpg')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Download size={18} />
              Export JPG
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors ml-2"
            >
              <X size={20} className="text-gray-300" />
            </button>
          </div>
        </div>

        {/* Canvas Container */}
        <div className="flex-1 overflow-auto bg-gray-800 flex items-center justify-center p-8">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
              <div className="text-white">Loading editor...</div>
            </div>
          )}
          <div className="shadow-2xl" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>

      {/* Right Panel - Properties */}
      <div className="w-72 bg-gray-900 border-l border-gray-700 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-white font-semibold mb-4">Properties</h3>

          {selectedObject ? (
            <div className="space-y-4">
              {/* Object Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={deleteSelected}
                  className="p-2 bg-red-600/20 hover:bg-red-600/40 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} className="text-red-400" />
                </button>
                <button
                  onClick={duplicateSelected}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  title="Duplicate"
                >
                  <Copy size={16} className="text-gray-300" />
                </button>
                <button
                  onClick={rotateSelected}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  title="Rotate 15°"
                >
                  <RotateCw size={16} className="text-gray-300" />
                </button>
                <button
                  onClick={bringForward}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  title="Bring Forward"
                >
                  <ChevronUp size={16} className="text-gray-300" />
                </button>
                <button
                  onClick={sendBackward}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  title="Send Backward"
                >
                  <ChevronDown size={16} className="text-gray-300" />
                </button>
              </div>

              {/* Text Properties */}
              {selectedObject.type === 'i-text' && (
                <>
                  {/* Font Family */}
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Font</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => updateTextProperty('fontFamily', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    >
                      {fonts.map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Size</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateTextProperty('fontSize', Math.max(8, fontSize - 2))}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded"
                      >
                        <Minus size={14} className="text-gray-300" />
                      </button>
                      <input
                        type="number"
                        value={fontSize}
                        onChange={(e) => updateTextProperty('fontSize', parseInt(e.target.value) || 32)}
                        className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm text-center"
                      />
                      <button
                        onClick={() => updateTextProperty('fontSize', Math.min(200, fontSize + 2))}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded"
                      >
                        <Plus size={14} className="text-gray-300" />
                      </button>
                    </div>
                  </div>

                  {/* Text Style */}
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Style</label>
                    <div className="flex gap-2">
                      <button
                        onClick={toggleBold}
                        className={`p-2 rounded transition-colors ${selectedObject.fontWeight === 'bold' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                      >
                        <Bold size={16} className="text-white" />
                      </button>
                      <button
                        onClick={toggleItalic}
                        className={`p-2 rounded transition-colors ${selectedObject.fontStyle === 'italic' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                      >
                        <Italic size={16} className="text-white" />
                      </button>
                      <button
                        onClick={toggleUnderline}
                        className={`p-2 rounded transition-colors ${selectedObject.underline ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                      >
                        <Underline size={16} className="text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Text Alignment */}
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Alignment</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTextAlign('left')}
                        className={`p-2 rounded transition-colors ${selectedObject.textAlign === 'left' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                      >
                        <AlignLeft size={16} className="text-white" />
                      </button>
                      <button
                        onClick={() => setTextAlign('center')}
                        className={`p-2 rounded transition-colors ${selectedObject.textAlign === 'center' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                      >
                        <AlignCenter size={16} className="text-white" />
                      </button>
                      <button
                        onClick={() => setTextAlign('right')}
                        className={`p-2 rounded transition-colors ${selectedObject.textAlign === 'right' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                      >
                        <AlignRight size={16} className="text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="text-gray-400 text-sm block mb-1">Color</label>
                    <div className="grid grid-cols-6 gap-1">
                      {colors.map(color => (
                        <button
                          key={color}
                          onClick={() => updateTextProperty('fill', color)}
                          className={`w-8 h-8 rounded border-2 transition-all ${textColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => updateTextProperty('fill', e.target.value)}
                      className="w-full h-10 mt-2 rounded cursor-pointer"
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">
              <p className="mb-4">Select an element to edit its properties</p>
              <div className="space-y-2 text-xs">
                <p>💡 <strong>Add Text:</strong> Click the T icon</p>
                <p>💡 <strong>Add Logo:</strong> Click the image icon</p>
                <p>💡 <strong>Edit Text:</strong> Double-click on text</p>
                <p>💡 <strong>Move:</strong> Drag any element</p>
                <p>💡 <strong>Resize:</strong> Drag corner handles</p>
                <p>💡 <strong>Delete:</strong> Select + press Delete key</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Add Section */}
        <div className="p-4 border-t border-gray-700">
          <h3 className="text-white font-semibold mb-3">Quick Add</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={addText}
              className="flex items-center gap-2 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm text-gray-300"
            >
              <Type size={16} />
              Add Text
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm text-gray-300"
            >
              <Upload size={16} />
              Add Logo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PosterEditor;

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Shape {
  id: string;
  x: number;
  y: number;
  type: 'circle' | 'star' | 'triangle' | 'heart' | 'square' | 'hexagon' | 'diamond' | 'flower' | 'butterfly' | 'rainbow';
  color: string;
  size: number;
  palette: string;
  opacity: number;
}

interface Point {
  x: number;
  y: number;
}

const COLOR_PALETTES = {
  pastels: ['#FFB3E6', '#B3E5FF', '#B3FFB3', '#FFFFB3', '#E6B3FF', '#FFE6B3', '#B3FFFF', '#FFB3B3'],
  rainbow: ['#FF1493', '#00CED1', '#32CD32', '#FFD700', '#FF69B4', '#00BFFF', '#7FFF00', '#FF6347'],
  warm: ['#FF4500', '#FF8C00', '#FFD700', '#FF1493', '#DC143C', '#FF69B4', '#FF6B6B', '#FF7F50']
};

// Beautiful musical notes - pentatonic scale for harmony
const MUSICAL_NOTES = {
  pentatonic: [
    261.63, // C4
    293.66, // D4
    329.63, // E4
    392.00, // G4
    440.00, // A4
    523.25, // C5
    587.33, // D5
    659.25  // E5
  ],
  gentle: [
    220.00, // A3
    246.94, // B3
    261.63, // C4
    293.66, // D4
    329.63, // E4
    349.23, // F4
    392.00, // G4
    440.00  // A4
  ]
};

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}



export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const shapesRef = useRef<Shape[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  
  // Update refs when state changes
  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);
  
  useEffect(() => {
    particlesRef.current = particles;
  }, [particles]);

  const [currentShape, setCurrentShape] = useState<'circle' | 'star' | 'triangle' | 'heart' | 'square' | 'hexagon' | 'diamond' | 'flower' | 'butterfly' | 'rainbow'>('circle');
  const [currentPalette, setCurrentPalette] = useState<'pastels' | 'rainbow' | 'warm'>('pastels');
  const [currentSize, setCurrentSize] = useState(80); // Default size
  const [eraserMode, setEraserMode] = useState(false);
  const [draggedShape, setDraggedShape] = useState<Shape | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showLongPressIndicator, setShowLongPressIndicator] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const { toast } = useToast();

  // Initialize audio context
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Audio context not available:', error);
      }
    }
  }, []);

  // Play beautiful musical notes
  const playNote = useCallback((noteType: 'create' | 'delete' | 'action' = 'create') => {
    if (!audioContextRef.current) return;
    
    try {
      let frequency: number;
      
      if (noteType === 'create') {
        // Beautiful pentatonic notes for creation - always harmonious
        const pentatonicNotes = MUSICAL_NOTES.pentatonic;
        frequency = pentatonicNotes[Math.floor(Math.random() * pentatonicNotes.length)];
      } else if (noteType === 'delete') {
        // Gentle lower notes for deletion
        const gentleNotes = MUSICAL_NOTES.gentle;
        frequency = gentleNotes[Math.floor(Math.random() * gentleNotes.length)];
      } else {
        // Mix of both for actions
        const allNotes = [...MUSICAL_NOTES.pentatonic, ...MUSICAL_NOTES.gentle];
        frequency = allNotes[Math.floor(Math.random() * allNotes.length)];
      }
      
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      const filter = audioContextRef.current.createBiquadFilter();
      
      // Create bell-like tone
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      // Bell-like waveform with harmonics
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      
      // Bright filter for bell sound
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(frequency * 6, audioContextRef.current.currentTime);
      filter.Q.setValueAtTime(2, audioContextRef.current.currentTime);
      
      // Bell filter sweep
      filter.frequency.exponentialRampToValueAtTime(frequency * 2, audioContextRef.current.currentTime + 0.8);
      
      // Bell-like envelope - quick attack, gentle decay
      const volume = noteType === 'create' ? 0.15 : noteType === 'delete' ? 0.10 : 0.12;
      const duration = noteType === 'create' ? 1.2 : noteType === 'delete' ? 0.8 : 1.0;
      
      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContextRef.current.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(volume * 0.3, audioContextRef.current.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
      
      // Add harmonic overtones for richer sound
      const harmonic1 = audioContextRef.current.createOscillator();
      const harmonic1Gain = audioContextRef.current.createGain();
      harmonic1.connect(harmonic1Gain);
      harmonic1Gain.connect(audioContextRef.current.destination);
      harmonic1.type = 'sine';
      harmonic1.frequency.setValueAtTime(frequency * 2, audioContextRef.current.currentTime);
      harmonic1Gain.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      harmonic1Gain.gain.linearRampToValueAtTime(volume * 0.3, audioContextRef.current.currentTime + 0.01);
      harmonic1Gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration * 0.7);
      harmonic1.start(audioContextRef.current.currentTime);
      harmonic1.stop(audioContextRef.current.currentTime + duration * 0.7);
      
    } catch (error) {
      console.warn('Failed to play musical note:', error);
    }
  }, []);

  // Get random color from current palette
  const getRandomColor = useCallback(() => {
    const colors = COLOR_PALETTES[currentPalette];
    return colors[Math.floor(Math.random() * colors.length)];
  }, [currentPalette]);

  // Create spreading wave effect that covers the shape
  const createSpreadingWave = useCallback((x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    
    // Create a single expanding wave particle that represents the spreading effect
    newParticles.push({
      id: `wave-${Date.now()}`,
      x,
      y,
      vx: 0, // No movement at all
      vy: 0, // No movement at all
      life: 60, // Shorter, more elegant animation
      maxLife: 60,
      color: color,
      size: currentSize // Start with shape size
    });
    
    setParticles(prev => [...prev, ...newParticles]);
  }, [currentSize]);





  // Resize canvas to full screen
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Redraw all shapes after resize
    drawShapes();
  }, []);

  // Draw all shapes and particles on canvas
  const drawShapes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw each shape
    shapes.forEach(shape => {
      drawShape(ctx, shape);
    });
    
    // Draw particles
    particles.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    
  }, [shapes, particles]);

  // Draw individual shape
  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: Shape) => {
    ctx.save();
    ctx.globalAlpha = shape.opacity;
    ctx.fillStyle = shape.color;
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = 2;
    
    switch (shape.type) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, shape.size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'star':
        drawStar(ctx, shape.x, shape.y, shape.size / 2);
        break;
        
      case 'triangle':
        drawTriangle(ctx, shape.x, shape.y, shape.size / 2);
        break;
        
      case 'heart':
        drawHeart(ctx, shape.x, shape.y, shape.size / 2);
        break;
        
      case 'square':
        drawSquare(ctx, shape.x, shape.y, shape.size / 2);
        break;
        
      case 'hexagon':
        drawHexagon(ctx, shape.x, shape.y, shape.size / 2);
        break;
        
      case 'diamond':
        drawDiamond(ctx, shape.x, shape.y, shape.size / 2);
        break;
        
      case 'flower':
        drawFlower(ctx, shape.x, shape.y, shape.size / 2);
        break;
        
      case 'butterfly':
        drawButterfly(ctx, shape.x, shape.y, shape.size / 2);
        break;
        
      case 'rainbow':
        drawRainbow(ctx, shape.x, shape.y, shape.size / 2);
        break;
    }
    
    ctx.restore();
  }, []);

  // Draw star shape
  const drawStar = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    const spikes = 5;
    const outerRadius = radius;
    const innerRadius = radius * 0.5;
    
    ctx.beginPath();
    
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    
    ctx.closePath();
    ctx.fill();
  }, []);

  // Draw triangle shape
  const drawTriangle = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x - radius * 0.866, y + radius * 0.5);
    ctx.lineTo(x + radius * 0.866, y + radius * 0.5);
    ctx.closePath();
    ctx.fill();
  }, []);

  // Draw heart shape
  const drawHeart = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    const scale = radius / 20;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-10, -5, -20, 0, -10, 15);
    ctx.bezierCurveTo(-5, 20, 0, 25, 0, 25);
    ctx.bezierCurveTo(0, 25, 5, 20, 10, 15);
    ctx.bezierCurveTo(20, 0, 10, -5, 0, 5);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }, []);

  // Draw square shape
  const drawSquare = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    ctx.beginPath();
    ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.fill();
  }, []);

  // Draw hexagon shape
  const drawHexagon = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
  }, []);

  // Draw diamond shape
  const drawDiamond = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x + radius, y);
    ctx.lineTo(x, y + radius);
    ctx.lineTo(x - radius, y);
    ctx.closePath();
    ctx.fill();
  }, []);

  // Draw flower shape
  const drawFlower = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    const petals = 8;
    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * Math.PI * 2;
      const petalX = x + Math.cos(angle) * radius * 0.5;
      const petalY = y + Math.sin(angle) * radius * 0.5;
      
      ctx.beginPath();
      ctx.arc(petalX, petalY, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Center
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  // Draw butterfly shape
  const drawButterfly = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    // Left upper wing
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.4, y - radius * 0.2, radius * 0.35, radius * 0.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Right upper wing
    ctx.beginPath();
    ctx.ellipse(x + radius * 0.4, y - radius * 0.2, radius * 0.35, radius * 0.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Left lower wing
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.3, y + radius * 0.3, radius * 0.25, radius * 0.35, -0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Right lower wing
    ctx.beginPath();
    ctx.ellipse(x + radius * 0.3, y + radius * 0.3, radius * 0.25, radius * 0.35, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 0.08, radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Antennae
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.1, y - radius * 0.6);
    ctx.lineTo(x - radius * 0.2, y - radius * 0.8);
    ctx.moveTo(x + radius * 0.1, y - radius * 0.6);
    ctx.lineTo(x + radius * 0.2, y - radius * 0.8);
    ctx.stroke();
  }, []);

  // Draw rainbow shape
  const drawRainbow = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    const colors = ['#FF0000', '#FF8000', '#FFFF00', '#00FF00', '#0080FF', '#8000FF'];
    const segments = colors.length;
    
    for (let i = 0; i < segments; i++) {
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.arc(x, y, radius - (i * radius / segments), 0, Math.PI, true);
      ctx.arc(x, y, Math.max(0, radius - ((i + 1) * radius / segments)), Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    }
  }, []);

  // Find shape at coordinates
  const findShapeAt = useCallback((x: number, y: number): Shape | null => {
    // Check shapes in reverse order (topmost first)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      const distance = Math.sqrt((x - shape.x) ** 2 + (y - shape.y) ** 2);
      if (distance <= shape.size / 2) {
        return shape;
      }
    }
    return null;
  }, [shapes]);

  // Create new shape
  const createShape = useCallback((x: number, y: number) => {
    if (eraserMode) return;
    
    const color = getRandomColor();
    const newShape: Shape = {
      id: Date.now() + Math.random().toString(),
      x,
      y,
      type: currentShape,
      color,
      size: currentSize + Math.random() * 20 - 10, // Add some variety
      palette: currentPalette,
      opacity: 0.9
    };
    
    setShapes(prev => [...prev, newShape]);
    createSpreadingWave(x, y, color);
    playNote('create');
    initAudioContext();
  }, [currentShape, currentPalette, currentSize, eraserMode, getRandomColor, createSpreadingWave, playNote, initAudioContext]);

  // Delete shape
  const deleteShape = useCallback((shapeToDelete: Shape) => {
    setShapes(prev => prev.filter(shape => shape.id !== shapeToDelete.id));
    playNote('delete');
  }, [playNote]);

  // Increase shape size
  const increaseSize = useCallback(() => {
    setCurrentSize(prev => Math.min(prev + 20, 200)); // Max size 200
    playNote('action');
  }, [playNote]);

  // Decrease shape size
  const decreaseSize = useCallback(() => {
    setCurrentSize(prev => Math.max(prev - 20, 20)); // Min size 20
    playNote('action');
  }, [playNote]);

  // Handle pointer down (mouse/touch start)
  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    initAudioContext();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const touchedShape = findShapeAt(x, y);
    
    if (touchedShape && eraserMode) {
      deleteShape(touchedShape);
      return;
    }
    
    if (touchedShape) {
      // Start long press timer for drag mode
      setShowLongPressIndicator(true);
      setLongPressProgress(0);
      
      const timer = setTimeout(() => {
        setDraggedShape(touchedShape);
        setDragOffset({ x: x - touchedShape.x, y: y - touchedShape.y });
        setShowLongPressIndicator(false);
        
        // Highlight the dragged shape
        setShapes(prev => prev.map(shape => 
          shape.id === touchedShape.id 
            ? { ...shape, opacity: 0.7 } // Make dragged shape semi-transparent
            : shape
        ));
        
        playNote('action');
        toast({
          title: "Drag Mode",
          description: "You can now drag this shape around!",
          duration: 2000,
        });
      }, 1500); // 1.5 seconds - more than 1 second as requested
      
      setLongPressTimer(timer);
      
      // Animate progress
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / 1500, 1); // Update to match new timer
        setLongPressProgress(progress);
        
        if (progress >= 1) {
          clearInterval(progressInterval);
        }
      }, 16);
    } else {
      // Create new shape
      createShape(x, y);
    }
  }, [findShapeAt, eraserMode, deleteShape, createShape, initAudioContext, toast]);

  // Handle pointer move (drag)
  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggedShape) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - dragOffset.x;
    const y = event.clientY - rect.top - dragOffset.y;
    
    setShapes(prev => prev.map(shape => 
      shape.id === draggedShape.id 
        ? { ...shape, x, y }
        : shape
    ));
  }, [draggedShape, dragOffset]);

  // Handle pointer up (mouse/touch end)
  const handlePointerUp = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // Restore opacity of dragged shape
    if (draggedShape) {
      setShapes(prev => prev.map(shape => 
        shape.id === draggedShape.id 
          ? { ...shape, opacity: 1 } // Restore full opacity
          : shape
      ));
      playNote('action');
    }
    
    setShowLongPressIndicator(false);
    setLongPressProgress(0);
    setDraggedShape(null);
    setDragOffset({ x: 0, y: 0 });
  }, [longPressTimer, draggedShape, playNote]);

  // Cycle through shapes
  const cycleShape = useCallback(() => {
    const shapes: Array<'circle' | 'star' | 'triangle' | 'heart' | 'square' | 'hexagon' | 'diamond' | 'flower' | 'butterfly' | 'rainbow'> = 
      ['circle', 'star', 'triangle', 'heart', 'square', 'hexagon', 'diamond', 'flower', 'butterfly', 'rainbow'];
    const currentIndex = shapes.indexOf(currentShape);
    setCurrentShape(shapes[(currentIndex + 1) % shapes.length]);
    playNote('action');
  }, [currentShape, playNote]);

  // Cycle through color palettes
  const cyclePalette = useCallback(() => {
    const palettes: Array<'pastels' | 'rainbow' | 'warm'> = ['pastels', 'rainbow', 'warm'];
    const currentIndex = palettes.indexOf(currentPalette);
    setCurrentPalette(palettes[(currentIndex + 1) % palettes.length]);
    playNote('action');
  }, [currentPalette, playNote]);

  // Toggle eraser mode
  const toggleEraser = useCallback(() => {
    setEraserMode(prev => !prev);
    playNote('action');
  }, [playNote]);

  // Clear all shapes
  const clearCanvas = useCallback(() => {
    if (shapes.length > 0) {
      setShapes([]);
      setParticles([]);
      playNote('action');
      toast({
        title: "Canvas Cleared",
        description: "All shapes have been removed!",
        duration: 2000,
      });
    }
  }, [shapes.length, playNote, toast]);

  // Save artwork
  const saveArtwork = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const filename = prompt('Enter a name for your artwork:') || 'my-artwork';
    
    try {
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast({
        title: "Artwork Saved!",
        description: `Your creation "${filename}" has been downloaded.`,
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save your artwork. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [toast]);

  // Get shape icon
  const getShapeIcon = useCallback((shape: string) => {
    switch (shape) {
      case 'circle': return 'fa-circle';
      case 'star': return 'fa-star';
      case 'triangle': return 'fa-play';
      case 'heart': return 'fa-heart';
      case 'square': return 'fa-square';
      case 'hexagon': return 'fa-hexagon';
      case 'diamond': return 'fa-diamond';
      case 'flower': return 'fa-flower';
      case 'butterfly': return 'fa-bug';
      case 'rainbow': return 'fa-rainbow';
      default: return 'fa-circle';
    }
  }, []);

  // Initialize canvas and event listeners
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas]);

  // Redraw canvas when shapes change
  useEffect(() => {
    drawShapes();
  }, [drawShapes]);

  // Animation loop for smooth rendering
  useEffect(() => {
    let isRunning = true;
    
    const animate = () => {
      if (!isRunning) return;
      
      const canvas = canvasRef.current;
      if (!canvas) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Access current state from refs to avoid stale closures
      const currentShapes = shapesRef.current || [];
      const currentParticles = particlesRef.current || [];
      
      // Draw each shape
      currentShapes.forEach(shape => {
        drawShape(ctx, shape);
      });
      
      // Draw spreading wave effect
      currentParticles.forEach(particle => {
        const alpha = particle.life / particle.maxLife;
        const progress = 1 - alpha; // How far the wave has spread
        
        ctx.save();
        
        // Create expanding filled circle that fades out
        const waveRadius = particle.size + (progress * 150); // Expands much larger
        const waveAlpha = alpha * 0.6; // Fade out over time
        
        // Create radial gradient for smooth spreading effect
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, particle.size * 0.5,
          particle.x, particle.y, waveRadius
        );
        
        // Color fades from solid at center to transparent at edge
        gradient.addColorStop(0, particle.color + Math.floor(waveAlpha * 255).toString(16).padStart(2, '0'));
        gradient.addColorStop(0.3, particle.color + Math.floor(waveAlpha * 128).toString(16).padStart(2, '0'));
        gradient.addColorStop(0.7, particle.color + Math.floor(waveAlpha * 64).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, particle.color + '00'); // Fully transparent at edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, waveRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      isRunning = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawShape]);

  // Separate useEffect for particle updates to avoid infinite loop
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setParticles(prev => prev
        .map(particle => ({
          ...particle,
          // No movement - particles stay in place
          x: particle.x,
          y: particle.y,
          vx: 0,
          vy: 0,
          life: particle.life - 1
        }))
        .filter(particle => particle.life > 0)
      );
    }, 16); // ~60fps
    
    return () => clearInterval(updateInterval);
  }, []);

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 canvas-bg cursor-crosshair touch-manipulation"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ touchAction: 'none' }}
      />

      {/* Control Panel */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-10">
        <div className="flex items-center gap-3">
          {/* Shape Selector */}
          <Button
            onClick={cycleShape}
            className="flex flex-col items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Shape selector"
          >
            <i className={`fas ${getShapeIcon(currentShape)} text-xl mb-1`}></i>
            <span className="text-xs font-medium">Shape</span>
          </Button>

          {/* Color Palette Selector */}
          <Button
            onClick={cyclePalette}
            className="flex flex-col items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Color palette selector"
          >
            <i className="fas fa-palette text-xl mb-1"></i>
            <span className="text-xs font-medium">Colors</span>
          </Button>

          {/* Size Controls */}
          <div className="flex flex-col gap-1">
            <Button
              onClick={increaseSize}
              className="flex items-center justify-center w-12 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
              aria-label="Increase size"
            >
              <i className="fas fa-plus text-xs"></i>
            </Button>
            <Button
              onClick={decreaseSize}
              className="flex items-center justify-center w-12 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
              aria-label="Decrease size"
            >
              <i className="fas fa-minus text-xs"></i>
            </Button>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-200"></div>

          {/* Eraser Toggle */}
          <Button
            onClick={toggleEraser}
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 ${
              eraserMode 
                ? 'bg-gradient-to-br from-red-600 to-red-700 pulse-glow' 
                : 'bg-gradient-to-br from-orange-500 to-red-500'
            }`}
            aria-label="Toggle eraser mode"
          >
            <i className="fas fa-eraser text-xl mb-1"></i>
            <span className="text-xs font-medium">Erase</span>
          </Button>

          {/* Clear Canvas */}
          <Button
            onClick={clearCanvas}
            className="flex flex-col items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Clear all shapes"
          >
            <i className="fas fa-trash text-xl mb-1"></i>
            <span className="text-xs font-medium">Clear</span>
          </Button>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-200"></div>

          {/* Save Artwork */}
          <Button
            onClick={saveArtwork}
            className="flex flex-col items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Save artwork"
          >
            <i className="fas fa-download text-xl mb-1"></i>
            <span className="text-xs font-medium">Save</span>
          </Button>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="absolute top-6 left-6 bg-white rounded-xl shadow-lg p-4 border border-gray-200 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Shape:</span>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full flex items-center justify-center">
              <i className={`fas ${getShapeIcon(currentShape)} text-white text-sm`}></i>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Palette:</span>
            <div className="flex gap-1">
              {COLOR_PALETTES[currentPalette].slice(0, 4).map((color, index) => (
                <div
                  key={index}
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: color }}
                ></div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Size:</span>
            <div className="px-2 py-1 bg-blue-100 rounded-lg">
              <span className="text-sm font-medium text-blue-700">{currentSize}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Long Press Indicator */}
      {showLongPressIndicator && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 fade-in">
          <div className="w-24 h-24 bg-white rounded-full shadow-2xl flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-purple-200 rounded-full relative">
              <div 
                className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent transition-transform duration-75"
                style={{ 
                  transform: `rotate(${longPressProgress * 360}deg)`,
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((longPressProgress * 360 - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((longPressProgress * 360 - 90) * Math.PI / 180)}%, 50% 50%)`
                }}
              ></div>
            </div>
          </div>
          <p className="text-center text-white text-sm mt-2 font-medium">Hold to drag...</p>
        </div>
      )}

      {/* Instructions Panel */}
      {showInstructions && (
        <div className="absolute top-6 right-6 bg-white rounded-xl shadow-lg p-4 border border-gray-200 max-w-xs z-10 fade-in">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <i className="fas fa-info-circle text-blue-500"></i>
            How to Play
          </h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-start gap-2">
              <i className="fas fa-hand-pointer text-purple-500 mt-0.5 text-xs"></i>
              <span>Tap anywhere to create colorful shapes</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-hand-paper text-orange-500 mt-0.5 text-xs"></i>
              <span>Hold for 3 seconds to drag shapes</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-music text-green-500 mt-0.5 text-xs"></i>
              <span>Each touch plays a musical note</span>
            </li>
          </ul>
          <Button
            onClick={() => setShowInstructions(false)}
            variant="ghost"
            size="sm"
            className="mt-3 text-xs text-gray-500 hover:text-gray-700 transition-colors p-0 h-auto"
          >
            <i className="fas fa-times mr-1"></i> Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

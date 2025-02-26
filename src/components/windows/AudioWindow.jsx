import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

const AudioWindow = ({ nodeId, onCommand, windowState, updateWindowState }) => {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(windowState?.isPlaying || false);
  const [currentTime, setCurrentTime] = useState(windowState?.currentTime || 0);

  // Define draw function outside of other functions to avoid dependency issues
  const draw = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) {
      console.error('Cannot draw: canvas or analyser is null');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    
    // Make sure canvas dimensions are set correctly
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = canvas.offsetWidth || 300;
      canvas.height = canvas.offsetHeight || 150;
    }
    
    // Use a smaller FFT size for better visualization
    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const drawFrame = () => {
      // Cancel any existing animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      // Request next frame
      animationRef.current = requestAnimationFrame(drawFrame);
      
      // Get frequency data
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.fillStyle = 'rgb(28, 25, 23)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw visualizer
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] * 1.5;
        
        // Make sure we have a minimum height for bars
        if (barHeight < 1) barHeight = 1;
        
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#14b8a6');
        gradient.addColorStop(1, '#2dd4bf');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    // Start the animation
    drawFrame();
    
    console.log('Visualization started');
    
    // Return a cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  // Track if audio element has been connected to a source
  const sourceConnectedRef = useRef(false);

  // Setup audio with Web Audio API for visualization
  const setupAudio = useCallback(async () => {
    try {
      const audio = audioRef.current;
      if (!audio) {
        console.error('Audio element reference is null');
        return false;
      }
      
      // Force reset the sourceConnected flag if we're having issues
      if (audioContextRef.current?.state === 'closed') {
        sourceConnectedRef.current = false;
      }
      
      // Create new AudioContext if needed
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        console.log('Creating new AudioContext');
        
        // Create new AudioContext
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create and configure analyser
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; // Smaller FFT size for better visualization
        analyser.smoothingTimeConstant = 0.8; // Add smoothing
        
        // Resume audio context (needed due to browser autoplay policies)
        await audioContext.resume();
        
        // Create a new MediaElementSource and connect it
        try {
          console.log('Creating new MediaElementSource');
          const source = audioContext.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(audioContext.destination);
          sourceConnectedRef.current = true;
          
          // Store references
          audioContextRef.current = audioContext;
          analyserRef.current = analyser;
          
          console.log('Audio setup complete with new AudioContext');
        } catch (sourceError) {
          console.error('Error creating MediaElementSource:', sourceError);
          return false;
        }
      } else {
        // If AudioContext exists but is suspended, resume it
        if (audioContextRef.current.state === 'suspended') {
          console.log('Resuming suspended AudioContext');
          await audioContextRef.current.resume();
        }
        
        console.log('Using existing AudioContext');
      }
      
      // Restore playback position from window state
      if (windowState?.currentTime) {
        audio.currentTime = windowState.currentTime;
      }
      
      return true;
    } catch (error) {
      console.error('Error setting up audio:', error);
      return false;
    }
  }, [windowState]);

  // Initialize audio on mount or when windowState changes
  useEffect(() => {
    const initializeAudio = async () => {
      // Set up the audio context
      const success = await setupAudio();
      
      // If setup was successful and we should be playing, start playback
      if (success && windowState?.isPlaying) {
        try {
          await audioRef.current.play();
          draw();
        } catch (error) {
          console.error('Error auto-playing audio:', error);
          setIsPlaying(false);
        }
      }
    };

    if (audioRef.current && 
        (!audioContextRef.current || audioContextRef.current.state === 'closed')) {
      initializeAudio();
    }

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (error) {
          console.error('Error closing AudioContext:', error);
        }
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [windowState, setupAudio, draw]);

  // Toggle play/pause
  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      console.log('Toggle play clicked, current state:', isPlaying);
      
      // Make sure audio context is initialized and running
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        console.log('Setting up audio again');
        const success = await setupAudio();
        if (!success) {
          console.error('Failed to set up audio');
          return;
        }
      } else if (audioContextRef.current.state === 'suspended') {
        console.log('Resuming suspended AudioContext');
        await audioContextRef.current.resume();
      }

      if (isPlaying) {
        console.log('Pausing audio');
        audioRef.current.pause();
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      } else {
        console.log('Starting audio playback');
        try {
          // Start visualization before playing to ensure it's ready
          if (analyserRef.current && !animationRef.current) {
            console.log('Starting visualization');
            draw();
          }
          
          // Play the audio
          const playPromise = audioRef.current.play();
          if (playPromise) {
            await playPromise;
            console.log('Audio playback started successfully');
            
            // Make sure visualization is running
            if (!animationRef.current && analyserRef.current) {
              console.log('Starting visualization after successful play');
              draw();
            }
          }
        } catch (playError) {
          console.error('Error playing audio:', playError);
        }
      }
      
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error in togglePlay:', error);
    }
  }, [isPlaying, setupAudio, draw]);

  // Handle canvas resize
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Update current time when playing
  useEffect(() => {
    if (!audioRef.current) return;
    
    const updateTime = () => {
      setCurrentTime(audioRef.current.currentTime);
    };
    
    audioRef.current.addEventListener('timeupdate', updateTime);
    return () => {
      audioRef.current?.removeEventListener('timeupdate', updateTime);
    };
  }, []);
  
  // Start visualization when audio is playing
  useEffect(() => {
    // If audio is playing but visualization is not running, start it
    if (isPlaying && audioRef.current && analyserRef.current && !animationRef.current) {
      console.log('Starting visualization due to isPlaying state change');
      draw();
    }
    
    // If audio is not playing but visualization is running, stop it
    if (!isPlaying && animationRef.current) {
      console.log('Stopping visualization due to isPlaying state change');
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [isPlaying, draw]);

  // Update window state when relevant state changes
  useEffect(() => {
    if (updateWindowState) {
      updateWindowState({
        isPlaying,
        currentTime
      });
    }
  }, [isPlaying, currentTime, updateWindowState]);

  return (
    <div className="h-full w-full flex flex-col bg-stone-900 text-teal-400">
      <div className="flex-1 relative">
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />
      </div>

      <div className="border-t border-stone-700">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={togglePlay}
            className="p-2 hover:bg-stone-800 rounded-full transition-colors"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <Volume2 size={24} />
        </div>

        <audio
          ref={audioRef}
          src="scamming-on-runescape.mp3"
          preload="auto"
          crossOrigin="anonymous"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />

        <div className="p-2 flex items-center gap-2 border-t border-stone-700">
          <span>$</span>
          <input
            type="text"
            className="flex-1 bg-stone-800 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                onCommand(e.target.value.trim());
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AudioWindow;

import React, { useState, useEffect, useRef } from 'react';
import { DicesIcon, History, Trash, Plus, Minus, Save } from 'lucide-react';

const DiceWindow = ({ nodeId, onCommand, windowState, updateWindowState }) => {
  // State for the dice window
  const [diceType, setDiceType] = useState(windowState?.diceType || 20);
  const [numDice, setNumDice] = useState(windowState?.numDice || 1);
  const [modifier, setModifier] = useState(windowState?.modifier || 0);
  const [rollHistory, setRollHistory] = useState(windowState?.rollHistory || []);
  const [rollResults, setRollResults] = useState(windowState?.rollResults || null);
  const [isRolling, setIsRolling] = useState(false);
  const [favorites, setFavorites] = useState(windowState?.favorites || []);
  
  // Constants for dice types
  const diceTypes = [4, 6, 8, 10, 12, 20, 100];
  
  // Refs
  const rollAreaRef = useRef(null);

  // Function to roll dice
  const rollDice = () => {
    // Start rolling animation
    setIsRolling(true);
    
    // Generate random results after a short delay for animation effect
    setTimeout(() => {
      const results = [];
      let total = 0;
      
      // Roll each die
      for (let i = 0; i < numDice; i++) {
        const result = Math.floor(Math.random() * diceType) + 1;
        results.push(result);
        total += result;
      }
      
      // Add modifier to total
      total += modifier;
      
      // Create roll result object with timestamp
      const rollResult = {
        diceType,
        numDice,
        modifier,
        results,
        total,
        timestamp: new Date().toISOString(),
      };
      
      // Update results and history
      setRollResults(rollResult);
      setRollHistory(prev => [rollResult, ...prev].slice(0, 20)); // Keep only last 20 rolls
      setIsRolling(false);
    }, 600);
  };
  
  // Function to add a favorite combination
  const addFavorite = () => {
    const newFavorite = {
      id: Date.now(),
      name: `${numDice}d${diceType}${modifier > 0 ? `+${modifier}` : modifier < 0 ? modifier : ''}`,
      diceType,
      numDice,
      modifier
    };
    
    setFavorites(prev => [newFavorite, ...prev]);
  };
  
  // Function to use a favorite combination
  const useFavorite = (favorite) => {
    setDiceType(favorite.diceType);
    setNumDice(favorite.numDice);
    setModifier(favorite.modifier);
  };
  
  // Function to remove a favorite
  const removeFavorite = (id) => {
    setFavorites(prev => prev.filter(fav => fav.id !== id));
  };
  
  // Function to clear history
  const clearHistory = () => {
    setRollHistory([]);
    setRollResults(null);
  };
  
  // Function to increment dice number
  const incrementDice = () => {
    setNumDice(prev => Math.min(prev + 1, 20));
  };
  
  // Function to decrement dice number
  const decrementDice = () => {
    setNumDice(prev => Math.max(prev - 1, 1));
  };
  
  // Function to increment modifier
  const incrementModifier = () => {
    setModifier(prev => prev + 1);
  };
  
  // Function to decrement modifier
  const decrementModifier = () => {
    setModifier(prev => prev - 1);
  };
  
  // Handle command input
  const handleDiceCommand = (command) => {
    // Basic regex to match dice roll syntax like "2d6+3"
    const diceRegex = /^(\d+)d(\d+)([+-]\d+)?$/i;
    const match = command.match(diceRegex);
    
    if (match) {
      const parsedNumDice = parseInt(match[1], 10);
      const parsedDiceType = parseInt(match[2], 10);
      const parsedModifier = match[3] ? parseInt(match[3], 10) : 0;
      
    // Check if the dice type is valid (between 2 and 100)
    if (parsedDiceType >= 2 && parsedDiceType <= 100) {
      setNumDice(parsedNumDice);
      setDiceType(parsedDiceType);
      setModifier(parsedModifier);
      rollDice();
    } else {
      // Invalid dice type
      console.log("Invalid dice type. Please use dice with 2-100 sides (e.g., d2, d6, d20, d37, d100)");
    }
    } else {
      // Pass any other commands to the parent handler
      if (onCommand) {
        onCommand(command);
      }
    }
  };
  
  // Update window state when state changes
  useEffect(() => {
    if (updateWindowState) {
      updateWindowState({
        diceType,
        numDice,
        modifier,
        rollHistory,
        rollResults,
        favorites
      });
    }
  }, [diceType, numDice, modifier, rollHistory, rollResults, favorites, updateWindowState]);
  
  // Function to format the dice expression
  const getDiceExpression = () => {
    return `${numDice}d${diceType}${modifier > 0 ? `+${modifier}` : modifier < 0 ? modifier : ''}`;
  };
  
  // Render dice button
  const renderDiceButton = (type) => {
    return (
      <button
        key={type}
        onClick={() => setDiceType(type)}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          diceType === type
            ? 'bg-teal-600 text-white'
            : 'bg-stone-800 text-teal-400 hover:bg-stone-700'
        }`}
      >
        d{type}
      </button>
    );
  };
  
  // Render individual die result with animation
  const renderDieResult = (result, index) => {
    return (
      <div 
        key={index}
        className={`text-center p-2 rounded-md bg-stone-800 font-bold text-lg ${
          result === diceType ? 'text-yellow-400' : 'text-teal-400'
        }`}
      >
        {result}
      </div>
    );
  };
  
  return (
    <div className="h-full w-full flex flex-col bg-stone-900 text-teal-400 overflow-hidden">
      {/* Dice selector section */}
      <div className="p-4 border-b border-stone-700">
        <div className="flex flex-wrap gap-2 mb-4">
          {diceTypes.map(type => renderDiceButton(type))}
        </div>
        
        {/* Dice quantity and modifier controls */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Number:</span>
            <button
              onClick={decrementDice}
              className="p-1 rounded-md bg-stone-800 hover:bg-stone-700"
              disabled={numDice <= 1}
            >
              <Minus size={16} />
            </button>
            <span className="w-8 text-center">{numDice}</span>
            <button
              onClick={incrementDice}
              className="p-1 rounded-md bg-stone-800 hover:bg-stone-700"
              disabled={numDice >= 20}
            >
              <Plus size={16} />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Modifier:</span>
            <button
              onClick={decrementModifier}
              className="p-1 rounded-md bg-stone-800 hover:bg-stone-700"
            >
              <Minus size={16} />
            </button>
            <span className="w-8 text-center">{modifier >= 0 ? `+${modifier}` : modifier}</span>
            <button
              onClick={incrementModifier}
              className="p-1 rounded-md bg-stone-800 hover:bg-stone-700"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        
        {/* Roll button and favorites */}
        <div className="flex gap-2">
          <button
            onClick={rollDice}
            className={`flex-1 py-2 rounded-md text-white font-medium transition-colors ${
              isRolling ? 'bg-teal-700' : 'bg-teal-600 hover:bg-teal-500'
            }`}
            disabled={isRolling}
          >
            Roll {getDiceExpression()}
          </button>
          <button
            onClick={addFavorite}
            className="p-2 rounded-md bg-stone-800 hover:bg-stone-700"
            title="Save as favorite"
          >
            <Save size={20} />
          </button>
        </div>
      </div>
      
      {/* Results section */}
      <div 
        ref={rollAreaRef}
        className="flex-1 p-4 overflow-y-auto"
      >
        {/* Current roll results */}
        {rollResults && (
          <div className="mb-6 p-4 rounded-lg bg-stone-800 animate-fade-in">
            <div className="text-lg font-bold mb-2">
              {rollResults.numDice}d{rollResults.diceType}
              {rollResults.modifier > 0 && `+${rollResults.modifier}`}
              {rollResults.modifier < 0 && rollResults.modifier}
            </div>
            
            <div className="grid grid-cols-5 gap-2 mb-3">
              {rollResults.results.map((result, idx) => renderDieResult(result, idx))}
            </div>
            
            <div className="text-xl font-bold text-center">
              Total: <span className="text-yellow-400">{rollResults.total}</span>
            </div>
          </div>
        )}
        
        {/* Favorites section */}
        {favorites.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-2 flex items-center">
              <Save size={16} className="mr-2" /> Favorites
            </div>
            <div className="grid grid-cols-2 gap-2">
              {favorites.map(favorite => (
                <div
                  key={favorite.id}
                  className="flex justify-between items-center p-2 rounded-md bg-stone-800"
                >
                  <button
                    onClick={() => useFavorite(favorite)}
                    className="flex-1 text-left"
                  >
                    {favorite.name}
                  </button>
                  <button
                    onClick={() => removeFavorite(favorite.id)}
                    className="p-1 text-stone-500 hover:text-red-400"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Roll history section */}
        {rollHistory.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2 flex items-center justify-between">
              <div className="flex items-center">
                <History size={16} className="mr-2" /> 
                Roll History
              </div>
              <button
                onClick={clearHistory}
                className="text-xs p-1 text-stone-500 hover:text-red-400 flex items-center"
              >
                <Trash size={14} className="mr-1" /> Clear
              </button>
            </div>
            
            <div className="space-y-2">
              {rollHistory.map((roll, idx) => (
                <div
                  key={idx}
                  className="text-sm p-2 rounded-md bg-stone-800 flex justify-between"
                >
                  <div>
                    {roll.numDice}d{roll.diceType}
                    {roll.modifier > 0 && `+${roll.modifier}`}
                    {roll.modifier < 0 && roll.modifier}
                    {" = "}
                    <span className="font-medium">{roll.total}</span>
                  </div>
                  <div className="text-stone-500">
                    {new Date(roll.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Command input section */}
      <div className="p-2 flex items-center gap-2 border-t border-stone-700">
        <span>$</span>
        <input
          type="text"
          className="flex-1 bg-stone-800 text-teal-400 px-2 py-1 rounded font-mono text-sm focus:outline-none"
          placeholder="Type a dice command (e.g. 2d6+3)"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              handleDiceCommand(e.target.value.trim());
              e.target.value = '';
            }
          }}
        />
      </div>
    </div>
  );
};

export default DiceWindow;

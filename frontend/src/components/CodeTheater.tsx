import React, { useState, useEffect, useRef } from 'react';
import { Stage, Container, Text, Graphics } from '@pixi/react';
import axios from 'axios';
import * as PIXI from 'pixi.js';

// Types
interface Character {
    name: string;
    role: string;
    description: string;
    type?: string;
}

interface SceneStep {
    action: string;
    character: string;
    details: string;
    line?: string;
}

interface ScriptResponse {
    characters: Character[];
    script: SceneStep[];
}

// Procedural Character Generator (Pixel-style / Geometric)
const CharacterSprite = ({ name, type, x, y, color, isTalking }: { name: string, type?: string, x: number, y: number, color: number, isTalking?: boolean }) => {
    const draw = React.useCallback((g: PIXI.Graphics) => {
        g.clear();
        
        // --- Body ---
        g.beginFill(color);
        if (type === 'function') {
            // Robot / Boxy shape for functions
            g.drawRoundedRect(-20, -30, 40, 60, 5);
        } else if (type === 'variable') {
            // Sphere / Circle for data
            g.drawCircle(0, 0, 25);
        } else if (type === 'class') {
            // Hexagon / Fortress for classes
            g.drawPolygon([-30, 0, -15, -25, 15, -25, 30, 0, 15, 25, -15, 25]);
        } else {
             // Default blob
             g.drawEllipse(0, 0, 25, 35);
        }
        g.endFill();
        
        // --- Eyes ---
        g.beginFill(0xFFFFFF);
        g.drawCircle(-8, -10, 6);
        g.drawCircle(8, -10, 6);
        g.endFill();
        
        g.beginFill(0x000000);
        g.drawCircle(-8, -10, 2); // Pupil
        g.drawCircle(8, -10, 2);  // Pupil
        g.endFill();
        
        // --- Mouth (Animated if talking) ---
        g.lineStyle(2, 0xFFFFFF);
        if (isTalking) {
             g.drawEllipse(0, 10, 6, 4); // Open mouth
        } else {
             g.moveTo(-5, 10);
             g.lineTo(5, 10); // Closed mouth
        }
        
        // --- Accessories based on type ---
        if (type === 'function') {
            // Antenna
            g.lineStyle(2, color);
            g.moveTo(0, -30);
            g.lineTo(0, -45);
            g.beginFill(0xFF0000);
            g.drawCircle(0, -45, 3);
            g.endFill();
        }

    }, [color, type, isTalking]);

    return (
        <Container x={x} y={y}>
            <Graphics draw={draw} />
            <Text 
                text={name} 
                anchor={0.5} 
                y={-50} 
                style={new PIXI.TextStyle({ 
                    fill: 'white', 
                    fontSize: 14,
                    fontWeight: 'bold',
                    stroke: '#000000',
                    strokeThickness: 2,
                })} 
            />
        </Container>
    );
};

const PRESET_EXAMPLES = [
    {
        name: "Bubble Sort",
        code: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]`
    },
    {
        name: "Fibonacci Recursion",
        code: `def fibonacci(n):
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)
        
result = fibonacci(5)`
    },
    {
        name: "Simple Class",
        code: `class Dog:
    def __init__(self, name):
        self.name = name
        
    def bark(self):
        print(f"{self.name} says Woof!")
        
dog = Dog("Buddy")
dog.bark()`
    }
];

const CodeTheater: React.FC = () => {
    const [code, setCode] = useState<string>('def sort(list):\n    pass');
    const [scriptData, setScriptData] = useState<ScriptResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [backendStatus, setBackendStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
    
    // Character positions state
    const [charPositions, setCharPositions] = useState<{[key: string]: {x: number, y: number, visible: boolean}}>({});

    const [debugLog, setDebugLog] = useState<string[]>([]);
    
    const addLog = (msg: string) => {
        setDebugLog(prev => [msg, ...prev].slice(0, 5));
        console.log(msg);
    };

    useEffect(() => {
        const checkBackend = async () => {
            try {
                // Use relative path to leverage Vite proxy
                await axios.get('/api/health');
                setBackendStatus('connected');
                // addLog("Backend connected via proxy");
            } catch (err: any) {
                console.error("Backend check failed:", err);
                setBackendStatus('error');
                addLog(`Backend check failed: ${err.message}`);
            }
        };
        checkBackend();
        const interval = setInterval(checkBackend, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleRandomCode = () => {
        const randomExample = PRESET_EXAMPLES[Math.floor(Math.random() * PRESET_EXAMPLES.length)];
        setCode(randomExample.code);
    };

    const [language, setLanguage] = useState<'en' | 'zh' | 'ja' | 'fr'>('en');
    
    const getLanguageLabel = (lang: string) => {
        switch(lang) {
            case 'zh': return '🇨🇳 中文';
            case 'ja': return '🇯🇵 日本語';
            case 'fr': return '🇫🇷 Français';
            default: return '🇺🇸 English';
        }
    };
    
    const cycleLanguage = () => {
        setLanguage(prev => {
            if (prev === 'en') return 'zh';
            if (prev === 'zh') return 'ja';
            if (prev === 'ja') return 'fr';
            return 'en';
        });
    };

    const handleVisualize = async () => {
        setLoading(true);
        addLog("Starting visualization...");
        try {
            // Use relative path to leverage Vite proxy
            const apiUrl = '/api/parse';
            addLog(`Sending request to: ${apiUrl}`);
            
            const response = await axios.post<ScriptResponse>(apiUrl, {
                code,
                language: 'python',
                output_language: language
            });
            addLog(`Response received: ${response.status} OK`);
            
            // Auto-start the script
            setScriptData(response.data);
            
            // Start from step 0 immediately
            setCurrentStepIndex(0);
            
            // Initialize positions
            const initialPos: {[key: string]: {x: number, y: number, visible: boolean}} = {};
            response.data.characters.forEach((char, index) => {
                initialPos[char.name] = { 
                    x: 100 + index * 120, 
                    y: 300, 
                    visible: false // Start invisible
                };
            });
            
            // Apply first step logic immediately
            const firstStep = response.data.script[0];
            if (firstStep) {
                 const charName = firstStep.character;
                 if (!initialPos[charName]) initialPos[charName] = { x: 300, y: 300, visible: false };
                 
                 if (firstStep.action === 'enter') {
                     initialPos[charName].visible = true;
                 }
            }
            
            setCharPositions(initialPos);

        } catch (error: any) {
            console.error("Error parsing code:", error);
            // Enhanced error message
            let msg = "Failed to parse code";
            if (error.response) {
                msg = `Server Error (${error.response.status}): ${JSON.stringify(error.response.data)}`;
            } else if (error.request) {
                msg = "No response from server. Check console for CORS/Network issues.";
            } else {
                msg = error.message;
            }
            addLog(`Error: ${msg}`);
            alert("Error: " + msg);
        } finally {
            setLoading(false);
        }
    };

    const playNextStep = () => {
        if (!scriptData || currentStepIndex >= scriptData.script.length - 1) return;

        const nextIndex = currentStepIndex + 1;
        const step = scriptData.script[nextIndex];
        setCurrentStepIndex(nextIndex);

        // Update state based on step action
        setCharPositions(prev => {
            const newPos = { ...prev };
            const charName = step.character;
            
            if (!newPos[charName]) {
                 newPos[charName] = { x: 300, y: 300, visible: true };
            }

            if (step.action === 'enter') {
                newPos[charName].visible = true;
                // Move to a slot
                const visibleCount = Object.values(newPos).filter(p => p.visible).length;
                newPos[charName].x = 100 + visibleCount * 100;
            } else if (step.action === 'exit') {
                newPos[charName].visible = false;
            } else if (step.action === 'action') {
                // Jump animation logic would go here (using a separate animation loop or state)
                // For now, we rely on the re-render. 
                // To do real animation, we'd need useTick or Framer Motion wrapper.
            }
            
            return newPos;
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '20px', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', backgroundColor: '#2d2d2d', color: '#fff' }}>
            <h1 style={{ marginBottom: '20px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                🎭 Code Theater: AI Edition
                <div 
                    title={backendStatus === 'connected' ? "Backend Connected" : "Backend Disconnected"}
                    style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: backendStatus === 'connected' ? '#00cc66' : '#ff3333',
                        boxShadow: `0 0 5px ${backendStatus === 'connected' ? '#00cc66' : '#ff3333'}`
                    }}
                />
            </h1>
            
            <div style={{ display: 'flex', flex: 1, gap: '20px', overflow: 'hidden' }}>
                {/* Editor Panel */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', borderRadius: '8px', padding: '10px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#aaa' }}>Source Code</h3>
                    <textarea 
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        style={{ 
                            flex: 1, 
                            padding: '15px', 
                            fontSize: '14px', 
                            fontFamily: 'Consolas, monospace',
                            backgroundColor: '#252526',
                            color: '#d4d4d4',
                            border: 'none',
                            borderRadius: '4px',
                            resize: 'none',
                            outline: 'none'
                        }}
                        spellCheck={false}
                    />
                    
                    {/* Debug Log */}
                    <div style={{
                        marginTop: '10px',
                        padding: '5px',
                        backgroundColor: '#000',
                        color: '#0f0',
                        fontSize: '10px',
                        height: '60px',
                        overflowY: 'auto',
                        fontFamily: 'monospace',
                        border: '1px solid #333'
                    }}>
                        {debugLog.length === 0 ? "Ready..." : debugLog.map((log, i) => <div key={i}>{`> ${log}`}</div>)}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        <button 
                            onClick={handleVisualize} 
                            disabled={loading}
                            style={{
                                flex: 2,
                                padding: '12px',
                                backgroundColor: loading ? '#444' : '#0e639c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                transition: 'background 0.2s'
                            }}
                        >
                            {loading ? (language === 'zh' ? '🤖 AI 正在分析...' : '🤖 Analyzing with AI...') : (language === 'zh' ? '🎬 生成剧场' : '🎬 Visualize Code')}
                        </button>
                        <button 
                            onClick={cycleLanguage}
                            style={{
                                flex: 0.8,
                                padding: '12px',
                                backgroundColor: '#2d2d2d',
                                color: '#fff',
                                border: '1px solid #555',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold'
                            }}
                        >
                            {getLanguageLabel(language)}
                        </button>
                        <button 
                            onClick={handleRandomCode}
                            style={{
                                flex: 1,
                                padding: '12px',
                                backgroundColor: '#333',
                                color: '#fff',
                                border: '1px solid #555',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            {language === 'zh' ? '🎲 随机代码' : '🎲 Random'}
                        </button>
                    </div>
                </div>

                {/* Theater Panel */}
                <div style={{ flex: 2, backgroundColor: '#000', borderRadius: '8px', position: 'relative', overflow: 'hidden', border: '2px solid #333' }}>
                    <Stage width={800} height={600} options={{ backgroundColor: 0x1a1a1a }}>
                        {/* Background Grid */}
                        <Graphics draw={(g) => {
                            g.clear();
                            g.lineStyle(1, 0x333333, 0.5);
                            for(let i=0; i<800; i+=50) { g.moveTo(i,0); g.lineTo(i,600); }
                            for(let i=0; i<600; i+=50) { g.moveTo(0,i); g.lineTo(800,i); }
                        }} />

                        {scriptData && scriptData.characters.map((char, i) => {
                            const pos = charPositions[char.name];
                            if (!pos || !pos.visible) return null;
                            
                            // Determine color based on type
                            let color = 0xCCCCCC;
                            if (char.type === 'function') color = 0x61dafb; // Cyan
                            else if (char.type === 'variable') color = 0xf1c40f; // Yellow
                            else if (char.type === 'class') color = 0xe74c3c; // Red
                            
                            // Check if this character is currently speaking
                            const isTalking = currentStepIndex >= 0 && 
                                              scriptData.script[currentStepIndex].character === char.name &&
                                              scriptData.script[currentStepIndex].action === 'speak';

                            return (
                                <CharacterSprite 
                                    key={char.name} 
                                    name={char.name}
                                    type={char.type}
                                    x={pos.x} 
                                    y={pos.y} 
                                    color={color}
                                    isTalking={isTalking}
                                />
                            );
                        })}
                    </Stage>
                    
                    {/* Subtitles / Dialog Overlay */}
                    {currentStepIndex >= 0 && scriptData && (
                        <div style={{
                            position: 'absolute',
                            bottom: '30px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '80%',
                            backgroundColor: 'rgba(0,0,0,0.85)',
                            color: 'white',
                            padding: '20px',
                            borderRadius: '12px',
                            border: '1px solid #555',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}>
                            <div style={{ 
                                alignSelf: 'flex-start', 
                                color: '#4fc1ff', 
                                fontSize: '14px', 
                                marginBottom: '8px', 
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}>
                                {scriptData.script[currentStepIndex].character}
                            </div>
                            
                            <div style={{ 
                                fontSize: '18px', 
                                lineHeight: '1.4', 
                                textAlign: 'center',
                                marginBottom: '15px'
                            }}>
                                "{scriptData.script[currentStepIndex].line || scriptData.script[currentStepIndex].details}"
                            </div>
                            
                            <button 
                                onClick={playNextStep} 
                                style={{ 
                                    padding: '8px 20px', 
                                    cursor: 'pointer',
                                    backgroundColor: '#fff',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '20px',
                                    fontWeight: 'bold',
                                    fontSize: '14px'
                                }}
                            >
                                Next ➡️
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CodeTheater;

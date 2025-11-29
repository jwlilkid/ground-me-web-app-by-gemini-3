import React, { useState, useEffect } from 'react';
import { 
  AppScreen, 
  SenseType, 
  GroundingData, 
  JournalEntry, 
  SENSE_CONFIG 
} from './types';
import { generateGroundingImage } from './services/geminiService';
import { Button } from './components/Button';
import { MoodSlider } from './components/MoodSlider';
import { VoiceInput } from './components/VoiceInput';
import { Toggle } from './components/Toggle';
import { 
  Wind, 
  Volume2, 
  Eye, 
  Hand, 
  Utensils, 
  ArrowRight, 
  BookOpen, 
  Home, 
  History,
  Sparkles,
  Download,
  Share2,
  ChevronLeft,
  Calendar,
  Clock,
  Settings,
  Heart,
  Activity,
  Bell,
  X
} from 'lucide-react';

const STORAGE_KEY = 'ground_me_journal';
const SETTINGS_KEY = 'ground_me_settings';

interface AppSettings {
  healthKitEnabled: boolean;
  notificationsEnabled: boolean;
  stressSensitivity: 'low' | 'medium' | 'high';
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.WELCOME);
  const [preMood, setPreMood] = useState<number>(50); // Start at Neutral (50)
  const [postMood, setPostMood] = useState<number>(50); // Start at Neutral (50)
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    healthKitEnabled: false,
    notificationsEnabled: false,
    stressSensitivity: 'medium',
  });
  
  // Mock Notification State
  const [showNotification, setShowNotification] = useState(false);

  // Grounding Data State
  const [groundingData, setGroundingData] = useState<GroundingData>({
    [SenseType.SEE]: '',
    [SenseType.HEAR]: '',
    [SenseType.TOUCH]: '',
    [SenseType.SMELL]: '',
    [SenseType.TASTE]: '',
  });

  const [currentSenseIndex, setCurrentSenseIndex] = useState(0);
  const sensesOrder = [SenseType.SEE, SenseType.HEAR, SenseType.TOUCH, SenseType.SMELL, SenseType.TASTE];
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Load Journal & Settings
  useEffect(() => {
    const savedJournal = localStorage.getItem(STORAGE_KEY);
    if (savedJournal) {
      try {
        setJournal(JSON.parse(savedJournal));
      } catch (e) {
        console.error("Failed to load journal", e);
      }
    }

    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }
  }, []);

  const saveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  const saveJournalEntry = () => {
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      data: groundingData,
      preMood,
      postMood,
      imageUrl: generatedImage || undefined
    };
    const updatedJournal = [newEntry, ...journal];
    setJournal(updatedJournal);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedJournal));
    setScreen(AppScreen.WELCOME);
  };

  const handleStart = () => {
    // Reset state
    setPreMood(50);
    setPostMood(50);
    setGroundingData({
      [SenseType.SEE]: '',
      [SenseType.HEAR]: '',
      [SenseType.TOUCH]: '',
      [SenseType.SMELL]: '',
      [SenseType.TASTE]: '',
    });
    setCurrentSenseIndex(0);
    setGeneratedImage(null);
    setScreen(AppScreen.PRE_CHECKIN);
  };

  const handleNextSense = async () => {
    if (currentSenseIndex < sensesOrder.length - 1) {
      setCurrentSenseIndex(prev => prev + 1);
    } else {
      // Finished all senses
      setScreen(AppScreen.GENERATING);
      const imageUrl = await generateGroundingImage(groundingData);
      setGeneratedImage(imageUrl);
      setScreen(AppScreen.POST_CHECKIN);
    }
  };

  const updateSenseData = (text: string) => {
    const currentSense = sensesOrder[currentSenseIndex];
    setGroundingData(prev => ({
      ...prev,
      [currentSense]: text
    }));
  };

  const handleViewEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setScreen(AppScreen.JOURNAL_DETAIL);
  };

  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to format mood for display text
  const formatMoodScore = (val: number) => {
    // If it's old data (small number < 11), treat as 0-10 scale mapped to 0-100
    // But assuming new data is 0-100.
    const normalized = val <= 10 ? val * 10 : val;
    
    if (normalized < 45) return `${((50 - normalized)/10).toFixed(0)} Not Good`;
    if (normalized > 55) return `${((normalized - 50)/10).toFixed(0)} Good`;
    return "Neutral";
  };

  const getMoodValueDisplay = (val: number) => {
     // For "5" display
     const normalized = val <= 10 ? val * 10 : val;
     return (Math.abs(normalized - 50) / 10).toFixed(1).replace('.0', '');
  }

  // --- Mock HealthKit Logic ---
  const toggleHealthKit = async (enabled: boolean) => {
    if (enabled) {
      // Simulate Permission Request
      const confirmed = window.confirm(
        "Allow 'Ground Me' to access Health Data?\n\nWe use Heart Rate and HRV to detect stress patterns and offer timely support. Your data stays on your device."
      );
      if (confirmed) {
        saveSettings({ ...settings, healthKitEnabled: true, notificationsEnabled: true });
      }
    } else {
      saveSettings({ ...settings, healthKitEnabled: false, notificationsEnabled: false });
    }
  };

  const simulateStressTrigger = () => {
    setShowNotification(true);
    // Auto hide after 8 seconds
    setTimeout(() => setShowNotification(false), 8000);
  };

  const handleNotificationAction = () => {
    setShowNotification(false);
    handleStart(); // Jump straight to exercise flow
  };

  // --- Dynamic Background Logic ---
  const getDynamicBackground = () => {
    let targetValue = 50; // Default Cream
    
    if (screen === AppScreen.PRE_CHECKIN) {
      targetValue = preMood;
    } else if (screen === AppScreen.POST_CHECKIN) {
      targetValue = postMood;
    } else {
      return undefined; // Default class handling
    }

    // Interpolation Logic
    // 0: Cool Blue (#A5B4C9 -> 165, 180, 201)
    // 50: Cream (#F5F2EB -> 245, 242, 235)
    // 100: Warm Peach (#F0D5C5 -> 240, 213, 197) -> using a soft peach/terracotta tint

    let r, g, b;

    if (targetValue <= 50) {
      const percentage = targetValue / 50; // 0 to 1
      // Interpolate Cool (0) -> Cream (1)
      r = 165 + (245 - 165) * percentage;
      g = 180 + (242 - 180) * percentage;
      b = 201 + (235 - 201) * percentage;
    } else {
      const percentage = (targetValue - 50) / 50; // 0 to 1
      // Interpolate Cream (0) -> Warm (1)
      r = 245 + (240 - 245) * percentage;
      g = 242 + (213 - 242) * percentage;
      b = 235 + (197 - 235) * percentage;
    }

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  };

  const currentBgColor = getDynamicBackground();


  // --- Views ---

  const renderWelcome = () => (
    <div className="flex flex-col h-full justify-center items-center p-8 text-center space-y-8 animate-in fade-in duration-700 relative">
      <div className="absolute top-6 right-6">
        <button 
          onClick={() => setScreen(AppScreen.SETTINGS)}
          className="p-3 bg-white/50 backdrop-blur rounded-full shadow-sm hover:bg-white text-gray-400 hover:text-charcoal transition-colors"
        >
          <Settings size={20} />
        </button>
      </div>

      <div className="bg-sage-100 p-6 rounded-full">
        <Wind size={64} className="text-sage-400" />
      </div>
      <div>
        <h1 className="text-4xl font-bold text-charcoal mb-2">Ground Me</h1>
        <p className="text-lg text-gray-500 max-w-xs mx-auto">
          Find your center using the 5-4-3-2-1 technique.
        </p>
      </div>
      <div className="w-full max-w-xs space-y-4">
        <Button fullWidth onClick={handleStart} className="text-lg py-5 shadow-lg">
          Start Grounding
        </Button>
        <Button fullWidth variant="secondary" onClick={() => setScreen(AppScreen.JOURNAL)}>
          <BookOpen size={20} /> Journal
        </Button>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="flex flex-col h-full bg-sage-50/50">
      {/* Header */}
      <div className="p-6 bg-white shadow-sm flex items-center gap-4">
        <button onClick={() => setScreen(AppScreen.WELCOME)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100">
          <ChevronLeft size={24} className="text-charcoal" />
        </button>
        <h2 className="text-xl font-bold text-charcoal">Settings</h2>
      </div>

      <div className="p-6 space-y-8 overflow-y-auto">
        
        {/* Integrations Section */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Integrations</h3>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-sage-100">
            
            <div className="flex items-center gap-4 mb-6">
               <div className="bg-red-100 p-3 rounded-2xl">
                 <Heart className="text-red-500" size={24} fill="currentColor" fillOpacity={0.2} />
               </div>
               <div className="flex-1">
                 <h4 className="font-bold text-charcoal">Apple Health</h4>
                 <p className="text-xs text-gray-400">Sync Heart Rate & HRV</p>
               </div>
            </div>

            <Toggle 
              label="Sync with Health" 
              description="Allow access to health metrics to detect stress."
              checked={settings.healthKitEnabled} 
              onChange={toggleHealthKit} 
            />

            {settings.healthKitEnabled && (
              <div className="mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-2 fade-in duration-300">
                <Toggle 
                  label="Stress Notifications" 
                  description="Receive gentle check-ins when stress is detected."
                  checked={settings.notificationsEnabled} 
                  onChange={(val) => saveSettings({...settings, notificationsEnabled: val})} 
                />
                
                <div className="mt-6">
                  <label className="text-sm font-medium text-charcoal mb-2 block">Detection Sensitivity</label>
                  <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
                    {['low', 'medium', 'high'].map((level) => (
                      <button
                        key={level}
                        onClick={() => saveSettings({...settings, stressSensitivity: level as any})}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                          settings.stressSensitivity === level 
                            ? 'bg-white shadow-sm text-sage-500' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {settings.stressSensitivity === 'high' 
                      ? 'Will notify on minor HRV drops.' 
                      : settings.stressSensitivity === 'low' 
                        ? 'Only notifies on significant sustained stress.' 
                        : 'Balanced detection for daily use.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Debug / Test Section */}
        {settings.healthKitEnabled && settings.notificationsEnabled && (
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Testing</h3>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-sage-100">
              <p className="text-sm text-gray-500 mb-4">
                Simulate a high-stress event (High HR + Low HRV) to test the notification flow.
              </p>
              <Button variant="secondary" fullWidth onClick={simulateStressTrigger}>
                <Activity size={18} /> Simulate Stress Event
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  const renderPreCheckin = () => (
    <div className="flex flex-col h-full justify-between p-6 animate-in slide-in-from-right duration-500">
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-charcoal mb-2">Check In</h2>
        <p className="text-charcoal/70">How are you feeling right now?</p>
      </div>
      
      <div className="flex-1 flex items-center">
        <MoodSlider value={preMood} onChange={setPreMood} />
      </div>

      <Button fullWidth onClick={() => setScreen(AppScreen.EXERCISE)}>
        Begin <ArrowRight size={20} />
      </Button>
    </div>
  );

  const renderExercise = () => {
    const currentSense = sensesOrder[currentSenseIndex];
    const config = SENSE_CONFIG[currentSense];
    
    // Icon mapping
    const icons = {
      [SenseType.SEE]: Eye,
      [SenseType.HEAR]: Volume2,
      [SenseType.TOUCH]: Hand,
      [SenseType.SMELL]: Wind, // Reusing wind for smell as abstract
      [SenseType.TASTE]: Utensils,
    };
    const Icon = icons[currentSense];

    return (
      <div className="flex flex-col h-full p-6 animate-in fade-in duration-500" key={currentSense}>
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {sensesOrder.map((s, idx) => (
            <div 
              key={s} 
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${idx <= currentSenseIndex ? config.color : 'bg-gray-200'}`}
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col items-center text-center space-y-6">
          <div className={`${config.color} w-24 h-24 rounded-3xl flex items-center justify-center shadow-md transform transition-transform hover:scale-105`}>
             <Icon size={40} className="text-white" />
          </div>
          
          <div>
            <div className="text-6xl font-bold text-sage-500 mb-2 font-sans opacity-20">{config.count}</div>
            <h2 className="text-3xl font-bold text-charcoal mb-4">
               {config.instruction}
            </h2>
          </div>

          <VoiceInput 
            key={currentSense} // Critical: Remounts component to reset audio context for new step
            onTranscriptChange={updateSenseData}
            initialText={groundingData[currentSense]}
            placeholder={`Say what you ${config.label.toLowerCase()}...`}
          />
        </div>

        <div className="mt-6">
          <Button fullWidth onClick={handleNextSense}>
             Next Step <ArrowRight size={20} />
          </Button>
        </div>
      </div>
    );
  };

  const renderGenerating = () => (
    <div className="flex flex-col h-full justify-center items-center p-8 text-center space-y-8 animate-in pulse duration-1000">
      <Sparkles size={64} className="text-terracotta animate-spin-slow" />
      <div>
        <h2 className="text-2xl font-bold text-charcoal mb-2">Breathing...</h2>
        <p className="text-gray-500">
          We are creating a peaceful visualization based on your senses.
        </p>
      </div>
      <div className="w-16 h-1 bg-sage-200 rounded-full overflow-hidden">
        <div className="h-full bg-sage-400 animate-progress-indeterminate"></div>
      </div>
    </div>
  );

  const renderPostCheckin = () => (
    <div className="flex flex-col h-full justify-between p-6 animate-in slide-in-from-right duration-500">
       <div className="mt-8">
        <h2 className="text-2xl font-bold text-charcoal mb-2">All Done</h2>
        <p className="text-charcoal/70">How do you feel now?</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {generatedImage && (
          <div className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-xl border-4 border-white/80">
            <img src={generatedImage} alt="Generated Calm" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>
        )}
        <MoodSlider value={postMood} onChange={setPostMood} />
      </div>

      <Button fullWidth onClick={() => setScreen(AppScreen.RESULT)}>
        Finish <ArrowRight size={20} />
      </Button>
    </div>
  );

  const renderResult = () => {
    const improvement = postMood - preMood;
    // Normalize logic: 0-100 scale.
    // e.g. Pre: 20, Post: 80 -> +60 improvement.
    
    return (
      <div className="flex flex-col h-full p-6 animate-in fade-in duration-700">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <div className="bg-sage-100 p-4 rounded-full">
            <Sparkles size={40} className="text-sage-500" />
          </div>
          
          <h2 className="text-3xl font-bold text-charcoal">Great Job!</h2>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-sage-100 w-full max-w-sm">
             <div className="flex justify-between items-center px-4">
                <div className="text-center">
                  <div className="text-xs text-cool-blue-400 font-bold uppercase mb-1">Before</div>
                  <div className="text-lg font-medium text-gray-600">{formatMoodScore(preMood)}</div>
                </div>
                <ArrowRight size={24} className="text-sage-300" />
                <div className="text-center">
                  <div className="text-xs text-terracotta font-bold uppercase mb-1">After</div>
                  <div className="text-lg font-medium text-sage-500">{formatMoodScore(postMood)}</div>
                </div>
             </div>
             {improvement > 5 && (
               <div className="mt-4 text-sm text-sage-600 font-medium bg-sage-50 py-2 px-4 rounded-xl">
                 You moved towards calm!
               </div>
             )}
          </div>
          
          {generatedImage && (
             <div className="w-full max-w-xs mx-auto relative group">
               <p className="text-sm text-gray-400 mb-2">Your visualization</p>
               <div className="relative">
                <img src={generatedImage} className="rounded-2xl shadow-md w-full h-48 object-cover" alt="Visualization"/>
                <button 
                  onClick={() => downloadImage(generatedImage, `grounding-${Date.now()}.png`)}
                  className="absolute bottom-2 right-2 p-2 bg-white/90 hover:bg-white rounded-xl shadow-sm text-sage-500 transition-all"
                >
                  <Download size={20} />
                </button>
               </div>
             </div>
          )}
        </div>

        <div className="space-y-3 mt-6">
          <Button fullWidth onClick={saveJournalEntry}>
            Save to Journal
          </Button>
          <Button fullWidth variant="ghost" onClick={() => setScreen(AppScreen.WELCOME)}>
            Skip & Home
          </Button>
        </div>
      </div>
    );
  };

  const renderJournal = () => (
    <div className="flex flex-col h-full p-6 bg-sage-50/50">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setScreen(AppScreen.WELCOME)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50">
          <Home size={20} className="text-charcoal" />
        </button>
        <h2 className="text-2xl font-bold text-charcoal">Your Journey</h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {journal.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-center">
            <History size={48} className="mb-4 opacity-20" />
            <p>No entries yet.<br/>Start your first grounding session.</p>
          </div>
        ) : (
          journal.map((entry) => {
            const preVal = entry.preMood <= 10 ? entry.preMood * 10 : entry.preMood;
            const postVal = entry.postMood <= 10 ? entry.postMood * 10 : entry.postMood;
            const improvement = postVal - preVal;
            
            return (
              <button 
                key={entry.id} 
                onClick={() => handleViewEntry(entry)}
                className="w-full bg-white p-4 rounded-3xl shadow-sm border border-sage-100 flex gap-4 transition-transform active:scale-[0.98] text-left hover:shadow-md"
              >
                {entry.imageUrl ? (
                  <div className="w-20 h-20 rounded-2xl bg-sage-100 flex-shrink-0 overflow-hidden">
                    <img src={entry.imageUrl} alt="Saved" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-sage-100 flex-shrink-0 flex items-center justify-center">
                    <Wind className="text-sage-300" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                     <p className="text-xs text-gray-400 font-medium">
                       {new Date(entry.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                     </p>
                     {improvement > 0 && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                          +{getMoodValueDisplay(improvement)}
                        </span>
                     )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                     <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden flex">
                        <div 
                           className="h-full bg-cool-blue-400 opacity-50" 
                           style={{ width: `${preVal}%` }}
                        />
                        <div 
                           className="h-full bg-terracotta" 
                           style={{ width: `${postVal - preVal}%` }}
                        />
                     </div>
                  </div>
                   <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                      <span>{getMoodValueDisplay(preVal)}</span>
                      <span>{getMoodValueDisplay(postVal)}</span>
                   </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  );

  const renderJournalDetail = () => {
    if (!selectedEntry) return null;

    const date = new Date(selectedEntry.timestamp);
    // Normalize data if old format
    const preVal = selectedEntry.preMood <= 10 ? selectedEntry.preMood * 10 : selectedEntry.preMood;
    const postVal = selectedEntry.postMood <= 10 ? selectedEntry.postMood * 10 : selectedEntry.postMood;

    return (
      <div className="flex flex-col h-full bg-cream">
        {/* Header */}
        <div className="p-6 pb-2 flex items-center gap-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <button 
            onClick={() => setScreen(AppScreen.JOURNAL)} 
            className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 border border-sage-100"
          >
            <ChevronLeft size={20} className="text-charcoal" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-sage-500 font-medium uppercase tracking-wider">
               <Calendar size={12} /> {date.toLocaleDateString()}
            </div>
            <h2 className="text-xl font-bold text-charcoal">Session Details</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
          
          {/* Main Visualization Image */}
          {selectedEntry.imageUrl && (
            <div className="relative group rounded-3xl overflow-hidden shadow-lg border-4 border-white">
              <img 
                src={selectedEntry.imageUrl} 
                alt="Visualization" 
                className="w-full aspect-square object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-6">
                 <Button 
                    variant="secondary"
                    onClick={() => downloadImage(selectedEntry.imageUrl!, `grounding-${selectedEntry.timestamp}.png`)}
                    className="bg-white/90 hover:bg-white text-sage-600"
                 >
                   <Download size={18} /> Save to Photos
                 </Button>
              </div>
            </div>
          )}

          {/* Mood Check */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-sage-100">
             <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">Mood Shift</h3>
             
             {/* Read-only Slider Visualization */}
             <div className="px-2 pb-6">
                <MoodSlider value={postVal} onChange={()=>{}} disabled={true} />
             </div>
             
             <div className="flex items-center justify-between text-sm px-2 border-t border-gray-100 pt-4">
                <div className="flex flex-col items-center gap-1">
                   <div className="text-gray-400 font-bold">Start</div>
                   <div className="text-gray-500">{formatMoodScore(preVal)}</div>
                </div>
                <ArrowRight size={16} className="text-gray-300" />
                <div className="flex flex-col items-center gap-1">
                   <div className="text-sage-500 font-bold">End</div>
                   <div className="text-sage-600">{formatMoodScore(postVal)}</div>
                </div>
             </div>
          </div>

          {/* Transcript Content */}
          <div className="space-y-4">
             <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide px-2">Your Senses</h3>
             {sensesOrder.map((sense) => {
               const config = SENSE_CONFIG[sense];
               const text = selectedEntry.data[sense];
               if (!text) return null;

               return (
                 <div key={sense} className="bg-white p-5 rounded-3xl shadow-sm border border-sage-50">
                    <div className="flex items-center gap-3 mb-2">
                       <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                         {config.count}
                       </div>
                       <h4 className="font-semibold text-charcoal">{config.label}</h4>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed pl-11">
                      "{text}"
                    </p>
                 </div>
               );
             })}
          </div>

          <div className="h-8"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-cream flex justify-center items-center font-sans">
      <div 
        className="w-full max-w-md h-[100dvh] bg-cream md:h-[850px] md:rounded-[40px] md:shadow-2xl md:border-[8px] md:border-white overflow-hidden relative transition-colors duration-300 ease-linear"
        style={currentBgColor ? { backgroundColor: currentBgColor } : {}}
      >
        
        {/* Mock Notification Banner */}
        {showNotification && (
          <div className="absolute top-4 left-4 right-4 z-50 animate-in slide-in-from-top duration-500">
            <div className="bg-white/95 backdrop-blur-md border border-cool-blue-300 shadow-xl rounded-2xl p-4 flex gap-4 items-start">
              <div className="bg-cool-blue-300 p-2 rounded-xl flex-shrink-0">
                <Heart className="text-white" size={20} fill="currentColor" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                   <h3 className="font-bold text-charcoal text-sm">Hey, checking in 💙</h3>
                   <button onClick={() => setShowNotification(false)} className="text-gray-400 hover:text-charcoal"><X size={14}/></button>
                </div>
                <p className="text-xs text-gray-500 mt-1 mb-3">
                  You seem a bit stressed right now. Would you like to do some grounding with me?
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={handleNotificationAction}
                    className="flex-1 bg-sage-400 text-white text-xs font-bold py-2 rounded-lg hover:bg-sage-500"
                  >
                    Yes, let's go
                  </button>
                  <button 
                     onClick={() => setShowNotification(false)}
                     className="flex-1 bg-gray-100 text-gray-500 text-xs font-bold py-2 rounded-lg hover:bg-gray-200"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === AppScreen.WELCOME && renderWelcome()}
        {screen === AppScreen.SETTINGS && renderSettings()}
        {screen === AppScreen.PRE_CHECKIN && renderPreCheckin()}
        {screen === AppScreen.EXERCISE && renderExercise()}
        {screen === AppScreen.GENERATING && renderGenerating()}
        {screen === AppScreen.POST_CHECKIN && renderPostCheckin()}
        {screen === AppScreen.RESULT && renderResult()}
        {screen === AppScreen.JOURNAL && renderJournal()}
        {screen === AppScreen.JOURNAL_DETAIL && renderJournalDetail()}
      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Alert,
  Dimensions 
} from 'react-native';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

const CountdownTimerApp = () => {
  const [mode, setMode] = useState('normal');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  
  // Exam timer warning settings
  const [warningHours, setWarningHours] = useState(0);
  const [warningMinutes, setWarningMinutes] = useState(0);
  const [warningSeconds, setWarningSeconds] = useState(0);
  
  // Repeating beep settings
  const [intervalHours, setIntervalHours] = useState(0);
  const [intervalMinutes, setIntervalMinutes] = useState(0);
  const [intervalSeconds, setIntervalSeconds] = useState(0);
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [warningTriggered, setWarningTriggered] = useState(false);
  const [nextBeepTime, setNextBeepTime] = useState(0);
  const [soundsLoaded, setSoundsLoaded] = useState(false);
  
  const intervalRef = useRef(null);
  const soundsRef = useRef({});

  // Initialize sounds
  useEffect(() => {
    const initializeSounds = async () => {
      try {
        // Set audio mode for better sound playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        // Load sound files
        const { sound: startSound } = await Audio.Sound.createAsync(
          require('./assets/sounds/start.mp3')
        );
        soundsRef.current.startSound = startSound;

        const { sound: warningSound } = await Audio.Sound.createAsync(
          require('./assets/sounds/warning.mp3')
        );
        soundsRef.current.warningSound = warningSound;

        const { sound: intervalSound } = await Audio.Sound.createAsync(
          require('./assets/sounds/interval.mp3')
        );
        soundsRef.current.intervalSound = intervalSound;

        const { sound: endSound } = await Audio.Sound.createAsync(
          require('./assets/sounds/end_alarm.mp3')
        );
        soundsRef.current.endSound = endSound;

        setSoundsLoaded(true);
      } catch (error) {
        console.log('Error loading sounds:', error);
        setSoundsLoaded(true); // Allow app to continue even if sounds fail
      }
    };

    initializeSounds();

    // Cleanup function
    return () => {
      Object.values(soundsRef.current).forEach(sound => {
        if (sound) {
          sound.unloadAsync();
        }
      });
    };
  }, []);

  // Audio beep function with actual sound playback
  const playBeep = async (type = 'short') => {
    if (!soundsLoaded) {
      console.log('Sounds not loaded yet');
      return;
    }

    const playSound = async (sound, callback) => {
      if (sound) {
        try {
          await sound.replayAsync();
          console.log(`${type} sound played successfully`);
          if (callback) callback();
        } catch (error) {
          console.log(`Failed to play ${type} sound:`, error);
          if (callback) callback();
        }
      } else {
        console.log(`${type} sound not available`);
        if (callback) callback();
      }
    };

    switch (type) {
      case 'start':
        // Play 1 second alert sound
        await playSound(soundsRef.current.startSound);
        break;
        
      case 'warning':
        // Play double beep 3 times consecutively
        // const playWarningSequence = async (count = 0) => {
        //   if (count < 3) {
        await playSound(soundsRef.current.warningSound);
        //  () => {
        //       // Wait 200ms between beeps, then play next
        //       setTimeout(() => {
        //         playWarningSequence(count + 1);
        //       }, 200);
        //     });
        //   }
        // };
        // await playWarningSequence();
        break;
        
      case 'interval':
        // Play 0.5 second ding
        await playSound(soundsRef.current.intervalSound);
        break;
        
      case 'end':
        // Play 5 second alarm
        await playSound(soundsRef.current.endSound);
        break;
        
      default:
        console.log('Unknown beep type:', type);
    }
  };

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          
          // Check for exam timer warning
          if (mode === 'exam' && !warningTriggered) {
            const warningTime = warningHours * 3600 + warningMinutes * 60 + warningSeconds;
            if (newTime === warningTime) {
              playBeep('warning');
              setWarningTriggered(true);
            }
          }
          
          // Check for repeating beeps
          if (mode === 'repeating' && newTime > 0) {
            const intervalTime = intervalHours * 3600 + intervalMinutes * 60 + intervalSeconds;
            if (intervalTime > 0 && newTime === nextBeepTime) {
              playBeep('interval');
              setNextBeepTime(newTime - intervalTime);
            }
          }
          
          // Timer finished
          if (newTime <= 0) {
            playBeep('end');
            setIsRunning(false);
            setIsPaused(false);
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft, mode, warningHours, warningMinutes, warningSeconds, 
      intervalHours, intervalMinutes, intervalSeconds, warningTriggered, nextBeepTime]);

  const startTimer = () => {
    if (timeLeft === 0) {
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      if (totalSeconds === 0) return;
      
      setTimeLeft(totalSeconds);
      
      // Set up repeating beep schedule
      if (mode === 'repeating') {
        const intervalTime = intervalHours * 3600 + intervalMinutes * 60 + intervalSeconds;
        if (intervalTime > 0 && intervalTime < totalSeconds) {
          setNextBeepTime(totalSeconds - intervalTime);
        }
      }
      
      setWarningTriggered(false);
    }
    
    // Play start beep
    playBeep('start');
    
    setIsRunning(true);
    setIsPaused(false);
  };

  const pauseTimer = () => {
    setIsRunning(false);
    setIsPaused(true);
  };

  const stopTimer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(0);
    setWarningTriggered(false);
    setNextBeepTime(0);
  };

  const resetTimer = () => {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    setTimeLeft(totalSeconds);
    setIsRunning(false);
    setIsPaused(false);
    setWarningTriggered(false);
    
    if (mode === 'repeating') {
      const intervalTime = intervalHours * 3600 + intervalMinutes * 60 + intervalSeconds;
      if (intervalTime > 0 && intervalTime < totalSeconds) {
        setNextBeepTime(totalSeconds - intervalTime);
      }
    }
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const NumberPicker = ({ value, onChange, max, label }) => (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.pickerButtonContainer}>
        <TouchableOpacity 
          style={styles.pickerButton} 
          onPress={() => onChange(value < max ? value + 1 : 0)}
        >
          <Text style={styles.pickerButtonText}>+</Text>
        </TouchableOpacity>
        <View style={styles.pickerValue}>
          <Text style={styles.pickerValueText}>{value.toString().padStart(2, '0')}</Text>
        </View>
        <TouchableOpacity 
          style={styles.pickerButton} 
          onPress={() => onChange(value > 0 ? value - 1 : max)}
        >
          <Text style={styles.pickerButtonText}>-</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Countdown Timer</Text>
        {!soundsLoaded && (
          <Text style={styles.loadingText}>Loading sounds...</Text>
        )}
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        <View style={styles.modeButtons}>
          {[
            { key: 'normal', label: 'Normal' },
            { key: 'exam', label: 'Exam Timer' },
            { key: 'repeating', label: 'Repeating Beep' }
          ].map((modeOption) => (
            <TouchableOpacity
              key={modeOption.key}
              onPress={() => setMode(modeOption.key)}
              style={[
                styles.modeButton,
                mode === modeOption.key && styles.modeButtonActive
              ]}
            >
              <Text style={[
                styles.modeButtonText,
                mode === modeOption.key && styles.modeButtonTextActive
              ]}>
                {modeOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Timer Display */}
      <View style={styles.content}>
        <View style={styles.timerDisplay}>
          <Text style={styles.timerText}>
            {formatTime(timeLeft > 0 ? timeLeft : hours * 3600 + minutes * 60 + seconds)}
          </Text>
          <Text style={styles.timerStatus}>
            {isRunning ? 'Running' : isPaused ? 'Paused' : 'Ready'}
          </Text>
        </View>

        {/* Time Setting */}
        {!isRunning && !isPaused && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Set Timer</Text>
            <View style={styles.pickerRow}>
              <NumberPicker value={hours} onChange={setHours} max={23} label="Hours" />
              <NumberPicker value={minutes} onChange={setMinutes} max={59} label="Minutes" />
              <NumberPicker value={seconds} onChange={setSeconds} max={59} label="Seconds" />
            </View>
          </View>
        )}

        {/* Exam Timer Warning Setting */}
        {mode === 'exam' && !isRunning && !isPaused && (
          <View style={[styles.section, styles.examSection]}>
            <Text style={styles.specialTitle}>Warning Alert Before</Text>
            <View style={styles.pickerRow}>
              <NumberPicker value={warningHours} onChange={setWarningHours} max={23} label="Hours" />
              <NumberPicker value={warningMinutes} onChange={setWarningMinutes} max={59} label="Minutes" />
              <NumberPicker value={warningSeconds} onChange={setWarningSeconds} max={59} label="Seconds" />
            </View>
          </View>
        )}

        {/* Repeating Beep Interval Setting */}
        {mode === 'repeating' && !isRunning && !isPaused && (
          <View style={[styles.section, styles.repeatingSection]}>
            <Text style={styles.specialTitle}>Beep Every</Text>
            <View style={styles.pickerRow}>
              <NumberPicker value={intervalHours} onChange={setIntervalHours} max={23} label="Hours" />
              <NumberPicker value={intervalMinutes} onChange={setIntervalMinutes} max={59} label="Minutes" />
              <NumberPicker value={intervalSeconds} onChange={setIntervalSeconds} max={59} label="Seconds" />
            </View>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.controls}>
          {!isRunning ? (
            <TouchableOpacity
              onPress={startTimer}
              style={[styles.button, styles.startButton]}
              disabled={!soundsLoaded}
            >
              <Text style={styles.startButtonText}>▶ Start</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={pauseTimer}
              style={[styles.button, styles.pauseButton]}
            >
              <Text style={styles.pauseButtonText}>⏸ Pause</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            onPress={stopTimer}
            style={[styles.button, styles.stopButton]}
          >
            <Text style={styles.stopButtonText}>🟥 Stop</Text>
          </TouchableOpacity>
          
          {(isPaused || timeLeft > 0) && (
            <TouchableOpacity
              onPress={resetTimer}
              style={[styles.button, styles.resetButton]}
            >
              <Text style={styles.resetButtonText}>↻ Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status Messages */}
        {mode === 'exam' && isRunning && !warningTriggered && (
          <View style={[styles.statusMessage, styles.examStatus]}>
            <Text style={styles.statusText}>
              Warning will sound {formatTime(warningHours * 3600 + warningMinutes * 60 + warningSeconds)} before end
            </Text>
          </View>
        )}
        
        {mode === 'repeating' && isRunning && (
          <View style={[styles.statusMessage, styles.repeatingStatus]}>
            <Text style={styles.statusText}>
              Next beep in {formatTime(nextBeepTime)} 
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 15,
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    backgroundColor: 'black',
    padding: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#8bc995',
  },
  loadingText: {
    fontSize: 12,
    color: '#bfdbfe',
    marginTop: 4,
  },
  modeSelector: {
    padding: 16,
    backgroundColor: 'black',
    // borderTopWidth: 4,
    // borderBottomWidth: 2,
    // borderColor: '#005e0b',

  },
  modeButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#bd0000',
    backgroundColor: 'black',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: 'black',
    borderColor: '#0ec414',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#bd0000',
    textAlignVertical: 'center',
    textAlign: 'center',

  },
  modeButtonTextActive: {
    fontWeight: 'bold',
    color: '#0ec414',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 25,
  },
  timerText: {
    fontSize: 60,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#7598ff',
    marginBottom: 5,
  },
  timerStatus: {
    fontSize: 14,
    color: '#49eb51',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0099ff',
    marginBottom: 16,
    textAlign: 'center',
  },
  examSection: {
    backgroundColor: 'black',
    padding: 16,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: '#f7861b',
  },
  repeatingSection: {
    backgroundColor: 'black',
    padding: 16,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: '#d69404',
  },
  specialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 5,
    textAlign: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  pickerContainer: {
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 8,
  },
  pickerButtonContainer: {
    alignItems: 'center',
  },
  pickerButton: {
    backgroundColor: '#020036',
    width: 40,
    height: 30,
    borderWidth: 0.5,
    borderRadius: 8,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  pickerButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  pickerValue: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginVertical: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  pickerValueText: {
    fontSize: 20,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  startButton: {
    borderWidth: 2,
    borderColor:'#15ff00',
    backgroundColor: '#050029',
  },
  pauseButton: {
    borderWidth: 2,
    borderColor:'#ff8400',
    backgroundColor: '#050029',
  },
  stopButton: {
    borderWidth: 2,
    borderColor:'#ff0000',
    backgroundColor: '#050029',
  },
  resetButton: {
    borderWidth: 2,
    borderColor:'#dec697',
    backgroundColor: '#050029',
  },

  startButtonText: {
    color: '#15ff00',
    fontSize: 20,
    fontWeight: 'bold',
  },
  pauseButtonText: {
    color: '#ff8400',
    fontSize: 20,
    fontWeight: 'bold',
  },
  stopButtonText: {
    color: '#ff0000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  resetButtonText: {
    color: '#dec697',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusMessage: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  examStatus: {
    backgroundColor: '#d10000',
  },
  repeatingStatus: {
    backgroundColor: '#b87a00',
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default CountdownTimerApp;
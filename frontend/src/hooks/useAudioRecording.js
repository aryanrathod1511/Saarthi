import { useState, useRef, useEffect } from 'react';

export const useAudioRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const onDataAvailableCallbackRef = useRef(null);

  // Cleanup function
  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    mediaRecorderRef.current = null;
  };

  useEffect(() => {
    return cleanup;
  }, []);

  const initializeAudio = async () => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const options = {
        mimeType: 'audio/webm;codecs=opus'
      };
      
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      
      // Set up the ondataavailable and onstop handlers
      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Call the callback with the blob when recording stops
        if (onDataAvailableCallbackRef.current) {
          onDataAvailableCallbackRef.current(blob);
        }
      };
      
    } catch (error) {
      console.error('Error initializing audio:', error);
      throw new Error('Failed to initialize audio recording');
    }
  };

  const startRecording = async (onDataAvailable) => {
    try {
      // Store the callback for when recording stops
      onDataAvailableCallbackRef.current = onDataAvailable;
      
      // Reset timer for new recording
      setRecordingDuration(0);
      
      // Clear previous audio data to ensure each recording is a new file
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      
      // Initialize audio only when starting to record
      await initializeAudio();
      
      if (!mediaRecorderRef.current) {
        throw new Error('Audio not initialized');
      }

      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      
      const timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      recordingTimerRef.current = timer;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // Stop microphone access immediately
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingDuration(0);
    onDataAvailableCallbackRef.current = null;
  };

  // Function to create audio URL only when user wants to play back
  const createAudioUrl = () => {
    if (audioBlob && !audioUrl) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return url;
    }
    return audioUrl;
  };

  // Function to revoke audio URL when no longer needed
  const revokeAudioUrl = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  return {
    isRecording,
    audioBlob,
    audioUrl,
    recordingDuration,
    startRecording,
    stopRecording,
    resetRecording,
    createAudioUrl,
    revokeAudioUrl
  };
};

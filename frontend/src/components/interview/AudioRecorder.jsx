import React, { useState } from 'react';
import { Mic, MicOff, Play, Pause } from 'lucide-react';
import Button from '../common/Button';

const AudioRecorder = ({
  isRecording,
  isProcessing,
  recordingDuration,
  audioBlob,
  onStartRecording,
  onStopRecording,
  createAudioUrl,
  revokeAudioUrl,
  isQuestionFullyDisplayed,
  isLoading
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayRecording = () => {
    if (!audioBlob) return;

    try {
      // Create audio URL only when user wants to play
      const audioUrl = createAudioUrl();
      
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }

      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setIsPlaying(false);
        setAudioElement(null);
      };
      
      audio.play();
      setIsPlaying(true);
      setAudioElement(audio);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handleStopPlayback = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
      setAudioElement(null);
    }
  };

  const handleNewRecording = () => {
    // Stop any current playback
    handleStopPlayback();
    // Revoke previous audio URL
    revokeAudioUrl();
  };

  // Disable recording button if:
  // 1. Question is not fully displayed
  // 2. AI is loading/thinking
  // 3. Currently processing audio
  const isRecordingDisabled = !isQuestionFullyDisplayed || isLoading || isProcessing;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <Mic className="w-6 h-6 mr-3 text-blue-600" />
          Record Your Response
        </h3>
        {isProcessing && (
          <div className="flex items-center text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Processing...
          </div>
        )}
        {isLoading && (
          <div className="flex items-center text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            AI is thinking...
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4 mb-4">
        {!isRecording ? (
          <Button
            variant="danger"
            icon={Mic}
            onClick={() => {
              handleNewRecording();
              onStartRecording();
            }}
            disabled={isRecordingDisabled}
            size="lg"
          >
            {!isQuestionFullyDisplayed ? 'Waiting for Question...' : 
             isLoading ? 'AI is Thinking...' : 
             isProcessing ? 'Processing...' : 'Start Recording'}
          </Button>
        ) : (
          <Button
            variant="secondary"
            icon={MicOff}
            onClick={onStopRecording}
            size="lg"
          >
            Stop Recording
          </Button>
        )}
        
        {isRecording && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-lg font-mono text-gray-700">
              {formatTime(recordingDuration)}
            </span>
          </div>
        )}
      </div>

      {/* Show play button only if there's a recording and not currently recording */}
      {audioBlob && !isRecording && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Your Recording:</h4>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              icon={isPlaying ? Pause : Play}
              onClick={isPlaying ? handleStopPlayback : handlePlayRecording}
              size="sm"
            >
              {isPlaying ? 'Stop' : 'Play'} Recording
            </Button>
            <span className="text-sm text-gray-600">
              Click to listen to your response
            </span>
          </div>
        </div>
      )}

      {/* Show status message when recording is disabled */}
      {isRecordingDisabled && !isRecording && (
        <div className="text-sm text-gray-500 italic">
          {!isQuestionFullyDisplayed && "Please wait for the question to be fully displayed..."}
          {isLoading && "Please wait while AI is thinking..."}
          {isProcessing && "Please wait while processing your response..."}
        </div>
      )}
    </div>
  );
};

export default AudioRecorder; 
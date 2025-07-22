import React from 'react';
import Card from '../common/Card';
import QuestionDisplay from './QuestionDisplay';
import AudioRecorder from './AudioRecorder';
import Button from '../common/Button';
import { RotateCcw, LogOut, CheckCircle } from 'lucide-react';

const InterviewPanel = ({
  interviewStarted,
  currentQuestion,
  displayedQuestion,
  isLoading,
  isRecording,
  isProcessing,
  recordingDuration,
  audioBlob,
  onStartRecording,
  onStopRecording,
  onResetInterview,
  onFinishInterview,
  onToggleAudioPlayback,
  onToggleMute,
  isPlaying,
  isMuted,
  interviewType,
  createAudioUrl,
  revokeAudioUrl,
  isQuestionFullyDisplayed
}) => {
  if (!interviewStarted) {
    return (
      <Card className="lg:col-span-2">
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">S</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Ready to Start Your Interview</h2>
          <p className="text-gray-600 mb-8 text-lg">
            Complete the setup on the left to begin your {interviewType.toUpperCase()} interview simulation
          </p>
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
              Professional AI Interviewer
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
              Real-time Analysis
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
              Company-Specific Questions
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2">
      <QuestionDisplay
        question={displayedQuestion}
        isLoading={isLoading}
        isPlaying={isPlaying}
        isMuted={isMuted}
        onToggleAudioPlayback={onToggleAudioPlayback}
        onToggleMute={onToggleMute}
        interviewType={interviewType}
      />

      <AudioRecorder
        isRecording={isRecording}
        isProcessing={isProcessing}
        recordingDuration={recordingDuration}
        audioBlob={audioBlob}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        createAudioUrl={createAudioUrl}
        revokeAudioUrl={revokeAudioUrl}
        isQuestionFullyDisplayed={isQuestionFullyDisplayed}
        isLoading={isLoading}
      />

      <div className="flex items-center space-x-4">
        <Button
          variant="secondary"
          icon={RotateCcw}
          onClick={onResetInterview}
        >
          Reset Interview
        </Button>

        <Button
          variant="success"
          icon={LogOut}
          onClick={onFinishInterview}
        >
          Finish Interview
        </Button>
      </div>
    </Card>
  );
};

export default InterviewPanel; 
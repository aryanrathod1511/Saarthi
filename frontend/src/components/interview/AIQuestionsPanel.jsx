import React from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { 
  MessageSquare, 
  Mic, 
  Square,
  RotateCcw,
  LogOut,
  Loader
} from 'lucide-react';

const AIQuestionsPanel = ({
  currentQuestion,
  displayedQuestion,
  isQuestionFullyDisplayed,
  questions,
  currentRound,
  // Recording props
  isRecording,
  isProcessing,
  recordingDuration,
  onStartRecording,
  onStopRecording,
  // Control buttons
  onResetInterview,
  onFinishInterview
}) => {
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              AI
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Interviewer</h2>
              <p className="text-sm text-gray-600">Round {currentRound}</p>
            </div>
          </div>
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center mb-2">
                <MessageSquare className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-sm font-semibold text-blue-800">Current Question</span>
              </div>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed text-lg">
                  {displayedQuestion || currentQuestion}
                </p>
                {!isQuestionFullyDisplayed && (
                  <div className="inline-block w-2 h-6 bg-blue-600 animate-pulse ml-1"></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recording Section */}
        {currentQuestion && isQuestionFullyDisplayed && (
          <div className="mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Mic className="w-5 h-5 mr-2 text-red-600" />
                  Your Response
                </h3>
                {isRecording && (
                  <div className="flex items-center text-red-600">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-2"></div>
                    <span className="text-sm font-medium">
                      {formatDuration(recordingDuration)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center space-x-4">
                {!isRecording ? (
                  <Button
                    onClick={onStartRecording}
                    disabled={isProcessing}
                    icon={Mic}
                    variant="danger"
                    size="lg"
                    className="px-8"
                  >
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    onClick={onStopRecording}
                    icon={Square}
                    variant="danger"
                    size="lg"
                    className="px-8"
                  >
                    Stop Recording
                  </Button>
                )}
              </div>

              {isProcessing && (
                <div className="mt-4 text-center">
                  <div className="flex items-center justify-center text-blue-600">
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    <span className="text-sm">Processing your response...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
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

        {/* Empty State */}
        {!currentQuestion && (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">AI Questions</h3>
            <p className="text-gray-600">AI interviewer questions will appear here once the interview begins.</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AIQuestionsPanel; 
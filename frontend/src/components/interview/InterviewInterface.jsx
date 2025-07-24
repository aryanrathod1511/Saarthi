import React from 'react';
import DSAInterviewPanel from './DSAInterviewPanel';
import QuestionStatement from './QuestionStatement';
import AIQuestionsPanel from './AIQuestionsPanel';
import NonDSAInterviewPanel from './NonDSAInterviewPanel';
import SummaryModal from '../SummaryModal';

const InterviewInterface = ({
  // State
  interviewType,
  isProcessing,
  displayedQuestion,
  isQuestionFullyDisplayed,
  showDSAProblem,
  showSummary,
  summaryData,
  currentProblem,
  currentProblemIndex,
  totalProblems,
  currentQuestion,
  questions,
  currentRound,
  isRecording,
  recordingDuration,
  isPlaying,
  isMuted,

  // Handlers
  handleStartRecording,
  handleStopRecording,
  resetInterview,
  finishInterview,
  toggleAudioPlayback,
  toggleMute,
  handleNextQuestionFromCode,
  handleCloseSummary,
  sessionId,
  isOngoing = false
}) => {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left side - AI Questions Panel */}
        <div>
          <AIQuestionsPanel
            currentQuestion={currentQuestion}
            displayedQuestion={displayedQuestion}
            isQuestionFullyDisplayed={isQuestionFullyDisplayed}
            questions={questions}
            currentRound={currentRound}
            isRecording={isRecording}
            isProcessing={isProcessing}
            recordingDuration={recordingDuration}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onResetInterview={resetInterview}
            onFinishInterview={finishInterview}
          />
        </div>

        {/* Right side - DSA Problem & Code Editor or Non-DSA Panel */}
        <div>
          {interviewType === 'dsa' || showDSAProblem ? (
            <div className="space-y-6">
              <QuestionStatement
                interviewType={interviewType}
                currentQuestion={currentQuestion}
                displayedQuestion={displayedQuestion}
                currentProblem={currentProblem}
                currentProblemIndex={currentProblemIndex}
                totalProblems={totalProblems}
                isQuestionFullyDisplayed={isQuestionFullyDisplayed}
                isPlaying={isPlaying}
                isMuted={isMuted}
                onToggleAudioPlayback={toggleAudioPlayback}
                onToggleMute={toggleMute}
              />
              
              <DSAInterviewPanel
                interviewStarted={true}
                sessionId={sessionId}
                onNextQuestionFromCode={handleNextQuestionFromCode}
              />
            </div>
          ) : (
            <NonDSAInterviewPanel
              interviewType={interviewType}
              currentQuestion={currentQuestion}
              displayedQuestion={displayedQuestion}
              isQuestionFullyDisplayed={isQuestionFullyDisplayed}
              isPlaying={isPlaying}
              isMuted={isMuted}
              onToggleAudioPlayback={toggleAudioPlayback}
              onToggleMute={toggleMute}
            />
          )}
        </div>
      </div>

      {/* Summary Modal */}
      <SummaryModal
        isOpen={showSummary}
        onClose={handleCloseSummary}
        summaryData={summaryData}
      />
    </>
  );
};

export default InterviewInterface; 
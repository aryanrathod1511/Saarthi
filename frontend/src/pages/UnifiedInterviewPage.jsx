import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useInterviewSession } from '../hooks/useInterviewSession';
import { useInterviewLogic } from '../hooks/useInterviewLogic';
import { interviewService } from '../services/interviewService';
import InterviewSetup from '../components/interview/InterviewSetup';
import InterviewInterface from '../components/interview/InterviewInterface';

const UnifiedInterviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if this is an ongoing interview
  const sessionData = location.state;
  const isOngoing = !!sessionData?.sessionId;
  const initialSessionId = sessionData?.sessionId;
  
  const { interviewStarted, startSession, endSession } = useInterviewSession();
  
  const {
    // State
    interviewType,
    isLoading,
    isProcessing,
    sessionId,
    selectedFile,
    companyInfo,
    isPlaying,
    isMuted,
    displayedQuestion,
    isQuestionFullyDisplayed,
  
    showSummary,
    summaryData,
    currentProblem,
    dsaProblems,
    currentProblemIndex,
    currentQuestion,
    questions,
    currentRound,
    isRecording,
    recordingDuration,

    // Handlers
    handleFileSelect,
    handleCompanyInfoChange,
    handleInterviewTypeChange,
    handleStartInterview,
    handleStartRecording,
    handleStopRecording,
    resetInterview,
    finishInterview,
    toggleAudioPlayback,
    toggleMute,
    handleNextQuestionFromCode,
    handleCloseSummary,
    loadDSAProblems
  } = useInterviewLogic(isOngoing, initialSessionId);

  // Initialize ongoing interview data and handle invalid access
  useEffect(() => {
    if (isOngoing) {
      if (!sessionData?.sessionId) {
        // If someone tries to access ongoing interview without session data, redirect to form
        navigate('/interview', { replace: true, state: null });
        return;
      }
      
      // Set initial data for ongoing interview
      if (sessionData.currentQuestion) {
        // This will be handled by the hook's useEffect for currentQuestion
      }
      if (sessionData.questions) {
        sessionData.questions.forEach(q => {
          // Add questions to context if needed
        });
      }
      if (sessionData.currentRound) {
        // Set round if needed
      }
    }
  }, [isOngoing, sessionData, navigate]);

  // Start session when interview begins (for new interviews)
  useEffect(() => {
    if (currentQuestion && !interviewStarted && !isOngoing) {
      startSession();
    }
  }, [currentQuestion, interviewStarted, isOngoing, startSession]);

  // Load DSA problems when interview starts
  useEffect(() => {
    if ((interviewStarted || isOngoing) && sessionId && interviewType === 'dsa') {
      loadDSAProblems();
    }
  }, [interviewStarted, isOngoing, sessionId, interviewType, loadDSAProblems]);

  // Handle navigation away - terminate session and redirect to form
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (sessionId) {
        e.preventDefault();
        e.returnValue = '';
        interviewService.terminateSession(sessionId).catch(console.error);
      }
    };

    const handlePopState = async () => {
      if (sessionId) {
        try {
          await interviewService.terminateSession(sessionId);
          // Clear any ongoing session data
          navigate('/interview', { replace: true, state: null });
        } catch (error) {
          console.error('Error terminating session:', error);
          navigate('/interview', { replace: true, state: null });
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [sessionId, navigate]);

  // Cleanup effect - terminate session when component unmounts
  useEffect(() => {
    return () => {
      if (sessionId) {
        interviewService.terminateSession(sessionId).catch(console.error);
      }
    };
  }, [sessionId]);

  // Enhanced handlers
  const handleResetInterview = async () => {
    if (window.confirm('Are you sure you want to reset the interview? This will clear all progress.')) {
      try {
        console.log('Resetting interview...');
        // Terminate session first
        if (sessionId) {
          await interviewService.terminateSession(sessionId);
          console.log('Session terminated');
        }
        // Reset local state
        resetInterview();
        endSession();
        console.log('State reset, redirecting to form...');
        // Force redirect to form page by clearing location state
        navigate('/interview', { replace: true, state: null });
      } catch (error) {
        console.error('Error resetting interview:', error);
        // Still redirect even if termination fails
        navigate('/interview', { replace: true, state: null });
      }
    }
  };

  const handleFinishInterview = async () => {
    try {
      console.log('🚀 User clicked finish interview button');
      await finishInterview();
      console.log('✅ Interview finish process completed');
    } catch (error) {
      console.error('❌ Error finishing interview:', error);
    }
  };

  const handleCloseSummaryEnhanced = () => {
    console.log('🔒 Closing summary modal');
    handleCloseSummary();
    // Redirect to landing page instead of interview form
    navigate('/', { replace: true });
    console.log('🎉 Summary modal should now be visible');
  };

  // Debug logging
  useEffect(() => {
    console.log('Interview state:', {
      interviewStarted,
      isOngoing,
      sessionId,
      showSummary,
      summaryData: !!summaryData
    });
  }, [interviewStarted, isOngoing, sessionId, showSummary, summaryData]);

  // Loading state for ongoing interviews
  if (isOngoing && !sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {(!interviewStarted && !isOngoing) || (!sessionId && !isLoading) ? (
          <InterviewSetup
            selectedFile={selectedFile}
            companyInfo={companyInfo}
            interviewType={interviewType}
            onFileSelect={handleFileSelect}
            onCompanyInfoChange={handleCompanyInfoChange}
            onInterviewTypeChange={handleInterviewTypeChange}
            onStartInterview={handleStartInterview}
            isLoading={isLoading}
          />
        ) : (
          <InterviewInterface
            // State
            interviewType={interviewType}
            isProcessing={isProcessing}
            displayedQuestion={displayedQuestion}
            isQuestionFullyDisplayed={isQuestionFullyDisplayed}
    
            showSummary={showSummary}
            summaryData={summaryData}
            currentProblem={currentProblem}
            currentProblemIndex={currentProblemIndex}
            totalProblems={isOngoing ? 1 : dsaProblems.length}
            currentQuestion={currentQuestion}
            questions={questions}
            currentRound={currentRound}
            isRecording={isRecording}
            recordingDuration={recordingDuration}
            isPlaying={isPlaying}
            isMuted={isMuted}

            // Handlers
            handleStartRecording={handleStartRecording}
            handleStopRecording={handleStopRecording}
            resetInterview={handleResetInterview}
            finishInterview={handleFinishInterview}
            toggleAudioPlayback={toggleAudioPlayback}
            toggleMute={toggleMute}
            handleNextQuestionFromCode={handleNextQuestionFromCode}
            handleCloseSummary={handleCloseSummaryEnhanced}
            sessionId={sessionId}
            isOngoing={isOngoing}
          />
        )}
      </div>
    </div>
  );
};

export default UnifiedInterviewPage; 
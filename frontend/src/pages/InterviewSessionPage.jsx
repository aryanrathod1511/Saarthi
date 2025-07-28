import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useInterviewSession } from '../hooks/useInterviewSession';
import { useInterviewLogic } from '../hooks/useInterviewLogic';
import { interviewService } from '../services/interviewService';
import InterviewInterface from '../components/interview/InterviewInterface';

const InterviewSessionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get session data from navigation state
  const sessionData = location.state;
  const sessionId = sessionData?.sessionId;
  const interviewType = sessionData?.interviewType;
  const companyInfo = sessionData?.companyInfo;
  
  const { interviewStarted, startSession, endSession } = useInterviewSession();
  
  const {
    // State
    isLoading,
    isProcessing,
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
    isPlaying,
    isMuted,

    // Handlers
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
  } = useInterviewLogic(false, sessionId);

  // Function to terminate session and redirect
  const terminateSessionAndRedirect = async (reason = 'user_navigation') => {
    console.log(`🗑️ Terminating session due to: ${reason}`);
    
    // Show appropriate message based on reason
    if (reason === 'browser_back') {
      if (window.toast) {
        window.toast.warning('Interview terminated. You can start a new interview from the form.');
      }
    } else if (reason === 'user_reset') {
      if (window.toast) {
        window.toast.info('Interview reset. Redirecting to form...');
      }
    }
    
    if (sessionId) {
      try {
        await interviewService.terminateSession(sessionId);
        console.log('✅ Session terminated successfully');
      } catch (error) {
        console.error('❌ Error terminating session:', error);
      }
    }
    
    // Clear any local session data
    endSession();
    
    // Redirect to form
    navigate('/interview', { replace: true, state: null });
    console.log('🔄 Redirected to interview form');
  };

  // Initialize interview session
  useEffect(() => {
    if (!sessionData?.sessionId) {
      // If someone tries to access interview session without session data, redirect to form
      console.log('❌ No session data found, redirecting to form');
      navigate('/interview', { replace: true });
      return;
    }
    
    // Start the interview session
    if (sessionId && !interviewStarted) {
      console.log(' Starting interview session');
      startSession();
      handleStartInterview();
    }
  }, [sessionId, interviewStarted, sessionData, navigate, startSession, handleStartInterview]);

  // Load DSA problems when interview starts
  useEffect(() => {
    if (interviewStarted && sessionId && interviewType === 'dsa') {
      loadDSAProblems();
    }
  }, [interviewStarted, sessionId, interviewType, loadDSAProblems]);

  // Enhanced navigation protection
  useEffect(() => {
    // Handle browser back button
    const handlePopState = async (event) => {
      console.log('🔙 Browser back button pressed');
      event.preventDefault();
      await terminateSessionAndRedirect('browser_back');
    };

    // Handle page refresh/close
    const handleBeforeUnload = (event) => {
      console.log(' Page refresh/close detected');
      if (sessionId) {
        // Show confirmation dialog
        event.preventDefault();
        event.returnValue = 'Are you sure you want to leave? Your interview progress will be lost.';
        
        // Terminate session immediately (synchronous)
        interviewService.terminateSession(sessionId).catch(error => {
          console.error('Error terminating session on unload:', error);
        });
      }
    };

    // Handle visibility change (tab switch)
    const handleVisibilityChange = async () => {
      if (document.hidden && sessionId) {
        console.log('️ Tab switched away');
        // Don't terminate immediately, but log it
        console.log('⚠️ User switched tabs - session remains active');
      }
    };

    // Handle focus loss (window blur)
    const handleWindowBlur = () => {
      if (sessionId) {
        console.log('🪟 Window lost focus');
        // Don't terminate immediately, but log it
        console.log('⚠️ Window lost focus - session remains active');
      }
    };

    // Add event listeners
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    // Cleanup function
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [sessionId, navigate, endSession]);

  const handleResetInterview = async () => {
    if (window.confirm('Are you sure you want to reset the interview? This will clear all progress.')) {
      await terminateSessionAndRedirect('user_reset');
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
    console.log('🔒 Closing summary modal, redirecting to home page...');
    handleCloseSummary();
    
    // Terminate session before redirecting to home
    if (sessionId) {
      interviewService.terminateSession(sessionId).catch(error => {
        console.error('Error terminating session:', error);
      });
    }
    
    // Redirect to home page
    navigate('/', { replace: true });
    console.log(' Redirected to home page');
  };

  // Loading state
  if (!sessionId || isLoading) {
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
          totalProblems={dsaProblems.length}
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
          isOngoing={false}
        />
      </div>
    </div>
  );
};

export default InterviewSessionPage; 
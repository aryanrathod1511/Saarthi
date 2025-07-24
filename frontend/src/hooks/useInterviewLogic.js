import { useState, useEffect, useRef, useCallback } from 'react';
import { useInterview } from '../contexts/InterviewContext';
import { useAudioRecording } from './useAudioRecording';
import { interviewService } from '../services/interviewService';
import { typeWriter, speakText } from '../utils/helpers';

export const useInterviewLogic = (isOngoing = false, sessionIdFromProps = null) => {
  // Context
  const { 
    currentQuestion, 
    questions, 
    addQuestion,
    setCurrentQuestion,
    setCurrentRound,
    currentRound
  } = useInterview();

  // Interview state
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState(sessionIdFromProps);

  // UI state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [displayedQuestion, setDisplayedQuestion] = useState('');
  const [isQuestionFullyDisplayed, setIsQuestionFullyDisplayed] = useState(false);
  const [showDSAProblem, setShowDSAProblem] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  // DSA state
  const [currentProblem, setCurrentProblem] = useState(null);
  const [dsaProblems, setDsaProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);

  // Refs
  const utteranceRef = useRef(null);

  // Custom hooks
  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    resetRecording
  } = useAudioRecording();

  // Typewriter effect
  useEffect(() => {
    if (currentQuestion) {
      setIsQuestionFullyDisplayed(false);
      setDisplayedQuestion('');
      
      typeWriter(currentQuestion, setDisplayedQuestion, 60, () => {
        setIsQuestionFullyDisplayed(true);
      });
      
      const utterance = speakText(currentQuestion, setIsPlaying);
      utteranceRef.current = utterance;
    }
    
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentQuestion]);

  // Load DSA problems
  const loadDSAProblems = useCallback(async () => {
    try {
      const response = await interviewService.getDSAProblems(sessionId);
      setDsaProblems(response.problems);
      setCurrentProblemIndex(response.currentProblemIndex);
    } catch (error) {
      console.error('Error loading DSA problems:', error);
    }
  }, [sessionId]);

  // Load current problem
  const loadCurrentProblem = useCallback(async () => {
    try {
      const response = await interviewService.getCurrentProblem(sessionId);
      setCurrentProblem(response.problem);
    } catch (error) {
      console.error('Error loading current problem:', error);
    }
  }, [sessionId]);

  // Update current problem
  useEffect(() => {
    if (dsaProblems.length > 0 && currentProblemIndex < dsaProblems.length) {
      setCurrentProblem(dsaProblems[currentProblemIndex]);
    }
  }, [dsaProblems, currentProblemIndex]);

  // Start interview handler
  const handleStartInterview = async () => {
    if (!sessionId) {
      console.error('No session ID provided');
      return;
    }

    setIsLoading(true);
    try {
      const response = await interviewService.startInterview(sessionId);
      
      if (response.question) {
        setCurrentQuestion(response.question);
        addQuestion(response.question, 'Introduction');
        setCurrentRound(1);
        
        if (window.toast) {
          window.toast.success('Interview started successfully!');
        }
      }
    } catch (error) {
      console.error('Error starting interview:', error);
      if (window.toast) {
        window.toast.error(error.response?.data?.error || 'Failed to start interview');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Recording handlers
  const handleStartRecording = () => {
    if (!isQuestionFullyDisplayed) {
      if (window.toast) {
        window.toast.warning('Please wait for the question to finish loading.');
      }
      return;
    }
    startRecording(processAudio);
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const processAudio = async (blob) => {
    setIsProcessing(true);
    
    try {
      const audioResponse = await interviewService.uploadAudio(blob);
      
      if (audioResponse.transcript) {
        const nextQuestionResponse = await interviewService.getNextQuestion(
          sessionId,
          audioResponse.transcript,
          audioResponse.toneMatrix,
          questions.length + 1
        );

        if (nextQuestionResponse.question) {
          setCurrentQuestion(nextQuestionResponse.question);
          addQuestion(nextQuestionResponse.question, 'Next Question');
          setCurrentRound(nextQuestionResponse.round || questions.length + 1);
          
          if (nextQuestionResponse.showDSAProblem !== undefined) {
            setShowDSAProblem(nextQuestionResponse.showDSAProblem);
          }
          
          if (nextQuestionResponse.shouldMoveToNextProblem) {
            setCurrentProblemIndex(prev => prev + 1);
            setCurrentProblem(null);
            setTimeout(() => loadCurrentProblem(), 500);
            
            if (window.toast) {
              window.toast.info('Moving to the next problem...');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      if (window.toast) {
        window.toast.error(error.response?.data?.message || 'Failed to process audio');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Control handlers
  const resetInterview = () => {
    if (window.confirm('Are you sure you want to reset the interview? This will clear all progress.')) {
      setCurrentQuestion('');
      setDisplayedQuestion('');
      setQuestions([]);
      setCurrentRound(0);
      setShowDSAProblem(false);
      resetRecording();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      setIsMuted(false);
      setCurrentProblem(null);
      setDsaProblems([]);
      setCurrentProblemIndex(0);
      setSessionId(null);
    }
  };

  const finishInterview = async () => {
    try {
      console.log(' Starting interview finish process...');
      
      if (!sessionId) {
        console.error('❌ No active session found');
        if (window.toast) {
          window.toast.error('No active session found.');
        }
        return;
      }

      console.log('📊 Generating detailed interview summary...');
      if (window.toast) {
        window.toast.info('Generating detailed interview summary...', 0);
      }
      
      const response = await interviewService.getSummary(sessionId);
      
      if (response.summary) {
        console.log('✅ Summary generated successfully:', {
          summaryLength: response.summary.length,
          totalRounds: response.totalRounds,
          companyInfo: response.companyInfo
        });
        
        if (window.toast) {
          window.toast.success('Interview completed! Detailed summary generated.');
        }
        
        // Set summary data and show modal immediately
        setSummaryData(response);
        setShowSummary(true);
        setSessionId(null);
        
        console.log('🎉 Summary modal should now be visible');
      } else {
        console.error('❌ No summary in response');
        if (window.toast) {
          window.toast.error('Failed to generate summary');
        }
      }
    } catch (error) {
      console.error('❌ Error getting feedback:', error);
      if (window.toast) {
        window.toast.error(error.response?.data?.error || 'Failed to get interview feedback');
      }
    }
  };

  // Audio controls
  const toggleAudioPlayback = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else if (currentQuestion) {
      speakText(currentQuestion, setIsPlaying);
    }
  };

  const toggleMute = () => {
    if ('speechSynthesis' in window) {
      if (isMuted) {
        window.speechSynthesis.resume();
        setIsMuted(false);
      } else {
        window.speechSynthesis.pause();
        setIsMuted(true);
      }
    }
  };

  // Code submission handler
  const handleNextQuestionFromCode = (nextQuestion, round, shouldMoveToNextProblem = false) => {
    setCurrentQuestion(nextQuestion);
    if (round) {
      setCurrentRound(round);
    }
    addQuestion(nextQuestion, 'DSA Follow-up');
    
    if (shouldMoveToNextProblem) {
      setCurrentProblemIndex(prev => prev + 1);
      setCurrentProblem(null);
      setTimeout(() => loadCurrentProblem(), 500);
      
      if (window.toast) {
        window.toast.info('Moving to the next problem...');
      }
    }
  };

  // Summary handlers
  const handleCloseSummary = () => {
    console.log('🔒 Closing summary modal');
    setShowSummary(false);
    setSummaryData(null); // Clear summary data when closing
  };

  // Monitor summary state changes
  useEffect(() => {
    if (showSummary) {
      console.log('📋 Summary modal is now open');
    } else if (summaryData) {
      console.log('📋 Summary modal is now closed');
    }
  }, [showSummary, summaryData]);

  return {
    // State
    isLoading,
    isProcessing,
    displayedQuestion,
    isQuestionFullyDisplayed,
    showDSAProblem,
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
    loadDSAProblems,
    loadCurrentProblem
  };
}; 
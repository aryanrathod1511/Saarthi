import React, { useState, useEffect, useRef } from 'react';
import { useInterview } from '../contexts/InterviewContext';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { useInterviewSession } from '../hooks/useInterviewSession';
import { interviewService } from '../services/interviewService';
import { typeWriter, speakText } from '../utils/helpers';
import { sessionManager } from '../utils/sessionManager.js';
import InterviewSetup from '../components/interview/InterviewSetup';
import InterviewPanel from '../components/interview/InterviewPanel';
import DSAInterviewPanel from '../components/interview/DSAInterviewPanel';
import QuestionStatement from '../components/interview/QuestionStatement';
import AIQuestionsPanel from '../components/interview/AIQuestionsPanel';
import NonDSAInterviewPanel from '../components/interview/NonDSAInterviewPanel';
import { Modal } from '../components/common';
import { Clock } from 'lucide-react';

const InterviewPage = () => {
  const { 
    isInterviewActive, 
    currentQuestion, 
    questions, 
    startInterview, 
    endInterview, 
    addQuestion,
    setCurrentQuestion,
    setCurrentRound,
    setQuestions,
    currentRound
  } = useInterview();

  // Interview state
  const [interviewType, setInterviewType] = useState('dsa');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    type: 'startup',
    role: 'Software Development Engineer',
    level: 'Entry level'
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [displayedQuestion, setDisplayedQuestion] = useState('');
  const [isQuestionFullyDisplayed, setIsQuestionFullyDisplayed] = useState(false);
  const utteranceRef = useRef(null);

  // DSA specific state
  const [currentProblem, setCurrentProblem] = useState(null);
  const [dsaProblems, setDsaProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);

  // Summary modal state
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  // Custom hooks
  const {
    isRecording,
    audioBlob,
    recordingDuration,
    startRecording,
    stopRecording,
    resetRecording,
    createAudioUrl,
    revokeAudioUrl
  } = useAudioRecording();

  const {
    interviewStarted,
    startSession,
    endSession
  } = useInterviewSession();

  // Typewriter effect for question display
  useEffect(() => {
    if (currentQuestion) {
      setIsQuestionFullyDisplayed(false);
      setDisplayedQuestion(''); // Clear previous question immediately
      typeWriter(currentQuestion, setDisplayedQuestion, 50, () => {
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

  // Load DSA problems when interview starts
  useEffect(() => {
    if (interviewStarted && sessionId && interviewType === 'dsa') {
      loadDSAProblems();
    }
  }, [interviewStarted, sessionId, interviewType]);

  // Update current problem when problems or index changes
  useEffect(() => {
    if (dsaProblems.length > 0 && currentProblemIndex < dsaProblems.length) {
      setCurrentProblem(dsaProblems[currentProblemIndex]);
    }
  }, [dsaProblems, currentProblemIndex]);

  // Stop speech if user navigates away or tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const loadDSAProblems = async () => {
    try {
      const response = await interviewService.getDSAProblems(sessionId);
      setDsaProblems(response.problems);
      setCurrentProblemIndex(response.currentProblemIndex);
    } catch (error) {
      console.error('Error loading DSA problems:', error);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Please select a valid PDF file.');
    }
  };

  const handleCompanyInfoChange = (field, value) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleInterviewTypeChange = (type) => {
    setInterviewType(type);
  };

  const handleStartInterview = async () => {
    if (!selectedFile || !companyInfo.name.trim()) {
      if (window.toast) {
        window.toast.error('Please fill in company information and select a resume file.');
      }
      return;
    }

    setIsLoading(true);
    try {
      // First upload resume
      const formData = new FormData();
      formData.append('resume', selectedFile);
      formData.append('companyInfo', JSON.stringify(companyInfo));
      formData.append('interviewType', interviewType);

      const uploadResponse = await interviewService.uploadResume(formData);
      setSessionId(uploadResponse.sessionId);
      
      // Then start interview
      const response = await interviewService.startInterview(uploadResponse.sessionId, interviewType);
      
      if (response.question) {
        setCurrentQuestion(response.question);
        addQuestion(response.question, 'Introduction');
        startSession();
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

  const handleStartRecording = () => {
    if (!isQuestionFullyDisplayed) {
      if (window.toast) {
        window.toast.warning('Please wait for the question to finish loading.');
      }
      return;
    }
    
    // Pass the callback function to handle the audio blob when recording stops
    startRecording(processAudio);
  };

  const handleStopRecording = () => {
    stopRecording();
    // The processAudio function will be called automatically by the hook
  };

  const processAudio = async (blob) => {
    setIsProcessing(true);
    try {
      console.log('Processing audio blob:', blob); // Debug log
      
      // Upload audio for processing
      const audioResponse = await interviewService.uploadAudio(blob);
      console.log('Audio upload response:', audioResponse); // Debug log
      
      if (audioResponse.transcript) {
        // Get next question
        const nextQuestionResponse = await interviewService.getNextQuestion(
          sessionId,
          audioResponse.transcript,
          audioResponse.toneMatrix,
          questions.length + 1
        );
        console.log('Next question response:', nextQuestionResponse); // Debug log

        if (nextQuestionResponse.question) {
          setCurrentQuestion(nextQuestionResponse.question);
          addQuestion(nextQuestionResponse.question, 'Next Question');
          setCurrentRound(nextQuestionResponse.round || questions.length + 1);
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

  const resetInterview = () => {
    if (window.confirm('Are you sure you want to reset the interview? This will clear all progress.')) {
      setCurrentQuestion('');
      setDisplayedQuestion('');
      setQuestions([]);
      setCurrentRound(0);
      endSession();
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
      if (!sessionId) {
        if (window.toast) {
          window.toast.error('No active session found.');
        }
        return;
      }

      if (window.toast) {
        window.toast.info('Generating detailed interview summary...', 0);
      }
      
      const response = await interviewService.getSummary(sessionId);
      
      if (response.summary) {
        if (window.toast) {
          window.toast.success('Interview completed! Detailed summary generated.');
        }
        
        // End the session after getting summary
        endSession();
        setSummaryData(response);
        setShowSummary(true);
        
        // Clear session ID
        setSessionId(null);
      }
    } catch (error) {
      console.error('Error getting feedback:', error);
      if (window.toast) {
        window.toast.error(error.response?.data?.error || 'Failed to get interview feedback');
      }
    }
  };

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

  const handleNextQuestionFromCode = (nextQuestion, round) => {
    setCurrentQuestion(nextQuestion);
    if (round) {
      setCurrentRound(round);
    }
    addQuestion(nextQuestion, 'DSA Follow-up');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {!interviewStarted ? (
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
          // Interview layout - two columns
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left side - AI Questions Panel */}
            <div>
              <AIQuestionsPanel
                currentQuestion={currentQuestion}
                displayedQuestion={displayedQuestion}
                isQuestionFullyDisplayed={isQuestionFullyDisplayed}
                questions={questions}
                currentRound={currentRound}
                // Recording props
                isRecording={isRecording}
                isProcessing={isProcessing}
                recordingDuration={recordingDuration}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                // Control buttons
                onResetInterview={resetInterview}
                onFinishInterview={finishInterview}
              />
            </div>

            {/* Right side - DSA Problem & Code Editor or Non-DSA Panel */}
            <div>
              {interviewType === 'dsa' ? (
                <div className="space-y-6">
                  {/* DSA Problem Statement */}
                  <QuestionStatement
                    interviewType={interviewType}
                    currentQuestion={currentQuestion}
                    displayedQuestion={displayedQuestion}
                    currentProblem={currentProblem}
                    currentProblemIndex={currentProblemIndex}
                    totalProblems={dsaProblems.length}
                    isQuestionFullyDisplayed={isQuestionFullyDisplayed}
                    isPlaying={isPlaying}
                    isMuted={isMuted}
                    onToggleAudioPlayback={toggleAudioPlayback}
                    onToggleMute={toggleMute}
                  />
                  
                  {/* Code Editor */}
                  <DSAInterviewPanel
                    interviewStarted={interviewStarted}
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
        )}
      </div>

      {/* Summary Modal */}
      <Modal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        title="Interview Summary"
        size="lg"
      >
        {summaryData && (
          <div className="prose max-w-none">
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Saarthi Interview Summary</h2>
              </div>
              <p className="text-gray-600">
                {summaryData.companyInfo?.name || 'Company'} - {summaryData.companyInfo?.role || 'Position'}
              </p>
            </div>
            <div className="text-gray-700 leading-relaxed">
              {summaryData.summary.split('\n').map((line, index) => (
                <p key={index} className="mb-3">{line}</p>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{summaryData.totalRounds || 0}</div>
                  <div>Total Rounds</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">{summaryData.aiQuestionsCount || 0}</div>
                  <div>Questions Asked</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-purple-600">{summaryData.userResponsesCount || 0}</div>
                  <div>Your Responses</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-orange-600">{summaryData.toneAnalysisCount || 0}</div>
                  <div>Tone Analysis</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InterviewPage;


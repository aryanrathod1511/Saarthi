import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useInterview } from '../contexts/InterviewContext';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { useInterviewSession } from '../hooks/useInterviewSession';
import { interviewService } from '../services/interviewService';
import { typeWriter, speakText } from '../utils/helpers';
import { sessionManager } from '../utils/sessionManager.js';
import InterviewSetup from '../components/interview/InterviewSetup';
import InterviewPanel from '../components/interview/InterviewPanel';
import { Modal, CodeEditor, Select, Card } from '../components/common';
import { 
  Code, 
  Briefcase, 
  Users, 
  MessageSquare,
  Clock
} from 'lucide-react';

const InterviewPage = () => {
  const { 
    isInterviewActive, 
    currentQuestion, 
    questions, 
    startInterview, 
    endInterview, 
    addQuestion,
    setCurrentQuestion,
    setCurrentRound
  } = useInterview();

  // Interview state
  const [interviewType, setInterviewType] = useState('dsa');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);

  // Company info state
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    type: 'startup',
    role: 'Software Development Engineer',
    level: 'Entry level'
  });

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // State for displayed question with typewriter effect
  const [displayedQuestion, setDisplayedQuestion] = useState('');
  const [isQuestionFullyDisplayed, setIsQuestionFullyDisplayed] = useState(false);
  const utteranceRef = useRef(null);

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
    currentRound,
    interviewProgress,
    startSession,
    endSession,
    updateProgress
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

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      toast.success('Resume selected successfully');
    } else {
      toast.error('Please select a valid PDF file');
    }
  };

  const handleCompanyInfoChange = (field, value) => {
    setCompanyInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInterviewTypeChange = (type) => {
    setInterviewType(type);
  };

  const uploadResume = async () => {
    if (!selectedFile) {
      if (window.toast) {
        window.toast.error('Please select a resume file');
      }
      return;
    }

    if (!companyInfo.name.trim()) {
      if (window.toast) {
        window.toast.error('Please enter company name');
      }
      return;
    }

    setIsUploading(true);
    if (window.toast) {
      window.toast.info('Uploading resume and preparing interview...', 0);
    }

    try {
      const formData = new FormData();
      formData.append('resume', selectedFile);

      Object.keys(companyInfo).forEach(key => {
        if (companyInfo[key]) {
          formData.append(key, companyInfo[key]);
        }
      });

      formData.append('interviewType', interviewType);

      const response = await interviewService.uploadResume(formData);

      if (response.sessionId) {
        sessionManager.setSessionId(response.sessionId);
        startSession(response.sessionId, response.candidateName);
        
        if (window.toast) {
          window.toast.success(`Welcome ${response.candidateName}! Interview session created.`);
        }
        
        await startInterviewSession();
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      if (window.toast) {
        window.toast.error(error.response?.data?.message || 'Failed to upload resume');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const startInterviewSession = async () => {
    try {
      setIsLoading(true);
      const currentSessionId = sessionManager.getValidSessionId();

      const response = await interviewService.startInterview(currentSessionId, interviewType);

      if (response.question) {
        setCurrentQuestion(response.question);
        addQuestion(response.question);
        updateProgress(1);
        setCurrentRound(1);
        startInterview();
        if (window.toast) {
          window.toast.success('Interview started! Listen to the welcome message.');
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

  const getNextQuestion = async (transcript = '', toneMatrix = null, code = null) => {
    if (!isInterviewActive) return;

    try {
      setIsLoading(true);
      const currentSessionId = sessionManager.getValidSessionId();

      const response = await interviewService.getNextQuestion(
        currentSessionId, 
        transcript, 
        toneMatrix, 
        currentRound + 1,
        code // Add code parameter
      );

      if (response.question) {
        setCurrentQuestion(response.question);
        addQuestion(response.question);
        updateProgress(currentRound + 1);
        setCurrentRound(currentRound + 1);
        if (window.toast) {
          window.toast.success(`Question ${currentRound + 1} received!`);
        }
      } else {
        if (window.toast) {
          window.toast.success('Interview completed! Generating detailed summary...');
        }
        await finishInterview();
      }
    } catch (error) {
      console.error('Error getting next question:', error);
      if (window.toast) {
        window.toast.error(error.response?.data?.error || 'Failed to get next question');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartRecording = () => {
    console.log('🎤 Starting recording...');
    startRecording(async (blob) => {
      console.log('🎤 Recording stopped, processing audio...', blob);
      // This will be called automatically when recording stops
      await processAudio(blob);
    });
    if (window.toast) {
      window.toast.success('Recording started. Speak clearly into your microphone.');
    }
  };

  const handleStopRecording = () => {
    console.log('🎤 Stopping recording...');
    stopRecording();
    // The processAudio will be called automatically via the onDataAvailable callback
  };

  const processAudio = async (blob) => {
    if (!blob) {
      console.log('❌ No blob provided to processAudio');
      return;
    }

    console.log('🔄 Processing audio...', blob.size, 'bytes');
    setIsProcessing(true);
    if (window.toast) {
      window.toast.success('Recording stopped. Processing your response...');
    }

    try {
      const response = await interviewService.uploadAudio(blob);
      console.log('✅ Audio processed successfully:', response);

      if (response.transcript) {
        if (window.toast) {
          window.toast.success('Response processed successfully!');
        }
        
        await getNextQuestion(response.transcript, response.toneMatrix);
      }
    } catch (error) {
      console.error('❌ Error processing audio:', error);
      if (window.toast) {
        window.toast.error('Failed to process audio response. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const resetInterview = () => {
    endSession();
    setSelectedFile(null);
    resetRecording();
    setDisplayedQuestion('');
    endInterview();
    if (window.toast) {
      window.toast.success('Interview reset successfully');
    }
  };

  const finishInterview = async () => {
    try {
      const currentSessionId = sessionManager.getValidSessionId();
      if (window.toast) {
        window.toast.info('Generating detailed interview summary...', 0);
      }
      
      const response = await interviewService.getSummary(currentSessionId);
      
      if (response.summary) {
        if (window.toast) {
          window.toast.success('Interview completed! Detailed summary generated.');
        }
        
        endSession();
        setSummaryData(response);
        setShowSummary(true);
      }
    } catch (error) {
      console.error('Error getting feedback:', error);
      if (window.toast) {
        window.toast.error(error.response?.data?.error || 'Failed to get interview feedback');
      }
    }
  };

  // Modal state
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  // Add new state for code editor
  const [code, setCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  const toggleAudioPlayback = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else if (currentQuestion) {
      speakText(currentQuestion, setIsPlaying);
    }
  };

  const handleCodeSubmit = async (submittedCode) => {
    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to submit this code?');
    
    if (!confirmed) {
      return;
    }

    setIsSubmittingCode(true);
    
    try {
      // For now, we'll just call the next question API as usual
      // The backend will need to be updated to handle code submissions
      await getNextQuestion('', null, submittedCode);
      
      // Clear the code editor after successful submission
      setCode('');
    } catch (error) {
      console.error('Error submitting code:', error);
      if (window.toast) {
        window.toast.error('Failed to submit code. Please try again.');
      }
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const handleLanguageChange = (newLanguage) => {
    setSelectedLanguage(newLanguage);
    // Clear code when language changes
    setCode('');
  };

  const getInterviewTypeIcon = (type) => {
    switch (type) {
      case 'dsa':
        return <Code className="w-4 h-4 text-blue-600" />;
      case 'resume_cs':
        return <Briefcase className="w-4 h-4 text-green-600" />;
      case 'technical_hr':
        return <Users className="w-4 h-4 text-purple-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-600" />;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 flex items-center">
                <div className="w-10 h-10 mr-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                Saarthi
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Your AI-powered interview companion
              </p>
            </div>
            {interviewStarted && (
              <div className="flex items-center space-x-4">
                <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                  <div className="flex items-center space-x-2">
                    {getInterviewTypeIcon(interviewType)}
                    <span className="text-sm font-medium">{interviewType.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Layout changes based on interview state */}
        {!interviewStarted ? (
          // Setup layout - single column
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <InterviewSetup
              interviewType={interviewType}
              onInterviewTypeChange={handleInterviewTypeChange}
              companyInfo={companyInfo}
              onCompanyInfoChange={handleCompanyInfoChange}
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onStartInterview={uploadResume}
              isUploading={isUploading}
            />
          </div>
        ) : (
          // Interview layout - two columns
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left side - Interview Panel */}
            <div>
              <InterviewPanel
                interviewStarted={interviewStarted}
                currentQuestion={currentQuestion}
                displayedQuestion={displayedQuestion}
                isLoading={isLoading}
                isRecording={isRecording}
                isProcessing={isProcessing}
                recordingDuration={recordingDuration}
                audioBlob={audioBlob}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                onResetInterview={resetInterview}
                onFinishInterview={finishInterview}
                onToggleAudioPlayback={toggleAudioPlayback}
                onToggleMute={toggleMute}
                isPlaying={isPlaying}
                isMuted={isMuted}
                interviewType={interviewType}
                createAudioUrl={createAudioUrl}
                revokeAudioUrl={revokeAudioUrl}
                isQuestionFullyDisplayed={isQuestionFullyDisplayed}
              />
            </div>

            {/* Right side - Code Editor */}
            <div>
              <Card className="h-full">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-800">Code Editor</h3>
                    <Select
                      value={selectedLanguage}
                      onChange={handleLanguageChange}
                      options={[
                        { value: 'javascript', label: 'JavaScript' },
                        { value: 'python', label: 'Python' },
                        { value: 'java', label: 'Java' },
                        { value: 'cpp', label: 'C++' },
                        { value: 'c', label: 'C' }
                      ]}
                      className="w-32"
                    />
                  </div>
                  <p className="text-gray-600 text-sm">
                    Write and submit your code solutions here. Your code will be evaluated as part of the interview.
                  </p>
                </div>
                
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language={selectedLanguage}
                  onSubmit={handleCodeSubmit}
                  isSubmitting={isSubmittingCode}
                />
              </Card>
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


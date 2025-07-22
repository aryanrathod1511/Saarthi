import { useState, useEffect } from 'react';
import { sessionManager } from '../utils/sessionManager';

export const useInterviewSession = () => {
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [interviewProgress, setInterviewProgress] = useState({
    totalRounds: 0,
    completedRounds: 0,
    currentPhase: 'setup'
  });

  useEffect(() => {
    if (sessionManager.hasSession()) {
      setInterviewStarted(true);
      setInterviewProgress(prev => ({ ...prev, currentPhase: 'interview' }));
    }
  }, []);

  const startSession = (sessionId, candidateName) => {
    sessionManager.setSessionId(sessionId);
    setInterviewStarted(true);
    setInterviewProgress(prev => ({ 
      ...prev, 
      currentPhase: 'interview',
      candidateName 
    }));
  };

  const endSession = () => {
    sessionManager.clearSessionId();
    setInterviewStarted(false);
    setCurrentRound(0);
    setInterviewProgress({
      totalRounds: 0,
      completedRounds: 0,
      currentPhase: 'setup'
    });
  };

  const updateProgress = (round) => {
    setCurrentRound(round);
    setInterviewProgress(prev => ({ 
      ...prev, 
      completedRounds: round,
      totalRounds: Math.max(prev.totalRounds, round)
    }));
  };

  return {
    interviewStarted,
    currentRound,
    interviewProgress,
    startSession,
    endSession,
    updateProgress
  };
}; 
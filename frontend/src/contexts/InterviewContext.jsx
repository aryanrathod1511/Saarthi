import React, { createContext, useContext, useReducer } from 'react';

const InterviewContext = createContext();

const initialState = {
  isInterviewActive: false,
  currentRound: 0,
  candidateInfo: null,
  currentQuestion: '',
  questions: [],
  questionHistory: [],
  interviewType: 'dsa',
  currentPhase: 'setup',
  companyInfo: null,
  isLoading: false,
  error: null,
  sessionId: null,
  interviewProgress: {
    totalRounds: 0,
    completedRounds: 0,
    currentPhase: 'setup'
  }
};

const interviewReducer = (state, action) => {
  switch (action.type) {
    case 'START_INTERVIEW':
      return {
        ...state,
        isInterviewActive: true,
        currentRound: 1,
        isLoading: false,
        error: null,
        currentPhase: 'interview'
      };

    case 'END_INTERVIEW':
      return {
        ...state,
        isInterviewActive: false,
        currentRound: 0,
        currentQuestion: '',
        questions: [],
        questionHistory: [],
        currentPhase: 'setup',
        isLoading: false,
        sessionId: null
      };

    case 'SET_CURRENT_QUESTION':
      return {
        ...state,
        currentQuestion: action.payload,
        isLoading: false
      };

    case 'ADD_QUESTION':
      return {
        ...state,
        questions: [...state.questions, action.payload],
        questionHistory: [...state.questionHistory, {
          question: action.payload,
          round: state.currentRound,
          timestamp: new Date().toISOString()
        }]
      };

    case 'SET_CURRENT_ROUND':
      return {
        ...state,
        currentRound: action.payload
      };

    case 'SET_INTERVIEW_TYPE':
      return {
        ...state,
        interviewType: action.payload,
        currentPhase: 'setup'
      };

    case 'SET_CURRENT_PHASE':
      return {
        ...state,
        currentPhase: action.payload
      };

    case 'SET_COMPANY_INFO':
      return {
        ...state,
        companyInfo: action.payload
      };

    case 'SET_SESSION_ID':
      return {
        ...state,
        sessionId: action.payload
      };

    case 'SET_INTERVIEW_PROGRESS':
      return {
        ...state,
        interviewProgress: {
          ...state.interviewProgress,
          ...action.payload
        }
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case 'RESET_INTERVIEW':
      return {
        ...initialState
      };

    default:
      return state;
  }
};

export const InterviewProvider = ({ children }) => {
  const [state, dispatch] = useReducer(interviewReducer, initialState);

  const startInterview = () => {
    dispatch({ type: 'START_INTERVIEW' });
  };

  const endInterview = () => {
    dispatch({ type: 'END_INTERVIEW' });
  };

  const setCurrentQuestion = (question) => {
    dispatch({ type: 'SET_CURRENT_QUESTION', payload: question });
  };

  const addQuestion = (question) => {
    dispatch({ type: 'ADD_QUESTION', payload: question });
  };

  const setCurrentRound = (round) => {
    dispatch({ type: 'SET_CURRENT_ROUND', payload: round });
  };

  const setInterviewType = (type) => {
    dispatch({ type: 'SET_INTERVIEW_TYPE', payload: type });
  };

  const setCurrentPhase = (phase) => {
    dispatch({ type: 'SET_CURRENT_PHASE', payload: phase });
  };

  const setCompanyInfo = (info) => {
    dispatch({ type: 'SET_COMPANY_INFO', payload: info });
  };

  const setSessionId = (sessionId) => {
    dispatch({ type: 'SET_SESSION_ID', payload: sessionId });
  };

  const setInterviewProgress = (progress) => {
    dispatch({ type: 'SET_INTERVIEW_PROGRESS', payload: progress });
  };

  const setLoading = (loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const resetInterview = () => {
    dispatch({ type: 'RESET_INTERVIEW' });
  };

  const value = {
    ...state,
    startInterview,
    endInterview,
    setCurrentQuestion,
    addQuestion,
    setCurrentRound,
    setInterviewType,
    setCurrentPhase,
    setCompanyInfo,
    setSessionId,
    setInterviewProgress,
    setLoading,
    setError,
    resetInterview
  };

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
}; 
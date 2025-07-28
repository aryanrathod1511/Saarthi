import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import interviewService from '../services/interviewService.js';
import toast from 'react-hot-toast';

const InterviewContext = createContext();

const initialState = {
    currentInterview: null,
    interviewHistory: [],
    loading: false,
    error: null,
    // Add these for interview logic
    currentQuestion: '',
    questions: [],
    currentRound: 0
};

const interviewReducer = (state, action) => {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false };
        case 'SET_CURRENT_INTERVIEW':
            return { ...state, currentInterview: action.payload, loading: false };
        case 'SET_INTERVIEW_HISTORY':
            return { ...state, interviewHistory: action.payload, loading: false };
        case 'SET_CURRENT_QUESTION':
            return { ...state, currentQuestion: action.payload };
        case 'ADD_QUESTION':
            return {
                ...state,
                questions: [...(state.questions || []), {
                    ...action.payload,
                    shouldMoveToNextProblem: action.payload.shouldMoveToNextProblem || false
                }]
            };
        case 'SET_CURRENT_ROUND':
            return { ...state, currentRound: action.payload };
        case 'RESET_QUESTIONS':
            return { ...state, questions: [], currentQuestion: '', currentRound: 0 };
        case 'UPDATE_INTERVIEW_STATUS':
            return {
                ...state,
                currentInterview: {
                    ...state.currentInterview,
                    status: action.payload
                }
            };
        case 'CLEAR_CURRENT_INTERVIEW':
            return { ...state, currentInterview: null };
        default:
            return state;
    }
};

export const InterviewProvider = ({ children }) => {
    const [state, dispatch] = useReducer(interviewReducer, initialState);
    const { isAuthenticated } = useAuth();

    // Load interview history when user is authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadInterviewHistory();
        }
    }, [isAuthenticated]);

    const loadInterviewHistory = async () => {
        if (!isAuthenticated) return;

        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await interviewService.getInterviewHistory();
            dispatch({ type: 'SET_INTERVIEW_HISTORY', payload: response.interviews || [] });
        } catch (error) {
            console.error('Error loading interview history:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to load interview history' });
        }
    };

    const createInterview = async (interviewData) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await interviewService.createInterview(interviewData);
            dispatch({ type: 'SET_CURRENT_INTERVIEW', payload: response.interview });
            toast.success('Interview created successfully!');
            return response.interview;
        } catch (error) {
            console.error('Error creating interview:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to create interview' });
            toast.error('Failed to create interview');
            throw error;
        }
    };

    const startInterview = async (interviewData) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await interviewService.startInterview(interviewData);
            dispatch({ type: 'SET_CURRENT_INTERVIEW', payload: response.interview });
            toast.success('Interview started!');
            return response.interview;
        } catch (error) {
            console.error('Error starting interview:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to start interview' });
            toast.error('Failed to start interview');
            throw error;
        }
    };

    const submitAnswer = async (answerData) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await interviewService.submitAnswer(answerData);
            toast.success('Answer submitted!');
            return response;
        } catch (error) {
            console.error('Error submitting answer:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to submit answer' });
            toast.error('Failed to submit answer');
            throw error;
        }
    };

    const evaluateCode = async (codeData) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await interviewService.evaluateCode(codeData);
            toast.success('Code evaluated!');
            return response;
        } catch (error) {
            console.error('Error evaluating code:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to evaluate code' });
            toast.error('Failed to evaluate code');
            throw error;
        }
    };

    const endInterview = async (interviewId) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const response = await interviewService.endInterview(interviewId);
            dispatch({ type: 'UPDATE_INTERVIEW_STATUS', payload: 'completed' });
            toast.success('Interview ended!');
            return response;
        } catch (error) {
            console.error('Error ending interview:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to end interview' });
            toast.error('Failed to end interview');
            throw error;
        }
    };

    const clearCurrentInterview = () => {
        dispatch({ type: 'CLEAR_CURRENT_INTERVIEW' });
        dispatch({ type: 'RESET_QUESTIONS' });
    };

    // Add these functions for interview logic
    const setCurrentQuestion = (question) => {
        dispatch({ type: 'SET_CURRENT_QUESTION', payload: question });
    };

    const addQuestion = (question, type = 'question', shouldMoveToNextProblem = false) => {
        dispatch({ type: 'ADD_QUESTION', payload: { question, type, shouldMoveToNextProblem, timestamp: Date.now() } });
    };

    const setCurrentRound = (round) => {
        dispatch({ type: 'SET_CURRENT_ROUND', payload: round });
    };

    const resetQuestions = () => {
        dispatch({ type: 'RESET_QUESTIONS' });
    };

    const value = {
        ...state,
        loadInterviewHistory,
        createInterview,
        startInterview,
        submitAnswer,
        evaluateCode,
        endInterview,
        clearCurrentInterview,
        // Add these for interview logic
        setCurrentQuestion,
        addQuestion,
        setCurrentRound,
        resetQuestions
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
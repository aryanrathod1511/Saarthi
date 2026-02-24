import fs from "fs";
import speechToText from "../services/speechToText.js";
import { analyzeTone } from "../services/openSmile.js";
import parseResume from "../services/resumeParser.js";
import {PromptEngineer} from "../services/promptEngineer.js";
import { v4 as uuidv4 } from 'uuid';
import { createSession, getSession, deleteSession } from "../services/sessionManager.js";
import { generateInterviewAnalysis } from "../services/gemini.js";
import dsaProblemService from "../services/dsaProblemService.js";
import codeEvaluationService from "../services/codeEvaluationService.js";
import interviewFlowService from "../services/interviewFlowService.js";
import Interview from "../models/Interview.js";
import User from "../models/User.js";
import comprehensiveFeedbackService from '../services/comprehensiveFeedbackService.js';
// New DSA architecture
import { DSASessionState } from '../services/dsaSessionState.js';
import dsaInterviewService from '../services/dsaInterviewService.js';


export const uploadResume = async (req, res) => {
    try {
        if (!req.body.resume) {
            return res.status(400).json({
                message: "No resume data provided"
            });
        }
        
        // Decode base64 file content
        const { filename, content, type } = req.body.resume;
        const buffer = Buffer.from(content, 'base64');
        
        // Save file temporarily
        const timestamp = Date.now();
        const resumePath = `uploads/resumes/resume_${timestamp}_${filename}`;
        
        // Ensure directory exists
        const fs = await import('fs');
        const path = await import('path');
        
        const uploadDir = path.dirname(resumePath);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        fs.writeFileSync(resumePath, buffer);
        
        // Parse the resume - just get the text
        const resumeData = await parseResume(resumePath);
        console.log('Resume parsed successfully:', {
            name: resumeData.name,
            textLength: resumeData.rawText.length
        });
        
        // Get company info from request body
        const companyInfo = req.body.companyInfo || {
            name: 'Tech Company',
            type: 'startup',
            role: 'Software Development Engineer',
            level: 'Entry level'
        };
        
        // Get interview type from request
        const interviewType = req.body.interviewType || 'technical';
        const duration = req.body.duration || 30;
        
        const promptEngineer = new PromptEngineer(resumeData, companyInfo);
        promptEngineer.setInterviewType(interviewType);
        promptEngineer.setDuration(duration);

        const sessionId = uuidv4();
        createSession(sessionId, promptEngineer);
        console.log('Session created:', sessionId);
        
        res.status(200).json({
            message: "Resume parsed and session created successfully",
            candidateName: resumeData.name || 'Unknown',
            companyInfo: companyInfo,
            interviewType: interviewType,
            sessionId: sessionId 
        });

    } catch (error) {
        console.error("Error in uploadResume:", error);
        res.status(500).json({
            message: "Error processing resume",
            error: error.message
        });
    }
};

export const processAudio = async (req, res) => {
    try {
        // Validate request
        if (!req.file) {
            return res.status(400).json({
                message: "No audio file uploaded"
            });
        }

        const audioPath = req.file.path;
        const stats = fs.statSync(audioPath);
        if (stats.size === 0) {
            return res.status(400).json({
                message: "Audio file is empty"
            });
        }

        if (stats.size > 10 * 1024 * 1024) { // 10MB limit
            return res.status(400).json({
                message: "Audio file too large (max 10MB)"
            });
        }

        console.log('Processing audio file:', audioPath);

        // Process USER audio
        const [transcriptResult, toneResult] = await Promise.allSettled([
            speechToText(audioPath),
            analyzeTone(audioPath) 
        ]);

        // Handle transcript result
        let finalTranscript = "";
        if (transcriptResult.status === 'fulfilled') {
            finalTranscript = transcriptResult.value;
            console.log('Transcription successful:', finalTranscript);
        } else {
            console.error('Transcription failed:', transcriptResult.reason);
            finalTranscript = "Could not transcribe audio. Please try speaking again.";
        }

        // Handle tone analysis result
        let finalToneMatrix = {
            confidence: 7,
            stress: 3,
            engagement: 8,
            clarity: 8,
            pace: 7,
            volume: 8
        };
        if (toneResult.status === 'fulfilled') {
            finalToneMatrix = toneResult.value;
            console.log('Tone analysis successful:', finalToneMatrix);
        } else {
            console.error('Tone analysis failed:', toneResult.reason);
        }
        
        // Append to request body for downstream processing
        req.body.transcript = finalTranscript;
        req.body.toneMatrix = finalToneMatrix;

        // Clean up audio file after processing
        try {
            fs.unlinkSync(audioPath);
        } catch (cleanupError) {
            console.warn('Could not clean up audio file:', cleanupError.message);
        }

        res.status(200).json({
            message: "USER audio processed successfully",
            transcript: finalTranscript,
            toneMatrix: finalToneMatrix
        });

    } catch (error) {
        console.error("Error in processAudio:", error);
        res.status(500).json({
            message: "Error processing USER audio",
            error: error.message
        });
    }
};

export const nextQuestion = async (req, res) => {
    try {
        const { sessionId, transcript, toneMatrix, round } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        const session = getSession(sessionId);
        if (!session) {
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }

        // ── DSA: new FSM-based service ──────────────────────────────────────
        if (session.sessionType === 'dsa') {
            const result = await dsaInterviewService.generateNextQuestion(session, transcript || null);

            return res.status(200).json({
                question: result.question,
                feedback: result.feedback || null,
                currentStage: result.currentStage,
                stageIndex: result.stageIndex,
                currentProblem: result.currentProblem,
                currentProblemIndex: result.problemIndex,
                totalProblems: result.totalProblems,
                isWrapUp: result.isWrapUp,
                // Legacy fields kept for frontend compatibility
                shouldMoveToNextProblem: false,
                round: session.getCurrentProblem()?.conversationHistory?.length || 0,
            });
        }

        // ── Non-DSA: existing flow completely unchanged ─────────────────────
        const promptEngineer = session;

        const elapsedMinutes = Math.floor(
            (new Date().getTime() - promptEngineer.interviewContext.startTime) / (1000 * 60)
        );

        promptEngineer.updateContext({
            currentRound: round || promptEngineer.interviewContext.questionHistory.length + 1,
            transcript: transcript,
            toneMetrics: toneMatrix || {}
        });

        if (req.body.shouldMoveToNextProblem) {
            const currentIndex = promptEngineer.interviewContext.currentProblemIndex || 0;
            const dsaProblems = promptEngineer.interviewContext.dsaProblems;
            if (dsaProblems && currentIndex < dsaProblems.length - 1) {
                promptEngineer.interviewContext.currentProblemIndex = currentIndex + 1;
            }
        }

        const context = {
            transcript: transcript,
            toneMetrics: toneMatrix || {},
            elapsedMinutes: elapsedMinutes,
            problemChanged: req.body.shouldMoveToNextProblem || false
        };

        const nextQuestionResponse = await interviewFlowService.generateNextQuestion(promptEngineer, context);

        promptEngineer.updateContext({
            currentRound: (promptEngineer.interviewContext.questionHistory.length + 1),
            currentQuestion: nextQuestionResponse.question
        });

        res.status(200).json({
            question: nextQuestionResponse.question,
            shouldMoveToNextProblem: nextQuestionResponse.shouldMoveToNextProblem,
            isWrapUp: nextQuestionResponse.isWrapUp,
            round: promptEngineer.interviewContext.questionHistory.length
        });

    } catch (error) {
        console.error('Error in nextQuestion:', error);
        res.status(500).json({ error: 'Failed to generate next question' });
    }
};

export const startInterview = async (req, res) => {
    try {
        console.log('Starting interview...');
        
        //get session
        const sessionId = req.body.sessionId;
        
        const promptEngineer = getSession(sessionId);

        if (!promptEngineer) {
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }

        const startTime = new Date();
        const interviewType = promptEngineer.interviewContext.interviewType.toLowerCase();

        // ── DSA: replace session with new DSASessionState ──────────────────
        if (interviewType === 'dsa') {
            try {
                const problems = dsaProblemService.selectRandomProblems(4);
                const candidateInfo = {
                    name: promptEngineer.resumeData?.name || 'Candidate',
                    level: promptEngineer.interviewContext.experienceLevel || 'Entry',
                };
                const dsaState = new DSASessionState(problems, promptEngineer.companyInfo, candidateInfo);
                // Replace the PromptEngineer session with DSASessionState
                createSession(sessionId, dsaState);

                const welcomeResponse = dsaInterviewService.generateWelcome(dsaState);

                return res.status(200).json({
                    question: welcomeResponse.question,
                    questionCategory: 'Introduction',
                    round: 1,
                    message: 'Interview started successfully',
                    interviewType: 'dsa',
                    startTime,
                    maxDuration: 50,
                    wrapUpThreshold: 45,
                    currentStage: 'INTRO',
                    currentProblem: welcomeResponse.currentProblem,
                    currentProblemIndex: 0,
                    dsaProblems: problems,
                    totalProblems: problems.length,
                });
            } catch (error) {
                console.error('Error initializing DSA interview:', error);
                return res.status(500).json({ error: 'Failed to initialize DSA interview' });
            }
        }

        // ── Non-DSA: reset context and generate welcome ────────────────────
        promptEngineer.interviewContext = {
            ...promptEngineer.interviewContext,
            startTime,
            currentRound: 0,
            questionHistory: [],
            currentQuestion: '',
            currentPhase: 'introduction',
            elapsedMinutes: 0,
        };

        const welcomeResponse = await interviewFlowService.generateWelcomeMessage(promptEngineer);

        promptEngineer.updateContext({
            currentRound: 1,
            currentQuestion: welcomeResponse.question,
            transcript: '',
            toneMetrics: {}
        });

        const config = interviewFlowService.getInterviewConfig(promptEngineer.interviewContext.interviewType);

        const response = {
            question: welcomeResponse.question,
            questionCategory: 'Introduction',
            round: 1,
            message: 'Interview started successfully',
            interviewType: promptEngineer.interviewContext.interviewType,
            startTime: startTime,
            maxDuration: config.maxDuration,
            wrapUpThreshold: config.wrapUpThreshold
        };

        res.status(200).json(response);

    } catch (err) {
        console.error('Error in startInterview:', err);
        res.status(500).json({ error: 'Failed to start interview' });
    }
};

export const getFinalFeedback = async (req, res) => {
    try {
        const sessionId = req.body.sessionId || req.params.sessionId;
        const session = getSession(sessionId);

        if (!session) {
            return res.status(400).json({ error: 'Interview session not found' });
        }

        // ── DSA: collect evaluations from DSASessionState ──────────────────
        if (session.sessionType === 'dsa') {
            const summary = session.getSummary();

            // Collect all code evaluations across problems
            const evaluations = summary.problems
                .filter(p => p.codeSubmission?.evaluation)
                .map(p => ({
                    problemTitle: p.title,
                    evaluation: p.codeSubmission.evaluation,
                }));

            let feedback;
            let interviewSummary = {
                totalProblems: summary.problems.length,
                problemsCompleted: summary.problems.filter(p => p.status === 'completed').length,
                duration: summary.duration,
            };

            if (evaluations.length > 0) {
                const interviewData = {
                    companyInfo: summary.companyInfo,
                    resumeData: null,
                    interviewContext: { interviewType: 'dsa' },
                };
                const evaluationData = evaluations.map(e => e.evaluation);
                feedback = await comprehensiveFeedbackService.generateComprehensiveFeedback(
                    interviewData,
                    evaluationData
                );
                const scores = evaluationData.map(e => e.score);
                interviewSummary = {
                    ...interviewSummary,
                    averageScore: scores.reduce((s, v) => s + v, 0) / scores.length,
                    highestScore: Math.max(...scores),
                    lowestScore: Math.min(...scores),
                };
            }

            deleteSession(sessionId);

            return res.status(200).json({
                companyInfo: summary.companyInfo,
                interviewSummary,
                comprehensiveFeedback: feedback || null,
                problemEvaluations: evaluations,
            });
        }

        // ── Non-DSA: existing flow unchanged ───────────────────────────────
        const promptEngineer = session;
        const interviewContext = promptEngineer.interviewContext;
        const evaluations = interviewContext.evaluations || [];

        let feedback;
        let responseData = {
            totalRounds: interviewContext.questionHistory?.length || 0,
            companyInfo: promptEngineer.companyInfo,
            aiQuestionsCount: interviewContext.questionHistory?.length || 0,
            userResponsesCount: interviewContext.candidateResponses?.length || 0,
            toneAnalysisCount: interviewContext.toneAnalysis?.length || 0
        };

        if (evaluations.length > 0) {
            const interviewData = {
                companyInfo: promptEngineer.companyInfo,
                resumeData: promptEngineer.resumeData,
                interviewContext: interviewContext
            };
            const evaluationData = evaluations.map(evaluation => evaluation.evaluation);
            feedback = await comprehensiveFeedbackService.generateComprehensiveFeedback(
                interviewData,
                evaluationData
            );
            responseData = {
                ...responseData,
                comprehensiveFeedback: feedback,
                problemEvaluations: evaluations,
                interviewSummary: {
                    totalProblems: evaluations.length,
                    averageScore: evaluationData.reduce((sum, e) => sum + e.score, 0) / evaluationData.length,
                    highestScore: Math.max(...evaluationData.map(e => e.score)),
                    lowestScore: Math.min(...evaluationData.map(e => e.score))
                }
            };
        } else {
            const interviewData = {
                aiQuestions: interviewContext.questionHistory || [],
                userResponses: interviewContext.candidateResponses || [],
                toneAnalysis: interviewContext.toneAnalysis || [],
                interviewType: interviewContext.interviewType,
                candidateName: promptEngineer.resumeData?.name || 'Not specified',
                totalRounds: interviewContext.questionHistory?.length || 0
            };
            feedback = await generateInterviewAnalysis(interviewData, promptEngineer.companyInfo);
            responseData.summary = feedback;
        }

        deleteSession(sessionId);
        try {
            const resumePath = promptEngineer.resumeData?.filePath;
            if (resumePath && fs.existsSync(resumePath)) {
                fs.unlinkSync(resumePath);
            }
        } catch (cleanupError) {
            console.warn('Could not clean up resume file:', cleanupError.message);
        }

        res.status(200).json(responseData);
    } catch (err) {
        console.error('Error in getFinalFeedback:', err);
        res.status(500).json({ error: 'Failed to get final feedback' });
    }
};


export const getDSAProblems = async (req, res) => {
    try {
        const session = getSession(req.query.sessionId);
        if (!session) {
            return res.status(400).json({ error: 'Session not found' });
        }
        if (session.sessionType !== 'dsa') {
            return res.status(400).json({ error: 'Not a DSA interview session' });
        }

        const problems = session.problems.map(p => p.problemData);
        res.status(200).json({
            problems,
            currentProblemIndex: session.currentProblemIndex,
            totalProblems: problems.length,
        });
    } catch (error) {
        console.error('Error in getDSAProblems:', error);
        res.status(500).json({ error: 'Failed to get DSA problems' });
    }
};

export const getCurrentProblem = async (req, res) => {
    try {
        const session = getSession(req.query.sessionId);
        if (!session) {
            return res.status(400).json({ error: 'Session not found' });
        }
        if (session.sessionType !== 'dsa') {
            return res.status(400).json({ error: 'Not a DSA interview session' });
        }

        const problem = session.getCurrentProblem();
        if (!problem) {
            return res.status(404).json({ error: 'No active problem' });
        }

        res.status(200).json({
            problem: problem.problemData,
            currentIndex: session.currentProblemIndex,
            currentStage: problem.currentStage,
            totalProblems: session.problems.length,
            isLastProblem: session.currentProblemIndex === session.problems.length - 1,
        });
    } catch (error) {
        console.error('Error in getCurrentProblem:', error);
        res.status(500).json({ error: 'Failed to get current problem' });
    }
};

export const submitCode = async (req, res) => {
    try {
        const { sessionId, code, language = 'java' } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        const session = getSession(sessionId);
        if (!session) {
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }

        // ── DSA: new service ────────────────────────────────────────────────
        if (session.sessionType === 'dsa') {
            const currentProblem = session.getCurrentProblem();
            if (!currentProblem) {
                return res.status(400).json({ error: 'No active problem found' });
            }

            const evaluation = await codeEvaluationService.evaluateCode(
                code,
                currentProblem.problemData,
                language
            );

            const result = await dsaInterviewService.handleCodeSubmission(
                session,
                code,
                language,
                evaluation
            );

            return res.status(200).json({
                evaluation: {
                    score: evaluation.score,
                    overallFeedback: evaluation.overallFeedback,
                    strengths: evaluation.strengths,
                    weaknesses: evaluation.weaknesses,
                },
                nextQuestion: result.question,
                currentProblem: result.currentProblem,
                currentIndex: result.problemIndex,
                totalProblems: result.totalProblems,
                currentStage: result.currentStage,
                isWrapUp: result.isWrapUp || false,
                isCodeEvaluationDiscussion: true,
                // Legacy field — always false in new architecture (server controls this)
                shouldMoveToNextProblem: false,
            });
        }

        // ── Non-DSA: existing flow unchanged ───────────────────────────────
        const promptEngineer = session;

        const dsaProblems = promptEngineer.interviewContext.dsaProblems;
        const currentIndex = promptEngineer.interviewContext.currentProblemIndex || 0;
        const currentProblem = dsaProblems && currentIndex < dsaProblems.length
            ? dsaProblems[currentIndex]
            : null;

        if (!currentProblem) {
            return res.status(400).json({ error: 'No current problem found' });
        }

        const evaluation = await codeEvaluationService.evaluateCode(code, currentProblem, language);

        if (!promptEngineer.interviewContext.evaluations) {
            promptEngineer.interviewContext.evaluations = [];
        }
        promptEngineer.interviewContext.evaluations.push({
            problemTitle: currentProblem.title,
            problemIndex: currentIndex,
            evaluation: evaluation,
            timestamp: new Date()
        });

        const context = {
            transcript: `Code submitted for problem: ${currentProblem.title}`,
            toneMetrics: {},
            elapsedMinutes: Math.floor((new Date() - promptEngineer.interviewContext.startTime) / (1000 * 60)),
            currentProblem: currentProblem,
            lastEvaluation: evaluation,
            isCodeEvaluationDiscussion: true
        };

        const discussionResponse = await interviewFlowService.generateCodeEvaluationDiscussion(promptEngineer, context);

        const evaluationQuestionCount = interviewFlowService.getEvaluationQuestionCount(promptEngineer, currentProblem);
        const maxQuestions = interviewFlowService.getMaxQuestionsForScore(evaluation.score);
        if (evaluationQuestionCount >= maxQuestions && !discussionResponse.shouldMoveToNextProblem) {
            discussionResponse.shouldMoveToNextProblem = true;
        }

        promptEngineer.updateContext({
            currentRound: (promptEngineer.interviewContext.questionHistory.length + 1),
            currentQuestion: discussionResponse.question,
            transcript: `Code submitted for problem: ${currentProblem.title}`,
            toneMetrics: {}
        });

        res.status(200).json({
            evaluation: {
                score: evaluation.score,
                overallFeedback: evaluation.overallFeedback,
                strengths: evaluation.strengths,
                weaknesses: evaluation.weaknesses
            },
            nextQuestion: discussionResponse.question,
            currentProblem: currentProblem,
            currentIndex: currentIndex,
            totalProblems: dsaProblems.length,
            isLastProblem: currentIndex === dsaProblems.length - 1,
            round: promptEngineer.interviewContext.questionHistory.length,
            shouldMoveToNextProblem: discussionResponse.shouldMoveToNextProblem,
            isWrapUp: discussionResponse.isWrapUp,
            currentStage: discussionResponse.currentStage,
            isCodeEvaluationDiscussion: true
        });

    } catch (error) {
        console.error('Error submitting code:', error);
        res.status(500).json({ error: 'Failed to submit code', details: error.message });
    }
};

export const terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    deleteSession(sessionId);


    res.status(200).json({ 
      message: 'Session terminated successfully',
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({ 
      error: 'Failed to terminate session',
      message: error.message 
    });
  }
};



// Get user's interview history
export const getInterviewHistory = async (req, res) => {
    try {
        const interviews = await Interview.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20);
        
        res.json({ interviews });
    } catch (error) {
        console.error('Error fetching interview history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get specific interview
export const getInterview = async (req, res) => {
    try {
        const interview = await Interview.findOne({
            _id: req.params.interviewId,
            userId: req.user.id
        });
        
        if (!interview) {
            return res.status(404).json({ error: 'Interview not found' });
        }
        
        res.json({ interview });
    } catch (error) {
        console.error('Error fetching interview:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create new interview
export const createInterview = async (req, res) => {
    try {
        const { type, companyInfo } = req.body;
        
        const interview = new Interview({
            userId: req.user.id,
            type,
            companyInfo,
            status: 'pending'
        });
        
        await interview.save();
        
        // Add to user's interview history
        await User.findByIdAndUpdate(req.user.id, {
            $push: { interviewHistory: interview._id }
        });
        
        res.status(201).json({ interview });
    } catch (error) {
        console.error('Error creating interview:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update interview status
export const updateInterviewStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        const interview = await Interview.findOneAndUpdate(
            { _id: req.params.interviewId, userId: req.user.id },
            { status },
            { new: true }
        );
        
        if (!interview) {
            return res.status(404).json({ error: 'Interview not found' });
        }
        
        res.json({ interview });
    } catch (error) {
        console.error('Error updating interview status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Add question and answer to interview
export const addQuestion = async (req, res) => {
    try {
        const { question, answer, code, evaluation } = req.body;
        
        const interview = await Interview.findOneAndUpdate(
            { _id: req.params.interviewId, userId: req.user.id },
            {
                $push: {
                    questions: {
                        question,
                        answer,
                        code,
                        evaluation
                    }
                }
            },
            { new: true }
        );
        
        if (!interview) {
            return res.status(404).json({ error: 'Interview not found' });
        }
        
        res.json({ interview });
    } catch (error) {
        console.error('Error adding question:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

import fs from "fs";
import speechToText from "../services/speechToText.js";
import { analyzeTone } from "../services/openSmile.js";
import parseResume from "../services/resumeParser.js";
import {PromptEngineer} from "../services/promptEngineer.js";
import { v4 as uuidv4 } from 'uuid';
import {createSession, getSession, deleteSession, hasSession} from "../services/sessionManager.js";
import { generateInterviewAnalysis } from "../services/gemini.js";
import dsaProblemService from "../services/dsaProblemService.js";
import codeEvaluationService from "../services/codeEvaluationService.js";
import interviewFlowService from "../services/interviewFlowService.js";
import Interview from "../models/Interview.js";
import User from "../models/User.js";


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
        
        // Initialize prompt engineer with resume data and company info
        const promptEngineer = new PromptEngineer(resumeData, companyInfo);     
        promptEngineer.setInterviewType(interviewType);
        promptEngineer.setDuration(duration);
        
        // Create a session
        const sessionId = uuidv4();
        createSession(sessionId, promptEngineer);
        if(hasSession(sessionId)){
            console.log('Session Created successfully');
        }
        
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
        const { sessionId, transcript, toneMatrix, round, code } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({
                error: 'Session ID is required'
            });
        }

        const promptEngineer = getSession(sessionId);
        if (!promptEngineer) {
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }

        // Update context with candidate's response
        const elapsedMinutes = Math.floor((new Date().getTime() - promptEngineer.interviewContext.startTime) / (1000 * 60));
        
        promptEngineer.updateContext({
            currentRound: round || promptEngineer.interviewContext.questionHistory.length + 1,
            transcript: transcript,
            toneMetrics: toneMatrix || {}
        });

        // Get current problem for DSA interviews
        let currentProblem = null;
        if (promptEngineer.interviewContext.interviewType.toLowerCase() === 'dsa') {
            const dsaProblems = promptEngineer.interviewContext.dsaProblems;
            const currentIndex = promptEngineer.interviewContext.currentProblemIndex || 0;
            if (dsaProblems && currentIndex < dsaProblems.length) {
                currentProblem = dsaProblems[currentIndex];
            }
        }

        // Generate next question using flow service
        const context = {
            transcript: transcript,
            toneMetrics: toneMatrix || {},
            elapsedMinutes: elapsedMinutes,
            currentProblem: currentProblem,
            dsaProblemContext: currentProblem ? `DSA Problem: ${currentProblem.title} - ${currentProblem.description}` : null
        };

        const nextQuestionResponse = await interviewFlowService.generateNextQuestion(promptEngineer, context);

      
        promptEngineer.updateContext({
            currentRound: (promptEngineer.interviewContext.questionHistory.length + 1),
            currentQuestion: nextQuestionResponse.question
        });

        // Handle shouldMoveToNextProblem flag
        if (nextQuestionResponse.shouldMoveToNextProblem) {
            const currentIndex = promptEngineer.interviewContext.currentProblemIndex || 0;
            const dsaProblems = promptEngineer.interviewContext.dsaProblems;
            
            if (dsaProblems && currentIndex < dsaProblems.length - 1) {
                promptEngineer.interviewContext.currentProblemIndex = currentIndex + 1;
            }
        }

        // Prepare response object
        const response = {
            question: nextQuestionResponse.question,
            shouldMoveToNextProblem: nextQuestionResponse.shouldMoveToNextProblem,
            isWrapUp: nextQuestionResponse.isWrapUp,
            round: promptEngineer.interviewContext.questionHistory.length
        };

        // For DSA interviews, always include current problem info
        if (promptEngineer.interviewContext.interviewType.toLowerCase() === 'dsa') {
            const dsaProblems = promptEngineer.interviewContext.dsaProblems;
            const currentIndex = promptEngineer.interviewContext.currentProblemIndex || 0;
            
            if (dsaProblems && currentIndex < dsaProblems.length) {
                response.currentProblem = dsaProblems[currentIndex];
                response.currentProblemIndex = currentIndex;
                response.totalProblems = dsaProblems.length;
            }
        }

        res.status(200).json(response);

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

        if(!promptEngineer){
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }else{
            console.log("Interview initialized");
        }



        // Initialize interview context with time tracking
        const startTime = new Date();
        promptEngineer.interviewContext = {
            ...promptEngineer.interviewContext,
            startTime: startTime,
            currentRound: 0,
            questionHistory: [],
            currentQuestion: '',
            currentPhase: 'introduction',
            elapsedMinutes: 0
        };

        // For DSA interviews, load problems
        if (promptEngineer.interviewContext.interviewType.toLowerCase() === 'dsa') {
            try {
                const problems = dsaProblemService.selectRandomProblems(4);
                promptEngineer.interviewContext.dsaProblems = problems;
                promptEngineer.interviewContext.currentProblemIndex = 0;
                console.log(`Loaded ${problems.length} DSA problems for interview`);
            } catch (error) {
                console.error('Error loading DSA problems:', error);
                return res.status(500).json({
                    error: 'Failed to load DSA problems'
                });
            }
        }

        // Generate welcome message using the new flow service
        const welcomeResponse = await interviewFlowService.generateWelcomeMessage(promptEngineer);

        // Update context
        promptEngineer.updateContext({
            currentRound: 1,
            currentQuestion: welcomeResponse.question,
            transcript: '',
            toneMetrics: {}
        });

        const config = interviewFlowService.getInterviewConfig(promptEngineer.interviewContext.interviewType);

        // Prepare response object
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

        // For DSA interviews, include all problems in the response
        if (promptEngineer.interviewContext.interviewType.toLowerCase() === 'dsa') {
            response.dsaProblems = promptEngineer.interviewContext.dsaProblems;
            response.totalProblems = promptEngineer.interviewContext.dsaProblems.length;
        }

        res.status(200).json(response);

    } catch (err) {
        console.error('Error in startInterview:', err);
        res.status(500).json({ error: 'Failed to start interview' });
    }
};

export const getFinalFeedback = async (req, res) => {
    try {
        // Get session
        const sessionId = req.body.sessionId;
        const promptEngineer = getSession(sessionId);

        if(!promptEngineer){
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }

        // Get data from prompt engineer context
        const interviewContext = promptEngineer.interviewContext;
        
        if (!interviewContext || !interviewContext.questionHistory || interviewContext.questionHistory.length === 0) {
            return res.status(400).json({
                error: 'No interview data available for analysis'
            });
        }

        // Extract data from interview context
        const aiQuestions = interviewContext.questionHistory;
        const userResponses = interviewContext.candidateResponses || [];
        const toneAnalysis = interviewContext.toneAnalysis || [];
        const currentCompanyInfo = promptEngineer.companyInfo;

       
        const interviewData = {
            aiQuestions,
            userResponses,
            toneAnalysis,
            interviewType: promptEngineer.interviewContext.interviewType,
            candidateName: promptEngineer.resumeData?.name || 'Not specified',
            totalRounds: aiQuestions.length
        };
        
        const summary = await generateInterviewAnalysis(interviewData, currentCompanyInfo);
        deleteSession(sessionId);

        try {
            const resumePath = promptEngineer.resumeData?.filePath;
            if (resumePath && fs.existsSync(resumePath)) {
                fs.unlinkSync(resumePath);
            }
        } catch (cleanupError) {
            console.warn('Could not clean up resume file:', cleanupError.message);
        }

        res.status(200).json({ 
            summary: summary,
            totalRounds: aiQuestions.length,
            companyInfo: currentCompanyInfo,
            aiQuestionsCount: aiQuestions.length,
            userResponsesCount: userResponses.length,
            toneAnalysisCount: toneAnalysis.length
        });
    } catch (err) {
        console.error('Error in getFinalFeedback:', err);
        res.status(500).json({ error: 'Failed to get final feedback' });
    }
};


export const getDSAProblems = async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        const promptEngineer = getSession(sessionId);

        if (!promptEngineer) {
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }

        let dsaProblems = promptEngineer.interviewContext.dsaProblems;

        res.status(200).json({
            problems: dsaProblems,
            currentProblemIndex: promptEngineer.interviewContext.currentProblemIndex || 0,
            totalProblems: dsaProblems.length
        });

    } catch (error) {
        console.error('Error in getDSAProblems:', error);
        res.status(500).json({ error: 'Failed to get DSA problems' });
    }
};

export const getCurrentProblem = async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        const promptEngineer = getSession(sessionId);

        if (!promptEngineer) {
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }

        const dsaProblems = promptEngineer.interviewContext.dsaProblems;
        const currentIndex = promptEngineer.interviewContext.currentProblemIndex || 0;

        if (!dsaProblems || currentIndex >= dsaProblems.length) {
            return res.status(404).json({
                error: 'No more problems available'
            });
        }

        const currentProblem = dsaProblems[currentIndex];

        res.status(200).json({
            problem: currentProblem,
            currentIndex: currentIndex,
            totalProblems: dsaProblems.length,
            isLastProblem: currentIndex === dsaProblems.length - 1
        });

    } catch (error) {
        console.error('Error in getCurrentProblem:', error);
        res.status(500).json({ error: 'Failed to get current problem' });
    }
};

export const submitCode = async (req, res) => {
    try {
        const { sessionId, code, language = 'java' } = req.body;

        if (!sessionId || !code) {
            return res.status(400).json({
                error: 'Session ID and code are required'
            });
        }

        const promptEngineer = getSession(sessionId);

        if (!promptEngineer) {
            return res.status(400).json({
                error: 'Interview not initialized. Please upload resume first.'
            });
        }

        const dsaProblems = promptEngineer.interviewContext.dsaProblems;
        const currentIndex = promptEngineer.interviewContext.currentProblemIndex || 0;

        if (!dsaProblems || currentIndex >= dsaProblems.length) {
            return res.status(404).json({
                error: 'No current problem available'
            });
        }

        const currentProblem = dsaProblems[currentIndex];

        // Evaluate the code
        const evaluation = await codeEvaluationService.evaluateCode(code, currentProblem, language);

        // Store evaluation in session
        if (!promptEngineer.interviewContext.codeEvaluations) {
            promptEngineer.interviewContext.codeEvaluations = [];
        }
        
        promptEngineer.interviewContext.codeEvaluations.push({
            problemId: currentProblem.id,
            problemTitle: currentProblem.title,
            code: code,
            language: language,
            evaluation: evaluation,
            timestamp: new Date().toISOString()
        });

        // Get the DSA problem context
        const dsaProblemContext = `DSA Problem: ${currentProblem.title} - ${currentProblem.description}`;
        
        // Generate next question using flow service
        const context = {
            transcript: `Code submitted for problem: ${currentProblem.title}`,
            toneMetrics: {},
            elapsedMinutes: Math.floor((new Date() - promptEngineer.interviewContext.startTime) / (1000 * 60)),
            currentProblem: currentProblem,
            dsaProblemContext: dsaProblemContext
        };

        const nextQuestionResponse = await interviewFlowService.generateNextQuestion(promptEngineer, context);

        // Update context with the new question
        promptEngineer.updateContext({
            currentRound: (promptEngineer.interviewContext.questionHistory.length + 1),
            currentQuestion: nextQuestionResponse.question,
            transcript: `Code submitted for problem: ${currentProblem.title}`,
            toneMetrics: {}
        });

        // Handle shouldMoveToNextProblem flag
        if (nextQuestionResponse.shouldMoveToNextProblem) {
            const currentIndex = promptEngineer.interviewContext.currentProblemIndex || 0;
            const dsaProblems = promptEngineer.interviewContext.dsaProblems;
            
            if (dsaProblems && currentIndex < dsaProblems.length - 1) {
                promptEngineer.interviewContext.currentProblemIndex = currentIndex + 1;
            }
        }

        res.status(200).json({
            evaluation: evaluation,
            nextQuestion: nextQuestionResponse.question,
            currentProblem: currentProblem,
            currentIndex: currentIndex,
            totalProblems: dsaProblems.length,
            isLastProblem: currentIndex === dsaProblems.length - 1,
            round: promptEngineer.interviewContext.questionHistory.length,
            shouldMoveToNextProblem: nextQuestionResponse.shouldMoveToNextProblem,
            isWrapUp: nextQuestionResponse.isWrapUp
        });

    } catch (error) {
        console.error('Error in submitCode:', error);
        res.status(500).json({ error: 'Failed to evaluate code' });
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

// Add these new methods for the routes:

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

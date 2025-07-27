import express from "express";
import multer from "multer";
import { authenticateToken } from "../config/auth.js";
import { multerConfig, audioUpload } from "../config/multerConfig.js";
import * as interviewController from "../controllers/interviewController.js";

const router = express.Router();
const upload = multer(multerConfig);

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Specific routes FIRST (before parameterized routes)
router.get('/history', interviewController.getInterviewHistory);
router.get("/dsa-problems", interviewController.getDSAProblems);
router.get("/current-problem", interviewController.getCurrentProblem);

// Interview process routes
router.post("/upload-resume", interviewController.uploadResume);
router.post("/start-interview", interviewController.startInterview);
router.post("/next-question", interviewController.nextQuestion);
router.post("/submit-code", interviewController.submitCode);
router.post("/get-final-feedback", interviewController.getFinalFeedback);
router.post("/terminate-session", interviewController.terminateSession);

// Audio processing route - Use audioUpload instead of upload
router.post("/process-audio", audioUpload.single("audio"), interviewController.processAudio);

// Parameterized routes LAST
router.get('/:interviewId', interviewController.getInterview);
router.post('/create', interviewController.createInterview);
router.put('/:interviewId/status', interviewController.updateInterviewStatus);
router.post('/:interviewId/questions', interviewController.addQuestion);

export { router };

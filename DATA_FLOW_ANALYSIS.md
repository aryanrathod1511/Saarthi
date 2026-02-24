# PrepForge Interview Data Flow: End-to-End Analysis

## Overview
This document explains the complete data flow in the PrepForge interview system from **Resume Upload** → **Interview Execution** → **Comprehensive Feedback Generation**. The flow includes both **Frontend (React)** and **Backend (Node.js)** components.

---

## 1. RESUME UPLOAD & SESSION INITIALIZATION

### 1.1 Frontend: Resume Upload Component
**File:** [frontend/src/pages/InterviewFormPage.jsx](frontend/src/pages/InterviewFormPage.jsx)

#### Step 1: User Selects Resume & Company Information
- User selects a **PDF resume file** via `ResumeUpload` component
- User fills in **Company Information**:
  - Company Name
  - Company Type (startup, MNC, etc.)
  - Role (Software Developer, etc.)
  - Level (Entry, Mid, Senior)
- User selects **Interview Type**: `dsa` or `technical_behavioral` or `behavioral`

#### Step 2: Frontend Prepares Request Data
```javascript
// Frontend converts file to Base64
const reader = new FileReader();
reader.readAsDataURL(selectedFile);
// Converts to: data:application/pdf;base64,JVBERi0xLjQK...

// Removes the data:application/pdf;base64, prefix
const base64Content = reader.result.split(',')[1];

// Prepares request body
const requestData = {
  resume: {
    filename: 'resume.pdf',
    content: 'base64_encoded_content',
    type: 'application/pdf'
  },
  companyInfo: {
    name: 'Google',
    type: 'MNC',
    role: 'Software Engineer',
    level: 'Entry level'
  },
  interviewType: 'dsa',
  duration: 30 // optional, defaults to 30 minutes
};
```

#### Step 3: Frontend Sends Request via Service
**File:** [frontend/src/services/interviewService.js](frontend/src/services/interviewService.js#L33)

```javascript
async uploadResume(requestData) {
  const token = localStorage.getItem('token'); // JWT Auth token
  
  const response = await fetch('/api/interview/upload-resume', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  
  return response.json(); // Returns: { sessionId, candidateName, companyInfo }
}
```

---

### 1.2 Backend: Resume Processing & Session Creation

**File:** [server/controllers/interviewController.js](server/controllers/interviewController.js#L17) - `uploadResume` endpoint

#### Step 4: Backend Receives Resume Data
```javascript
POST /api/interview/upload-resume
Body: {
  resume: { filename, content (base64), type },
  companyInfo: { name, type, role, level },
  interviewType: 'dsa',
  duration: 30
}
```

#### Step 5: Decode & Save Resume Temporarily
```javascript
// Decode Base64 content to Buffer
const buffer = Buffer.from(content, 'base64');

// Save temporarily to: uploads/resumes/resume_${timestamp}_${filename}
const resumePath = `uploads/resumes/resume_1708956123456_resume.pdf`;
fs.writeFileSync(resumePath, buffer);
```

#### Step 6: Parse Resume using PDF Parser
**File:** [server/services/resumeParser.js](server/services/resumeParser.js)

```javascript
// Uses pdftotext command-line tool
const resumeData = await parseResume(resumePath);

// Returns:
resumeData = {
  rawText: "John Doe\nSoftware Engineer...",
  name: "John Doe" // Extracted from first few lines
}
```

#### Step 7: Initialize PromptEngineer with Resume Data

**File:** [server/services/promptEngineer.js](server/services/promptEngineer.js)

```javascript
const promptEngineer = new PromptEngineer(
  resumeData,     // { rawText, name }
  companyInfo,    // { name, type, role, level }
  duration,       // 30 minutes
  experienceLevel // Auto-detected from resume
);

// Sets interview context
promptEngineer.setInterviewType('dsa');
promptEngineer.setDuration(30);

// Resume Experience Level auto-detection:
// - Parses resume for years of experience
// - Checks for senior/lead/principal titles
// - Returns: 'Entry', 'Mid', or 'Senior'
```

#### Step 8: Create Session & Store in Memory
**File:** [server/services/sessionManager.js](server/services/sessionManager.js)

```javascript
const sessionId = uuidv4(); // Generate unique UUID

// Store in in-memory session store
createSession(sessionId, promptEngineer);

// sessionStore: {
//   'uuid-xxx': promptEngineer_instance,
//   'uuid-yyy': promptEngineer_instance
// }
```

#### Step 9: Backend Response to Frontend
```javascript
res.status(200).json({
  message: "Resume parsed and session created successfully",
  candidateName: "John Doe",
  companyInfo: { name: "Google", type: "MNC", ... },
  interviewType: "dsa",
  sessionId: "a1b2c3d4-e5f6-4g7h-8i9j"
});
```

#### Step 10: Frontend Navigation
```javascript
// Frontend receives sessionId
const uploadResponse = await interviewService.uploadResume(requestData);

// Navigate to interview session page with session context
navigate('/interview/session', {
  replace: true,
  state: {
    sessionId: uploadResponse.sessionId,
    interviewType: 'dsa',
    companyInfo: uploadResponse.companyInfo
  }
});
```

---

## 2. INTERVIEW START & INITIALIZATION

### 2.1 Frontend: Interview Session Page Initialization
**File:** [frontend/src/pages/InterviewSessionPage.jsx](frontend/src/pages/InterviewSessionPage.jsx)

#### Step 11: Session State Retrieved from Navigation
```javascript
const sessionData = location.state;
// { sessionId: 'a1b2c3d4...', interviewType: 'dsa', companyInfo: {...} }
```

#### Step 12: Session Lifecycle Management
```javascript
useEffect(() => {
  if (!sessionData?.sessionId) {
    navigate('/interview', { replace: true }); // Redirect if no session
    return;
  }
  
  // Start interview
  startSession();
  handleStartInterview();
}, [sessionId, interviewStarted]);

// For DSA interviews, load problems after session starts
useEffect(() => {
  if (interviewStarted && interviewType === 'dsa') {
    loadDSAProblems();
  }
}, [interviewStarted, interviewType]);
```

---

### 2.2 Backend: Interview Startup

**File:** [server/controllers/interviewController.js](server/controllers/interviewController.js#L260) - `startInterview` endpoint

#### Step 13: Start Interview API Call
```javascript
POST /api/interview/start-interview
Body: { sessionId: 'a1b2c3d4...' }
```

#### Step 14: Initialize Interview Context
```javascript
// Retrieve promptEngineer from session
const promptEngineer = getSession(sessionId);

// Initialize interview context with timestamp
promptEngineer.interviewContext = {
  ...promptEngineer.interviewContext,
  startTime: new Date(),
  currentRound: 0,
  questionHistory: [],
  currentQuestion: '',
  currentPhase: 'introduction',
  elapsedMinutes: 0
};
```

#### Step 15: Load DSA Problems (if DSA interview)
**File:** [server/services/dsaProblemService.js](server/services/dsaProblemService.js)

```javascript
if (interviewType === 'dsa') {
  // Randomly select 4 DSA problems from data/filtered_output.json
  const problems = dsaProblemService.selectRandomProblems(4);
  
  promptEngineer.interviewContext.dsaProblems = problems;
  promptEngineer.interviewContext.currentProblemIndex = 0;
  
  // Each problem structure:
  // {
  //   title: "Two Sum",
  //   description: "Given an array of integers...",
  //   difficulty: "Easy",
  //   examples: "Input: nums = [2,7,11,15]..."
  // }
}
```

#### Step 16: Generate Welcome Message
**File:** [server/services/interviewFlowService.js](server/services/interviewFlowService.js#L49)

```javascript
// Call Gemini AI to generate personalized welcome
const welcomeMessage = await interviewFlowService.generateWelcomeMessage(promptEngineer);

// Prompt sent to Gemini AI:
`You are starting a DSA interview at Google for Software Engineer position.
Welcome the candidate: "Hi John Doe, I'm [Indian name] from Google. Thanks for joining us today."
Ask for brief introduction.
Mention you'll work through 4 coding problems together.`

// Gemini Response:
// "Hi John Doe, I'm Raj from Google. Thanks for joining us today. 
//  Could you tell me a bit about yourself and your background?..."
```

#### Step 17: Update Interview Context & Response
```javascript
promptEngineer.updateContext({
  currentRound: 1,
  currentQuestion: welcomeMessage.question
});

res.status(200).json({
  question: "Hi John Doe, I'm Raj from Google...",
  questionCategory: 'Introduction',
  round: 1,
  interviewType: 'dsa',
  startTime: new Date(),
  maxDuration: 50, // DSA interview is 50 minutes
  wrapUpThreshold: 45,
  dsaProblems: [ { title: "Two Sum", ... }, ... ], // 4 problems
  totalProblems: 4
});
```

---

## 3. INTERVIEW EXECUTION - QUESTION & ANSWER CYCLE

### 3.1 Frontend: Audio Recording & Submission
**File:** [frontend/src/hooks/useInterviewLogic.js](frontend/src/hooks/useInterviewLogic.js#L140)

#### Step 18: User Speaks Answer
- Question displays with **typewriter animation**
- **Text-to-Speech (TTS)** plays the question
- User clicks **Record button**
- User speaks their answer
- User clicks **Stop Recording**

#### Step 19: Frontend Records Audio
**File:** [frontend/src/hooks/useAudioRecording.js](frontend/src/hooks/useAudioRecording.js)

```javascript
// Browser's MediaRecorder API captures audio
const mediaRecorder = new MediaRecorder(stream);
const audioChunks = [];

mediaRecorder.ondataavailable = (event) => {
  audioChunks.push(event.data);
};

mediaRecorder.onstop = () => {
  const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
  // Call: processAudio(audioBlob)
};
```

#### Step 20: Frontend Uploads Audio to Backend
```javascript
const processAudio = async (audioBlob) => {
  // Create FormData for file upload
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.wav');
  
  // Send to backend
  const response = await fetch('/api/interview/process-audio', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
};
```

---

### 3.2 Backend: Audio Processing

**File:** [server/controllers/interviewController.js](server/controllers/interviewController.js#L95) - `processAudio` endpoint

#### Step 21: Receive Audio File
```javascript
POST /api/interview/process-audio
FormData: { audio: audio.wav file }
```

#### Step 22: Validate Audio File
```javascript
// Check if file exists
const audioPath = req.file.path; // uploads/tmp/audio_xxx.wav

// Validate file size
const stats = fs.statSync(audioPath);
if (stats.size === 0) throw Error("Audio file is empty");
if (stats.size > 10 * 1024 * 1024) throw Error("Audio file too large");
```

#### Step 23: Speech-to-Text Processing
**File:** [server/services/speechToText.js](server/services/speechToText.js)

Uses **Assembly AI API** for transcription:

```javascript
const [transcriptResult, toneResult] = await Promise.allSettled([
  speechToText(audioPath),      // Transcription
  analyzeTone(audioPath)         // Tone analysis
]);

// Speech-to-Text Process:
// 1. Validate audio file
// 2. Upload audio to Assembly AI API
// 3. Submit transcription request
// 4. Poll for completion (max 120 seconds)
// 5. Return transcript text
```

**Assembly AI Workflow:**
```
1. Upload audio file to: https://api.assemblyai.com/v2/upload
   - Headers: { Authorization: ASSEMBLY_AI_API_KEY }
   - Response: { upload_url: "https://cdn-xxx.assemblyai.com/..." }

2. Submit transcription request to: https://api.assemblyai.com/v2/transcript
   - Payload: { audio_url: upload_url }
   - Response: { id: "transcript_xxx", status: "queued" }

3. Poll for completion: GET /api.assemblyai.com/v2/transcript/{id}
   - Polls every 1 second
   - Waits until status = "completed" (max 120 seconds)
   - Returns: { status: "completed", text: "I would use a hash map..." }
```

#### Step 24: Tone Analysis
**File:** [server/services/openSmile.js](server/services/openSmile.js)

Uses **OpenSmile** for acoustic feature extraction:

```javascript
// Analyzes audio for:
// - Confidence level (1-10)
// - Stress level (1-10)
// - Engagement (1-10)
// - Clarity (1-10)
// - Pace (1-10)
// - Volume (1-10)

// Default fallback values:
toneMatrix = {
  confidence: 7,
  stress: 3,
  engagement: 8,
  clarity: 8,
  pace: 7,
  volume: 8
}
```

#### Step 25: Return Transcript & Tone
```javascript
res.status(200).json({
  message: "USER audio processed successfully",
  transcript: "I would use a hash map to store the numbers...",
  toneMatrix: {
    confidence: 7,
    stress: 3,
    engagement: 8,
    clarity: 8,
    pace: 7,
    volume: 8
  }
});

// Clean up temporary audio file
fs.unlinkSync(audioPath);
```

---

### 3.3 Frontend: Prepare Next Question Request
```javascript
// After receiving transcript and tone analysis
const nextQuestionResponse = await interviewService.getNextQuestion(
  sessionId,
  audioResponse.transcript,           // User's spoken answer
  audioResponse.toneMatrix,           // Tone analysis
  questions.length + 1,               // Current round number
  shouldMoveToNextProblem             // Flag for DSA problems
);
```

---

### 3.4 Backend: Generate Next Question

**File:** [server/controllers/interviewController.js](server/controllers/interviewController.js#L165) - `nextQuestion` endpoint

#### Step 26: Receive User Response
```javascript
POST /api/interview/next-question
Body: {
  sessionId: 'a1b2c3d4...',
  transcript: "I would use a hash map...",
  toneMatrix: { confidence: 7, ... },
  round: 2,
  shouldMoveToNextProblem: false,
  code: null // For DSA problems
}
```

#### Step 27: Update Interview Context
```javascript
const promptEngineer = getSession(sessionId);

// Track elapsed time
const elapsedMinutes = Math.floor(
  (new Date().getTime() - promptEngineer.interviewContext.startTime) / (1000 * 60)
);

// Update context with candidate response
promptEngineer.updateContext({
  currentRound: 2,
  transcript: "I would use a hash map...",
  toneMetrics: { confidence: 7, ... }
});

// Adds to history:
// questionHistory: [..., "I would use a hash map..."]
// toneAnalysis: [..., { confidence: 7, ... }]
```

#### Step 28: Check for Problem Transition (DSA)
```javascript
if (req.body.shouldMoveToNextProblem) {
  const currentIndex = promptEngineer.interviewContext.currentProblemIndex;
  
  // Move to next problem
  if (currentIndex < dsaProblems.length - 1) {
    promptEngineer.interviewContext.currentProblemIndex = currentIndex + 1;
  }
}

// Get current problem for context
const currentProblem = dsaProblems[promptEngineer.interviewContext.currentProblemIndex];
// { title: "Two Sum", description: "...", ... }
```

#### Step 29: Generate Next Question via AI
**File:** [server/services/interviewFlowService.js](server/services/interviewFlowService.js#L65)

```javascript
const nextQuestionResponse = await interviewFlowService.generateNextQuestion(
  promptEngineer,
  {
    transcript: userResponse,
    toneMetrics: toneMatrix,
    elapsedMinutes: 2,
    currentProblem: { title: "Two Sum", ... },
    problemChanged: false
  }
);

// Generated prompt structure for Gemini AI:
`**INTERVIEW - NEXT QUESTION**

Context: Google | Software Engineer | 2/50 min | John Doe

Problem: Two Sum - Given an array of integers nums...
(Problem 1/4)

Conversation History:
- AI: "Let me ask you about the Two Sum problem..."
- Candidate: "I would use a hash map..."

**Your Task:**
1. Acknowledge their approach (it's good!)
2. Ask follow-up: "Can you explain the space complexity?"

Keep responses concise, natural, encouraging.`

// Gemini AI Response:
// "That's a good approach! Using a hash map would indeed work. 
//  Can you walk me through the space complexity of your solution?"
```

#### Step 30: Wrap-Up Check
```javascript
// Check if near end of interview (45 out of 50 minutes)
if (elapsedMinutes >= config.wrapUpThreshold) {
  return await generateWrapUpQuestion(promptEngineer, context);
  
  // Wrap-up prompt instructs AI to:
  // 1. Summarize what was covered
  // 2. Thank the candidate
  // 3. Explain next steps in the process
}
```

#### Step 31: Return Next Question
```javascript
res.status(200).json({
  question: "That's a good approach! Using a hash map would indeed work...",
  shouldMoveToNextProblem: false,
  isWrapUp: false,
  round: 2,
  
  // For DSA interviews:
  currentProblem: { title: "Two Sum", ... },
  currentProblemIndex: 0,
  totalProblems: 4
});
```

---

## 4. DSA INTERVIEWS - CODE SUBMISSION

### 4.1 Frontend: Code Submission

**File:** [frontend/src/components/interview/DSAInterviewPanel.jsx](frontend/src/components/interview/DSAInterviewPanel.jsx)

#### Step 32: User Writes & Submits Code
```javascript
// User writes solution in CodeEditor component
const userCode = `
class Solution {
  public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> map = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
      if (map.containsKey(target - nums[i])) {
        return new int[] { map.get(target - nums[i]), i };
      }
      map.put(nums[i], i);
    }
    return new int[] {};
  }
}
`;

// Frontend submits code
await interviewService.submitCode(sessionId, userCode, 'java');
```

---

### 4.2 Backend: Code Evaluation

**File:** [server/controllers/interviewController.js](server/controllers/interviewController.js#L520) - `submitCode` endpoint

#### Step 33: Receive Code Submission
```javascript
POST /api/interview/submit-code
Body: {
  sessionId: 'a1b2c3d4...',
  code: 'class Solution { ... }',
  language: 'java'
}
```

#### Step 34: Evaluate Code
**File:** [server/services/codeEvaluationService.js](server/services/codeEvaluationService.js)

```javascript
const evaluation = await codeEvaluationService.evaluateCode(
  userCode,
  currentProblem,
  'java'
);

// Evaluation prompt to Gemini AI:
`You are a senior software engineer evaluating a candidate's DSA solution.

Problem: Two Sum
Description: Given an array of integers nums and an integer target...

Candidate's Code (java):
class Solution {
  public int[] twoSum(int[] nums, int target) {
    ...
  }
}

Evaluation Criteria:
- Correctness (40%): Does it solve the problem correctly?
- Efficiency (25%): Is time/space complexity optimal?
- Code Quality (20%): Is it readable and well-structured?
- Edge Cases (10%): Does it handle boundary conditions?
- Best Practices (5%): Does it follow language conventions?

Scoring: 0-50 scale
- 40-50: Excellent, optimal solution
- 30-39: Good, minor issues
- 20-29: Average, needs improvement
- 10-19: Below average, significant issues
- 0-9: Poor, major errors

Response Format (JSON only):
{
  "score": 45,
  "overallFeedback": "Excellent solution! Your hash map approach...",
  "strengths": ["Correct solution", "O(n) time complexity"],
  "weaknesses": ["Could add comments"]
}
`
```

#### Step 35: Parse Evaluation Response
```javascript
// Gemini response:
{
  "score": 45,
  "overallFeedback": "Excellent solution! Your hash map approach...",
  "strengths": ["Correct solution", "O(n) time complexity"],
  "weaknesses": ["Could add comments"]
}

// Store in session context
promptEngineer.interviewContext.evaluations.push({
  problemIndex: 0,
  problem: { title: "Two Sum", ... },
  userCode: 'class Solution { ... }',
  evaluation: {
    score: 45,
    overallFeedback: "Excellent solution!",
    strengths: [...],
    weaknesses: [...]
  },
  timestamp: new Date()
});
```

#### Step 36: Determine Next Action
```javascript
const nextAction = codeEvaluationService.determineNextAction(45);

// If score >= 35: { action: 'nextProblem', reason: 'High score' }
// If score >= 20: { action: 'followup', reason: 'Medium score' }
// If score < 20: { action: 'followup', reason: 'Low score' }

res.status(200).json({
  message: "Code evaluated successfully",
  evaluation: {
    score: 45,
    overallFeedback: "Excellent solution!",
    strengths: [...],
    weaknesses: [...]
  },
  nextAction: 'nextProblem', // Move to next problem if score is high
  shouldMoveToNextProblem: true
});
```

---

## 5. INTERVIEW COMPLETION & FEEDBACK GENERATION

### 5.1 Frontend: Finish Interview

**File:** [frontend/src/hooks/useInterviewLogic.js](frontend/src/hooks/useInterviewLogic.js#L250)

#### Step 37: User Clicks "Finish Interview"
```javascript
const finishInterview = async () => {
  if (!sessionId) {
    window.toast.error('No active session found');
    return;
  }
  
  window.toast.info('Generating detailed interview summary...');
  
  // Call backend to generate feedback
  const response = await interviewService.getSummary(sessionId);
  
  // Response includes:
  // - comprehensiveFeedback (for DSA)
  // - problemEvaluations (for DSA)
  // - interviewSummary (stats)
  
  setSummaryData(response);
  setShowSummary(true); // Show SummaryModal
};
```

---

### 5.2 Backend: Generate Comprehensive Feedback

**File:** [server/controllers/interviewController.js](server/controllers/interviewController.js#L358) - `getFinalFeedback` endpoint

#### Step 38: Receive Feedback Request
```javascript
GET/POST /api/interview/get-final-feedback
Body: { sessionId: 'a1b2c3d4...' }
```

#### Step 39: Retrieve Session Data
```javascript
const promptEngineer = getSession(sessionId);

const interviewContext = promptEngineer.interviewContext;
// Contains:
// - questionHistory: [welcome_msg, q1, q2, q3, ...]
// - candidateResponses: [intro, a1, a2, a3, ...]
// - toneAnalysis: [tone1, tone2, tone3, ...]
// - evaluations: [
//     { problem: "Two Sum", evaluation: {...} },
//     { problem: "Add Two Numbers", evaluation: {...} },
//     ...
//   ]

const evaluations = interviewContext.evaluations || [];
```

#### Step 40: Check Interview Type & Prepare Data

```javascript
if (evaluations.length > 0) {
  // DSA Interview - Generate comprehensive feedback
  const interviewData = {
    companyInfo: { name: "Google", role: "SDE", ... },
    resumeData: { name: "John Doe", rawText: "..." },
    interviewContext: {...}
  };
  
  const evaluationData = evaluations.map(e => e.evaluation);
  // Each evaluation: { score: 45, strengths: [...], weaknesses: [...] }
  
  feedback = await comprehensiveFeedbackService.generateComprehensiveFeedback(
    interviewData,
    evaluationData
  );
} else {
  // General Q&A Interview
  const interviewData = {
    aiQuestions: questionHistory,
    userResponses: candidateResponses,
    toneAnalysis: toneAnalysis,
    interviewType: 'behavioral',
    candidateName: 'John Doe',
    totalRounds: questionHistory.length
  };
  
  feedback = await generateInterviewAnalysis(interviewData, companyInfo);
}
```

---

### 5.3 Comprehensive Feedback Generation

**File:** [server/services/comprehensiveFeedbackService.js](server/services/comprehensiveFeedbackService.js)

#### Step 41: Aggregate Evaluation Data
```javascript
// For DSA Interview with 4 problems:
allEvaluations = [
  { score: 45, strengths: [...], weaknesses: [...] }, // Problem 1
  { score: 38, strengths: [...], weaknesses: [...] }, // Problem 2
  { score: 42, strengths: [...], weaknesses: [...] }, // Problem 3
  { score: 35, strengths: [...], weaknesses: [...] }  // Problem 4
];

// Calculate aggregate stats
const totalProblems = 4;
const averageScore = (45 + 38 + 42 + 35) / 4 = 40;
const highestScore = 45;
const lowestScore = 35;

// Aggregate strengths & weaknesses
const allStrengths = [
  "Correct solution",
  "Good time complexity",
  "Handles edge cases",
  ...
];
const allWeaknesses = [
  "Could add comments",
  "Space complexity not optimal",
  ...
];
```

#### Step 42: Build Comprehensive Feedback Prompt
```javascript
// Gemini AI prompt:
`You are a senior technical interviewer providing comprehensive feedback.

Interview Context:
- Company: Google | Role: Software Engineer
- Candidate: John Doe
- Problems Attempted: 4
- Average Score: 40/50
- Score Range: 35-45/50

Problem Evaluations:
Problem 1: 45/50
- Feedback: Excellent solution with optimal approach
- Strengths: Correct, Good time complexity
- Weaknesses: Could add comments

Problem 2: 38/50
- Feedback: Good solution with minor inefficiencies
- Strengths: Handles edge cases
- Weaknesses: Space complexity not optimal

...more problems...

Common Strengths: Correct logic, Good communication, Quick thinking
Common Weaknesses: Code comments, Edge case handling

Generate comprehensive feedback report with:
1. Executive Summary (overall assessment, recommendation)
2. Technical Skills Assessment
3. Communication Skills
4. Problem-Solving Methodology
5. Specific Strengths (5-7 with examples)
6. Areas for Improvement (5-7 with suggestions)
7. Recommendations (resources, practice areas)
8. Overall Ratings (technical, problem-solving, communication: 1-10)

Response Format (JSON only):
{
  "executiveSummary": {
    "overallAssessment": "Strong DSA fundamentals with good problem-solving skills",
    "keyStrengths": ["Quick logic", "Good communication"],
    "primaryWeaknesses": ["Could optimize space complexity"],
    "recommendation": "Strong Yes",
    "reasoning": "Candidate demonstrated solid algorithmic thinking..."
  },
  "technicalAssessment": {
    "algorithmicThinking": "Strong - correctly identifies optimal approaches",
    "codeQuality": "Good - clean and readable code",
    "complexityAnalysis": "Good - understands time/space tradeoffs",
    "edgeCaseHandling": "Excellent - handles boundary conditions well"
  },
  "communicationAssessment": {
    "clarity": "Excellent - explains thoughts clearly",
    "technicalCommunication": "Good - uses proper terminology",
    "thoughtProcess": "Strong - walks through approach step-by-step"
  },
  "problemSolvingAssessment": {
    "approach": "Strong - breaks down problems methodically",
    "debugging": "Good - identifies and fixes issues",
    "adaptability": "Good - adjusts approach when needed"
  },
  "specificStrengths": [
    "Quick logical thinking",
    "Clean code structure",
    "Handles edge cases well",
    ...
  ],
  "areasForImprovement": [
    "Could add more comments in code",
    "Optimize space complexity in complex problems",
    ...
  ],
  "recommendations": {
    "resources": [
      "LeetCode Premium - practice more medium/hard problems",
      "AlgoExpert course - focus on advanced patterns"
    ],
    "practiceAreas": [
      "Dynamic Programming",
      "Graph algorithms"
    ],
    "timeline": "2-3 weeks for continued improvement",
    "nextSteps": [
      "Review failed problem approaches",
      "Practice similar problem patterns"
    ]
  },
  "ratings": {
    "technicalSkills": 8,
    "problemSolving": 8,
    "communication": 8,
    "overall": 8
  }
}
`
```

#### Step 43: Parse Comprehensive Feedback
```javascript
// Gemini returns JSON with all sections
const comprehensiveFeedback = {
  executiveSummary: {
    overallAssessment: "...",
    keyStrengths: [...],
    primaryWeaknesses: [...],
    recommendation: "Strong Yes",
    reasoning: "..."
  },
  technicalAssessment: {...},
  communicationAssessment: {...},
  problemSolvingAssessment: {...},
  specificStrengths: [...],
  areasForImprovement: [...],
  recommendations: {...},
  ratings: {
    technicalSkills: 8,
    problemSolving: 8,
    communication: 8,
    overall: 8
  }
};
```

---

### 5.4 Backend: Prepare Final Response

#### Step 44: Aggregate Response Data
```javascript
const responseData = {
  totalRounds: 12,
  companyInfo: { name: "Google", role: "SDE", ... },
  aiQuestionsCount: 12,
  userResponsesCount: 12,
  toneAnalysisCount: 12,
  
  // For DSA Interview:
  comprehensiveFeedback: {
    executiveSummary: {...},
    technicalAssessment: {...},
    communicationAssessment: {...},
    problemSolvingAssessment: {...},
    specificStrengths: [...],
    areasForImprovement: [...],
    recommendations: {...},
    ratings: {...}
  },
  
  problemEvaluations: [
    {
      problem: "Two Sum",
      evaluation: { score: 45, strengths: [...], weaknesses: [...] }
    },
    {
      problem: "Add Two Numbers",
      evaluation: { score: 38, strengths: [...], weaknesses: [...] }
    },
    ...
  ],
  
  interviewSummary: {
    totalProblems: 4,
    averageScore: 40,
    highestScore: 45,
    lowestScore: 35
  }
};
```

#### Step 45: Clean Up Session & Resources
```javascript
// Delete session from memory
deleteSession(sessionId);

// Delete temporary resume file if it exists
try {
  const resumePath = promptEngineer.resumeData?.filePath;
  if (resumePath && fs.existsSync(resumePath)) {
    fs.unlinkSync(resumePath);
  }
} catch (error) {
  console.warn('Could not clean up resume file');
}
```

#### Step 46: Return Feedback to Frontend
```javascript
res.status(200).json(responseData);

// Response structure:
{
  totalRounds: 12,
  companyInfo: {...},
  aiQuestionsCount: 12,
  userResponsesCount: 12,
  toneAnalysisCount: 12,
  comprehensiveFeedback: {
    executiveSummary: {...},
    technicalAssessment: {...},
    communicationAssessment: {...},
    problemSolvingAssessment: {...},
    specificStrengths: [...],
    areasForImprovement: [...],
    recommendations: {...},
    ratings: {...}
  },
  problemEvaluations: [...],
  interviewSummary: {
    totalProblems: 4,
    averageScore: 40,
    highestScore: 45,
    lowestScore: 35
  }
}
```

---

### 5.5 Frontend: Display Feedback

**File:** [frontend/src/components/SummaryModal.jsx](frontend/src/components/SummaryModal.jsx)

#### Step 47: Receive & Display Feedback
```javascript
// Frontend receives feedback response
const response = await interviewService.getSummary(sessionId);

// Display in SummaryModal component
<SummaryModal
  summaryData={response}
  onClose={() => setShowSummary(false)}
/>

// Modal displays:
// 1. Executive Summary
// 2. Technical Assessment (ratings)
// 3. Communication Assessment
// 4. Problem-Solving Assessment
// 5. Specific Strengths
// 6. Areas for Improvement
// 7. Recommendations (resources, practice areas)
// 8. Overall Ratings (1-10 scale)
// 9. Problem Evaluations (score per problem)
// 10. Interview Summary (stats)
```

---

## 6. COMPLETE DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PREPFORGE INTERVIEW DATA FLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 1: RESUME UPLOAD & SESSION INIT
──────────────────────────────────────
Frontend                              Backend
  │                                      │
  │─── 1. Select Resume/Company Info ────│
  │─── 2. Prepare Base64 Request ────────│
  │─── 3. POST /upload-resume ──────────→ 4. Decode Base64
  │                                      │ 5. Save to disk
  │                                      │ 6. Parse PDF → Extract text
  │                                      │ 7. Create PromptEngineer
  │                                      │ 8. Create Session & Store
  │← 9. Return sessionId ────────────────│
  │ 10. Navigate to /interview/session  │


PHASE 2: INTERVIEW START
──────────────────────────
Frontend                              Backend
  │                                      │
  │─── 11. Session page init ──────────→│ 12. Load DSA Problems
  │                                      │ 13. Generate Welcome Msg (AI)
  │← 14. Return welcome question ───────│
  │ 15. Display with TTS animation      │


PHASE 3: QUESTION & ANSWER CYCLE
──────────────────────────────────
Frontend                              Backend        External APIs
  │                                      │                  │
  │ 16. User speaks answer               │                  │
  │─── 17. Record audio blob ────────→ 18. Validate audio   │
  │                                      │ 19. Upload audio  │
  │                                      │    & process ────→ Assembly AI
  │                                      │    (Speech-to-Text) ←─ Transcript
  │                                      │ 20. Analyze tone  ─→ OpenSmile
  │                                      │    (Acoustic features) ←─ Tone Data
  │← 21. Return transcript + tone ──────│
  │ 22. Prepare next question request   │
  │─── 23. POST /next-question ────────→ 24. Update context
  │                                      │ 25. Generate Q (AI) ──→ Gemini AI
  │                                      │    (Follow-up Q) ────── ←─ Question
  │← 26. Return next question ──────────│
  │ 27. Display question + TTS          │
  │    [Loop back to step 16]            │


PHASE 4: DSA - CODE SUBMISSION (Optional)
───────────────────────────────────────────
Frontend                              Backend        External APIs
  │                                      │                  │
  │ 28. User writes code                │                  │
  │─── 29. POST /submit-code ──────────→ 30. Evaluate code ─→ Gemini AI
  │                                      │    (Code review) ──── ←─ Evaluation
  │← 31. Return evaluation ─────────────│
  │ 32. Display feedback                │
  │    [Set shouldMoveToNextProblem]     │


PHASE 5: INTERVIEW COMPLETION & FEEDBACK
──────────────────────────────────────────
Frontend                              Backend        External APIs
  │                                      │                  │
  │ 33. Click "Finish Interview"        │                  │
  │─── 34. GET /get-final-feedback ────→ 35. Aggregate data
  │                                      │ 36. Generate comprehensive
  │                                      │    feedback (AI) ─→ Gemini AI
  │                                      │    (All evaluations) ← Feedback
  │                                      │ 37. Delete session
  │                                      │ 38. Clean up files
  │← 39. Return comprehensive feedback ─│
  │ 40. Display SummaryModal             │
  │    - Executive Summary               │
  │    - Technical Assessment            │
  │    - Problem Evaluations             │
  │    - Recommendations                 │
```

---

## 7. DATA STRUCTURES

### PromptEngineer Object
```javascript
{
  resumeData: {
    rawText: "Full resume text...",
    name: "John Doe",
    filePath: "uploads/resumes/resume_xxx.pdf"
  },
  
  companyInfo: {
    name: "Google",
    type: "MNC",
    role: "Software Engineer",
    level: "Entry level"
  },
  
  interviewContext: {
    startTime: 1708956123456,
    currentTime: 1708956283456,
    interviewType: "dsa", // or "technical_behavioral", "behavioral"
    duration: 30 * 60 * 1000, // milliseconds
    experienceLevel: "Entry",
    currentRound: 5,
    currentPhase: "interview",
    
    // Question & Response History
    questionHistory: [
      "Hi, I'm Raj from Google...",
      "Tell me about yourself",
      "Have you used hash maps?",
      "Let's solve the Two Sum problem..."
    ],
    
    candidateResponses: [
      "Hi Raj, thanks for having me...",
      "I'm a computer science graduate...",
      "Yes, I've used them in...",
      "I would iterate through the array..."
    ],
    
    toneAnalysis: [
      { confidence: 7, stress: 3, engagement: 8, ... },
      { confidence: 7, stress: 2, engagement: 9, ... },
      ...
    ],
    
    // For DSA Interviews
    dsaProblems: [
      {
        title: "Two Sum",
        description: "Given an array of integers...",
        difficulty: "Easy",
        examples: "Input: nums = [2,7,11,15]..."
      },
      ...
    ],
    currentProblemIndex: 0,
    
    // Evaluations
    evaluations: [
      {
        problemIndex: 0,
        problem: { title: "Two Sum", ... },
        userCode: "class Solution { ... }",
        evaluation: {
          score: 45,
          overallFeedback: "Excellent solution...",
          strengths: ["Good logic", "Optimal complexity"],
          weaknesses: ["Could add comments"]
        },
        timestamp: 1708956195123
      },
      ...
    ]
  }
}
```

### Session Store
```javascript
// In-memory map (sessionManager.js)
{
  'a1b2c3d4-e5f6-4g7h-8i9j': PromptEngineer_instance,
  'b2c3d4e5-f6g7-4h8i-9j0k': PromptEngineer_instance,
  ...
}

// Lifetime: From resume upload → getFinalFeedback → Deleted
```

---

## 8. API ENDPOINTS SUMMARY

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| POST | `/upload-resume` | Initialize session with resume | resume, companyInfo | sessionId, candidateName |
| POST | `/start-interview` | Start interview and generate welcome | sessionId | Welcome question, problems |
| POST | `/process-audio` | Convert speech to text + analyze tone | audio file | transcript, toneMatrix |
| POST | `/next-question` | Generate next AI question | sessionId, transcript, tone | Next question, shouldMoveToNextProblem |
| POST | `/submit-code` | Evaluate code solution | sessionId, code, language | Code evaluation |
| GET | `/dsa-problems` | Get all DSA problems for session | sessionId | dsaProblems array |
| GET | `/current-problem` | Get current DSA problem | sessionId | Current problem details |
| GET/POST | `/get-final-feedback` | Generate comprehensive feedback | sessionId | comprehensiveFeedback, evaluations |
| POST | `/terminate-session` | Clean up session | sessionId | Success message |

---

## 9. EXTERNAL SERVICE INTEGRATIONS

### Assembly AI (Speech-to-Text)
- **Purpose**: Convert user's spoken answer to text transcript
- **API Endpoint**: `https://api.assemblyai.com/v2`
- **Process**:
  1. Upload audio file
  2. Submit transcription request
  3. Poll for completion (up to 120 seconds)
  4. Return transcript text

### OpenSmile (Tone Analysis)
- **Purpose**: Analyze tone, confidence, stress, engagement from audio
- **Metrics Extracted**:
  - Confidence (1-10)
  - Stress level (1-10)
  - Engagement (1-10)
  - Clarity (1-10)
  - Pace (1-10)
  - Volume (1-10)

### Google Gemini AI
- **Purpose**: Generate interview questions, follow-ups, and comprehensive feedback
- **Used for**:
  - Welcome message generation
  - Follow-up question generation
  - Code evaluation
  - Comprehensive feedback synthesis

---

## 10. KEY OBSERVATIONS

1. **Session Management**: Sessions are stored in-memory (not persisted) and deleted after feedback generation
2. **Audio Processing**: Uses Assembly AI for accurate transcription
3. **AI-Driven Flow**: All questions and evaluations are generated by Gemini AI based on context
4. **Tone Analysis**: Conducted in parallel with speech-to-text for efficiency
5. **Comprehensive Feedback**: Aggregates all code evaluations and generates a single detailed report
6. **Data Cleanup**: Temporary files (resume, audio) are deleted after processing
7. **Multi-phase Flow**: Interview progresses through Introduction → Questions → Code → Wrap-up → Feedback


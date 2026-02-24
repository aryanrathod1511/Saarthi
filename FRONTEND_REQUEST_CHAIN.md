# Frontend Request Chain - Interview Flow

## File: [frontend/src/hooks/useInterviewLogic.js](frontend/src/hooks/useInterviewLogic.js)

This file contains the **complete chain of API requests** from the frontend during interview execution.

---

## COMPLETE REQUEST CHAIN

### **Phase 1: Start Interview**

**Location:** Lines 98-117

```javascript
// 1️⃣ FIRST REQUEST: Start Interview
const handleStartInterview = async () => {
    if (!sessionId) {
      console.error('No session ID provided');
      return;
    }

    setIsLoading(true);
    try {
      // REQUEST 1: Start Interview
      const response = await interviewService.startInterview(sessionId);
      
      if (response.question) {
        setCurrentQuestion(response.question);        // Display welcome question
        addQuestion(response.question, 'Introduction'); // Add to history
        setCurrentRound(1);                            // Set round to 1
        
        if (window.toast) {
          window.toast.success('Interview started successfully!');
        }
      }
    } catch (error) {
      console.error('Error starting interview:', error);
    } finally {
      setIsLoading(false);
    }
  };
```

**Request Details:**
```javascript
// Calls interviewService.startInterview()
POST /api/interview/start-interview
Headers: { Authorization: Bearer ${token} }
Body: { sessionId: 'a1b2c3d4-...' }

// Response:
{
  question: "Hi John Doe, I'm Raj from Google...",
  questionCategory: 'Introduction',
  round: 1,
  interviewType: 'dsa',
  startTime: '2024-02-23T...',
  maxDuration: 50,
  wrapUpThreshold: 45,
  dsaProblems: [...],
  totalProblems: 4
}
```

---

### **Phase 2: User Records & Processes Audio**

**Location:** Lines 120-137

```javascript
// User clicks Record button
const handleStartRecording = () => {
    if (!isQuestionFullyDisplayed) {
      if (window.toast) {
        window.toast.warning('Please wait for the question to finish loading.');
      }
      return;
    }
    startRecording(processAudio);  // ← Start recording with callback
};

const handleStopRecording = () => {
    stopRecording();  // ← Stop recording triggers processAudio callback
};
```

---

### **Phase 3: Main Request Chain - processAudio()**

**Location:** Lines 139-181

This is the **CORE REQUEST CHAIN** where everything happens:

```javascript
const processAudio = async (blob) => {
    setIsProcessing(true);
    
    try {
      // ─────────────────────────────────────────────────────────────
      // REQUEST 2️⃣: UPLOAD AUDIO & GET TRANSCRIPT + TONE
      // ─────────────────────────────────────────────────────────────
      const audioResponse = await interviewService.uploadAudio(blob);
      
      if (audioResponse.transcript) {
        // audioResponse contains:
        // {
        //   message: "USER audio processed successfully",
        //   transcript: "I would use a hash map...",
        //   toneMatrix: { confidence: 7, stress: 3, ... }
        // }

        // Get shouldMoveToNextProblem flag from last question
        const lastQuestion = questions[questions.length - 1];
        const shouldMoveFlag = lastQuestion?.shouldMoveToNextProblem || false;
        
        // ─────────────────────────────────────────────────────────────
        // REQUEST 3️⃣: GET NEXT QUESTION (with transcript + tone)
        // ─────────────────────────────────────────────────────────────
        const nextQuestionResponse = await interviewService.getNextQuestion(
          sessionId,
          audioResponse.transcript,           // ← TRANSCRIPT PASSED HERE
          audioResponse.toneMatrix,           // ← TONE ANALYSIS PASSED HERE
          questions.length + 1,               // round number
          shouldMoveFlag                      // should move to next problem?
        );

        if (nextQuestionResponse.question) {
          setCurrentQuestion(nextQuestionResponse.question);  // Display new question
          addQuestion(nextQuestionResponse.question, 'Next Question', nextQuestionResponse.shouldMoveToNextProblem);
          setCurrentRound(nextQuestionResponse.round || questions.length + 1);
          
          // Check if should move to next problem
          if (nextQuestionResponse.shouldMoveToNextProblem) {
            setCurrentProblemIndex(prev => prev + 1);
            setCurrentProblem(null);
            
            // ─────────────────────────────────────────────────────────────
            // REQUEST 4️⃣ (Optional): LOAD CURRENT PROBLEM
            // ─────────────────────────────────────────────────────────────
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
```

---

## REQUEST CHAIN VISUALIZATION

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  FRONTEND REQUEST CHAIN SEQUENCE                         │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 1️⃣ handleStartInterview() - LINE 98-117                     │
│                                                               │
│ POST /api/interview/start-interview                          │
│ Body: { sessionId: '...' }                                   │
│                                                               │
│ Response:                                                    │
│ { question: "Hi John...", dsaProblems: [...], ... }         │
│                                                               │
│ Action: Display welcome question                            │
└──────────────────────────────────────────────────────────────┘
         ↓
         [User listens to question via TTS]
         [User clicks Record button]
         [User speaks answer]
         [User clicks Stop button]
         ↓
┌──────────────────────────────────────────────────────────────┐
│ 2️⃣ processAudio() - uploadAudio() - LINE 139-149            │
│                                                               │
│ POST /api/interview/process-audio                           │
│ Body: FormData { audio: blob }                              │
│                                                               │
│ Response:                                                    │
│ {                                                            │
│   transcript: "I would use a hash map...",                  │
│   toneMatrix: {                                             │
│     confidence: 7,                                          │
│     stress: 3,                                              │
│     engagement: 8,                                          │
│     ...                                                     │
│   }                                                          │
│ }                                                            │
│                                                               │
│ Action: Extract transcript and tone analysis                │
└──────────────────────────────────────────────────────────────┘
         ↓
         [Extract audio response data]
         [Get shouldMoveFlag from last question]
         ↓
┌──────────────────────────────────────────────────────────────┐
│ 3️⃣ processAudio() - getNextQuestion() - LINE 151-164        │
│                                                               │
│ POST /api/interview/next-question                           │
│ Body: {                                                      │
│   sessionId: '...',                                         │
│   transcript: "I would use a hash map...",  ← TRANSCRIPT    │
│   toneMatrix: { ... },                      ← TONE ANALYSIS │
│   round: 2,                                                 │
│   shouldMoveToNextProblem: false                            │
│ }                                                            │
│                                                               │
│ Response:                                                    │
│ {                                                            │
│   question: "That's a good approach!...",                  │
│   shouldMoveToNextProblem: false,                          │
│   isWrapUp: false,                                         │
│   round: 2,                                                │
│   currentProblem: { title: "Two Sum", ... },              │
│   currentProblemIndex: 0,                                 │
│   totalProblems: 4                                         │
│ }                                                            │
│                                                               │
│ Backend Processing:                                         │
│ - Updates interview context with transcript & tone          │
│ - Builds conversation history (all previous Q&A)            │
│ - Sends to Gemini AI with full context                     │
│ - Gemini evaluates and generates follow-up                 │
│ - Returns question                                          │
│                                                               │
│ Action: Display next question                              │
└──────────────────────────────────────────────────────────────┘
         ↓
         [Check if shouldMoveToNextProblem = true?]
         ↓
    NO  ↓ YES
        │
        └──→ (Optional) REQUEST 4️⃣: loadCurrentProblem()
            │
            ├─ GET /api/interview/current-problem?sessionId=...
            │
            └─ Response: { problem: {...}, currentIndex: 1, ... }
         ↓
         [Display new question]
         [User listens via TTS]
         
         
    ─── LOOP BACK TO REQUEST 2️⃣ ───
         ↓
         [User records another answer]
         [Upload audio again]
         [Get next question]
         [Repeat until interview ends]
         ↓
┌──────────────────────────────────────────────────────────────┐
│ 5️⃣ finishInterview() - LINE 186-223                          │
│                                                               │
│ GET/POST /api/interview/get-final-feedback                  │
│ Body: { sessionId: '...' }                                  │
│                                                               │
│ Response:                                                    │
│ {                                                            │
│   totalRounds: 12,                                          │
│   companyInfo: { ... },                                     │
│   comprehensiveFeedback: {                                  │
│     executiveSummary: {...},                               │
│     technicalAssessment: {...},                            │
│     specificStrengths: [...],                              │
│     areasForImprovement: [...],                            │
│     ratings: { overall: 8, ... }                           │
│   },                                                         │
│   problemEvaluations: [                                     │
│     { problem: "Two Sum", evaluation: {...} },             │
│     { problem: "Add Two Numbers", evaluation: {...} },     │
│     ...                                                     │
│   ],                                                         │
│   interviewSummary: {                                       │
│     totalProblems: 4,                                       │
│     averageScore: 40,                                       │
│     highestScore: 45,                                       │
│     lowestScore: 35                                         │
│   }                                                          │
│ }                                                            │
│                                                               │
│ Action: Display SummaryModal with feedback                 │
└──────────────────────────────────────────────────────────────┘
```

---

## DETAILED REQUEST #3 (Core Request with Previous Q&A)

**This is where the evaluation happens:**

```javascript
// REQUEST 3: POST /api/interview/next-question
{
  sessionId: 'a1b2c3d4-e5f6-4g7h-8i9j',
  
  transcript: "I would use a hash map to store the values...",
  // ↑ CURRENT USER RESPONSE
  
  toneMatrix: {
    confidence: 7,
    stress: 3,
    engagement: 8,
    clarity: 8,
    pace: 7,
    volume: 8
  },
  // ↑ TONE ANALYSIS OF CURRENT RESPONSE
  
  round: 2,
  shouldMoveToNextProblem: false
}

// BACKEND PROCESSING:
// 1. Gets promptEngineer from session
// 2. Retrieves questionHistory (all previous Qs)
// 3. Builds conversationHistory from questionHistory
// 4. Constructs prompt with:
//    - All previous Q&A
//    - Current transcript
//    - Tone metrics
//    - Problem context
// 5. Sends to Gemini AI
// 6. Gemini evaluates implicitly + generates follow-up
// 7. Returns response

// RESPONSE:
{
  question: "That's a good approach! Using a hash map would work. Can you explain the space complexity?",
  shouldMoveToNextProblem: false,
  isWrapUp: false,
  round: 2,
  currentProblem: { title: "Two Sum", ... },
  currentProblemIndex: 0,
  totalProblems: 4
}
```

---

## Summary of Request Chain

| Request # | Endpoint | Method | When | Data Passed | Backend Does |
|-----------|----------|--------|------|-------------|--------------|
| 1️⃣ | `/start-interview` | POST | Interview starts | sessionId | Loads problems, generates welcome |
| 2️⃣ | `/process-audio` | POST | User stops recording | audio blob | Speech-to-text + tone analysis |
| 3️⃣ | `/next-question` | POST | After transcript ready | sessionId, transcript, tone, round | Builds conversation history, sends to Gemini for evaluation |
| 4️⃣ | `/current-problem` | GET | Problem changes | sessionId | Returns new problem details |
| 5️⃣ | `/get-final-feedback` | GET/POST | User finishes | sessionId | Aggregates all data, generates comprehensive feedback |

---

## Key Observation

**The CRITICAL part where evaluation happens:**

```javascript
// LINE 151-164 in useInterviewLogic.js
const nextQuestionResponse = await interviewService.getNextQuestion(
  sessionId,
  audioResponse.transcript,              // ← USER'S RESPONSE PASSED
  audioResponse.toneMatrix,              // ← TONE PASSED
  questions.length + 1,                  // ← ROUND NUMBER
  shouldMoveFlag                         // ← MOVE TO NEXT PROBLEM FLAG
);
```

This single call to `/next-question` is where:
1. Backend retrieves **ALL previous Q&A** from session
2. Combines with **current transcript & tone**
3. Sends to **Gemini AI with full context**
4. Gemini **implicitly evaluates** the response
5. Gemini **generates appropriate follow-up**
6. Returns the next question

The **conversation history** is NOT explicitly passed from frontend - it's stored in the backend session and retrieved on each request!

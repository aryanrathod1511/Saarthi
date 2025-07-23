import React, { useState } from 'react';
import Card from '../common/Card';
import CodeEditor from '../common/CodeEditor';
import Button from '../common/Button';
import { 
  MessageSquare, 
  Code, 
  Play,
  Pause,
  Mic,
  Volume2,
  VolumeX
} from 'lucide-react';

const NonDSAInterviewPanel = ({
  interviewType,
  currentQuestion,
  displayedQuestion,
  isQuestionFullyDisplayed,
  isPlaying,
  isMuted,
  onToggleAudioPlayback,
  onToggleMute
}) => {
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [userCode, setUserCode] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');

  const getInterviewTypeInfo = () => {
    switch (interviewType) {
      case 'resume_cs':
        return {
          title: 'Resume + CS Fundamentals + DSA',
          description: 'This interview focuses on your resume, computer science fundamentals, and includes some DSA questions.',
          icon: '💼',
          features: ['Resume-based questions', 'CS fundamentals', 'DSA problems included']
        };
      case 'technical_hr':
        return {
          title: 'Technical + HR Round',
          description: 'This interview combines technical questions with HR/behavioral questions and may include coding.',
          icon: '👥',
          features: ['Technical questions', 'HR/Behavioral questions', 'Coding problems']
        };
      default:
        return {
          title: 'General Interview',
          description: 'A comprehensive interview covering various aspects.',
          icon: '🎯',
          features: ['General questions', 'Problem-solving', 'Technical discussion']
        };
    }
  };

  const interviewInfo = getInterviewTypeInfo();

  return (
    <div className="space-y-6">
      {/* Interview Type Info */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <span className="text-3xl mr-3">{interviewInfo.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{interviewInfo.title}</h3>
              <p className="text-gray-600">{interviewInfo.description}</p>
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">Interview Features:</h4>
            <ul className="space-y-1">
              {interviewInfo.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Optional Code Editor Toggle */}
          <div className="border-t pt-4">
            <Button
              variant="secondary"
              icon={Code}
              onClick={() => setShowCodeEditor(!showCodeEditor)}
              size="sm"
            >
              {showCodeEditor ? 'Hide Code Editor' : 'Show Code Editor (Optional)'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Current Question Display */}
      

      {/* Optional Code Editor */}
      {showCodeEditor && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Code className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-800">Code Editor (Optional)</h3>
              </div>
              <select
                value={codeLanguage}
                onChange={(e) => setCodeLanguage(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>

            <div className="mb-4">
              <CodeEditor
                value={userCode}
                onChange={setUserCode}
                language={codeLanguage}
                placeholder="Write code here if needed for the interview..."
                height="300px"
              />
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                Use this editor to write code if the interviewer asks for it
              </p>
              <Button
                variant="secondary"
                onClick={() => setUserCode('')}
                size="sm"
              >
                Clear Code
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Interview Tips */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Mic className="w-5 h-5 mr-2 text-blue-600" />
            Interview Tips
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Speak clearly and confidently when answering questions</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Take your time to think before responding</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Use the code editor if you need to write code or algorithms</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Ask for clarification if a question is unclear</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NonDSAInterviewPanel; 
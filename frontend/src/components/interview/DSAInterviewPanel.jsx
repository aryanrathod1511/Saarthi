import React, { useState } from 'react';
import Card from '../common/Card';
import CodeEditor from '../common/CodeEditor';
import Button from '../common/Button';
import { 
  Code, 
  Play
} from 'lucide-react';
import { interviewService } from '../../services/interviewService';

const DSAInterviewPanel = ({
  interviewStarted,
  sessionId,
  onNextQuestionFromCode
}) => {
  const [userCode, setUserCode] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  const handleSubmitCode = async () => {
    if (!userCode.trim()) {
      if (window.toast) {
        window.toast.warning('Please write some code before submitting.');
      }
      return;
    }

    if (!sessionId) {
      if (window.toast) {
        window.toast.error('No active session found.');
      }
      return;
    }

    setIsSubmittingCode(true);
    try {
      const response = await interviewService.submitCode(sessionId, userCode, codeLanguage);
      
      if (response.nextQuestion && onNextQuestionFromCode) {
        onNextQuestionFromCode(response.nextQuestion, response.round);
      }
      
      // Clear code editor after submission
      setUserCode('');
      
      if (window.toast) {
        window.toast.success('Code submitted successfully!');
      }
    } catch (error) {
      console.error('Error submitting code:', error);
      if (window.toast) {
        window.toast.error(error.response?.data?.message || 'Failed to submit code');
      }
    } finally {
      setIsSubmittingCode(false);
    }
  };

  return (
    <Card>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Code className="w-6 h-6 text-green-600" />
            <h3 className="text-xl font-bold text-gray-800">Code Editor</h3>
          </div>
          <div className="flex items-center space-x-2">
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
        </div>

        {/* Code Editor */}
        <div className="mb-6">
          <CodeEditor
            value={userCode}
            onChange={setUserCode}
            language={codeLanguage}
            placeholder="Write your solution here..."
            height="400px"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            variant="primary"
            icon={Play}
            onClick={handleSubmitCode}
            loading={isSubmittingCode}
            disabled={!userCode.trim()}
            size="lg"
            className="px-8"
          >
            {isSubmittingCode ? 'Submitting...' : 'Submit Code'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default DSAInterviewPanel; 
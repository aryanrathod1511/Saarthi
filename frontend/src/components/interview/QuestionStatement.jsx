import React from 'react';
import Card from '../common/Card';
import { Play, Pause, Volume2, VolumeX, FileText } from 'lucide-react';

const QuestionStatement = ({
  interviewType,
  currentQuestion,
  displayedQuestion,
  currentProblem,
  currentProblemIndex,
  totalProblems,
  isQuestionFullyDisplayed,
  isPlaying,
  isMuted,
  onToggleAudioPlayback,
  onToggleMute
}) => {
  if (!currentQuestion && !currentProblem) {
    return (
      <Card>
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Question Statement</h3>
          <p className="text-gray-600">Your question will appear here once the interview begins.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {interviewType === 'dsa' ? currentProblemIndex + 1 : 'Q'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {interviewType === 'dsa' ? 'Problem Statement' : 'Interview Question'}
              </h2>
            </div>
          </div>
          
        
          
        </div>

        {/* Content */}
        <div className="space-y-6">
          {interviewType === 'dsa' ? (
            // DSA Problem Statement
            <div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                <p className="text-gray-700 leading-relaxed text-lg">
                  {currentProblem?.description}
                </p>
              </div>
              
              {/* Input/Output Format */}
              {currentProblem?.inputFormat && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Input Format</h4>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200 font-mono text-sm">
                    {currentProblem.inputFormat}
                  </div>
                </div>
              )}

              {currentProblem?.outputFormat && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Output Format</h4>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200 font-mono text-sm">
                    {currentProblem.outputFormat}
                  </div>
                </div>
              )}

              {/* Sample Test Cases */}
              {currentProblem?.sampleTestCases && currentProblem.sampleTestCases.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Sample Test Cases</h4>
                  <div className="space-y-3">
                    {currentProblem.sampleTestCases.map((testCase, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                        <div className="mb-2">
                          <span className="font-semibold text-gray-700">Input:</span>
                          <div className="font-mono text-sm bg-white p-2 rounded mt-1">
                            {testCase.input}
                          </div>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">Output:</span>
                          <div className="font-mono text-sm bg-white p-2 rounded mt-1">
                            {testCase.output}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Regular Interview Question
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed text-lg">
                  {displayedQuestion || currentQuestion}
                </p>
                {!isQuestionFullyDisplayed && (
                  <div className="inline-block w-2 h-6 bg-blue-600 animate-pulse ml-1"></div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default QuestionStatement; 
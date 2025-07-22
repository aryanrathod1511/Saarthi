import React, { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';
import Button from './Button';

const CodeEditor = ({ 
  value = '', 
  onChange, 
  language = 'javascript',
  onSubmit,
  isSubmitting = false,
  placeholder = '// Write your code here...'
}) => {
  const [code, setCode] = useState(value);
  const [lineNumbers, setLineNumbers] = useState([]);
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  // Update line numbers when code changes
  useEffect(() => {
    const lines = code.split('\n');
    setLineNumbers(lines.map((_, index) => index + 1));
  }, [code]);

  // Sync scroll between textarea and line numbers
  const handleScroll = () => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);
    if (onChange) {
      onChange(newCode);
    }
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(code);
    }
  };

  const getLanguageColor = () => {
    const colors = {
      javascript: 'text-yellow-500',
      python: 'text-blue-500',
      java: 'text-red-500',
      cpp: 'text-purple-500',
      c: 'text-gray-500'
    };
    return colors[language] || 'text-gray-500';
  };

  const getLanguagePlaceholder = () => {
    const placeholders = {
      javascript: '// Write your JavaScript solution here...\nfunction solveProblem() {\n  // Your code here\n  return result;\n}',
      python: '# Write your Python solution here...\ndef solve_problem():\n    # Your code here\n    return result',
      java: '// Write your Java solution here...\npublic class Solution {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}',
      cpp: '// Write your C++ solution here...\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}',
      c: '// Write your C solution here...\n#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}'
    };
    return placeholders[language] || placeholder;
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-xl">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <span className={`text-sm font-medium ${getLanguageColor()}`}>
              {language.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="relative">
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="absolute left-0 top-0 w-12 bg-gray-800 text-gray-500 text-xs font-mono py-3 px-2 select-none overflow-hidden"
          style={{ height: '400px' }}
        >
          {lineNumbers.map((num) => (
            <div key={num} className="text-right pr-2 leading-6">
              {num}
            </div>
          ))}
        </div>

        {/* Code Textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleCodeChange}
          onScroll={handleScroll}
          placeholder={getLanguagePlaceholder()}
          className="w-full h-96 bg-gray-900 text-gray-100 font-mono text-sm leading-6 p-3 pl-16 resize-none focus:outline-none border-none"
          style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
        />
      </div>

      {/* Footer */}
      <div className="bg-gray-800 px-4 py-3 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {code.split('\n').length} lines • {code.length} characters
          </div>
          <Button
            variant="primary"
            icon={Play}
            onClick={handleSubmit}
            disabled={isSubmitting || !code.trim()}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Code'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor; 
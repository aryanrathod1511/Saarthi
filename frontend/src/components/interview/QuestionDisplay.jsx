import React from 'react';
import { User, Play, Pause, Volume2, Code, Briefcase, Users, MessageSquare } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';

const QuestionDisplay = ({
  question,
  isLoading,
  isPlaying,
  isMuted,
  onToggleAudioPlayback,
  onToggleMute,
  interviewType
}) => {
  const getInterviewTypeIcon = (type) => {
    switch (type) {
      case 'dsa':
        return <Code className="w-4 h-4" />;
      case 'resume':
        return <Briefcase className="w-4 h-4" />;
      case 'behavioral':
        return <Users className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <User className="w-6 h-6 mr-3 text-blue-600" />
          AI Question
        </h2>
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center">
            {getInterviewTypeIcon(interviewType)}
            <span className="ml-1">{interviewType.toUpperCase()}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-l-4 border-blue-500">
        <div className="flex items-start justify-between mb-4">
          <p className="text-gray-800 leading-relaxed text-lg">
            {question || "Loading question..."}
          </p>
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={onToggleAudioPlayback}
              className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-blue-600" />
              ) : (
                <Play className="w-4 h-4 text-blue-600" />
              )}
            </button>
            <button
              onClick={onToggleMute}
              className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              <Volume2 className={`w-4 h-4 ${isMuted ? 'text-red-500' : 'text-blue-600'}`} />
            </button>
          </div>
        </div>
        {isLoading && (
          <div className="flex items-center text-blue-600 mt-4">
            <LoadingSpinner size="sm" className="mr-2" />
            The interviewer is thinking...
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionDisplay; 
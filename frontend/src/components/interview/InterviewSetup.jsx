import React from 'react';
import { Upload, Code, Briefcase, Users, Sparkles } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import CompanyInfoForm from './CompanyInfoForm';
import ResumeUpload from './ResumeUpload';
import { INTERVIEW_TYPES } from '../../utils/constants';

const InterviewSetup = ({ 
  interviewType, 
  onInterviewTypeChange, 
  companyInfo, 
  onCompanyInfoChange,
  selectedFile,
  onFileSelect,
  onStartInterview,
  isLoading
}) => {
  const getIcon = (iconName) => {
    switch (iconName) {
      case 'Code': return Code;
      case 'Briefcase': return Briefcase;
      case 'Users': return Users;
      default: return Code;
    }
  };

  const isFormComplete = selectedFile && companyInfo.name.trim();

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="lg:col-span-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <Upload className="w-6 h-6 mr-3 text-blue-600" />
          Interview Setup
        </h2>

        {/* Interview Type Selection */}
        <div className="mb-8">
          <label className="block text-lg font-semibold text-gray-700 mb-4">
            Interview Type
          </label>
          <div className="space-y-3">
            {INTERVIEW_TYPES.map((type) => {
              const Icon = getIcon(type.icon);
              return (
                <label key={type.value} className="flex items-center p-4 border-2 rounded-xl cursor-pointer hover:bg-blue-50 transition-all duration-200">
                  <input
                    type="radio"
                    name="interviewType"
                    value={type.value}
                    checked={interviewType === type.value}
                    onChange={(e) => onInterviewTypeChange(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 border-2 rounded-full mr-4 flex items-center justify-center ${
                    interviewType === type.value 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300'
                  }`}>
                    {interviewType === type.value && (
                      <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="text-blue-600 mr-2"><Icon className="w-5 h-5" /></span>
                      <span className="font-semibold text-gray-800">{type.label}</span>
                    </div>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Company Information */}
        <CompanyInfoForm 
          companyInfo={companyInfo}
          onCompanyInfoChange={onCompanyInfoChange}
        />

        {/* Resume Upload */}
        <ResumeUpload 
          selectedFile={selectedFile}
          onFileSelect={onFileSelect}
        />

        {/* Start Interview Button */}
        <Button
          onClick={onStartInterview}
          disabled={!isFormComplete || isLoading}
          loading={isLoading}
          icon={Sparkles}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Starting Interview...' : 'Start Interview'}
        </Button>
      </Card>
    </div>
  );
};

export default InterviewSetup; 
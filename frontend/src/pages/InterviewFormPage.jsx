import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewService } from '../services/interviewService';
import InterviewSetup from '../components/interview/InterviewSetup';

const InterviewFormPage = () => {
  const navigate = useNavigate();
  
  // Form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    type: 'startup',
    role: 'Software Development Engineer',
    level: 'Entry level'
  });
  const [interviewType, setInterviewType] = useState('dsa');
  const [isLoading, setIsLoading] = useState(false);

  // File handlers
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Please select a valid PDF file.');
    }
  };

  const handleCompanyInfoChange = (field, value) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleInterviewTypeChange = (type) => {
    setInterviewType(type);
  };

  // Start interview handler
  const handleStartInterview = async () => {
    if (!selectedFile || !companyInfo.name.trim()) {
      if (window.toast) {
        window.toast.error('Please fill in company information and select a resume file.');
      }
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('resume', selectedFile);
      formData.append('companyInfo', JSON.stringify(companyInfo));
      formData.append('interviewType', interviewType);

      const uploadResponse = await interviewService.uploadResume(formData);
      
      if (window.toast) {
        window.toast.success('Interview setup completed! Starting interview...');
      }
      
      // Navigate to interview session page with session data
      navigate('/interview/session', { 
        replace: true, 
        state: { 
          sessionId: uploadResponse.sessionId,
          interviewType: interviewType,
          companyInfo: companyInfo
        } 
      });
      
    } catch (error) {
      console.error('Error starting interview:', error);
      if (window.toast) {
        window.toast.error(error.response?.data?.error || 'Failed to start interview');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <InterviewSetup
          selectedFile={selectedFile}
          companyInfo={companyInfo}
          interviewType={interviewType}
          onFileSelect={handleFileSelect}
          onCompanyInfoChange={handleCompanyInfoChange}
          onInterviewTypeChange={handleInterviewTypeChange}
          onStartInterview={handleStartInterview}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default InterviewFormPage; 
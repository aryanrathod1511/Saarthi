import React from 'react';
import { X, Download, Share2, Star, TrendingUp, MessageSquare, Clock, Award } from 'lucide-react';

const SummaryModal = ({ isOpen, onClose, summaryData }) => {
  console.log('🔍 SummaryModal render:', { isOpen, hasSummaryData: !!summaryData, summaryData });
  
  if (!isOpen || !summaryData) {
    console.log('❌ SummaryModal not showing:', { isOpen, hasSummaryData: !!summaryData });
    return null;
  }

  console.log('✅ SummaryModal showing with data:', summaryData);

  const { summary, companyInfo, totalRounds, aiQuestionsCount, userResponsesCount, toneAnalysisCount } = summaryData;

  const formatSummary = (text) => {
    if (!text) return [];
    
    // Split by common section headers
    const sections = text.split(/(?=^\d+\.|^[A-Z][A-Z\s]+:|^Overall|^Technical|^Communication|^Behavioral|^Strengths|^Areas|^Recommendations)/gm);
    
    return sections.filter(section => section.trim()).map(section => {
      const lines = section.trim().split('\n');
      const header = lines[0];
      const content = lines.slice(1).join('\n');
      
      return { header, content };
    });
  };

  const sections = formatSummary(summary);

  const downloadSummary = () => {
    const element = document.createElement('a');
    const file = new Blob([summary], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `interview-summary-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const shareSummary = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Interview Summary',
        text: summary.substring(0, 100) + '...',
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(summary);
      alert('Summary copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Interview Summary</h2>
                  <p className="text-blue-100">
                    {companyInfo?.name || 'Company'} - {companyInfo?.role || 'Position'}
                  </p>
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{totalRounds || 0}</div>
                  <div className="text-sm text-blue-100">Total Rounds</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{aiQuestionsCount || 0}</div>
                  <div className="text-sm text-blue-100">Questions Asked</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{userResponsesCount || 0}</div>
                  <div className="text-sm text-blue-100">Your Responses</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{toneAnalysisCount || 0}</div>
                  <div className="text-sm text-blue-100">Tone Analysis</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="text-white hover:text-blue-100 p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {sections.length > 0 ? (
            <div className="space-y-6">
              {sections.map((section, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    {section.header.includes('Strengths') && <Star className="w-5 h-5 text-green-600 mr-2" />}
                    {section.header.includes('Improvement') && <TrendingUp className="w-5 h-5 text-orange-600 mr-2" />}
                    {section.header.includes('Communication') && <MessageSquare className="w-5 h-5 text-blue-600 mr-2" />}
                    {section.header.includes('Overall') && <Award className="w-5 h-5 text-purple-600 mr-2" />}
                    {section.header}
                  </h3>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="prose max-w-none text-gray-700 leading-relaxed">
              {summary.split('\n').map((line, index) => (
                <p key={index} className="mb-3">{line}</p>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={downloadSummary}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
              <button
                onClick={shareSummary}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SummaryModal; 
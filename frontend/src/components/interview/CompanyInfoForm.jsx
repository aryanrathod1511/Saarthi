import React from 'react';
import { Building } from 'lucide-react';
import Input from '../common/Input';
import Select from '../common/Select';
import { COMPANY_TYPES, ROLES, LEVELS } from '../../utils/constants';

const CompanyInfoForm = ({ companyInfo, onCompanyInfoChange }) => {
  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <Building className="w-5 h-5 mr-2 text-blue-600" />
        Company Information
      </h3>
      
      <div className="space-y-4">
        <Input
          label="Company Name *"
          value={companyInfo.name}
          onChange={(e) => onCompanyInfoChange('name', e.target.value)}
          placeholder="e.g., Google, Microsoft, Startup XYZ"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Company Type"
            value={companyInfo.type}
            onChange={(e) => onCompanyInfoChange('type', e.target.value)}
            options={COMPANY_TYPES}
          />

          <Select
            label="Role"
            value={companyInfo.role}
            onChange={(e) => onCompanyInfoChange('role', e.target.value)}
            options={ROLES}
          />
        </div>

        <Select
          label="Level"
          value={companyInfo.level}
          onChange={(e) => onCompanyInfoChange('level', e.target.value)}
          options={LEVELS}
        />
      </div>
    </div>
  );
};

export default CompanyInfoForm; 
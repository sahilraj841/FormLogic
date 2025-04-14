import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function FormList({ forms }) {
  const [selectedValues, setSelectedValues] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [navigationHistory, setNavigationHistory] = useState([1]); // Initialize with step 1
  const navigate = useNavigate();

  // Group forms by step
  const formsByStep = forms.reduce((acc, form) => {
    const stepId = form.stepId || 1;
    if (!acc[stepId]) {
      acc[stepId] = [];
    }
    acc[stepId].push(form);
    return acc;
  }, {});

  // Get unique step IDs
  const stepIds = Object.keys(formsByStep).map(Number).sort((a, b) => a - b);

  // Get forms for current step
  const currentStepForms = formsByStep[currentStep] || [];

  const handleSelectChange = (formId, value) => {
    setSelectedValues(prev => {
      const newValues = { ...prev, [formId]: value };
      
      // Find the form that was changed
      const changedFormIndex = currentStepForms.findIndex(f => f.id === formId);
      const subsequentForms = currentStepForms.slice(changedFormIndex + 1);
      
      subsequentForms.forEach(form => {
        delete newValues[form.id];
      });
      
      return newValues;
    });
  };

  const shouldShowTextForm = (form) => {
    if (!form.displayConditions) return true;
  
    const { conditions, action } = form.displayConditions;
    if (!Array.isArray(conditions) || conditions.length === 0) return true;
  
    let shouldShow = false; 
    let tempAndResult = true; 
  
    for (let i = 0; i < conditions.length; i++) {
      const cond = conditions[i];
  
      if (!cond.formId || !cond.selectedValue) continue; 
  
      const isMatch = selectedValues[cond.formId] === cond.selectedValue;
  
      if (i === 0) {
        tempAndResult = isMatch;
        shouldShow = isMatch;
      } else {
        const prevCond = conditions[i - 1];
  
        if (prevCond.logicalOperator === 'AND') {
          tempAndResult = tempAndResult && isMatch;
        } else { // OR condition
          shouldShow = shouldShow || tempAndResult; // Finalize previous AND block
          tempAndResult = isMatch; // Reset for new AND block
        }
      }
    }
    shouldShow = shouldShow || tempAndResult; // Ensure last AND block is considered
  
    return action === 'SHOW' ? shouldShow : !shouldShow;
  };

  // Sort forms so parents come before children
  const sortedForms = [...currentStepForms].sort((a, b) => {
    if (a.fields.hasParent && !b.fields.hasParent) return 1;
    if (!a.fields.hasParent && b.fields.hasParent) return -1;
    return 0;
  });

  const handleNextStep = () => {
    const currentStepForms = formsByStep[currentStep] || [];
    const formWithLogic = currentStepForms.find(form => 
      form.displayConditions?.conditions?.length > 0
    );

    if (formWithLogic) {
      const { conditions, targetStep } = formWithLogic.displayConditions;
      
      // Check if conditions are met
      let conditionsMet = false;
      let tempAndResult = true;

      for (let i = 0; i < conditions.length; i++) {
        const cond = conditions[i];
        const isMatch = selectedValues[cond.formId] === cond.selectedValue;

        if (i === 0) {
          tempAndResult = isMatch;
          conditionsMet = isMatch;
        } else {
          const prevCond = conditions[i - 1];
          if (prevCond.logicalOperator === 'AND') {
            tempAndResult = tempAndResult && isMatch;
          } else {
            conditionsMet = conditionsMet || tempAndResult;
            tempAndResult = isMatch;
          }
        }
      }

      conditionsMet = conditionsMet || tempAndResult;

      // If conditions are met, jump to target step
      if (conditionsMet && targetStep) {
        setCurrentStep(targetStep);
        setNavigationHistory(prev => [...prev, targetStep]);
        return;
      }
    }

    // If no conditions or conditions not met, go to next step
    const nextStep = Math.min(stepIds.length, currentStep + 1);
    setCurrentStep(nextStep);
    setNavigationHistory(prev => [...prev, nextStep]);
  };

  const handlePreviousStep = () => {
    if (navigationHistory.length <= 1) {
      // If we're at the beginning of history, just go to previous step
      setCurrentStep(prev => Math.max(1, prev - 1));
      return;
    }

    // Remove current step from history
    const newHistory = navigationHistory.slice(0, -1);
    setNavigationHistory(newHistory);

    // Go to the previous step in history
    const previousStep = newHistory[newHistory.length - 1];
    setCurrentStep(previousStep);
  };

  const renderForm = (form) => {
    // For text forms, check conditions
    if (form.type === 'text') {
      if (!shouldShowTextForm(form)) {
        return null; // Don't render if conditions aren't met
      }

      return (
        <div key={form.id} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {form.fields.label || 'Untitled Form'}
          </label>
          <input
            type="text"
            value={form.fields.mapping}
            onChange={(e) => {
              // Update the mapping value in the form state
              setForms(prev => prev.map(f => {
                if (f.id === form.id) {
                  return { ...f, fields: { ...f.fields, mapping: e.target.value } };
                }
                return f;
              }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder={`Enter ${form.fields.label}`}
          />
        </div>
      );
    }
    // For forms with parent
    if (form.fields.hasParent) {
      const parentForm = forms.find(f => f.id === Number(form.fields.selectedParentId));
      const parentSelected = selectedValues[parentForm?.id];
      
      if (!parentSelected) return null;
      // Get relevant options if parent is selected
      const relevantOptions = parentSelected 
        ? form.addedOptions.filter(opt => opt.parentOption === parentSelected)
        : [];

      return (
        <div key={form.id} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {form.fields.label || 'Untitled Form'}
          </label>
          <select
            value={selectedValues[form.id] || ''}
            onChange={(e) => handleSelectChange(form.id, e.target.value)}
            disabled={!parentSelected}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white
              ${!parentSelected ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          >
            <option value="">
              {!parentSelected 
                ? `Select ${parentForm?.fields.label || 'parent'} first` 
                : `Select ${form.fields.label || 'option'}`}
            </option>
            {parentSelected && relevantOptions.map(option => (
              <option key={option.id} value={option.option1}>
                {option.option1}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // For forms without parent
    return (
      <div key={form.id} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {form.fields.label || 'Untitled Form'}
        </label>
        <select
          value={selectedValues[form.id] || ''}
          onChange={(e) => handleSelectChange(form.id, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Select {form.fields.label}</option>
          {form.addedOptions.map(option => (
            <option key={option.id} value={option.option1}>
              {option.option1}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">Form List</h1>
            <button
              onClick={() => navigate('/')}
              className="bg-gray-500 text-white rounded-md py-2 px-4 hover:bg-gray-600"
            >
              Back to Form Creator
            </button>
          </div>

          {/* Step Selector */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              {stepIds.map(stepId => (
                <button
                  key={stepId}
                  className={`px-4 py-2 rounded-md ${
                    currentStep === stepId 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Step {stepId}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePreviousStep}
                disabled={currentStep === 1}
                className={`px-4 py-2 rounded-md ${
                  currentStep === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                Previous
              </button>
              <button
                onClick={handleNextStep}
                disabled={currentStep === stepIds.length}
                className={`px-4 py-2 rounded-md ${
                  currentStep === stepIds.length
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                Next
              </button>
            </div>
          </div>
          
          {sortedForms.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No forms in this step.</p>
          ) : (
            <div className="space-y-6">
              {sortedForms.map(form => renderForm(form))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FormList; 
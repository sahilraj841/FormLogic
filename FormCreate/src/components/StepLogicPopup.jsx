import React, { useState, useEffect } from 'react';

function StepLogicPopup({ forms, currentStep, onClose, onSave, totalSteps }) {
  const [conditions, setConditions] = useState([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [targetStep, setTargetStep] = useState(currentStep + 1);

  // Find the first form in the current step that has step logic
  const currentStepForm = forms.find(form => 
    form.stepId === currentStep && 
    form.displayConditions?.logicType === 'step'
  );

  // Initialize with existing conditions if they exist
  useEffect(() => {
    if (currentStepForm?.displayConditions) {
      setConditions(currentStepForm.displayConditions.conditions || []);
      setTargetStep(currentStepForm.displayConditions.targetStep || currentStep + 1);
    }
  }, [currentStepForm, currentStep]);

  const selectForms = forms.filter(form => form.type === 'select');

  const addCondition = () => {
    if (selectedForm && selectedOption) {
      const formData = forms.find(f => f.id === Number(selectedForm));
      setConditions(prev => [...prev, {
        id: Date.now(),
        formId: selectedForm,
        formLabel: formData.fields.label,
        selectedValue: selectedOption,
        logicalOperator: 'AND' 
      }]);
      setSelectedForm('');
      setSelectedOption('');
    }
  };

  const removeCondition = (conditionId) => {
    setConditions(prev => prev.filter(c => c.id !== conditionId));
  };

  const handleLogicalOperatorChange = (conditionId, value) => {
    setConditions(prev => prev.map(condition => {
      if (condition.id === conditionId) {
        return { ...condition, logicalOperator: value };
      }
      return condition;
    }));
  };

  const handleSave = () => {
    onSave({
      conditions,
      action: 'STEP',
      targetStep,
      logicType: 'step'
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40"></div>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            
            <h2 className="text-xl font-bold mb-6">Add Step Navigation Logic</h2>

            {/* IF Section */}
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <span className="text-lg font-semibold text-gray-700">IF</span>
                <div className="flex-1 flex items-center space-x-2">
                  <select
                    value={selectedForm}
                    onChange={(e) => setSelectedForm(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="">Select Field</option>
                    {selectForms.map(form => (
                      <option key={form.id} value={form.id}>
                        {form.fields.label || 'Untitled Form'}
                      </option>
                    ))}
                  </select>

                  <span className="font-medium">IS</span>

                  <select
                    value={selectedOption}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    disabled={!selectedForm}
                  >
                    <option value="">Select Value</option>
                    {forms
                      .find(f => f.id === Number(selectedForm))
                      ?.addedOptions.map(option => (
                        <option key={option.id} value={option.option1}>
                          {option.option1}
                        </option>
                      ))}
                  </select>

                  <button
                    onClick={addCondition}
                    disabled={!selectedForm || !selectedOption}
                    className={`px-4 py-2 rounded-md ${
                      !selectedForm || !selectedOption
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    }`}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Added Conditions */}
              {conditions.length > 0 && (
                <div className="space-y-2 ml-14">
                  {conditions.map((condition, index) => (
                    <div key={condition.id}>
                      <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <span className="text-sm font-medium">
                          {condition.formLabel} IS {condition.selectedValue}
                        </span>
                        <button
                          onClick={() => removeCondition(condition.id)}
                          className="text-red-500 hover:text-red-600 ml-2"
                        >
                          ✕
                        </button>
                      </div>
                      {index < conditions.length - 1 && (
                        <div className="flex items-center py-1 px-4">
                          <select
                            value={condition.logicalOperator}
                            onChange={(e) => handleLogicalOperatorChange(condition.id, e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* THEN Section */}
            <div className="mb-6">
              <div className="flex flex-col space-y-4">
                <span className="text-lg font-semibold text-gray-700">THEN</span>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700">Jump to Step:</span>
                  <select
                    value={targetStep}
                    onChange={(e) => setTargetStep(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    {Array.from({ length: totalSteps }, (_, i) => i + 1).map(step => (
                      <option key={step} value={step}>
                        Step {step}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleSave}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md"
              >
                Save Logic
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default StepLogicPopup; 
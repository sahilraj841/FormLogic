import React, { useState, useEffect } from 'react'
import FormList from './FormList'
import LogicPopup from './LogicPopup'
import StepLogicPopup from './StepLogicPopup'
import { useNavigate } from 'react-router-dom'

function Home({ forms, setForms }) {
  const [showFormList, setShowFormList] = useState(false);
  const [showLogicPopup, setShowLogicPopup] = useState(false);
  const [showStepLogicPopup, setShowStepLogicPopup] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [formType, setFormType] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState([{ id: 1, forms: [] }]);
  const navigate = useNavigate();

  // Initialize steps with existing forms when component mounts
  useEffect(() => {
    if (forms && forms.length > 0) {
      // Group forms by their step
      const formsByStep = forms.reduce((acc, form) => {
        const stepId = form.stepId || 1; // Default to step 1 if no stepId
        if (!acc[stepId]) {
          acc[stepId] = [];
        }
        acc[stepId].push(form);
        return acc;
      }, {});

      // Create steps array with forms
      const newSteps = Object.entries(formsByStep).map(([stepId, stepForms]) => ({
        id: parseInt(stepId),
        forms: stepForms
      }));

      // Sort steps by id
      newSteps.sort((a, b) => a.id - b.id);
      
      // Set current step to the last step
      setCurrentStep(newSteps.length);
      setSteps(newSteps);
    }
  }, [forms]);

  const createNewForm = (type) => {
    setFormType(type);
    const newForm = type === 'select' ? {
      id: Date.now(),
      type: 'select',
      fields: {
        label: '',
        mapping: '',
        hasParent: false,
        parentMapping: '',
        selectedParentId: '',
        option1: '',
        option2: ''
      },
      addedOptions: [],
      parentSpecificOptions: {},
      stepId: currentStep // Add stepId to new form
    } : {
      id: Date.now(),
      type: 'text',
      fields: {
        label: '',
        mapping: ''
      },
      displayConditions: [],
      stepId: currentStep // Add stepId to new form
    };

    setSteps(prev => prev.map(step => 
      step.id === currentStep 
        ? { ...step, forms: [...step.forms, newForm] }
        : step
    ));
  };

  const handleStepClick = () => {
    setCurrentStep(prev => prev + 1);
    setSteps(prev => [...prev, { id: prev.length + 1, forms: [] }]);
  };

  const handleInputChange = (formId, e, parentOption = null) => {
    const { name, value } = e.target;
    setSteps(prev => prev.map(step => ({
      ...step,
      forms: step.forms.map(form => {
        if (form.id === formId) {
          if (parentOption) {
            return {
              ...form,
              parentSpecificOptions: {
                ...form.parentSpecificOptions,
                [parentOption.option1]: {
                  ...form.parentSpecificOptions[parentOption.option1],
                  [name]: value
                }
              }
            };
          }
          return {
            ...form,
            fields: {
              ...form.fields,
              [name]: value
            }
          };
        }
        return form;
      })
    })));
  };

  const handleParentSelect = (formId, parentId) => {
    setSteps(prev => prev.map(step => ({
      ...step,
      forms: step.forms.map(form => {
        if (form.id === formId) {
          const allForms = prev.flatMap(s => s.forms);
          const parentForm = allForms.find(f => f.id === parentId);
          return {
            ...form,
            fields: {
              ...form.fields,
              selectedParentId: parentId,
              parentMapping: parentForm ? parentForm.fields.mapping : ''
            },
            parentSpecificOptions: {},
            addedOptions: []
          };
        }
        return form;
      })
    })));
  };

  const handleAddOptions = (formId, parentOption = null) => {
    setSteps(prev => prev.map(step => ({
      ...step,
      forms: step.forms.map(form => {
        if (form.id === formId) {
          if (parentOption) {
            const parentOptions = form.parentSpecificOptions[parentOption.option1] || {};
            if (!parentOptions.option1?.trim() || !parentOptions.option2?.trim()) return form;

            const newOption = {
              id: Date.now(),
              option1: parentOptions.option1,
              option2: parentOptions.option2,
              parentOption: parentOption.option1
            };

            return {
              ...form,
              addedOptions: [...form.addedOptions, newOption],
              parentSpecificOptions: {
                ...form.parentSpecificOptions,
                [parentOption.option1]: {
                  option1: '',
                  option2: ''
                }
              }
            };
          } else {
            if (!form.fields.option1.trim() || !form.fields.option2.trim()) return form;

            return {
              ...form,
              addedOptions: [...form.addedOptions, {
                id: Date.now(),
                option1: form.fields.option1,
                option2: form.fields.option2
              }],
              fields: {
                ...form.fields,
                option1: '',
                option2: ''
              }
            };
          }
        }
        return form;
      })
    })));
  };

  const handleRemoveOption = (formId, optionId) => {
    setSteps(prev => {
      const allForms = prev.flatMap(s => s.forms);
      const form = allForms.find(f => f.id === formId);
      if (!form) return prev;

      const optionToRemove = form.addedOptions.find(opt => opt.id === optionId);
      if (!optionToRemove) return prev;

      // Helper function to check if an option has children across all forms
      const hasChildOptions = (optionValue) => {
        return allForms.some(otherForm => 
          otherForm.fields.hasParent &&
          otherForm.addedOptions.some(childOpt => childOpt.parentOption === optionValue)
        );
      };

      // Prevent removal if the option has any children (direct or indirect)
      if (hasChildOptions(optionToRemove.option1)) {
        alert("Cannot remove this option as it has child options in other forms. Please remove the child options first.");
        return prev;
      }

      // If no children, remove the option
      return prev.map(step => ({
        ...step,
        forms: step.forms.map(f => 
          f.id === formId 
            ? { ...f, addedOptions: f.addedOptions.filter(opt => opt.id !== optionId) }
            : f
        )
      }));
    });
  };

  const toggleParent = (formId) => {
    setSteps(prev => prev.map(step => ({
      ...step,
      forms: step.forms.map(form => {
        if (form.id === formId) {
          return {
            ...form,
            fields: {
              ...form.fields,
              hasParent: !form.fields.hasParent,
              parentMapping: '',
              selectedParentId: ''
            },
            parentSpecificOptions: {},
            addedOptions: []
          };
        }
        return form;
      })
    })));
  };

  const removeForm = (formId) => {
    setSteps(prev => {
      const allForms = prev.flatMap(s => s.forms);
      const formToRemove = allForms.find(f => f.id === formId);
      if (!formToRemove) return prev;

      const hasChildForms = allForms.some(otherForm => 
        otherForm.id !== formId && 
        otherForm.fields.hasParent && 
        otherForm.fields.selectedParentId === "" + formId
      );

      if (hasChildForms) {
        alert("Cannot remove this form as it has child forms. Please remove the child forms first.");
        return prev;
      }

      return prev.map(step => ({
        ...step,
        forms: step.forms.filter(form => form.id !== formId)
      }));
    });
  };

  const getAvailableParents = (currentFormId) => {
    return steps.flatMap(step => step.forms).filter(form => form.id !== currentFormId);
  };

  const isFormParent = (formId) => {
    return steps.flatMap(step => step.forms).some(otherForm => 
      otherForm.id !== formId && 
      otherForm.fields.hasParent && 
      Number(otherForm.fields.selectedParentId) === formId
    );
  };

  const getParentForm = (parentId) => {
    return steps.flatMap(step => step.forms).find(form => form.id === Number(parentId));
  };

  const handleSaveLogic = (formId, logicData) => {
    setSteps(prev => prev.map(step => ({
      ...step,
      forms: step.forms.map(form => {
        if (form.id === formId) {
          return {
            ...form,
            displayConditions: logicData
          };
        }
        return form;
      })
    })));
  };

  const handleSaveStepLogic = (logicData) => {
    // Find the first form in the current step to attach the logic to
    const currentStepForms = steps.find(s => s.id === currentStep)?.forms || [];
    if (currentStepForms.length > 0) {
      const firstFormId = currentStepForms[0].id;
      setSteps(prev => prev.map(step => ({
        ...step,
        forms: step.forms.map(form => {
          if (form.id === firstFormId) {
            return {
              ...form,
              displayConditions: logicData
            };
          }
          return form;
        })
      })));
    }
  };

  const renderForm = (form) => {
    if (form.type === 'text') {
      return (
        <div key={form.id} className="mt-6 max-w-md mx-auto bg-white rounded-lg shadow-md p-6 relative">
          <button
            onClick={() => removeForm(form.id)}
            className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
          >
            ✕
          </button>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label
              </label>
              <input
                type="text"
                name="label"
                value={form.fields.label}
                onChange={(e) => handleInputChange(form.id, e)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter label"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mapping
              </label>
              <input
                type="text"
                name="mapping"
                value={form.fields.mapping}
                onChange={(e) => handleInputChange(form.id, e)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter mapping"
              />
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                {form.displayConditions?.conditions?.length > 0 && (
                  <div className="text-sm text-gray-500">
                    {/* <span className="font-medium">Logic:</span> {form.displayConditions.conditions.length} condition(s) with {form.displayConditions.logicalOperator} operator */}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedFormId(form.id);
                  setShowLogicPopup(true);
                }}
                className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600"
              >
                Add Logic
              </button>
            </div>
          </div>
        </div>
      );
    }

    
    return (
      <div key={form.id} className="mt-6 max-w-md mx-auto bg-white rounded-lg shadow-md p-6 relative">
        <button
          onClick={() => removeForm(form.id)}
          className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
        >
          ✕
        </button>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Label
            </label>
            <input
              type="text"
              name="label"
              value={form.fields.label}
              onChange={(e) => handleInputChange(form.id, e)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter label"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mapping
            </label>
            <input
              type="text"
              name="mapping"
              value={form.fields.mapping}
              onChange={(e) => handleInputChange(form.id, e)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter mapping"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Has Parent</span>
            <label className={`relative inline-flex items-center ${isFormParent(form.id) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={form.fields.hasParent}
                onChange={() => !isFormParent(form.id) && toggleParent(form.id)}
                disabled={isFormParent(form.id)}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                peer-focus:ring-blue-300 rounded-full peer 
                ${form.fields.hasParent ? 'peer-checked:bg-blue-600' : ''} 
                peer-checked:after:translate-x-full after:content-[''] after:absolute 
                after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 
                after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                ${isFormParent(form.id) ? 'opacity-50' : ''}`}>
              </div>
            </label>
          </div>

          {form.fields.hasParent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Parent
              </label>
              <div className="relative">
                <select
                  value={form.fields.selectedParentId}
                  onChange={(e) => handleParentSelect(form.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select a parent</option>
                  {getAvailableParents(form.id).map(parentForm => (
                    <option key={parentForm.id} value={parentForm.id}>
                      {parentForm.fields.label || 'Untitled Form'}
                    </option>
                  ))}
                </select>
              </div>
              {form.fields.parentMapping && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Mapping
                  </label>
                  <input
                    type="text"
                    value={form.fields.parentMapping}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              )}
            </div>
          )}

          {!form.fields.hasParent && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Add Options
              </label>
              <div className="flex gap-x-2">
                <input
                  type="text"
                  name="option1"
                  value={form.fields.option1}
                  onChange={(e) => handleInputChange(form.id, e)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Option 1"
                />
                <input
                  type="text"
                  name="option2"
                  value={form.fields.option2}
                  onChange={(e) => handleInputChange(form.id, e)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Option 2"
                />
                <button
                  onClick={() => handleAddOptions(form.id)}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {form.fields.hasParent && form.fields.selectedParentId && (
            <div className="space-y-4">
              {getParentForm(form.fields.selectedParentId)?.addedOptions.map(parentOption => (
                <div key={parentOption.id} className="border border-gray-200 rounded-md p-4">
                  <h3 className="text-md font-medium mb-2">Options for {parentOption.option1}</h3>
                  <div className="flex gap-x-2">
                    <input
                      type="text"
                      name="option1"
                      value={form.parentSpecificOptions[parentOption.option1]?.option1 || ''}
                      onChange={(e) => handleInputChange(form.id, e, parentOption)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Option 1"
                    />
                    <input
                      type="text"
                      name="option2"
                      value={form.parentSpecificOptions[parentOption.option1]?.option2 || ''}
                      onChange={(e) => handleInputChange(form.id, e, parentOption)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Option 2"
                    />
                    <button
                      onClick={() => handleAddOptions(form.id, parentOption)}
                      className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {form.addedOptions.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Added Options
              </label>
              <div className="space-y-2">
                {form.addedOptions.map(option => (
                  <div key={option.id} className="flex items-center gap-x-2 bg-gray-50 p-2 rounded-md">
                    {option.parentOption && (
                      <span className="text-sm text-gray-500">{option.parentOption}:</span>
                    )}
                    <span className="flex-1">{option.option1}</span>
                    <span className="flex-1">{option.option2}</span>
                    <button
                      onClick={() => handleRemoveOption(form.id, option.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStep = (step) => {
    return (
      <div key={step.id} className={`mb-8 ${step.id !== currentStep ? 'hidden' : ''}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Step {step.id}</h2>
          <div className="flex gap-x-4">
            <button 
              onClick={() => createNewForm('select')}
              className="bg-black text-white rounded-md py-2 px-4 hover:bg-gray-800"
            >
              Select
            </button>
            <button 
              onClick={() => createNewForm('text')}
              className="bg-black text-white rounded-md py-2 px-4 hover:bg-gray-800"
            >
              Text
            </button>
          </div>
        </div>
        <div className="space-y-6">
          {step.forms.map(form => renderForm(form))}
        </div>
        <div className="flex justify-center mt-8 mb-8">
          {step.id === steps.length ? (
            <button
              onClick={() => {
                // Set all forms for display without storing in localStorage
                const allForms = steps.flatMap(step => 
                  step.forms.map(form => ({
                    ...form,
                    stepId: step.id
                  }))
                );
                setForms(allForms);
                navigate('/formList');
              }}
              className="bg-blue-500 text-white rounded-md py-2 px-6 hover:bg-blue-600"
            >
              View Form List
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(step.id + 1)}
              className="bg-green-500 text-white rounded-md py-2 px-6 hover:bg-green-600"
            >
              Next Step
            </button>
          )}
        </div>
      </div>
    );
  };

  const removeStep = (stepId) => {
    // Don't allow removing the last step
    if (steps.length === 1) {
      alert("Cannot remove the last step");
      return;
    }

    // If current step is being removed, set current step to the previous step
    if (currentStep === stepId) {
      setCurrentStep(stepId - 1);
    } else if (currentStep > stepId) {
      // If current step is after the removed step, adjust current step
      setCurrentStep(currentStep - 1);
    }

    // Remove the step and renumber remaining steps
    setSteps(prev => {
      const remainingSteps = prev.filter(step => step.id !== stepId);
      return remainingSteps.map((step, index) => ({
        ...step,
        id: index + 1,
        forms: step.forms.map(form => ({
          ...form,
          stepId: index + 1
        }))
      }));
    });
  };

  return (
    <div className="py-4 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="bold text-lg">Create Fields!!</h1>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowStepLogicPopup(true)}
            className="bg-purple-500 text-white rounded-md py-2 px-6 hover:bg-purple-600 flex items-center gap-2"
          >
            <span>Add Step Logic</span>
          </button>
          <button 
            onClick={handleStepClick}
            className="bg-green-500 text-white rounded-md py-2 px-6 hover:bg-green-600 flex items-center gap-2"
          >
            <span>Add Step</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {steps.map(step => (
          <div key={step.id} className="flex items-center gap-1">
            <button
              onClick={() => setCurrentStep(step.id)}
              className={`px-4 py-2 rounded-md ${
                currentStep === step.id 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Step {step.id}
            </button>
            <button
              onClick={() => removeStep(step.id)}
              className="text-gray-500 hover:text-red-500 px-2 py-2 rounded-md hover:bg-gray-100"
              title="Remove Step"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {steps.map(step => renderStep(step))}

      {showLogicPopup && (
        <LogicPopup
          forms={steps.flatMap(step => step.forms)}
          currentForm={steps.flatMap(step => step.forms).find(f => f.id === selectedFormId)}
          onClose={() => setShowLogicPopup(false)}
          onSave={(logicData) => {
            handleSaveLogic(selectedFormId, logicData);
            setShowLogicPopup(false);
          }}
        />
      )}

      {showStepLogicPopup && (
        <StepLogicPopup
          forms={steps.flatMap(step => step.forms)}
          currentStep={currentStep}
          onClose={() => setShowStepLogicPopup(false)}
          onSave={(logicData) => {
            handleSaveStepLogic(logicData);
            setShowStepLogicPopup(false);
          }}
          totalSteps={steps.length}
        />
      )}
    </div>
  )
}

export default Home

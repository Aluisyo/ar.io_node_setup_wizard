import React, { useState, useEffect, useCallback } from 'react';
import { Code, Eye, Plus, Trash2, ChevronDown } from 'lucide-react';

interface FilterRule {
  field: string;
  operator: string;
  value: string;
  type: 'string' | 'number' | 'boolean';
}

interface ANS104Filter {
  never?: boolean;
  always?: boolean;
  attributes?: {
    [key: string]: any;
  };
  tags?: Array<{
    name: string;
    value?: string;
    valueStartsWith?: string;
  }>;
  isNestedBundle?: boolean;
  hashPartition?: {
    partitionCount: number;
    partitionKey: string;
    targetPartitions: number[];
  };
  and?: ANS104Filter[];
  or?: ANS104Filter[];
  not?: ANS104Filter;
}

interface ANS104FilterBuilderProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  description: string;
  placeholder?: string;
}

const COMMON_FIELDS = [
  { value: 'never', label: 'Never Process', type: 'boolean' },
  { value: 'always', label: 'Always Process', type: 'boolean' },
  { value: 'owners', label: 'Owner Addresses', type: 'array' },
  { value: 'targets', label: 'Target Addresses', type: 'array' },
];

const TAG_FIELDS = [
  'Content-Type',
  'App-Name', 
  'App-Version',
  'Protocol',
  'Data-Protocol',
  'Variant',
  'Render-With',
  'Bundler-App-Name',
  'Bundle-Format',
  'Bundle-Version',
  'Type',
  'IPFS-Add',
  'Entity-Type',
  'Contract',
  'Input',
];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'in', label: 'In Array' },
  { value: 'not_in', label: 'Not In Array' },
];

export const ANS104FilterBuilder: React.FC<ANS104FilterBuilderProps> = ({
  value,
  onChange,
  label,
  description,
  placeholder = '{"never": true}',
}) => {
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [filter, setFilter] = useState<ANS104Filter>({ never: true });
  const [tagRules, setTagRules] = useState<Array<{ name: string; values: string[]; matchType: 'exact' | 'startsWith' | 'nameOnly' }>>([]);
  const [ownersList, setOwnersList] = useState<string[]>([]);
  const [targetsList, setTargetsList] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<Array<{ key: string; value: string; type: 'string' | 'number' }>>([]);
  const [codeValue, setCodeValue] = useState(placeholder || '{"never": true}');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from incoming value only once or when value changes externally
  useEffect(() => {
    try {
      if (value) {
        const parsed = JSON.parse(value);
        setFilter(parsed);
        setCodeValue(value);
        
        // Extract tag rules - handle different tag formats
        if (parsed.tags) {
          const extractedTagRules = parsed.tags.map((tag: any) => ({
            name: tag.name || '',
            values: tag.value ? [tag.value] : (tag.values || [])  
          }));
          setTagRules(extractedTagRules);
        } else {
          setTagRules([]);
        }
        
        // Extract owners
        setOwnersList(parsed.owners || []);
        
        // Extract targets
        setTargetsList(parsed.targets || []);
        
        // Extract attributes
        if (parsed.attributes) {
          const extractedAttrs = Object.entries(parsed.attributes).map(([key, value]) => ({
            key,
            value: String(value),
            type: typeof value === 'number' ? 'number' as const : 'string' as const
          }));
          setAttributes(extractedAttrs);
        } else {
          setAttributes([]);
        }
        
      } else if (!isInitialized) {
        // Set defaults only if not initialized yet
        const defaultFilter = { never: true };
        setFilter(defaultFilter);
        setTagRules([]);
        setOwnersList([]);
        setTargetsList([]);
        const defaultJson = JSON.stringify(defaultFilter, null, 2);
        setCodeValue(defaultJson);
        onChange(defaultJson);
      }
      setIsInitialized(true);
    } catch (error) {
      console.warn('Invalid JSON filter:', error);
      if (value) {
        setCodeValue(value);
      } else {
        const defaultFilter = { never: true };
        setFilter(defaultFilter);
        setTagRules([]);
        setOwnersList([]);
        setTargetsList([]);
        const defaultJson = JSON.stringify(defaultFilter, null, 2);
        setCodeValue(defaultJson);
        if (!isInitialized) {
          onChange(defaultJson);
        }
      }
      setIsInitialized(true);
    }
  }, [value]); // Remove onChange from deps to prevent infinite loop

  // Update JSON when visual mode changes
  useEffect(() => {
    if (mode === 'visual' && isInitialized) {
      const newFilter: ANS104Filter = { ...filter };
      
      // Clean up filter - remove empty arrays and undefined values
      if (tagRules.length > 0) {
        const validTags = tagRules.filter(rule => rule.name && rule.values.some(v => v.trim()));
        if (validTags.length > 0) {
          newFilter.tags = validTags.map(rule => ({
            name: rule.name,
            value: rule.values.length === 1 ? rule.values[0] : undefined,
            values: rule.values.length > 1 ? rule.values.filter(v => v.trim()) : undefined
          })).filter(tag => tag.name); // Remove empty tag names
        }
      }
      
      if (ownersList.length > 0) {
        const validOwners = ownersList.filter(owner => owner.trim());
        if (validOwners.length > 0) {
          newFilter.owners = validOwners;
        }
      }
      
      if (targetsList.length > 0) {
        const validTargets = targetsList.filter(target => target.trim());
        if (validTargets.length > 0) {
          newFilter.targets = validTargets;
        }
      }
      
      if (attributes.length > 0) {
        const validAttrs = attributes.filter(attr => attr.key && attr.value.trim());
        if (validAttrs.length > 0) {
          newFilter.attributes = {};
          validAttrs.forEach(attr => {
            if (newFilter.attributes) {
              newFilter.attributes[attr.key] = attr.type === 'number' ? parseFloat(attr.value) || attr.value : attr.value;
            }
          });
        }
      }

      const jsonString = JSON.stringify(newFilter, null, 2);
      if (jsonString !== codeValue) {
        setCodeValue(jsonString);
        onChange(jsonString);
      }
    }
  }, [filter, tagRules, ownersList, targetsList, attributes, mode, isInitialized]); // Managed dependencies carefully

  const addTagRule = () => {
    setTagRules([...tagRules, { name: '', values: [''] }]);
  };

  const updateTagRule = (index: number, field: 'name' | 'values', value: string | string[]) => {
    const newRules = [...tagRules];
    if (field === 'values') {
      newRules[index].values = value as string[];
    } else {
      newRules[index].name = value as string;
    }
    setTagRules(newRules);
  };

  const removeTagRule = (index: number) => {
    setTagRules(tagRules.filter((_, i) => i !== index));
  };

  const addTagValue = (ruleIndex: number) => {
    const newRules = [...tagRules];
    newRules[ruleIndex].values.push('');
    setTagRules(newRules);
  };

  const updateTagValue = (ruleIndex: number, valueIndex: number, value: string) => {
    const newRules = [...tagRules];
    newRules[ruleIndex].values[valueIndex] = value;
    setTagRules(newRules);
  };

  const removeTagValue = (ruleIndex: number, valueIndex: number) => {
    const newRules = [...tagRules];
    newRules[ruleIndex].values = newRules[ruleIndex].values.filter((_, i) => i !== valueIndex);
    setTagRules(newRules);
  };

  const addOwner = () => {
    setOwnersList([...ownersList, '']);
  };

  const updateOwner = (index: number, value: string) => {
    const newList = [...ownersList];
    newList[index] = value;
    setOwnersList(newList);
  };

  const removeOwner = (index: number) => {
    setOwnersList(ownersList.filter((_, i) => i !== index));
  };

  const addTarget = () => {
    setTargetsList([...targetsList, '']);
  };

  const updateTarget = (index: number, value: string) => {
    const newList = [...targetsList];
    newList[index] = value;
    setTargetsList(newList);
  };

  const removeTarget = (index: number) => {
    setTargetsList(targetsList.filter((_, i) => i !== index));
  };

  const handleCodeChange = (newValue: string) => {
    setCodeValue(newValue);
    onChange(newValue);
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(codeValue);
      const formatted = JSON.stringify(parsed, null, 2);
      setCodeValue(formatted);
      onChange(formatted);
    } catch (error) {
      // Invalid JSON, don't format
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-black">
          {label}
        </label>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setMode(mode === 'visual' ? 'code' : 'visual')}
            className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === 'visual'
                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {mode === 'visual' ? (
              <>
                <Code className="w-3 h-3 mr-1" />
                Switch to Code
              </>
            ) : (
              <>
                <Eye className="w-3 h-3 mr-1" />
                Switch to Visual
              </>
            )}
          </button>
        </div>
      </div>

      {mode === 'visual' ? (
        <div className="border border-gray-300 rounded-lg p-4 bg-white space-y-4">
          {/* Quick Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="never"
                checked={filter.never === true}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFilter({ never: true });
                  } else {
                    const { never, ...rest } = filter;
                    setFilter(rest);
                  }
                }}
                className="w-4 h-4 text-black bg-white border-gray-300 rounded focus:ring-black focus:ring-2"
              />
              <label htmlFor="never" className="text-sm font-medium text-gray-700">
                Never process (skip all)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="always"
                checked={filter.always === true}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFilter({ always: true });
                  } else {
                    const { always, ...rest } = filter;
                    setFilter(rest);
                  }
                }}
                className="w-4 h-4 text-black bg-white border-gray-300 rounded focus:ring-black focus:ring-2"
              />
              <label htmlFor="always" className="text-sm font-medium text-gray-700">
                Always process (process all)
              </label>
            </div>
          </div>

          {/* Tag Rules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Tag Filters</h4>
              <button
                type="button"
                onClick={addTagRule}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Tag Rule
              </button>
            </div>
            {tagRules.map((rule, index) => (
              <div key={index} className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    <select
                      value={rule.name}
                      onChange={(e) => updateTagRule(index, 'name', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs bg-white text-gray-900"
                    >
                      <option value="">Select tag name...</option>
                      {TAG_FIELDS.map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                      <option value="custom">Custom...</option>
                    </select>
                    {rule.name === 'custom' && (
                      <input
                        type="text"
                        placeholder="Custom tag name"
                        onChange={(e) => updateTagRule(index, 'name', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-xs bg-white text-gray-900"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTagRule(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Allowed values:</label>
                  {rule.values.map((value, valueIndex) => (
                    <div key={valueIndex} className="flex items-center space-x-1">
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateTagValue(index, valueIndex, e.target.value)}
                        placeholder="Tag value"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs bg-white text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => removeTagValue(index, valueIndex)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addTagValue(index)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    + Add Value
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Owner Addresses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Owner Addresses</h4>
              <button
                type="button"
                onClick={addOwner}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Owner
              </button>
            </div>
            {ownersList.map((owner, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => updateOwner(index, e.target.value)}
                  placeholder="Arweave wallet address (43 characters)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 font-mono"
                />
                <button
                  type="button"
                  onClick={() => removeOwner(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Target Addresses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Target Addresses</h4>
              <button
                type="button"
                onClick={addTarget}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Target
              </button>
            </div>
            {targetsList.map((target, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={target}
                  onChange={(e) => updateTarget(index, e.target.value)}
                  placeholder="Target Arweave address"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 font-mono"
                />
                <button
                  type="button"
                  onClick={() => removeTarget(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Attribute Filters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Attribute Filters</h4>
              <button
                type="button"
                onClick={() => setAttributes([...attributes, { key: '', value: '', type: 'string' }])}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Attribute
              </button>
            </div>
            {attributes.map((attr, index) => (
              <div key={index} className="flex items-center space-x-2">
                <select
                  value={attr.key}
                  onChange={(e) => {
                    const newAttrs = [...attributes];
                    newAttrs[index].key = e.target.value;
                    setAttributes(newAttrs);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-xs bg-white text-gray-900"
                >
                  <option value="">Select attribute...</option>
                  <option value="owner_address">Owner Address</option>
                  <option value="data_size">Data Size</option>
                  <option value="signature">Signature</option>
                  <option value="quantity">Quantity</option>
                  <option value="custom">Custom...</option>
                </select>
                {attr.key === 'custom' && (
                  <input
                    type="text"
                    placeholder="Custom attribute name"
                    onChange={(e) => {
                      const newAttrs = [...attributes];
                      newAttrs[index].key = e.target.value;
                      setAttributes(newAttrs);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-xs bg-white text-gray-900"
                  />
                )}
                <select
                  value={attr.type}
                  onChange={(e) => {
                    const newAttrs = [...attributes];
                    newAttrs[index].type = e.target.value as 'string' | 'number';
                    setAttributes(newAttrs);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-xs bg-white text-gray-900"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                </select>
                <input
                  type={attr.type === 'number' ? 'number' : 'text'}
                  value={attr.value}
                  onChange={(e) => {
                    const newAttrs = [...attributes];
                    newAttrs[index].value = e.target.value;
                    setAttributes(newAttrs);
                  }}
                  placeholder="Attribute value"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs bg-white text-gray-900 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setAttributes(attributes.filter((_, i) => i !== index))}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Advanced Options */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900">Advanced Options</h4>
            
            {/* Nested Bundle Detection */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isNestedBundle"
                checked={filter.isNestedBundle === true}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFilter({ ...filter, isNestedBundle: true });
                  } else {
                    const { isNestedBundle, ...rest } = filter;
                    setFilter(rest);
                  }
                }}
                className="w-4 h-4 text-black bg-white border-gray-300 rounded focus:ring-black focus:ring-2"
              />
              <label htmlFor="isNestedBundle" className="text-sm font-medium text-gray-700">
                Only process nested bundles
              </label>
              <span className="text-xs text-gray-500">(bundles within other bundles)</span>
            </div>

            {/* Hash Partition */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enableHashPartition"
                  checked={!!filter.hashPartition}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFilter({
                        ...filter,
                        hashPartition: {
                          partitionCount: 4,
                          partitionKey: 'id',
                          targetPartitions: [0]
                        }
                      });
                    } else {
                      const { hashPartition, ...rest } = filter;
                      setFilter(rest);
                    }
                  }}
                  className="w-4 h-4 text-black bg-white border-gray-300 rounded focus:ring-black focus:ring-2"
                />
                <label htmlFor="enableHashPartition" className="text-sm font-medium text-gray-700">
                  Enable hash partitioning
                </label>
                <span className="text-xs text-gray-500">(for distributed processing)</span>
              </div>
              
              {filter.hashPartition && (
                <div className="ml-6 space-y-2 p-3 bg-gray-50 border border-gray-200 rounded">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-600">Partition Count:</label>
                      <input
                        type="number"
                        min="2"
                        max="1000"
                        value={filter.hashPartition.partitionCount}
                        onChange={(e) => {
                          const newFilter = { ...filter };
                          if (newFilter.hashPartition) {
                            newFilter.hashPartition.partitionCount = parseInt(e.target.value) || 4;
                          }
                          setFilter(newFilter);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Partition Key:</label>
                      <select
                        value={filter.hashPartition.partitionKey}
                        onChange={(e) => {
                          const newFilter = { ...filter };
                          if (newFilter.hashPartition) {
                            newFilter.hashPartition.partitionKey = e.target.value;
                          }
                          setFilter(newFilter);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white text-gray-900"
                      >
                        <option value="id">Transaction ID</option>
                        <option value="owner_address">Owner Address</option>
                        <option value="owner">Owner Public Key</option>
                        <option value="target">Target</option>
                        <option value="signature">Signature</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Target Partitions (comma-separated):</label>
                    <input
                      type="text"
                      value={filter.hashPartition.targetPartitions.join(', ')}
                      onChange={(e) => {
                        const newFilter = { ...filter };
                        if (newFilter.hashPartition) {
                          newFilter.hashPartition.targetPartitions = e.target.value
                            .split(',')
                            .map(s => parseInt(s.trim()))
                            .filter(n => !isNaN(n));
                        }
                        setFilter(newFilter);
                      }}
                      placeholder="0, 1, 2"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white text-gray-900 font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Partitions are numbered 0 to {(filter.hashPartition.partitionCount || 4) - 1}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={formatJson}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Format JSON
            </button>
          </div>
          <textarea
            value={codeValue}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="w-full font-mono px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-black focus:border-transparent"
            rows={6}
            placeholder={placeholder}
          />
        </div>
      )}

      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
};

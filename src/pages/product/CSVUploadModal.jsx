import React, { useState } from 'react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';
import styles from './CSVUploadModal.module.css';
import uploadIcon from "../../assets/dashboard/upload.png"

const CSVUploadModal = ({ onClose, onProductsAdded }) => {
  const [csvFile, setCsvFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationStep, setValidationStep] = useState('upload'); // 'upload', 'validated', 'uploading'
  const [validationData, setValidationData] = useState(null);

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      toast.error('Please select a valid CSV file');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size should be less than 5MB');
      return;
    }

    setCsvFile(file);
    toast.success(`File "${file.name}" selected successfully`);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file first');
      return;
    }

    // Step 1: If in upload step, validate first
    if (validationStep === 'upload') {
      await validateCSV();
      return;
    }

    // Step 2: If validated, proceed with actual upload
    if (validationStep === 'validated') {
      await uploadCSV();
    }
  };

  const validateCSV = async () => {
    console.log("Starting CSV validation...");
    console.log("File:", csvFile);
    console.log("API Base URL:", API_BASE_URL);
    
    // Basic client-side file validation
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel'];
    if (!allowedTypes.includes(csvFile.type) && !csvFile.name.endsWith('.csv')) {
      toast.error('Please select a valid CSV file');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (csvFile.size > maxSize) {
      toast.error('File size should be less than 5MB');
      return;
    }

    // Reset validation data before new validation
    setValidationData(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      console.log("Token:", token ? "Present" : "Missing");
      
      const formData = new FormData();
      formData.append('csvFile', csvFile);

      console.log("Making request to:", `${API_BASE_URL}/api/products/validate-csv`);
      
      // Use the validate-csv endpoint for validation only
      const response = await fetch(`${API_BASE_URL}/api/products/validate-csv`, {
        method: 'POST',
        body: formData
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      console.log("Response headers:", response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log("Validation response data:", data);
        
        // Ensure we have a valid data structure
        if (!data.errors) data.errors = [];
        
        // Create a structured validation result for display
        const formattedData = {
          ...data,
          validProducts: data.validProducts || 0,
          totalRows: data.totalRows || 0,
          errors: data.errors.map(error => ({
            ...error,
            // Format the message for better display
            formattedMessage: `Row ${error.row}: ${error.message}`
          }))
        };
        
        // Update the validation data
        setValidationData(formattedData);
        
        // Only proceed to validation step if there are valid products
        if (formattedData.validProducts > 0) {
          setValidationStep('validated');
          toast.success(`Found ${formattedData.validProducts} valid product(s) ready to upload.`);
          
          // Show specific errors for each row with issues
          if (formattedData.errors.length > 0) {
            // Display a summary toast first
            toast.warning(`${formattedData.errors.length} row(s) have issues and will be excluded.`);
            
            // Group errors by type for clearer messaging
            const expiryErrors = formattedData.errors.filter(e => e.message.includes('Expiry date'));
            const columnErrors = formattedData.errors.filter(e => e.message.includes('columns'));
            const otherErrors = formattedData.errors.filter(e => 
              !e.message.includes('Expiry date') && !e.message.includes('columns'));
            
            // Show expiry date errors
            if (expiryErrors.length > 0) {
              toast.error(`${expiryErrors.length} product(s) have invalid expiry dates and will be excluded.`);
            }
            
            // Show column format errors
            if (columnErrors.length > 0) {
              toast.error(`${columnErrors.length} row(s) have incorrect number of columns.`);
            }
            
            // Show other errors
            if (otherErrors.length > 0) {
              const errorLimit = Math.min(otherErrors.length, 3);
              for (let i = 0; i < errorLimit; i++) {
                toast.error(otherErrors[i].formattedMessage);
              }
            }
          }
        } else {
          // Reset to upload step if no valid products
          setValidationStep('upload');
          toast.error(`No valid products found. Please fix the errors and try again.`);
          
          // Show the errors
          if (formattedData.errors.length > 0) {
            const errorLimit = Math.min(formattedData.errors.length, 5);
            for (let i = 0; i < errorLimit; i++) {
              toast.error(formattedData.errors[i].formattedMessage);
            }
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.log("Error response data:", errorData);
        
        // Handle specific validation errors
        if (response.status === 400) {
          if (errorData.message?.includes('format') || errorData.message?.includes('CSV')) {
            toast.error('Invalid CSV format. Please check the file structure and column headers.');
          } else if (errorData.message?.includes('empty')) {
            toast.error('CSV file is empty. Please add product data.');
          } else if (errorData.message?.includes('required')) {
            toast.error('Missing required fields in CSV. Please check all columns are filled.');
          } else {
            toast.error(errorData.message || 'CSV validation failed');
          }
        } else {
          toast.error(errorData.message || 'Failed to validate CSV');
        }
      }
    } catch (error) {
      console.error('Error validating CSV:', error);
      
      // More specific error handling
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error('Network error: Cannot connect to server. Please check if the server is running.');
      } else if (error.message.includes('CORS')) {
        toast.error('CORS error: Cross-origin request blocked. Please check server CORS settings.');
      } else if (error.message.includes('Failed to fetch')) {
        toast.error('Connection failed: Unable to reach the server. Please verify the server URL.');
      } else {
        toast.error(`Error validating CSV file: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadCSV = async () => {
    console.log("🚀 Starting CSV upload...");
    setLoading(true);
    
    // Check if we have validation data and there are valid products
    if (!validationData || validationData.validProducts <= 0) {
      toast.error('No valid products to upload. Please validate the file first.');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      console.log("📝 Token:", token ? "Present" : "Missing");
      
      const formData = new FormData();
      formData.append('csv', csvFile); // Changed from 'csvFile' to 'csv' to match backend expectation
      
      // Add validation info to help the backend filter out invalid rows
      if (validationData && validationData.errors && validationData.errors.length > 0) {
        // Convert errors to a simple format
        const invalidRows = validationData.errors.map(error => error.row);
        formData.append('invalidRows', JSON.stringify(invalidRows));
      }
      
      console.log("📁 FormData prepared with file:", csvFile?.name);
      console.log("🌐 Making request to:", `${API_BASE_URL}/api/products/add-multiple`);

      // Use the add-multiple endpoint for actual upload
      const response = await fetch(`${API_BASE_URL}/api/products/add-multiple`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      const data = await response.json();
      console.log("📋 Response data:", data);

      // Check if products were actually added, regardless of success flag
      const successCount = data.results?.successful?.length || 0;
      const failedCount = data.results?.failed?.length || 0;
      const totalProcessed = data.results?.total || 0;

      if (response.ok || successCount > 0) {
        // Success - products were added
        if (successCount > 0) {
          console.log("✅ Upload successful! Calling onProductsAdded and onClose");
          toast.success(`Successfully added ${successCount} products to your inventory!`);
          
          // Show detailed information about failed items
          if (failedCount > 0) {
            toast.warning(`${failedCount} products had issues and were skipped.`);
            
            // Show specific failed items if available
            if (data.results?.failed && data.results.failed.length > 0) {
              const failLimit = Math.min(data.results.failed.length, 3);
              for (let i = 0; i < failLimit; i++) {
                const failed = data.results.failed[i];
                if (failed.row && failed.reason) {
                  toast.error(`Row ${failed.row}: ${failed.reason}`);
                }
              }
            }
          }
          
          console.log("🔄 Calling onProductsAdded to refresh product list...");
          
          // Call onProductsAdded with a slight delay to ensure backend processing is complete
          setTimeout(() => {
            // Refresh the product list
            onProductsAdded();
            
            // Wait a moment before closing the modal to ensure refresh is triggered
            setTimeout(() => {
              console.log("🚪 Calling onClose to close modal...");
              onClose(); // Close the modal
            }, 500);
          }, 500);
        } else if (totalProcessed > 0) {
          // Products were processed but none succeeded
          toast.error('No products were added. Please check the CSV data format.');
          
          // Show error details if available
          if (data.results?.failed && data.results.failed.length > 0) {
            const failLimit = Math.min(data.results.failed.length, 3);
            for (let i = 0; i < failLimit; i++) {
              const failed = data.results.failed[i];
              if (failed.row && failed.reason) {
                toast.error(`Row ${failed.row}: ${failed.reason}`);
              }
            }
          }
        } else {
          toast.error('No products were processed. Please check the CSV file.');
        }
      } else {
        console.log("❌ Upload failed - Response not ok");
        console.log("📋 Error response data:", data);
        toast.error(data.message || 'Failed to upload CSV');
      }
    } catch (error) {
      console.error('❌ Upload error caught:', error);
      toast.error('Error uploading CSV file: ' + error.message);
    } finally {
      console.log("🏁 Upload process completed");
      setLoading(false);
    }
  };

  const downloadCSVFormat = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // First get the format information from the backend
      const formatResponse = await fetch(`${API_BASE_URL}/api/products/csv-format`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (formatResponse.ok) {
        await formatResponse.json(); // Just to consume the response
        
        // Create CSV content with headers and example data
        const headers = ['productName', 'category', 'costPrice', 'sellingPrice', 'quantity', 'unit', 'expiryDate', 'thresholdValue'];
        const exampleData = [
          ['Laptop Pro', 'Electronics', '800', '1200', '15', 'piece', '31/12/26', '5'],
          ['Gaming Mouse', 'Electronics', '40', '75', '50', 'piece', '30/06/27', '10'],
          ['Office Chair', 'Furniture', '200', '350', '25', 'piece', '15/03/28', '3']
        ];
        
        let csvContent = headers.join(',') + '\n';
        csvContent += exampleData.map(row => row.join(',')).join('\n');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'product_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('CSV template downloaded successfully');
      } else {
        toast.error('Failed to download CSV template');
      }
    } catch (error) {
      console.error('Error downloading CSV template:', error);
      toast.error('Error downloading CSV template');
    }
  };

  const resetUpload = () => {
    setCsvFile(null);
    setValidationStep('upload');
    setValidationData(null);
  };

  const handleButtonClick = () => {
    console.log("🔘 Button clicked! validationStep:", validationStep);
    console.log("🔘 Current state - csvFile:", csvFile?.name, "loading:", loading);
    
    if (validationStep === 'validated') {
      console.log("🚀 Should call uploadCSV");
      uploadCSV();
    } else {
      console.log("📋 Should call handleUpload (validation)");
      handleUpload();
    }
  };

  const getButtonText = () => {
    if (loading) {
      if (validationStep === 'upload') return 'Validating...';
      return 'Uploading...';
    }
    if (validationStep === 'validated') return 'Upload';
    return 'Next →';
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>CSV Upload</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContent}>
          <p className={styles.description}>Add your products here</p>

          {/* File Upload Area */}
          <div
            className={`${styles.uploadArea} ${isDragging ? styles.dragging : ''} ${csvFile ? styles.hasFile : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className={styles.uploadContent}>
              {csvFile ? (
                <div className={styles.fileSelected}>
                  <div className={styles.fileIcon}>📄</div>
                  <div className={styles.fileName}>{csvFile.name}</div>
                  <div className={styles.fileSize}>
                    {(csvFile.size / 1024).toFixed(2)} KB
                  </div>
                  {validationStep === 'upload' && (
                    <button 
                      className={styles.removeFileButton}
                      onClick={resetUpload}
                      type="button"
                    >
                      ✕
                    </button>
                  )}
                  {validationStep === 'validated' && validationData && (
                    <div className={styles.validationStatus}>
                      <span className={styles.validIcon}>✅</span>
                      <span className={styles.validText}>
                        Validated - {validationData.validProducts} valid product(s)
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className={styles.uploadIcon}><img src={uploadIcon} alt="Upload Icon" /></div>
                  <p className={styles.uploadText}>
                    Drag your file(s) to start uploading
                  </p>
                  <p className={styles.uploadOr}>OR</p>
                  <button
                    className={styles.browseButton}
                    onClick={() => document.getElementById('csvFileInput').click()}
                    type="button"
                  >
                    Browse files
                  </button>
                </>
              )}
            </div>
          </div>

          <input
            id="csvFileInput"
            type="file"
            accept=".csv"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />

          {/* Validation Results */}
          {validationStep === 'validated' && validationData && (
            <div className={styles.validationResults}>
              <h4 className={styles.validationTitle}>Validation Results</h4>
              <div className={styles.validationStats}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Successfully Added:</span>
                  <span className={styles.statValue}>{validationData.validProducts || 0}</span>
                </div>
                {validationData.errors && validationData.errors.length > 0 && (
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Failed:</span>
                    <span className={styles.statValue}>{validationData.errors.length}</span>
                  </div>
                )}
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Total Processed:</span>
                  <span className={styles.statValue}>{validationData.totalRows || 0}</span>
                </div>
              </div>
              {validationData.errors && validationData.errors.length > 0 && (
                <div className={styles.errorsList}>
                  <p className={styles.errorsTitle}>Issues Found:</p>
                  <div className={styles.errorsContainer}>
                    <ul className={styles.errorsItems}>
                      {(() => {
                        // Group errors by message for cleaner display
                        const errorsByType = {};
                        validationData.errors.forEach(error => {
                          const key = error.message || 'Unknown error';
                          if (!errorsByType[key]) {
                            errorsByType[key] = [];
                          }
                          errorsByType[key].push(error.row);
                        });
                        
                        // Display grouped errors
                        return Object.entries(errorsByType).map(([message, rows], idx) => (
                          <li key={idx} className={styles.errorItem}>
                            <strong>{message}:</strong> {
                              rows.length <= 3 
                                ? `Row${rows.length > 1 ? 's' : ''} ${rows.join(', ')}`
                                : `${rows.length} rows (${rows.slice(0, 3).join(', ')}...)`
                            }
                          </li>
                        ));
                      })()}
                    </ul>
                  </div>
                </div>
              )}
              {validationData.validProducts > 0 && (
                <div className={styles.successMessage}>
                  ✅ {validationData.validProducts} valid product{validationData.validProducts > 1 ? 's' : ''} ready to upload
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button 
              className={styles.cancelButton}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button 
              className={styles.nextButton}
              onClick={handleButtonClick}
              disabled={!csvFile || loading}
              type="button"
            >
              {getButtonText()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVUploadModal;

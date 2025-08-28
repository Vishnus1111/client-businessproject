import React, { useState } from 'react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';
import styles from './CSVUploadModal.module.css';

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
      
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      // Add a timestamp to ensure no caching
      formData.append('_t', Date.now().toString());
      // Add check for duplicates flag
      formData.append('checkDuplicates', 'true');

      console.log("Making request to validate CSV with duplicate checking...");
      
      // Use the validate-csv endpoint for validation only
      const response = await fetch(`${API_BASE_URL}/api/products/validate-csv?checkDuplicates=true&_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: formData
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

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
      console.log("🔐 Getting token and preparing request");
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token missing. Please log in again.');
      }
      
      const formData = new FormData();
      formData.append('csv', csvFile); // Changed from 'csvFile' to 'csv' to match backend expectation
      
      // Add validation info to help the backend filter out invalid rows
      if (validationData && validationData.errors && validationData.errors.length > 0) {
        // Convert errors to a simple format
        const invalidRows = validationData.errors.map(error => error.row);
        formData.append('invalidRows', JSON.stringify(invalidRows));
      }
      
      console.log("📁 FormData prepared with file:", csvFile?.name);
      console.log("🌐 Making request to add products...");

      // Use the add-multiple endpoint for actual upload with explicit timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      // Generate cache busting query parameter
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      
      const response = await fetch(`${API_BASE_URL}/api/products/add-multiple?_t=${timestamp}-${randomStr}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // Clear the timeout if request completes

      console.log("📡 Response received:", response.status, response.ok ? "success" : "failed");
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("📋 Response data:", data);

      // Check if products were actually added, regardless of success flag
      const successCount = data.results?.successful?.length || 0;
      const failedCount = data.results?.failed?.length || 0;
      const totalProcessed = data.results?.total || 0;
      
      console.log(`📊 Upload stats: ${successCount} succeeded, ${failedCount} failed, ${totalProcessed} total`);
      
      // Handle successful uploads
      if (successCount > 0) {
        console.log("✅ Upload successful! Products added to database");
        
        // Show success message with count
        toast.success(`Successfully added ${successCount} products to your inventory!`);
        
        // Show information about failed items if any
        if (failedCount > 0) {
          toast.warning(`${failedCount} products had issues and were skipped.`);
          
          // Show specific error details for failed items
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
        
        console.log("🔄 Will refresh product list NOW and close modal");
        
        // First notify parent that CSV products were added with enhanced waiting
        if (typeof onProductsAdded === 'function') {
          console.log("📋 Calling parent's onProductsAdded callback with CSV flag");
          try {
            // Call the callback function
            onProductsAdded(true); // Pass true to indicate this is a CSV upload
            
            // Show a toast to inform the user the process is ongoing
            toast.info("Refreshing product list with new data... Please wait.");
          } catch (error) {
            console.error("Error in onProductsAdded callback:", error);
          }
        }
        
        // Then close the modal after a brief delay to allow refresh to start
        // Using a longer delay to ensure the parent component has time to start the refresh
        setTimeout(() => {
          console.log("🚪 Closing modal");
          onClose();
        }, 800); // Increased delay to ensure callback starts
      } else if (totalProcessed > 0) {
        // Products were processed but none succeeded
        toast.error('No products were added. Please check the CSV data format.');
      } else {
        toast.error('No products were processed. Please check the CSV file.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Error uploading CSV file: ${error.message}`);
    } finally {
      setLoading(false);
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
    return 'Next   >';
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
                  <div className={styles.uploadIcon}>
                    <img src={require("../../assets/dashboard/upload.png")} alt="Upload" />
                  </div>
                  <div className={styles.uploadText}>
                    <p>Drag & drop a CSV file here</p>
                    <p>OR</p>
                    <label className={styles.uploadButton}>
                      <input
                        type="file"
                        accept=".csv,text/csv,application/vnd.ms-excel"
                        onChange={handleFileInputChange}
                        className={styles.fileInput}
                      />
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>

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
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              className={`${styles.uploadButton2} ${loading ? styles.loading : ''}`} 
              onClick={handleButtonClick}
              disabled={loading || !csvFile}
            >
              {getButtonText()}
              {loading && <span className={styles.spinner}></span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVUploadModal;

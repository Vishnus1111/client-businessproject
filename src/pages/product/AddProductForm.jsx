import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';
import styles from './AddProductForm.module.css';

const AddProductForm = ({ onClose, onProductAdded }) => {
  const [formData, setFormData] = useState({
    productName: '',
    productId: '',
    category: '',
    costPrice: '',
    sellingPrice: '',
    quantity: '',
    unit: 'piece',
    expiryDate: '',
    thresholdValue: '',
    description: ''
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Generate product ID on component mount
  useEffect(() => {
    generateProductId();
  }, []);

  const generateProductId = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/products/generate-id`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, productId: data.productId }));
      }
    } catch (error) {
      console.error('Error generating product ID:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Validate numeric fields for negative values
    if (['costPrice', 'sellingPrice', 'quantity', 'thresholdValue'].includes(name)) {
      // Allow empty value for editing, but prevent negative numbers
      if (value !== '' && (isNaN(value) || parseFloat(value) < 0)) {
        toast.error(`${name === 'costPrice' ? 'Cost Price' : 
                     name === 'sellingPrice' ? 'Selling Price' : 
                     name === 'quantity' ? 'Quantity' : 
                     'Threshold Value'} cannot be negative`);
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } else {
      toast.error('Please drop a valid image file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Frontend validation
    if (!formData.productName.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!formData.category.trim()) {
      toast.error('Category is required');
      return;
    }
    if (!formData.costPrice || parseFloat(formData.costPrice) < 0) {
      toast.error('Cost price must be a positive number');
      return;
    }
    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) < 0) {
      toast.error('Selling price must be a positive number');
      return;
    }
    if (parseFloat(formData.sellingPrice) < parseFloat(formData.costPrice)) {
      toast.error('Selling price should be greater than or equal to cost price');
      return;
    }
    if (!formData.quantity || parseInt(formData.quantity) < 0) {
      toast.error('Quantity must be a positive number');
      return;
    }
    if (!formData.thresholdValue || parseInt(formData.thresholdValue) < 0) {
      toast.error('Threshold value must be a positive number');
      return;
    }
    if (parseInt(formData.thresholdValue) > parseInt(formData.quantity)) {
      toast.error('Threshold value cannot be greater than current quantity');
      return;
    }
    if (!formData.expiryDate) {
      toast.error('Expiry date is required');
      return;
    }
    
    // Check if expiry date is in the past
    const expiryDate = new Date(formData.expiryDate);
    const today = new Date();
    if (expiryDate <= today) {
      toast.error('Expiry date must be in the future');
      return;
    }
    
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();

      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Append image if selected
      if (image) {
        formDataToSend.append('image', image);
      }

      const response = await fetch(`${API_BASE_URL}/api/products/add-single`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend
      });

      if (response.ok) {
        toast.success('Product added successfully!');
        onProductAdded();
        onClose();
      } else {
        const errorData = await response.json();
        
        // Handle specific error messages from backend
        if (response.status === 400) {
          if (errorData.message.includes('negative')) {
            toast.error('Values cannot be negative. Please check your inputs.');
          } else if (errorData.message.includes('threshold')) {
            toast.error('Threshold value cannot be greater than quantity');
          } else if (errorData.message.includes('price')) {
            toast.error('Please enter valid price values');
          } else if (errorData.message.includes('date')) {
            toast.error('Please enter a valid expiry date in DD/MM/YY format');
          } else if (errorData.message.includes('required')) {
            toast.error('Please fill in all required fields');
          } else {
            toast.error(errorData.message || 'Invalid input data');
          }
        } else if (response.status === 401) {
          toast.error('Authentication failed. Please login again.');
        } else if (response.status === 403) {
          toast.error('You do not have permission to add products');
        } else if (response.status === 409) {
          toast.error('Product with this name already exists');
        } else if (response.status === 413) {
          toast.error('Image file is too large. Please choose a smaller file.');
        } else if (response.status === 500) {
          toast.error('Server error occurred. Please try again later.');
        } else {
          toast.error(errorData.message || 'Failed to add product');
        }
      }
    } catch (error) {
      console.error('Error adding product:', error);
      if (error.name === 'NetworkError' || error.message.includes('fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error('Unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = () => {
    setFormData({
      productName: '',
      productId: '',
      category: '',
      costPrice: '',
      sellingPrice: '',
      quantity: '',
      unit: 'piece',
      expiryDate: '',
      thresholdValue: '',
      description: ''
    });
    setImage(null);
    setImagePreview(null);
    generateProductId();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.breadcrumb}>
            <span>Add Product</span>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span>Individual Product</span>
          </div>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContent}>
          <h2 className={styles.formTitle}>New Product</h2>

          <form onSubmit={handleSubmit} className={styles.productForm}>
            {/* Image Upload Section */}
            <div className={styles.imageSection}>
              <div 
                className={styles.imageUpload}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Product preview" className={styles.imagePreview} />
                ) : (
                  <div></div>
                )}
                <input
                  id="imageInput"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </div>
              <div className={styles.uploadInstructions}>
                <p>Drag image here</p>
                <p>or</p>
                <button 
                  type="button" 
                  className={styles.browseButton}
                  onClick={() => document.getElementById('imageInput').click()}
                >
                  Browse image
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className={styles.formFields}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Product Name</label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Product ID</label>
                <input
                  type="text"
                  name="productId"
                  value={formData.productId}
                  placeholder="Auto-generated product ID"
                  className={`${styles.input} ${styles.readOnlyInput}`}
                  readOnly
                  tabIndex="-1"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={styles.select}
                  required
                >
                  <option value="">Select product category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Food">Food</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Stationery">Stationery</option>
                  <option value="Health">Health</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Cost Price</label>
                <input
                  type="number"
                  name="costPrice"
                  value={formData.costPrice}
                  onChange={handleInputChange}
                  placeholder="Enter cost price"
                  className={styles.input}
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Selling Price</label>
                <input
                  type="number"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={handleInputChange}
                  placeholder="Enter selling price"
                  className={styles.input}
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="Enter product quantity"
                  className={styles.input}
                  min="0"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Unit</label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  <option value="piece">Piece</option>
                  <option value="kg">Kilogram</option>
                  <option value="gram">Gram</option>
                  <option value="liter">Liter</option>
                  <option value="ml">Milliliter</option>
                  <option value="pack">Pack</option>
                  <option value="box">Box</option>
                  <option value="bottle">Bottle</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Expiry Date</label>
                <input
                  type="text"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  placeholder="Enter expiry date (DD/MM/YY)"
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Threshold Value</label>
                <input
                  type="number"
                  name="thresholdValue"
                  value={formData.thresholdValue}
                  onChange={handleInputChange}
                  placeholder="Enter threshold value"
                  className={styles.input}
                  min="0"
                  required
                />
              </div>

              {/* Removing Description field as requested */}
            </div>

            {/* Form Actions */}
            <div className={styles.formActions}>
              <button 
                type="button" 
                className={styles.discardButton}
                onClick={handleDiscard}
              >
                Discard
              </button>
              <button 
                type="submit" 
                className={styles.addButton}
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddProductForm;

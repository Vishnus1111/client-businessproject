import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../pages/config';
import styles from './TopProductItem.module.css';

const TopProductItem = ({ product }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const placeholderImage = '/placeholder-image.png';
  
  // Function to handle image loading errors
  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true); // Consider it "loaded" even though it's the error state
  };
  
  // Function to handle image loading success
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Reset image state when product changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [product]);
  
  // Create a proper URL for the image
  const getImageUrl = () => {
    if (imageError || !product.image) {
      return placeholderImage;
    }
    
    // Check if the image path is a full URL or a relative path
    if (product.image && product.image.startsWith('http')) {
      return product.image;
    } else if (product.image) {
      // Remove any leading slash to ensure proper path construction
      const imagePath = product.image.startsWith('/') ? product.image.substring(1) : product.image;
      return `${API_BASE_URL}/${imagePath}`;
    } else {
      return placeholderImage;
    }
  };

  // Extract display data with fallbacks to ensure consistent appearance
  const displayName = product.name || 'Product';
  const displayPrice = product.price ? `₹${product.price.toLocaleString()}` : '₹0';
  const displaySales = product.totalSold ? product.totalSold.toString() : '0';
  const displayRating = product.rating ? product.rating.toFixed(1) : 'N/A';
  
  return (
    <div className={styles.topProductItem}>
      <div className={`${styles.productImageContainer} ${!imageLoaded ? styles.loading : ''}`}>
        {!imageLoaded && (
          <div className={styles.imagePlaceholder}>
            <div className={styles.imageLoader}></div>
          </div>
        )}
        <img 
          src={getImageUrl()} 
          alt={displayName} 
          className={`${styles.productImage} ${imageLoaded ? styles.visible : styles.hidden}`}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      </div>
      <div className={styles.productInfo}>
        <div className={styles.productName}>{displayName}</div>
        <div className={styles.productPrice}>{displayPrice}</div>
        <div className={styles.productSales}>
          {displaySales} sold | Rating: {displayRating}
        </div>
      </div>
    </div>
  );
};

export default TopProductItem;

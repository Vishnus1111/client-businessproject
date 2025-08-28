import React from 'react';
import styles from './TopProductItem.module.css';

const TopProductItem = ({ product }) => {
  // Safely handle missing data with defaults
  const {
    productName = 'Unknown Product',
    averageRating = 0,
    totalRatings = 0,
    sellingPrice = 0,
    imageUrl = null
  } = product || {};
  
  // Generate star rating display
  const renderStars = () => {
    const fullStars = Math.round(averageRating || 0);
    return (
      <div className={styles.starRating}>
        {[...Array(5)].map((_, i) => (
          <span 
            key={i} 
            className={`${styles.star} ${i < fullStars ? styles.filled : ''}`}
          >
            ★
          </span>
        ))}
        <span className={styles.ratingText}>
          {averageRating ? averageRating.toFixed(1) : '0.0'} 
          <span className={styles.totalRatings}>({totalRatings})</span>
        </span>
      </div>
    );
  };

  return (
    <div className={styles.productCard}>
      <div className={styles.imageContainer}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={productName} 
            className={styles.productImage}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/placeholder-image.png';
            }}
          />
        ) : (
          <div className={styles.placeholderImage}>No Image</div>
        )}
      </div>
      <div className={styles.productInfo}>
        <h3 className={styles.productName}>{productName}</h3>
        {renderStars()}
        <div className={styles.price}>₹{sellingPrice.toFixed(2)}</div>
      </div>
    </div>
  );
};

export default TopProductItem;

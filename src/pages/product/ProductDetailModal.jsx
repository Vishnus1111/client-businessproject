import React, { useState, useEffect } from 'react';
import styles from './ProductDetailModal.module.css';

const ProductDetailModal = ({ product, onClose, onPlaceOrder }) => {
  console.log("Modal rendering with product:", product);
  
  // Initialize with simpler state to debug rendering issues
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Add effect to log whenever modal is opened
  useEffect(() => {
    console.log("ProductDetailModal mounted with product:", product);
    
    // Add escape key handler
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        console.log("Escape key pressed, closing modal");
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      console.log("ProductDetailModal unmounted");
    };
  }, [onClose, product]);

  const handleIncreaseQuantity = () => {
    // Don't allow more than available quantity
    if (product.quantity && quantity < product.quantity) {
      setQuantity(quantity + 1);
    } else {
      console.log("Can't increase quantity beyond available stock");
    }
  };

  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleRatingChange = (newRating) => {
    console.log(`Rating changed to ${newRating}`);
    setRating(newRating);
  };

  const handleReviewChange = (e) => {
    setReview(e.target.value);
  };

  const handleCustomerInfoChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo({
      ...customerInfo,
      [name]: value
    });
  };

  const handlePlaceOrder = () => {
    const orderData = {
      productId: product.productId,
      quantityOrdered: quantity,
      rating: rating,
      review: review,
      customerInfo: customerInfo
    };
    
    console.log("Placing order with data:", orderData);
    
    if (rating === 0) {
      alert("Please provide a rating for the product");
      return;
    }
    
    if (onPlaceOrder) {
      onPlaceOrder(orderData);
    }
  };

  if (!product) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{product.productName}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.productImage}>
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.productName} />
            ) : (
              <div className={styles.placeholder}>No Image Available</div>
            )}
          </div>
          
          <div className={styles.productDetails}>
            <div className={styles.detailRow}>
              <span className={styles.label}>ID:</span>
              <span className={styles.value}>{product.productId}</span>
            </div>
            
            <div className={styles.detailRow}>
              <span className={styles.label}>Category:</span>
              <span className={styles.value}>{product.category}</span>
            </div>
            
            <div className={styles.detailRow}>
              <span className={styles.label}>Price:</span>
              <span className={styles.value}>₹{product.sellingPrice || product.price}</span>
            </div>
            
            <div className={styles.detailRow}>
              <span className={styles.label}>Availability:</span>
              <span className={styles.value}>{product.availability}</span>
            </div>
            
            {product.description && (
              <div className={styles.description}>
                <h3>Description</h3>
                <p>{product.description}</p>
              </div>
            )}
            
            <div className={styles.orderSection}>
              <div className={styles.quantityControl}>
                <span className={styles.label}>Quantity:</span>
                <div className={styles.quantityButtons}>
                  <button 
                    onClick={handleDecreaseQuantity} 
                    disabled={quantity <= 1}
                    className={styles.quantityButton}
                  >
                    -
                  </button>
                  <span className={styles.quantityValue}>{quantity}</span>
                  <button 
                    onClick={handleIncreaseQuantity}
                    disabled={product.quantity && quantity >= product.quantity}
                    className={styles.quantityButton}
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className={styles.totalPrice}>
                <span className={styles.totalLabel}>Total:</span>
                <span className={styles.totalAmount}>
                  ₹{((product.sellingPrice || 0) * quantity).toFixed(2)}
                </span>
              </div>
              
              <div className={styles.ratingSection}>
                <span className={styles.label}>Rate this product:</span>
                <div className={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`${styles.ratingStar} ${rating >= star ? styles.activeRating : ''}`}
                      onClick={() => handleRatingChange(star)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              
              <div className={styles.reviewSection}>
                <textarea
                  placeholder="Add your review (optional)"
                  value={review}
                  onChange={handleReviewChange}
                  className={styles.reviewTextarea}
                />
              </div>
              
              <div className={styles.customerInfo}>
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name (optional)"
                  value={customerInfo.name}
                  onChange={handleCustomerInfoChange}
                  className={styles.customerInput}
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Your Email (optional)"
                  value={customerInfo.email}
                  onChange={handleCustomerInfoChange}
                  className={styles.customerInput}
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Your Phone (optional)"
                  value={customerInfo.phone}
                  onChange={handleCustomerInfoChange}
                  className={styles.customerInput}
                />
              </div>
              
              <button 
                className={styles.orderButton}
                onClick={handlePlaceOrder}
                disabled={quantity < 1 || rating === 0}
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;

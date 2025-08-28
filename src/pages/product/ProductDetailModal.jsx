import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';
import styles from './ProductDetailModal.module.css';

const ProductDetailModal = ({ product, onClose, onPlaceOrder }) => {
  console.log("Modal rendering with product:", product);
  
  // Initialize with simpler state to debug rendering issues
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  // Add effect to log whenever modal is opened and check if product exists in database
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
    
    // Check if product exists in database
    const checkProduct = async () => {
      if (product && (product._id || product.productId)) {
        try {
          // Use productId if available, otherwise use _id
          const idToCheck = product.productId || product._id;
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/api/products/check/${idToCheck}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          const data = await response.json();
          if (!data.exists) {
            console.warn(`Product with ID ${idToCheck} does not exist in database!`);
          }
        } catch (error) {
          console.error("Error checking if product exists:", error);
        }
      }
    };
    
    checkProduct();
    
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

  const handlePlaceOrder = () => {
    // Log the product object to understand its structure
    console.log("Full product object:", product);
    
    const productId = product._id || product.productId;
    
    const orderData = {
      productId: productId,
      quantityOrdered: quantity
    };
    
    console.log("Placing order with data:", orderData);
    
    if (onPlaceOrder) {
      onPlaceOrder(orderData);
    }
  };

  const handleRatingClick = async (selectedRating) => {
    try {
      setRating(selectedRating);
      
      // Make sure we have all required fields
      if (!product) {
        console.error('Product information is missing');
        toast.error('Product information is incomplete');
        return;
      }
      
      // Use productId as that's the primary identifier in the database
      const productIdentifier = product.productId;
      
      if (!productIdentifier) {
        console.error('Product ID is missing');
        toast.error('Product information is incomplete');
        return;
      }

      const token = localStorage.getItem('token');
      console.log('Submitting rating with data:', {
        productId: productIdentifier,
        rating: selectedRating
      });
      
      // Create a simulated order ID for rating this product
      const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Use the existing statistics update-rating endpoint that's already connected to the top products
      const response = await fetch(`${API_BASE_URL}/api/statistics/update-rating/${productIdentifier}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: orderId,
          rating: selectedRating
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Rating submitted successfully');
        console.log('Rating response:', data);
        
        // Set a thank you message that will be shown in the UI
        setRating(selectedRating);
        
        // Refresh top products if a parent component provided a callback
        if (typeof window.refreshTopProducts === 'function') {
          window.refreshTopProducts();
        }
      } else {
        let errorMessage = 'Failed to submit rating';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('Rating submission failed:', errorData);
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Error submitting rating');
    }
  };

  if (!product) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        
        <h2 className={styles.modalTitle}>{product.productName}</h2>
        
        <div className={styles.modalBody}>
          {/* Product Image */}
          <div className={styles.productImage}>
            {product.imageUrl ? (
              <img 
                src={product.imageUrl} 
                alt={product.productName}
                className={styles.productImg} 
                onError={(e) => {
                  console.error("Image failed to load:", e);
                  e.target.onerror = null;
                  e.target.src = '/placeholder-image.png';
                }}
              />
            ) : (
              <div className={styles.placeholder}>No Image Available</div>
            )}
          </div>
          
          {/* Product Details in a clean vertical layout */}
          <div className={styles.infoContainer}>
            <div className={styles.productInfoSection}>
              <div className={styles.detailRow}>
                <span className={styles.label}>ID:</span>
                <span className={styles.value}>{product._id || product.productId || 'No ID available'}</span>
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
            </div>
            
            {/* Order Section */}
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
                  ₹{((product.sellingPrice || product.price || 0) * quantity).toFixed(2)}
                </span>
              </div>
              
              {/* Rating component */}
              <div className={styles.ratingContainer}>
                <span className={styles.ratingLabel}>Rate this product:</span>
                <div className={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`${styles.ratingStar} ${star <= rating ? styles.ratingStarActive : ''} ${star <= hoveredRating ? styles.ratingStarHovered : ''}`}
                      onClick={() => handleRatingClick(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                    >
                      ★
                    </span>
                  ))}
                </div>
                {rating > 0 && <div className={styles.ratingText}>Thank you for rating!</div>}
              </div>
              
              <button 
                className={styles.orderButton}
                onClick={handlePlaceOrder}
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

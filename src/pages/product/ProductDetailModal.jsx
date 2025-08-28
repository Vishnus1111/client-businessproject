import React, { useState, useEffect } from 'react';
import styles from './ProductDetailModal.module.css';

const ProductDetailModal = ({ product, onClose, onPlaceOrder }) => {
  console.log("Modal rendering with product:", product);
  
  // Initialize with simpler state to debug rendering issues
  const [quantity, setQuantity] = useState(1);

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

  const handlePlaceOrder = () => {
    const orderData = {
      productId: product.productId,
      quantityOrdered: quantity
    };
    
    console.log("Placing order with data:", orderData);
    
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
        <button className={styles.closeButton} onClick={onClose}>×</button>
        
        <h2 className={styles.modalTitle}>{product.productName}</h2>
        
        <div className={styles.modalBody}>
          {/* Product Image */}
          <div className={styles.productImage}>
            {product.imageUrl ? (
              <img 
                src={`${product.imageUrl.startsWith('http') ? '' : '/'}${product.imageUrl}`} 
                alt={product.productName}
                className={styles.productImg} 
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

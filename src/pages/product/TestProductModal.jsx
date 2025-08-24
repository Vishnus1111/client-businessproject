import React, { useState } from 'react';
import styles from './TestProductModal.module.css';

const TestProductModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(0);
  
  const handleOpenModal = () => {
    console.log("Opening modal");
    setIsOpen(true);
  };
  
  const handleCloseModal = () => {
    console.log("Closing modal");
    setIsOpen(false);
  };
  
  const handleDecreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncreaseQuantity = () => {
    setQuantity(quantity + 1);
  };

  const handleRatingChange = (value) => {
    setRating(value);
  };

  const handlePlaceOrder = () => {
    console.log("Order placed with quantity:", quantity, "and rating:", rating);
    alert("Order placed successfully!");
    setIsOpen(false);
  };
  
  const testProduct = {
    _id: "test-123",
    productName: "Test Product",
    sellingPrice: 999.99,
    description: "This is a test product description",
    unit: "Piece"
  };

  return (
    <div className={styles.container}>
      <h2>Test Product Modal</h2>
      <p>Click the button below to test the product modal functionality:</p>
      
      <button className={styles.testButton} onClick={handleOpenModal}>
        Open Test Modal
      </button>
      
      {isOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={handleCloseModal}>×</button>
            
            <div className={styles.contentContainer}>
              <div className={styles.productDetails}>
                <div className={styles.productImageContainer}>
                  <img 
                    src="/placeholder-image.png" 
                    alt={testProduct.productName} 
                    className={styles.productImage} 
                  />
                </div>
                
                <div className={styles.productInfo}>
                  <h2 className={styles.productName}>{testProduct.productName}</h2>
                  <div className={styles.priceContainer}>
                    <span className={styles.priceLabel}>Price:</span>
                    <span className={styles.productPrice}>₹{testProduct.sellingPrice.toFixed(2)}</span>
                    <span className={styles.perUnit}>per {testProduct.unit}</span>
                  </div>
                  
                  <p className={styles.productDescription}>{testProduct.description}</p>
                </div>
              </div>
              
              <div className={styles.orderSection}>
                <div className={styles.quantitySection}>
                  <label className={styles.quantityLabel}>Quantity:</label>
                  <div className={styles.quantityControl}>
                    <button 
                      className={styles.quantityButton}
                      onClick={handleDecreaseQuantity}
                      disabled={quantity <= 1}
                    >
                      -
                    </button>
                    <div className={styles.quantityDisplay}>{quantity}</div>
                    <button 
                      className={styles.quantityButton}
                      onClick={handleIncreaseQuantity}
                    >
                      +
                    </button>
                  </div>
                </div>
                
                <div className={styles.ratingSection}>
                  <label className={styles.ratingLabel}>Rate this product:</label>
                  <div className={styles.ratingStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`${styles.star} ${rating >= star ? styles.activeStar : ''}`}
                        onClick={() => handleRatingChange(star)}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className={styles.totalSection}>
                  <span className={styles.totalLabel}>Total:</span>
                  <span className={styles.totalAmount}>
                    ₹{(testProduct.sellingPrice * quantity).toFixed(2)}
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
      )}
    </div>
  );
};

export default TestProductModal;

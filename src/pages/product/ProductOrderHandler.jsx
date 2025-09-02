import React, { useState } from 'react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';
import ProductDetailModal from './ProductDetailModal';

const ProductOrderHandler = ({ productId, onClose, onOrderPlaced, refreshInventory }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch product details when productId changes
  React.useEffect(() => {
    if (productId) {
      (async () => {
        try {
          setLoading(true);
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/api/orders/product/${productId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.product) {
              // Make sure image URL is properly formatted
              const product = {
                ...data.product,
                imageUrl: data.product.imageUrl ? 
                  (data.product.imageUrl.startsWith('http') ? 
                    data.product.imageUrl : 
                    `${API_BASE_URL}/${data.product.imageUrl.replace(/^\//, '')}`) 
                  : null
              };
              console.log("Product with processed image URL:", product);
              setSelectedProduct(product);
            } else {
              toast.error(data.message || 'Failed to load product details');
            }
          } else {
            toast.error('Failed to fetch product details');
          }
        } catch (error) {
          console.error('Error fetching product details:', error);
          toast.error('Error loading product details');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [productId]);

  // Function to handle placing an order
  const handlePlaceOrder = async (orderData) => {
    try {
      setLoading(true);
      console.log('Placing order with data:', orderData);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/orders/place-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Order placed successfully!');
        
        // Call the refreshInventory function passed from parent
        if (refreshInventory) {
          console.log('Refreshing inventory after order placement...');
          refreshInventory();
        }
        
        // Call onOrderPlaced if provided, include context about the product ordered
        if (onOrderPlaced) {
          onOrderPlaced(
            data.order,
            {
              productId: selectedProduct?.productId || orderData.productId,
              initialAvailability: selectedProduct?.availability,
              updatedProduct: data.updatedProduct
            }
          );
        }
        
        // Close the modal
        setSelectedProduct(null);
        if (onClose) onClose();
      } else {
        toast.error(data.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Error while placing order');
    } finally {
      setLoading(false);
    }
  };

  // Render the product detail modal if a product is selected
  return (
    <>
      {loading && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000
        }}>
          <div style={{ 
            padding: 20, 
            backgroundColor: 'white', 
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            Loading product details...
          </div>
        </div>
      )}
      
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => {
            setSelectedProduct(null);
            if (onClose) onClose();
          }}
          onPlaceOrder={handlePlaceOrder}
        />
      )}
    </>
  );
};

export default ProductOrderHandler;

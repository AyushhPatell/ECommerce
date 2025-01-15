import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

interface SaleItem {
  productId: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface StockAdjustment {
  productId: number;
  currentStock: number;
  adjustment: number;
}


const ProductList = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState<StockAdjustment | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log("Fetching with token:", token);
  
      if (!token) {
        console.error('No token found');
        return;
      }
  
      const response = await fetch('http://localhost:8000/api/products', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
  
      console.log("Products response:", response.status);
  
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', response.status, errorData);
        if (response.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: newProduct.name,
            price: parseFloat(newProduct.price),
            stock: parseInt(newProduct.stock)
          }),
        });

        if (response.ok) {
          fetchProducts();
          setNewProduct({ name: '', price: '', stock: '' });
          setIsAdding(false);
        }
      } catch (error) {
        console.error('Error adding product:', error);
      }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingProduct) return;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: editingProduct.name,
            price: editingProduct.price,
            stock: editingProduct.stock
          }),
        });

        if (response.ok) {
          setEditingProduct(null);
          fetchProducts();
        }
      } catch (error) {
        console.error('Error updating product:', error);
      }
  };

  const handleDeleteProduct = async (id: number) => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/products/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          fetchProducts();
        }
      } catch (error) {
        console.error('Error deleting product:', error);
      }
  };

  const [cart, setCart] = useState<SaleItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: product.price,
        total: product.price
      }]);
    }
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.productId !== productId));
    } else {
      setCart(cart.map(item => 
        item.productId === productId 
          ? { ...item, quantity, total: quantity * item.price }
          : item
      ));
    }
  };

  const handleCheckout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        navigate('/login');
        return;
      }
  
      console.log('Using token for checkout:', token); // Debug log
      
      const response = await fetch('http://localhost:8000/api/sales/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Make sure the 'Bearer ' prefix is included
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        }),
      });
  
      console.log('Response status:', response.status); // Debug log
  
      if (response.ok) {
        setCart([]);
        setShowCart(false);
        fetchProducts();
        setCheckoutSuccess(true);
        setTimeout(() => setCheckoutSuccess(false), 3000);
      } else {
        const errorData = await response.json();
        console.error('Checkout error:', errorData);
        if (response.status === 401) {
          // Handle unauthorized access
          navigate('/login');
        } else {
          alert(errorData.detail || 'Checkout failed');
        }
      }
    } catch (error) {
      console.error('Error processing checkout:', error);
      alert('Error processing checkout. Please try again.');
    }
  };

  return (
    <div className="p-4">

      {checkoutSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded shadow-lg transition-all duration-500 ease-in-out">
          Checkout completed successfully!
        </div>
      )}

      <div className="flex justify-between mb-4">
        <input
          type="text"
          placeholder="Search products..."
          className="p-2 border rounded"
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => setIsAdding(true)}
        >
          Add New Product
        </button>  
        
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => setShowCart(true)}
        >
          Cart ({cart.length})
        </button>    
      </div>

      {isAdding && (
        <form onSubmit={handleAddProduct} className="mb-4 p-4 border rounded">
          <div className="grid grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Product Name"
              className="p-2 border rounded"
              value={newProduct.name}
              onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
              required
            />
            <input
              type="number"
              placeholder="Price"
              className="p-2 border rounded"
              value={newProduct.price}
              onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
              required
            />
            <input
              type="number"
              placeholder="Stock"
              className="p-2 border rounded"
              value={newProduct.stock}
              onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
              required
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
              Save Product
            </button>
            <button 
              type="button" 
              className="bg-gray-500 text-white px-4 py-2 rounded"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {editingProduct && (
        <form onSubmit={handleEditProduct} className="mb-4 p-4 border rounded bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Edit Product Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Product Name</label>
              <input
                type="text"
                placeholder="Product Name"
                className="p-2 border rounded w-full"
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({
                  ...editingProduct,
                  name: e.target.value
                })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price</label>
              <input
                type="number"
                placeholder="Price"
                className="p-2 border rounded w-full"
                value={editingProduct.price}
                onChange={(e) => setEditingProduct({
                  ...editingProduct,
                  price: parseFloat(e.target.value)
                })}
                required
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
              Save Changes
            </button>
            <button 
              type="button" 
              className="bg-gray-500 text-white px-4 py-2 rounded"
              onClick={() => setEditingProduct(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="p-3 border-b">Name</th>
            <th className="p-3 border-b">Price</th>
            <th className="p-3 border-b">Stock</th>
            <th className="p-3 border-b">Status</th>
            <th className="p-3 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products
            .filter(product => 
              product.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map(product => (
              <tr key={product.id}>
                <td className="p-3 border-b">{product.name}</td>
                <td className="p-3 border-b">${product.price}</td>
                <td className="p-3 border-b">{product.stock}</td>
                <td className="p-3 border-b">
                  <span className={`px-2 py-1 rounded ${
                    product.stock > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
                <td className="p-3 border-b">
                <div className="flex flex-col gap-2">
                  {/* First row of buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-sm flex-1"
                      title="Edit product details"
                    >
                      Edit Details
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded text-sm flex-1"
                      title="Delete product"
                    >
                      Delete
                    </button>
                  </div>
                  {/* Second row of buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStockAdjustment({
                        productId: product.id,
                        currentStock: product.stock,
                        adjustment: 0
                      })}
                      className="bg-purple-500 text-white px-2 py-1 rounded text-sm flex-1"
                      title="Manage inventory"
                    >
                      Manage Stock
                    </button>
                    <button
                      onClick={() => addToCart(product)}
                      className="bg-green-500 text-white px-2 py-1 rounded text-sm flex-1"
                      disabled={product.stock <= 0}
                      title={product.stock <= 0 ? "Out of stock" : "Add to cart"}
                    >
                      {product.stock <= 0 ? "Out of Stock" : "Add to Cart"}
                    </button>
                  </div>
                </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {showCart && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          onClick={() => setShowCart(false)}  // Close when clicking the background
        >
          <div 
            className="bg-white p-6 rounded-lg w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}  // Prevent closing when clicking the modal itself
          >
            <h2 className="text-2xl font-bold mb-4">Shopping Cart</h2>
            
            {cart.length === 0 ? (
              <p>Cart is empty</p>
            ) : (
              <>
                <table className="w-full mb-4">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(item => (
                      <tr key={item.productId}>
                        <td>{item.name}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value))}
                            className="w-20 p-1 border rounded"
                          />
                        </td>
                        <td>${item.price}</td>
                        <td>${item.total}</td>
                        <td>
                          <button
                            onClick={() => updateQuantity(item.productId, 0)}
                            className="text-red-500"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="text-right font-bold">Total:</td>
                      <td className="font-bold">
                        ${cart.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCart(false)}
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    Continue Shopping
                  </button>
                  <button
                    onClick={handleCheckout}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {stockAdjustment && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          onClick={() => setStockAdjustment(null)}
        >
          <div 
            className="bg-white p-6 rounded-lg max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Manage Inventory</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Current Stock: {stockAdjustment.currentStock}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Add/Remove Stock:</label>
              <div className="flex items-center gap-4">
                <button 
                  className="bg-red-500 text-white px-3 py-1 rounded"
                  onClick={() => setStockAdjustment({
                    ...stockAdjustment,
                    adjustment: stockAdjustment.adjustment - 1
                  })}
                >
                  -
                </button>
                <input 
                  type="number"
                  value={stockAdjustment.adjustment}
                  onChange={(e) => setStockAdjustment({
                    ...stockAdjustment,
                    adjustment: parseInt(e.target.value) || 0
                  })}
                  className="w-20 text-center border rounded p-1"
                />
                <button 
                  className="bg-green-500 text-white px-3 py-1 rounded"
                  onClick={() => setStockAdjustment({
                    ...stockAdjustment,
                    adjustment: stockAdjustment.adjustment + 1
                  })}
                >
                  +
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              New Stock Level: {stockAdjustment.currentStock + stockAdjustment.adjustment}
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 border rounded"
                onClick={() => setStockAdjustment(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={(e) => {
                  const product = products.find(p => p.id === stockAdjustment.productId);
                  if (product) {
                    setEditingProduct({
                      ...product,
                      stock: product.stock + stockAdjustment.adjustment
                    });
                    handleEditProduct(e as React.FormEvent);
                  }
                  setStockAdjustment(null);
                }}
              >
                Update Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
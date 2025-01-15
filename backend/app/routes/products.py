from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..utils.auth import get_current_user, SECRET_KEY, ALGORITHM
from ..models.product import Product
from ..models.sale import Sale
from ..models.user import User
from ..utils.database import get_db
from ..utils.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

class ProductCreate(BaseModel):
    name: str
    price: float
    stock: int

class ProductResponse(BaseModel):
    id: int
    name: str
    price: float
    stock: int
    user_id: int
    
class SaleCreate(BaseModel):
    quantity: int
    price: float
    
class CartItem(BaseModel):
    productId: int
    quantity: int
    price: float

class BulkSaleRequest(BaseModel):
    items: List[CartItem]

    class Config:
        from_attributes = True

@router.get("/products", response_model=List[ProductResponse])
async def get_products(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    products = db.query(Product).filter(Product.user_id == current_user.id).all()
    return products

@router.post("/products", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_product = Product(**product.dict(), user_id=current_user.id)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_update: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_product = db.query(Product).filter(
        Product.id == product_id,
        Product.user_id == current_user.id
    ).first()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for key, value in product_update.dict().items():
        setattr(db_product, key, value)
    
    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.user_id == current_user.id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    return {"message": "Product deleted successfully"}

@router.post("/products/{product_id}/sell")
async def sell_product(
    product_id: int,
    sale: SaleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.user_id == current_user.id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.stock < sale.quantity:
        raise HTTPException(status_code=400, detail="Not enough stock")
    
    # Update product stock
    product.stock -= sale.quantity
    
    # Create sale record
    new_sale = Sale(
        product_id=product_id,
        user_id=current_user.id,
        quantity=sale.quantity,
        total_amount=sale.quantity * sale.price
    )
    
    db.add(new_sale)
    db.commit()
    db.refresh(product)
    
    return {"message": "Sale recorded successfully"}

@router.post("/sales/bulk")
async def create_bulk_sale(
    sale: BulkSaleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        print("Received sale request:", sale.dict())  # Debug log
        
        for item in sale.items:
            print(f"Processing sale item: productId={item.productId} quantity={item.quantity} price={item.price}")
            
            # Get product
            product = db.query(Product).filter(Product.id == item.productId).first()
            if not product:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Product with id {item.productId} not found"
                )
            
            # Check stock
            if product.stock < item.quantity:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Not enough stock for product {product.name}. Available: {product.stock}, Requested: {item.quantity}"
                )
            
            # Update stock
            product.stock -= item.quantity
            
            # Create sale record
            new_sale = Sale(
                product_id=item.productId,
                user_id=current_user.id,
                quantity=item.quantity,
                total_amount=item.quantity * item.price
            )
            db.add(new_sale)
        
        db.commit()
        return {"message": "Sale completed successfully"}
        
    except HTTPException as he:
        db.rollback()
        print("HTTP Exception:", he.detail)  # Debug log
        raise he
    except Exception as e:
        db.rollback()
        print("Unexpected error:", str(e))  # Debug log
        raise HTTPException(status_code=400, detail=str(e))
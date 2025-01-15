from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..utils.database import get_db
from ..models.product import Product
from ..models.sale import Sale
from ..models.user import User
from ..utils.auth import get_current_user
from typing import List
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get stats only for the current user's products and sales
    total_products = db.query(func.count(Product.id))\
        .filter(Product.user_id == current_user.id)\
        .scalar()

    total_sales = db.query(func.sum(Sale.quantity))\
        .filter(Sale.user_id == current_user.id)\
        .scalar() or 0

    total_revenue = db.query(func.sum(Sale.total_amount))\
        .filter(Sale.user_id == current_user.id)\
        .scalar() or 0

    low_stock_products = db.query(func.count(Product.id))\
        .filter(Product.user_id == current_user.id)\
        .filter(Product.stock < 10)\
        .scalar()

    return {
        "totalProducts": total_products,
        "totalSales": total_sales,
        "totalRevenue": float(total_revenue),
        "lowStockProducts": low_stock_products
    }

@router.get("/dashboard/sales-chart")
async def get_sales_chart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get last 7 days sales for current user only
    seven_days_ago = datetime.now() - timedelta(days=7)
    sales = db.query(
        func.date(Sale.sale_date).label('date'),
        func.sum(Sale.total_amount).label('sales')
    ).filter(
        Sale.user_id == current_user.id,
        Sale.sale_date >= seven_days_ago
    ).group_by(
        func.date(Sale.sale_date)
    ).all()

    return [{"date": str(sale.date), "sales": float(sale.sales)} for sale in sales]

@router.get("/dashboard/recent-sales")
async def get_recent_sales(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get last 10 sales for current user with product details
    recent_sales = db.query(
        Sale, Product.name.label('product_name')
    ).join(
        Product, Sale.product_id == Product.id
    ).filter(
        Sale.user_id == current_user.id
    ).order_by(
        Sale.sale_date.desc()
    ).limit(10).all()

    return [{
        "id": sale.Sale.id,
        "product_name": sale.product_name,
        "quantity": sale.Sale.quantity,
        "total_amount": float(sale.Sale.total_amount),
        "sale_date": sale.Sale.sale_date.strftime("%Y-%m-%d %H:%M")
    } for sale in recent_sales]
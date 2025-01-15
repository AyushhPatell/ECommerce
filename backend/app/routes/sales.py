from sqlalchemy import Column, Integer, DECIMAL, DateTime, ForeignKey
from sqlalchemy.sql import func
from ..utils.database import Base

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey('products.id'))
    quantity = Column(Integer, nullable=False)
    total_amount = Column(DECIMAL(10,2), nullable=False)
    sale_date = Column(DateTime(timezone=True), server_default=func.now())
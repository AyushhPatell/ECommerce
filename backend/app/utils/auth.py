from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from typing import Optional
import logging
from ..models.user import User
from .database import get_db
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get settings from environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "8AA311BB84BC6F2AFB38C3F825634")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Add logging
logger = logging.getLogger(__name__)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    logger.info(f"Received token: {token}")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        logger.info("Attempting to decode token")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        logger.info(f"Decoded email: {email}")
        if email is None:
            raise credentials_exception
    except JWTError as e:
        logger.error(f"JWT Error: {str(e)}")
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        logger.error("User not found in database")
        raise credentials_exception
    return user
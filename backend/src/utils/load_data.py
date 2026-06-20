import glob
import os
import re
from collections import Counter
import pandas as pd

from sqlalchemy.ext.asyncio import AsyncSession

INITIAL_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "db", "initial_data")



async def load_all_data(db: AsyncSession):
    pass 
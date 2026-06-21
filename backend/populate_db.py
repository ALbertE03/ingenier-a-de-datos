
import asyncio
from src.db.session import SessionLocal
from src.utils.load_data import load_all_data


async def main():
    print("Populating database with CSV data...")
    async with SessionLocal() as db:
        await load_all_data(db)
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())

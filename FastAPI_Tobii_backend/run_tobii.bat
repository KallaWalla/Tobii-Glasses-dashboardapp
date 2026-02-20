@echo off
REM Activate the Conda environment
call C:\Users\Kalla\anaconda3\Scripts\activate.bat tobii

REM Change to your project directory
cd /d "C:\Users\Kalla\Documents\Github_Repo's\Tobii-Glasses-dashboardapp\FastAPI_Tobii_backend"

REM Run your FastAPI app with uvicorn
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000
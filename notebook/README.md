# Simulation notebook — PraesagiumChain

## Setup (virtual environment)

On systems using PEP 668 (Debian/Ubuntu), create a venv before installing:

```bash
cd notebook
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install jupyter         # If you want to use: jupyter notebook
```

## Running the notebook

1. Start the backend in another terminal: `npm run backend`
2. Activate the venv: `source .venv/bin/activate`
3. Open the notebook: `jupyter notebook simulation_efficiency.ipynb`  
   Or open it from VS Code / Cursor and select the venv kernel (`.venv/bin/python`).

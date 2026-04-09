from fastapi import FastAPI

app = FastAPI(title="PTIK AI Gateway")

@app.get("/")
def read_root():
    return {"message": "AI Engine is active"}

@app.post("/predict")
def get_prediction(data: dict):
    # Route ke modul src/ sesuai kebutuhan
    return {"prediction": "success", "note": "Logic pending"}

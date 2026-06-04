import os

# Helper to load .env variables manually
def load_env():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(backend_dir, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()

# Run loader
load_env()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")


import os
import sys
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

api_key = os.environ.get('GEMINI_API_KEY')
if not api_key:
    print("No API Key found")
    sys.exit(1)

try:
    from google import genai
    client = genai.Client(api_key=api_key)
    # The new SDK might specific way to list models.
    # standard lists usually via client.models.list_models() or similar?
    # Based on google-genai pypi:
    try:
        # Try different potential methods
        if hasattr(client.models, 'list'):
            models_iter = client.models.list()
            print("Available models (via list()):")
            for m in models_iter:
                print(f"- {m.name}")
        elif hasattr(client.models, 'list_models'):
            models = client.models.list_models()
            print("Available models (via list_models()):") 
            for m in models:
                print(f"- {m.name}")
        else:
            print("Could not find list method on client.models")
            print(dir(client.models))
    except Exception as e:
        print(f"Error listing models with new SDK: {e}")
except ImportError:
    print("New SDK not found, trying old...")
    # fallback to google.generativeai
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name}")
    except Exception as e:
        print(f"Error with old SDK: {e}")

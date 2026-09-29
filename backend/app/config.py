from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    HINDSIGHT_API_KEY: str = ""
    HINDSIGHT_BASE_URL: str = "https://api.hindsight.vectorize.io"
    HINDSIGHT_BANK_ID: str = "cyberhinsight"
    GROQ_API_KEY: str = ""
    LLM_MODEL: str = "openai/gpt-oss-120b"

    model_config = {
        "env_file": ".env"
    }

settings = Settings()

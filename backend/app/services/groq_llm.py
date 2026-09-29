from groq import Groq

class GroqLLMService:
    def __init__(self, api_key: str, model: str):
        self.client = Groq(api_key=api_key)
        self.model = model

    def analyze(self, system_prompt: str, user_prompt: str) -> str:
        try:
            response = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=self.model,
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error in Groq analysis: {e}")
            return f"{{\"error\": \"{str(e)}\"}}"

    def check_connection(self) -> bool:
        try:
            self.client.chat.completions.create(
                messages=[{"role": "user", "content": "ping"}],
                model=self.model,
                max_tokens=5
            )
            return True
        except Exception:
            return False

import socket
import subprocess
import shutil
import time
from langchain_ollama import ChatOllama
from langchain_google_genai import ChatGoogleGenerativeAI
from config import LLM_MODEL_NAME, GOOGLE_API_KEY, GEMINI_MODEL_NAME, IS_PRODUCTION


def _is_ollama_running() -> bool:
    """Check if Ollama is running on port 11434."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        result = s.connect_ex(("127.0.0.1", 11434))
        s.close()
        return result == 0
    except Exception:
        return False


def _start_ollama() -> bool:
    """Try to start Ollama service automatically."""
    ollama_path = shutil.which("ollama")
    if not ollama_path:
        import os
        user_path = os.path.expanduser(r"~\AppData\Local\Programs\Ollama\ollama.exe")
        if os.path.exists(user_path):
            ollama_path = user_path

    if not ollama_path:
        return False

    try:
        subprocess.Popen(
            [ollama_path, "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=0x00000008,  # DETACHED_PROCESS on Windows
        )
        for _ in range(15):
            time.sleep(2)
            if _is_ollama_running():
                return True
        return False
    except Exception:
        return False


def _get_ollama_llm(model_name: str | None = None, temperature: float = 0.3):
    """Return a ChatOllama instance, auto-starting Ollama if needed."""
    if not _is_ollama_running():
        started = _start_ollama()
        if not started:
            raise ConnectionError(
                "Ollama is not running and could not be started automatically. "
                "Please start Ollama manually:\n"
                "1. Open a terminal/command prompt\n"
                "2. Run: ollama serve\n"
                "3. Then try your query again"
            )

    return ChatOllama(
        model=model_name or LLM_MODEL_NAME,
        temperature=temperature,
    )


def _get_gemini_llm(model_name: str | None = None, temperature: float = 0.3):
    """Return a ChatGoogleGenerativeAI instance."""
    if not GOOGLE_API_KEY:
        raise ValueError(
            "GOOGLE_API_KEY is not set. "
            "Add it to your .env file:\n"
            "GOOGLE_API_KEY=your-api-key-here"
        )

    return ChatGoogleGenerativeAI(
        model=model_name or GEMINI_MODEL_NAME,
        google_api_key=GOOGLE_API_KEY,
        temperature=temperature,
        convert_system_message_to_human=True,
    )


def get_llm(model_provider: str = "ollama", model_name: str | None = None, temperature: float = 0.3):
    """
    Factory to get LLM instance.
    Supports 'ollama' (local) and 'gemini' (cloud) providers.
    In production, always uses Gemini (Ollama is not available on cloud hosting).
    """
    provider = model_provider.lower().strip()

    # In production, force Gemini since Ollama can't run on cloud
    if IS_PRODUCTION:
        provider = "gemini"

    if provider == "gemini":
        return _get_gemini_llm(model_name=model_name, temperature=temperature)
    else:
        return _get_ollama_llm(model_name=model_name, temperature=temperature)

"""Suite-wide guard: fail fast with one clear message when dependencies are missing.

Without this, a fresh Python install produces seven identical
ModuleNotFoundError tracebacks (one per handler test module) before any test
runs. The fix is always the same command, so say it once.
"""
import importlib.util

import pytest

# import name -> pip package (the runtime deps live in src/requirements.txt,
# which requirements-dev.txt pulls in with -r).
_REQUIRED = {
    "aws_lambda_powertools": "aws-lambda-powertools",
    "pydantic": "pydantic",
    "boto3": "boto3",
    "requests": "requests",
    "moto": "moto",
}


def pytest_configure(config):
    missing = [pkg for mod, pkg in _REQUIRED.items() if importlib.util.find_spec(mod) is None]
    if missing:
        pytest.exit(
            "Missing test dependencies: "
            + ", ".join(missing)
            + "\nInstall them once from the backend folder:\n"
            + "    python -m pip install -r requirements-dev.txt",
            returncode=4,
        )

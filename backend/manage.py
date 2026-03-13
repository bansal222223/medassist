import os
import sys

def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "medassist_project.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Django install nahi hai ya venv activate nahi hai."
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()
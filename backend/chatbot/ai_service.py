"""
ai_service.py — GenAI Integration Layer
Groq (Free) use ho raha hai — OpenAI compatible API.
"""
from openai import OpenAI
from django.conf import settings

# ── System Prompts (feature-wise) ─────────────────────────────────────────────

SYSTEM_PROMPTS = {
    "symptom": """You are MedAssist's Symptom Checker AI. Your job:
1. Ask about symptoms ONE AT A TIME in a conversational way.
2. Gather: onset, severity (1-10), duration, location, associated symptoms.
3. After enough info, list 2-4 possible conditions with brief explanations.
4. Always recommend consulting a real doctor for diagnosis.
5. For emergencies (chest pain, stroke signs, breathing trouble) → tell them to call 112 immediately.
Be warm, calm, and reassuring.""",

    "medicine": """You are MedAssist's Medicine Information AI. For any medicine asked:
1. Generic & brand names
2. Drug class & mechanism of action
3. Indications / uses
4. Standard dosage (adult & pediatric if applicable)
5. Common side effects (top 5-7)
6. Serious side effects to watch for
7. Drug interactions (top 5)
8. Contraindications & warnings
9. Storage instructions
Always end with: "Consult your pharmacist or doctor before changing any medication." """,

    "firstaid": """You are MedAssist's First Aid Guide AI.
1. Start with immediate safety assessment
2. Give clear numbered step-by-step instructions
3. Include what NOT to do (common mistakes)
4. State clearly when to call 112 / emergency services
5. Include follow-up care
Handle: burns, cuts, fractures, choking, CPR, allergic reactions, poisoning,
heat stroke, hypothermia, seizures, eye injuries, fainting, nosebleeds, sprains, etc.""",

    "appointment": """You are MedAssist's Appointment Booking AI. Collect step by step:
1. Patient full name
2. Date of birth
3. Contact number
4. Email address
5. Doctor specialty (General Physician, Cardiologist, Dermatologist, etc.)
6. Preferred date and time (morning / afternoon / evening)
7. Symptoms / reason for visit
8. Insurance provider (optional)
After collecting all details, show a BOOKING SUMMARY and confirm.
Generate a reference number in format: MA-YYYYMMDD-XXXX. Be friendly and efficient.""",

    "hospital": """You are MedAssist's Hospital Finder AI.
1. Ask for the user's city, area, or pincode
2. Ask if a specific specialty is needed
3. Provide 3-5 hospitals with:
   - Name, Address, Phone number
   - Specialties available
   - Emergency services: Yes/No
   - Approximate directions from their area
4. Highlight the nearest emergency hospital first if urgency is mentioned
5. Mention what to bring (ID, insurance card, medication list)""",

    "general": """You are MedAssist, a compassionate AI health companion. You help with:
- Symptom checking and health guidance
- Medicine information and drug details
- First aid instructions for emergencies
- Doctor appointment booking
- Finding nearby hospitals
Be warm, professional, and accurate. Always recommend professional care for serious issues.
Disclaimer: You provide general information only, not professional medical advice.""",
}

# ── Main AI Service Class ──────────────────────────────────────────────────────

class MedAssistAI:
    """Groq AI se baat karne ka central service (OpenAI compatible)."""

    def __init__(self):
        self.client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url="https://api.groq.com/openai/v1",  # ← Groq endpoint
        )
        self.model      = settings.AI_MODEL
        self.max_tokens = settings.AI_MAX_TOKENS

    def chat(self, messages: list, feature: str = "general") -> dict:
        """
        Groq ko messages bhejo, response lo.

        Args:
            messages : [{"role": "user"|"assistant", "content": "..."}, ...]
            feature  : symptom | medicine | firstaid | appointment | hospital | general

        Returns:
            {
                "reply"  : str,
                "feature": str,
                "model"  : str,
                "usage"  : {"input_tokens": int, "output_tokens": int}
            }
        """
        system_prompt = SYSTEM_PROMPTS.get(feature, SYSTEM_PROMPTS["general"])

        # System message pehle, phir conversation history
        groq_messages = [{"role": "system", "content": system_prompt}] + messages

        response = self.client.chat.completions.create(
            model=self.model,
            max_tokens=self.max_tokens,
            messages=groq_messages,
            temperature=0.7,
        )

        reply_text = response.choices[0].message.content or ""

        return {
            "reply"  : reply_text,
            "feature": feature,
            "model"  : response.model,
            "usage"  : {
                "input_tokens" : response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens,
            },
        }

    def quick_summary(self, text: str) -> str:
        """Kisi bhi text ka 8-word summary banao (logging ke liye)."""
        response = self.client.chat.completions.create(
            model=self.model,
            max_tokens=30,
            messages=[
                {"role": "system", "content": "Summarize in 8 words or less."},
                {"role": "user",   "content": text[:300]},
            ],
        )
        return response.choices[0].message.content or ""


# Singleton — poore project mein ek hi instance
ai_service = MedAssistAI()
from django.db import models
from django.contrib.auth.models import User
import uuid


class ChatSession(models.Model):
    FEATURE_CHOICES = [
        ("symptom", "Symptom Checker"),
        ("medicine", "Medicine Info"),
        ("firstaid", "First Aid Guide"),
        ("appointment", "Book Appointment"),
        ("hospital", "Nearby Hospitals"),
        ("general", "General"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    session_key = models.CharField(max_length=64, db_index=True)
    feature = models.CharField(max_length=20, choices=FEATURE_CHOICES, default="general")
    title = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Session [{self.feature}] - {self.title[:40]}"


class Message(models.Model):
    ROLE_CHOICES = [("user", "User"), ("assistant", "Assistant")]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    feature = models.CharField(max_length=20, default="general")
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    model_used = models.CharField(max_length=60, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class Appointment(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("cancelled", "Cancelled"),
        ("completed", "Completed"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_number = models.CharField(max_length=20, unique=True)
    patient_name = models.CharField(max_length=200)
    patient_dob = models.DateField(null=True, blank=True)
    contact_number = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    doctor_specialty = models.CharField(max_length=100)
    preferred_date = models.DateField()
    preferred_time = models.TimeField()
    symptoms = models.TextField()
    insurance_provider = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    session = models.ForeignKey(ChatSession, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.reference_number} - {self.patient_name}"


class SymptomReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="symptom_reports")
    symptoms_reported = models.TextField()
    ai_assessment = models.TextField()
    severity_level = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
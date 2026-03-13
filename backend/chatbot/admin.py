from django.contrib import admin
from .models import ChatSession, Message, Appointment, SymptomReport

admin.site.register(ChatSession)
admin.site.register(Message)
admin.site.register(Appointment)
admin.site.register(SymptomReport)
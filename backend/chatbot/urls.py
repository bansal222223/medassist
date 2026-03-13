from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"sessions", views.ChatSessionViewSet, basename="session")
router.register(r"appointments", views.AppointmentViewSet, basename="appointment")
router.register(r"symptom-reports", views.SymptomReportViewSet, basename="symptom-report")

urlpatterns = [
    path("", include(router.urls)),
    path("chat/", views.ChatView.as_view(), name="chat"),
    path("health/", views.health_check, name="health"),
]
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import ChatSession, Message, Appointment, SymptomReport
from .serializers import (
    ChatSessionSerializer, ChatSessionListSerializer,
    MessageSerializer, ChatRequestSerializer,
    AppointmentSerializer, SymptomReportSerializer,
)
from .ai_service import ai_service


class ChatView(APIView):
    """POST /api/chat/ — Main GenAI endpoint"""

    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        feature = data["feature"]
        user_message = data["message"]
        session_key = data.get("session_key", "anonymous")
        session_id = data.get("session_id")

        # Session get ya create karo
        if session_id:
            session = get_object_or_404(ChatSession, id=session_id)
        else:
            session = ChatSession.objects.create(
                user=request.user if request.user.is_authenticated else None,
                session_key=session_key,
                feature=feature,
                title=user_message[:80],
            )

        # User message save karo
        user_msg = Message.objects.create(
            session=session, role="user",
            content=user_message, feature=feature,
        )

        # Puri conversation history build karo
        history = list(
            session.messages.exclude(id=user_msg.id)
            .order_by("created_at").values("role", "content")
        )
        history.append({"role": "user", "content": user_message})

        # Claude se response lo
        try:
            ai_result = ai_service.chat(messages=history, feature=feature)
        except Exception as exc:
            return Response({"error": f"AI error: {str(exc)}"}, status=503)

        # AI response save karo
        assistant_msg = Message.objects.create(
            session=session, role="assistant",
            content=ai_result["reply"], feature=feature,
            input_tokens=ai_result["usage"]["input_tokens"],
            output_tokens=ai_result["usage"]["output_tokens"],
            model_used=ai_result["model"],
        )

        session.updated_at = timezone.now()
        session.save(update_fields=["updated_at"])

        return Response({
            "session_id": str(session.id),
            "reply": ai_result["reply"],
            "feature": feature,
            "model": ai_result["model"],
            "usage": ai_result["usage"],
            "message_id": str(assistant_msg.id),
        })


class ChatSessionViewSet(viewsets.ModelViewSet):
    queryset = ChatSession.objects.all()

    def get_serializer_class(self):
        if self.action == "list":
            return ChatSessionListSerializer
        return ChatSessionSerializer

    def get_queryset(self):
        qs = ChatSession.objects.all()
        feature = self.request.query_params.get("feature")
        if feature:
            qs = qs.filter(feature=feature)
        return qs

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        session = self.get_object()
        return Response(MessageSerializer(session.messages.all(), many=True).data)

    @action(detail=True, methods=["post"])
    def clear(self, request, pk=None):
        self.get_object().messages.all().delete()
        return Response({"detail": "Session cleared."})


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all().order_by("-created_at")
    serializer_class = AppointmentSerializer

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        appt = self.get_object()
        appt.status = "cancelled"
        appt.save(update_fields=["status", "updated_at"])
        return Response({"detail": "Cancelled", "reference": appt.reference_number})

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        appt = self.get_object()
        appt.status = "confirmed"
        appt.save(update_fields=["status", "updated_at"])
        return Response({"detail": "Confirmed", "reference": appt.reference_number})


class SymptomReportViewSet(viewsets.ModelViewSet):
    queryset = SymptomReport.objects.all().order_by("-created_at")
    serializer_class = SymptomReportSerializer
    http_method_names = ["get", "post", "head", "options"]


@api_view(["GET"])
def health_check(request):
    return Response({
        "status": "ok",
        "service": "MedAssist API",
        "ai_model": ai_service.model,
    })
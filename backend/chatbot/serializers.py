from rest_framework import serializers
from .models import ChatSession, Message, Appointment, SymptomReport


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "role", "content", "feature",
                  "input_tokens", "output_tokens", "model_used", "created_at"]
        read_only_fields = ["id", "created_at"]


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = ["id", "feature", "title", "created_at",
                  "updated_at", "is_active", "messages", "message_count"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_message_count(self, obj):
        return obj.messages.count()


class ChatSessionListSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = ["id", "feature", "title", "created_at",
                  "updated_at", "is_active", "message_count"]

    def get_message_count(self, obj):
        return obj.messages.count()


class ChatRequestSerializer(serializers.Serializer):
    session_id = serializers.UUIDField(required=False, allow_null=True)
    message = serializers.CharField(max_length=4000)
    feature = serializers.ChoiceField(
        choices=["symptom", "medicine", "firstaid",
                 "appointment", "hospital", "general"],
        default="general",
    )
    session_key = serializers.CharField(max_length=64,
                                        required=False, default="anonymous")


class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = "__all__"
        read_only_fields = ["id", "reference_number", "created_at", "updated_at"]

    def create(self, validated_data):
        from datetime import date
        import random, string
        date_str = date.today().strftime("%Y%m%d")
        rand = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        validated_data["reference_number"] = f"MA-{date_str}-{rand}"
        return super().create(validated_data)


class SymptomReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = SymptomReport
        fields = "__all__"
        read_only_fields = ["id", "created_at"]
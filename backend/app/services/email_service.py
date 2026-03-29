import logging

import httpx

from app.config import settings


logger = logging.getLogger(__name__)


class EmailSender:
    def send_verification_code(self, *, email: str, username: str, code: str) -> None:
        raise NotImplementedError


class ResendEmailSender(EmailSender):
    def send_verification_code(self, *, email: str, username: str, code: str) -> None:
        if not settings.resend_api_key or not settings.email_from:
            logger.info("Verification code for %s (%s): %s", username, email, code)
            return

        html = (
            f"<p>Hi {username},</p>"
            f"<p>Your JustTalk verification code is <strong>{code}</strong>.</p>"
            f"<p>This code expires in {settings.verification_code_expire_minutes} minutes.</p>"
        )
        payload = {
            "from": settings.email_from,
            "to": [email],
            "subject": "Your JustTalk verification code",
            "html": html,
        }
        if settings.email_reply_to:
            payload["reply_to"] = settings.email_reply_to

        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=10.0,
        )
        response.raise_for_status()


email_sender: EmailSender = ResendEmailSender()

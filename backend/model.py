"""Lightweight NLP model and explainable rule layer for ScamShield AI."""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import FeatureUnion


SCAM_MESSAGES = [
    "URGENT! Your bank account has been blocked. Verify your KYC now at http://bit.ly/kyc-update",
    "Congratulations! You won Rs 25 lakh in KBC lottery. Pay processing fee to claim prize",
    "Your SBI YONO account will be suspended today. Click the link and enter OTP to reactivate",
    "Dear customer your electricity connection will be disconnected tonight. Call this number immediately",
    "You have won a free iPhone. Complete this survey and pay only shipping charges",
    "Income tax refund of INR 18,540 is pending. Submit card details to receive refund",
    "I am an army officer buying your OLX item. Scan this QR code to receive advance payment",
    "Your parcel is on hold due to unpaid customs fee. Pay now using this shortened link",
    "Update PAN card immediately or your bank account will be frozen. Visit tinyurl link",
    "Amazon refund approved. Share OTP with our executive to receive money",
    "Hi mum, my phone is broken. This is my new number. Please send money urgently",
    "Earn 5000 daily from home. No experience required. Pay registration fee now",
    "You are selected for a part time job. Like videos and earn money. Deposit to unlock tasks",
    "Police complaint registered against your Aadhaar. Pay penalty now to avoid arrest",
    "FedEx parcel contains illegal items. Contact cyber crime officer and transfer verification amount",
    "Your UPI cashback of Rs 4999 expires today. Enter UPI PIN to collect",
    "Exclusive crypto investment doubles money in 24 hours. Guaranteed returns join now",
    "Your Netflix payment failed. Update billing details at netfliix-support dot com",
    "Bank security alert: unusual login detected. Confirm username password and OTP immediately",
    "You won lucky draw! Send account number IFSC and Aadhaar photo to claim",
    "Final warning: repay loan now or we will send your photos to all contacts",
    "RBI is giving government subsidy. Click to register and share debit card PIN",
    "Your WhatsApp will stop working. Forward this code to keep your account active",
    "Hello sir I transferred money by mistake. Please return it using this collect request",
    "Get instant loan without documents. Pay insurance charge before disbursal",
    "Free recharge available for Jio users. Forward to ten people and login to claim",
    "Work from home opportunity with Amazon. Security deposit required for onboarding",
    "Dear user your FASTag has expired. Pay fine immediately through this unknown link",
    "Matrimony profile interested in you. I sent an expensive gift, pay customs to release",
    "Investment tip from expert: buy this stock now for confirmed 300 percent profit",
    "Your credit card reward points expire in 2 hours. Redeem by entering CVV here",
    "I am calling from bank fraud department. Tell me the OTP just received for verification",
    "Your Instagram account violates copyright. Login through attached form to appeal",
    "Congratulations beneficiary. UN grant has been approved in your name send transfer fee",
    "This is customer care. Install screen sharing app so we can process your refund",
    "Scan QR and enter UPI PIN to receive payment for the item",
    "Court notice pending in your name. Settle the case through gift cards today",
    "Your SIM will be deactivated due to incomplete KYC. Download this APK to update",
    "Lottery winner alert claim 10 crore rupees by paying tax deposit now",
    "Remote job interview selected without application. Purchase training kit to begin",
    "We noticed suspicious activity. Confirm your seed phrase to secure crypto wallet",
    "PM relief fund benefit approved. Share OTP and bank details for direct transfer",
    "Delivery failed confirm address and pay 2 rupees at suspicious payment page",
    "You are eligible for pre-approved loan. Send Aadhaar PAN and upfront processing fee",
    "Hi this is your CEO. I need you to urgently buy gift cards and send the codes",
    "Account locked verify immediately using http link or permanently lose access",
    "Your child is in trouble and needs money now. Do not call anyone just transfer",
    "Paytm KYC expired call agent and share screen to avoid wallet closure",
]

LEGIT_MESSAGES = [
    "Your order has been shipped and will arrive by Friday. Track it in the official app",
    "Hi, are we still meeting at 6 pm near the station?",
    "Your OTP is 482913. Do not share it with anyone. Bank staff will never ask for your OTP",
    "Payment of INR 850 to Fresh Mart was successful. If not you, use the official app",
    "Reminder: your dentist appointment is tomorrow at 10:30 AM",
    "Can you send me the notes from today's lecture when you are free?",
    "Your monthly bank statement is now available in internet banking",
    "The team meeting has moved to 3 pm. Calendar invite updated",
    "Happy birthday! Hope you have a wonderful year ahead",
    "Your food order is out for delivery. The rider will reach in 12 minutes",
    "Electricity bill of INR 1240 is due on 28 July. Pay through the official provider app",
    "Your train ticket is confirmed. PNR and coach details are available in IRCTC",
    "Thanks for applying. Your interview is scheduled for Monday on our company video link",
    "Class is cancelled today because the professor is unavailable",
    "I reached home safely, thanks for checking",
    "Your salary has been credited to your account ending 4512",
    "Library book return date is next Wednesday",
    "The code review is complete. I left two comments on the pull request",
    "Your package was delivered to the reception desk at 2:14 pm",
    "Please bring your college ID card for tomorrow's examination",
    "Your cab has arrived. Driver and vehicle details are visible in the app",
    "We received your support request. Track ticket status on our official website",
    "Mom asked if you can pick up groceries on your way home",
    "Your subscription renews next month. Manage it from account settings",
    "The payment request from Rohan for dinner is INR 430",
    "Congratulations on completing the course. Your certificate is ready",
    "Your vaccination appointment is confirmed at the civic centre",
    "There is maintenance in our building from 11 am to 1 pm",
    "Please review the attached project report before our presentation",
    "Your refund for the cancelled order has been credited to the original payment method",
    "Welcome to the college coding club. Orientation is in Lab 3 on Saturday",
    "The bank branch will be closed on Sunday for scheduled maintenance",
    "Your one-time password is 120884. Never disclose it to anyone, including bank employees",
    "Your UPI payment to City Cafe was completed successfully",
    "Here is the Google Meet link for our scheduled tutorial session",
    "Movie tickets booked successfully. Show the QR code at the cinema entrance",
    "Your exam results have been published on the official university portal",
    "Meeting minutes and action items are attached for your review",
    "Thank you for your purchase. Download the invoice from the official app",
    "I will be ten minutes late because of traffic",
    "Security notice: a new login was detected. Review activity by opening the official app",
    "Your mobile recharge of INR 299 was successful",
    "The hostel fee receipt is available in the student portal",
    "Would you like to join us for cricket this Sunday morning?",
    "Password changed successfully. If this was not you, contact support through the app",
    "Your credit card bill was generated. The due date is shown in your banking app",
    "The placement cell workshop starts at 9 AM in the auditorium",
    "I have shared the design file with your college email address",
]


@dataclass
class Signal:
    label: str
    detail: str
    weight: float
    kind: str = "risk"

    def as_dict(self) -> dict[str, Any]:
        return {"label": self.label, "detail": self.detail, "kind": self.kind}


class ScamDetector:
    """A word + character TF-IDF classifier blended with transparent safety rules."""

    def __init__(self) -> None:
        self.vectorizer = FeatureUnion([
            ("word", TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)),
            ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=2, sublinear_tf=True)),
        ])
        training_messages = SCAM_MESSAGES + LEGIT_MESSAGES
        labels = [1] * len(SCAM_MESSAGES) + [0] * len(LEGIT_MESSAGES)
        features = self.vectorizer.fit_transform(training_messages)
        self.classifier = LogisticRegression(max_iter=1200, C=3.0, class_weight="balanced", random_state=42)
        self.classifier.fit(features, labels)

    def _signals(self, message: str) -> tuple[list[Signal], float]:
        text = message.lower()
        signals: list[Signal] = []
        score = 0.0

        patterns = [
            (r"https?://|www\.|bit\.ly|tinyurl|t\.me/|\.apk\b", "Suspicious link", "Contains a link or downloadable file—verify the destination independently.", 0.19),
            (r"\b(otp|pin|cvv|password|seed phrase|login details)\b", "Sensitive information", "Mentions credentials that legitimate support agents should never request.", 0.17),
            (r"\b(urgent|immediately|now|today only|expires? (today|soon)|final warning|within \d+ (minutes?|hours?))\b", "Pressure language", "Creates urgency to make you act before checking the facts.", 0.13),
            (r"\b(won|winner|lottery|prize|free iphone|cashback|reward points?|grant)\b", "Too-good-to-be-true offer", "Promises an unexpected reward or benefit.", 0.18),
            (r"\b(pay|fee|deposit|transfer|gift cards?|processing charge|customs|penalty|upi pin|scan (this )?qr)\b", "Payment request", "Asks for money, a fee, or a payment action.", 0.15),
            (r"\b(blocked|suspended|frozen|deactivated|disconnected|arrest|police|court notice|legal action)\b", "Threat or consequence", "Uses a threat of account loss, disconnection, or legal action.", 0.16),
            (r"\b(kyc|aadhaar|pan card|bank account|credit card|debit card|ifsc)\b", "Financial identity terms", "References banking or identity information often used in impersonation scams.", 0.09),
            (r"\b(guaranteed returns?|double(s)? money|\d{2,3}\s?% profit|earn \d+ daily|instant loan)\b", "Unrealistic promise", "Offers unusually high or guaranteed financial returns.", 0.17),
            (r"\b(install|anydesk|teamviewer|screen shar(e|ing)|download (this|the) app)\b", "Remote access request", "May be trying to gain control of your phone or screen.", 0.22),
            (r"\b(new number|phone is broken|do not call|don't call|secret)\b", "Identity manipulation", "Discourages normal verification or claims a sudden identity change.", 0.16),
        ]

        for pattern, label, detail, weight in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                signals.append(Signal(label, detail, weight))
                score += weight

        safe_patterns = [
            (r"\bdo not share (it|your otp)|never (ask for|share|disclose)\b", "Safety reminder", "Explicitly tells you not to disclose credentials."),
            (r"\b(official app|official website|student portal|banking app)\b", "Official-channel guidance", "Directs you to an official channel rather than an unknown contact."),
        ]
        for pattern, label, detail in safe_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                signals.append(Signal(label, detail, -0.10, "safe"))
                score -= 0.10

        return signals[:5], max(0.0, min(1.0, score))

    def analyze(self, message: str) -> dict[str, Any]:
        features = self.vectorizer.transform([message])
        ml_probability = float(self.classifier.predict_proba(features)[0][1])
        signals, rule_score = self._signals(message)

        # NLP remains the primary decision-maker; rules improve recall and explanations.
        scam_probability = (0.72 * ml_probability) + (0.28 * rule_score)
        scam_probability = max(0.02, min(0.98, scam_probability))
        is_scam = scam_probability >= 0.50
        confidence = scam_probability if is_scam else 1.0 - scam_probability

        if not signals:
            signals = [Signal(
                "No common scam patterns",
                "The message does not match strong urgency, credential, payment, or threat patterns.",
                0,
                "safe",
            )]

        risk_level = "High" if scam_probability >= 0.72 else "Medium" if scam_probability >= 0.45 else "Low"
        return {
            "verdict": "SCAM" if is_scam else "LEGIT",
            "confidence": round(confidence * 100, 1),
            "scam_probability": round(scam_probability * 100, 1),
            "risk_level": risk_level,
            "signals": [signal.as_dict() for signal in signals],
            "advice": (
                "Do not reply, tap links, share credentials, or send money. Verify the sender using an official number or app."
                if is_scam
                else "No strong scam pattern was found. Still verify unexpected requests before sharing money or personal details."
            ),
            "model_probability": round(ml_probability * 100, 1),
        }


_detector: ScamDetector | None = None


def get_detector() -> ScamDetector:
    global _detector
    if _detector is None:
        _detector = ScamDetector()
    return _detector

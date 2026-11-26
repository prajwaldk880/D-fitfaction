import re
from typing import Any, Dict, List, Optional

EMERGENCY_KEYWORDS = [
    "emergency", "112", "ambulance", "heart attack", "chest pain", "stroke",
    "unconscious", "bleeding", "accident", "trauma", "breathing", "critical",
    "ತುರ್ತು", "ಆಂಬ್ಯುಲೆನ್ಸ್", "अस्पताल आपात", "आपातकालीन", "एम्बुलेंस", "हार्ट अटैक",
]

SPECIALTY_KEYWORDS = {
    "Cardiology": ["cardio", "heart", "cardiology", "ಹೃದಯ", "हृदय", "कार्डियो"],
    "Neurology": ["neuro", "brain", "neurology", "ನರ", "न्यूरो"],
    "Orthopedics": ["ortho", "bone", "fracture", "orthopedics", "ಮೂಳೆ", "हड्डी"],
    "Pediatrics": ["pediatric", "child", "children", "kids", "ಮಕ್ಕಳ", "बच्चों"],
    "Gynecology": ["gynec", "maternity", "pregnancy", "महिला", "ಪ್ರಸೂತಿ"],
    "Oncology": ["oncology", "cancer", "कैंसर"],
    "Dermatology": ["skin", "dermatology"],
    "Ophthalmology": ["eye", "ophthalmology", "ಕಣ್ಣು", "आंख"],
    "ENT": ["ent", "ear", "nose", "throat"],
    "Psychiatry": ["psychiatry", "mental"],
    "General Medicine": ["general medicine", "physician", "fever"],
    "Emergency Medicine": ["emergency medicine", "trauma"],
    "Gastroenterology": ["gastro", "stomach", "liver"],
    "Nephrology": ["nephro", "kidney"],
    "Urology": ["urology"],
    "Pulmonology": ["pulmono", "lung", "respiratory"],
    "Dentistry": ["dental", "dentist", "tooth"],
    "Physiotherapy": ["physio", "physiotherapy"],
    "Radiology": ["radiology", "scan"],
}

SERVICE_KEYWORDS = {
    "ICU": ["icu", "intensive care"],
    "Dialysis": ["dialysis", "ಡಯಾಲಿಸಿಸ್", "डायलिसिस"],
    "Emergency department": ["emergency", "er", "casualty"],
    "Ambulance": ["ambulance"],
    "Blood bank": ["blood bank", "blood"],
    "MRI": ["mri"],
    "CT scan": ["ct scan", "ct"],
    "Maternity care": ["maternity", "delivery"],
    "Pharmacy": ["pharmacy", "chemist"],
}

DISCLAIMERS = {
    "en": (
        "Healthcare Discovery Disclaimer: Life Protecter helps locate healthcare facilities "
        "and verified service records. It does NOT diagnose medical conditions, prescribe "
        "medication, or provide medical advice. In an emergency in India, call 112 immediately."
    ),
    "kn": (
        "ಆರೋಗ್ಯ ಸಲಹೆ ಹಕ್ಕುತ್ಯಾಗ: ಲೈಫ್ ಪ್ರೊಟೆಕ್ಟರ್ ಆಸ್ಪತ್ರೆಗಳು ಮತ್ತು ಪರಿಶೀಲಿಸಿದ ಸೇವೆಗಳನ್ನು "
        "ಹುಡುಕಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ. ಇದು ರೋಗನಿರ್ಣಯ ಮಾಡುವುದಿಲ್ಲ ಅಥವಾ ಔಷಧಿಗಳನ್ನು ಶಿಫಾರಸು ಮಾಡುವುದಿಲ್ಲ. "
        "ಭಾರತದಲ್ಲಿ ತುರ್ತು ಸಂದರ್ಭದಲ್ಲಿ ತಕ್ಷಣ 112 ಗೆ ಕರೆ ಮಾಡಿ."
    ),
    "hi": (
        "स्वास्थ्य सेवा अस्वीकरण: लाइफ प्रोटेक्टर स्वास्थ्य केंद्रों और सत्यापित सेवाओं को खोजने "
        "में मदद करता है। यह किसी बीमारी का निदान नहीं करता और न ही दवा लिखता है। "
        "भारत में आपात स्थिति में तुरंत 112 पर कॉल करें।"
    ),
}


def detect_intent(query: str, language: str = "en") -> Dict[str, Any]:
    text = query.strip().lower()
    is_emergency = any(kw in text for kw in EMERGENCY_KEYWORDS)

    radius_km: float = 10.0
    radius_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:km|kilometer|kilometre)", text)
    if radius_match:
        radius_km = min(max(float(radius_match.group(1)), 1.0), 50.0)

    matched_specialty: Optional[str] = None
    for spec_name, kws in SPECIALTY_KEYWORDS.items():
        if any(kw in text for kw in kws):
            matched_specialty = spec_name
            break

    matched_service: Optional[str] = None
    for svc_name, kws in SERVICE_KEYWORDS.items():
        if any(kw in text for kw in kws):
            matched_service = svc_name
            break

    intent = "find_nearby_hospitals"
    if is_emergency:
        intent = "emergency_hospitals"
    elif matched_specialty:
        intent = f"find_specialty_{matched_specialty.lower().replace(' ', '_')}"
    elif matched_service:
        intent = f"find_service_{matched_service.lower().replace(' ', '_')}"
    elif radius_match:
        intent = "find_hospitals_within_radius"

    lang = language if language in DISCLAIMERS else "en"

    if is_emergency:
        reply_map = {
            "en": (
                "URGENT: In an emergency in India, call 112 immediately. Do not wait for this app. "
                "Below are nearby facilities with verified or reported emergency capabilities."
            ),
            "kn": (
                "ತುರ್ತು ಸೂಚನೆ: ಭಾರತದಲ್ಲಿ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಲ್ಲಿ ತಕ್ಷಣ 112 ಗೆ ಕರೆ ಮಾಡಿ. "
                "ಈ ಆ್ಯಪ್‌ಗಾಗಿ ಕಾಯಬೇಡಿ. ಹತ್ತಿರದ ತುರ್ತು ಆಸ್ಪತ್ರೆಗಳನ್ನು ಕೆಳಗೆ ತೋರಿಸಲಾಗಿದೆ."
            ),
            "hi": (
                "आपातकालीन सूचना: भारत में किसी भी आपात स्थिति में तुरंत 112 पर कॉल करें। "
                "इस ऐप का इंतजार न करें। नीचे नजदीकी आपातकालीन अस्पताल दिखाए गए हैं।"
            ),
        }
        reply = reply_map[lang]
    elif matched_specialty:
        reply_map = {
            "en": f"Showing healthcare facilities with verified or reported {matched_specialty} records within {radius_km:g} km.",
            "kn": f"{radius_km:g} ಕಿ.ಮೀ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ {matched_specialty} ಸೇವೆ ಇರುವ ಆಸ್ಪತ್ರೆಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ.",
            "hi": f"{radius_km:g} किमी के भीतर {matched_specialty} विभाग वाले अस्पताल दिखाए जा रहे हैं।",
        }
        reply = reply_map[lang]
    elif matched_service:
        reply_map = {
            "en": f"Showing facilities with {matched_service} availability records within {radius_km:g} km.",
            "kn": f"{radius_km:g} ಕಿ.ಮೀ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ {matched_service} ಲಭ್ಯತೆಯ ದಾಖಲೆಗಳಿರುವ ಆಸ್ಪತ್ರೆಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ.",
            "hi": f"{radius_km:g} किमी के भीतर {matched_service} सेवा वाले अस्पताल दिखाए जा रहे हैं।",
        }
        reply = reply_map[lang]
    else:
        reply_map = {
            "en": f"Showing nearby healthcare facilities within {radius_km:g} km sorted by distance.",
            "kn": f"{radius_km:g} ಕಿ.ಮೀ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಹತ್ತಿರದ ಆರೋಗ್ಯ ಕೇಂದ್ರಗಳನ್ನು ದೂರದ ಪ್ರಕಾರ ತೋರಿಸಲಾಗುತ್ತಿದೆ.",
            "hi": f"{radius_km:g} किमी के भीतर नजदीकी स्वास्थ्य केंद्र दूरी के अनुसार दिखाए जा रहे हैं।",
        }
        reply = reply_map[lang]

    return {
        "intent": intent,
        "is_emergency": is_emergency,
        "reply": reply,
        "disclaimer": DISCLAIMERS[lang],
        "recommended_filters": {
            "specialty": matched_specialty,
            "service": matched_service,
            "radius_km": radius_km,
            "emergency_only": is_emergency,
        },
    }
